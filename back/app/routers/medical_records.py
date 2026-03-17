import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_account, CurrentAccount
from app.models.medical_record import MedicalRecord
from app.models.attachment import Attachment
from app.models.consent_form import ConsentForm
from app.models.client import Client
from app.schemas.medical_record import (
    MedicalRecordCreate, MedicalRecordResponse, MedicalRecordUpdate,
    ConsentFormCreate, ConsentFormResponse, AttachmentUpdate
)
from app.services.security import encrypt_data, decrypt_data, decrypt_bytes

router = APIRouter(prefix="/medical-records", tags=["Prontuários"])

MEDICAL_FILES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "medical_records")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}

def check_client_access(db: Session, client_id: int, account: CurrentAccount):
    user_id = account.user.id
    if account.role == "staff":
        if not account.permissions.get("can_access_documents"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Você não tem permissão para acessar documentos de pacientes"
            )
    
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == user_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return client

def decrypt_record(record: MedicalRecord):
    """Auxiliar para descriptografar o conteúdo de um registro antes de enviar para o cliente."""
    if record.content:
        try:
            record.content = decrypt_data(record.content.encode() if isinstance(record.content, str) else record.content)
        except Exception:
            pass # Caso já esteja descriptografado ou erro na chave
    return record

@router.get("/check-clinical-data")
def check_clinical_data_status(
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account)
):
    """Verifica se o usuário possui qualquer dado clínico (prontuário ou anexo) cadastrado."""
    # Busca IDs de clientes do usuário
    client_ids = db.query(Client.id).filter(Client.user_id == account.user.id).all()
    client_ids = [c[0] for c in client_ids]
    
    if not client_ids:
        return {"has_clinical_data": False}
        
    # Verifica se existe algum registro médico para esses clientes
    has_records = db.query(MedicalRecord).filter(MedicalRecord.client_id.in_(client_ids)).first() is not None
    
    return {"has_clinical_data": has_records}

@router.get("/client/{client_id}", response_model=List[MedicalRecordResponse])
def get_client_records(
    client_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account)
):
    """Lista todos os registros (anamnese e evoluções) de um cliente com conteúdo descriptografado."""
    check_client_access(db, client_id, account)
    records = db.query(MedicalRecord).filter(MedicalRecord.client_id == client_id).order_by(MedicalRecord.created_at.desc()).all()
    return [decrypt_record(r) for r in records]

@router.post("/", response_model=MedicalRecordResponse)
def create_medical_record(
    data: MedicalRecordCreate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account)
):
    """Cria um novo registro (Anamnese ou Evolução) com conteúdo criptografado."""
    check_client_access(db, data.client_id, account)
    
    # Criptografar conteúdo
    encrypted_content = encrypt_data(data.content).decode()
    
    if data.type == "anamnesis":
        existing = db.query(MedicalRecord).filter(
            MedicalRecord.client_id == data.client_id, 
            MedicalRecord.type == "anamnesis"
        ).first()
        if existing:
            existing.content = encrypted_content
            db.commit()
            db.refresh(existing)
            return decrypt_record(existing)

    new_record = MedicalRecord(
        client_id=data.client_id,
        appointment_id=data.appointment_id,
        type=data.type,
        content=encrypted_content
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return decrypt_record(new_record)

@router.delete("/{record_id}")
def delete_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account)
):
    """Exclui um registro médico e seus anexos físicos."""
    record = db.query(MedicalRecord).join(Client).filter(
        MedicalRecord.id == record_id, 
        Client.user_id == account.user.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Registro não encontrado")

    # Deletar arquivos físicos dos anexos
    for att in record.attachments:
        actual_path = os.path.join(MEDICAL_FILES_DIR, os.path.basename(att.file_path))
        if os.path.exists(actual_path):
            os.remove(actual_path)

    db.delete(record)
    db.commit()
    return {"detail": "Registro excluído com sucesso"}

@router.post("/{record_id}/attachments", response_model=MedicalRecordResponse)
def upload_attachment(
    record_id: int,
    label: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account)
):
    """Upload de anexo criptografado."""
    record = db.query(MedicalRecord).join(Client).filter(
        MedicalRecord.id == record_id, 
        Client.user_id == account.user.id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Registro não encontrado")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido")

    os.makedirs(MEDICAL_FILES_DIR, exist_ok=True)
    filename = f"record_{record_id}_{uuid.uuid4().hex[:8]}{ext}.enc"
    filepath = os.path.join(MEDICAL_FILES_DIR, filename)

    # Criptografar bytes do arquivo
    file_content = file.file.read()
    encrypted_content = encrypt_data(file_content)

    with open(filepath, "wb") as f:
        f.write(encrypted_content)

    attachment = Attachment(
        medical_record_id=record_id,
        file_path=f"static/medical_records/{filename}",
        file_type=file.content_type,
        label=label
    )
    db.add(attachment)
    db.commit()
    db.refresh(record)
    return decrypt_record(record)

