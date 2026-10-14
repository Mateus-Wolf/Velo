"""Confere todos os dados antes de rotacionar; nenhuma escrita sem --apply."""
import argparse
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models import MedicalRecord, ConsentForm, Attachment
from app.services.security import get_cipher


def rotate(db, files_dir: Path, apply: bool = False):
    cipher = get_cipher()
    fields = []
    for record in db.query(MedicalRecord).all():
        fields.append((record, "content"))
    for form in db.query(ConsentForm).all():
        fields.append((form, "content"))
        if form.signature_data:
            fields.append((form, "signature_data"))
    files = sorted({files_dir / Path(att.file_path).name for att in db.query(Attachment).all()})

    # Preflight completo: chave incorreta, texto não criptografado ou arquivo ausente aborta sem escrita.
    for record, field in fields:
        cipher.decrypt(getattr(record, field).encode())
    for path in files:
        cipher.decrypt(path.read_bytes())
    if apply:
        for path in files:
            rotated = cipher.rotate(path.read_bytes())
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(dir=files_dir, delete=False) as handle:
                    temporary = Path(handle.name)
                    handle.write(rotated)
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(temporary, path)
            finally:
                if temporary and temporary.exists():
                    temporary.unlink()
        for record, field in fields:
            setattr(record, field, cipher.rotate(getattr(record, field).encode()).decode())
        db.commit()
    return {"encrypted_fields": len(fields), "files": len(files), "applied": apply}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Rotacionar após backup e com a API parada")
    args = parser.parse_args()
    with SessionLocal() as db:
        print(rotate(db, Path(__file__).resolve().parents[1] / "static" / "medical_records", args.apply))