@router.put("/attachments/{attachment_id}", response_model=MedicalRecordResponse)
def update_attachment(
    attachment_id: int,
    data: AttachmentUpdate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account)
):
    """Atualiza o rótulo de um anexo."""
    attachment = db.query(Attachment).join(MedicalRecord).join(Client).filter(
        Attachment.id == attachment_id,
        Client.user_id == account.user.id
    ).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    if data.label:
        attachment.label = data.label
    
    db.commit()
    db.refresh(attachment.medical_record)
    return decrypt_record(attachment.medical_record)

@router.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account)
):
    """Exclui um anexo físico e seu registro no banco."""
    attachment = db.query(Attachment).join(MedicalRecord).join(Client).filter(
        Attachment.id == attachment_id,
        Client.user_id == account.user.id
    ).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    actual_path = os.path.join(MEDICAL_FILES_DIR, os.path.basename(attachment.file_path))
    if os.path.exists(actual_path):
        os.remove(actual_path)

    record = attachment.medical_record
    db.delete(attachment)
    db.commit()
    db.refresh(record)
    return decrypt_record(record)

@router.get("/attachments/{attachment_id}/file")
def get_decrypted_file(
    attachment_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account)
):
    """Retorna o arquivo descriptografado para visualização/download."""
    attachment = db.query(Attachment).join(MedicalRecord).join(Client).filter(
        Attachment.id == attachment_id,
        Client.user_id == account.user.id
    ).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")

    actual_path = os.path.join(MEDICAL_FILES_DIR, os.path.basename(attachment.file_path))
    if not os.path.exists(actual_path):
        raise HTTPException(status_code=404, detail="Arquivo físico não encontrado")

    with open(actual_path, "rb") as f:
        encrypted_content = f.read()
    
    try:
        decrypted_content = decrypt_bytes(encrypted_content)
        return Response(content=decrypted_content, media_type=attachment.file_type)
    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao descriptografar arquivo")

@router.post("/consent", response_model=ConsentFormResponse)
def create_consent_form(
    data: ConsentFormCreate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account)
):
    """Cria um termo de consentimento com conteúdo criptografado."""
    check_client_access(db, data.client_id, account)
    
    # Criptografar conteúdo do termo
    new_form = ConsentForm(
        client_id=data.client_id,
        appointment_id=data.appointment_id,
        title=data.title,
        content=encrypt_data(data.content).decode()
    )
    db.add(new_form)
    db.commit()
    db.refresh(new_form)
    # Descriptografar para retorno
    new_form.content = decrypt_data(new_form.content.encode())
    return new_form

@router.put("/consent/{form_id}/sign", response_model=ConsentFormResponse)
def sign_consent_form(
    form_id: int,
    signature_data: str,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account)
):
    """Salva a assinatura criptografada."""
    form = db.query(ConsentForm).join(Client).filter(
        ConsentForm.id == form_id,
        Client.user_id == account.user.id
    ).first()
    
    if not form:
        raise HTTPException(status_code=404, detail="Termo não encontrado")

    form.signature_data = encrypt_data(signature_data).decode()
    form.signed_at = __import__("datetime").datetime.now()
    db.commit()
    db.refresh(form)
    
    form.content = decrypt_data(form.content.encode())
    form.signature_data = decrypt_data(form.signature_data.encode())
    return form
