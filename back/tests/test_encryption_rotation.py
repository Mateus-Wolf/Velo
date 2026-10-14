import pytest
from cryptography.fernet import Fernet, InvalidToken

from app.config import settings
from app.models import MedicalRecord, ConsentForm, Attachment
from app.services.security import encrypt_data, decrypt_bytes, get_cipher
from scripts.rotate_medical_encryption import rotate


def test_no_fallback_key(monkeypatch):
    monkeypatch.setattr(settings, 'MEDICAL_ENCRYPTION_KEY', '')
    with pytest.raises(RuntimeError, match='MEDICAL_ENCRYPTION_KEY'):
        get_cipher()


def test_invalid_key_is_rejected(monkeypatch):
    monkeypatch.setattr(settings, 'MEDICAL_ENCRYPTION_KEY', 'invalid')
    with pytest.raises(RuntimeError, match='inválida'):
        get_cipher()


@pytest.fixture
def legacy(db, seed, tmp_path, monkeypatch):
    old, new = Fernet.generate_key(), Fernet.generate_key()
    monkeypatch.setattr(settings, 'MEDICAL_ENCRYPTION_KEY', new.decode())
    monkeypatch.setattr(settings, 'MEDICAL_PREVIOUS_ENCRYPTION_KEYS', old.decode())
    record=MedicalRecord(client_id=seed['patient'].id,type='anamnesis',content=Fernet(old).encrypt(b'notes').decode())
    form=ConsentForm(client_id=seed['patient'].id,title='Consent',content=Fernet(old).encrypt(b'consent').decode(),signature_data=Fernet(old).encrypt(b'sign').decode())
    db.add_all([record,form])
    db.flush()
    db.add(Attachment(medical_record_id=record.id,file_path='static/medical_records/test.enc'))
    db.commit()
    path=tmp_path/'test.enc'
    path.write_bytes(Fernet(old).encrypt(b'file'))
    return record,form,path,new


def test_previous_keys_are_read_only(monkeypatch):
    old,new=Fernet.generate_key(),Fernet.generate_key()
    monkeypatch.setattr(settings,'MEDICAL_ENCRYPTION_KEY',new.decode())
    monkeypatch.setattr(settings,'MEDICAL_PREVIOUS_ENCRYPTION_KEYS',old.decode())
    assert decrypt_bytes(Fernet(old).encrypt(b'legacy'))==b'legacy'
    ciphertext=encrypt_data(b'new')
    assert Fernet(new).decrypt(ciphertext)==b'new'
    with pytest.raises(InvalidToken):
        Fernet(old).decrypt(ciphertext)


def test_rotation_dry_run_and_apply(db,legacy,tmp_path,monkeypatch):
    record,form,path,new=legacy
    original=(record.content,form.content,form.signature_data,path.read_bytes())
    assert rotate(db,tmp_path)=={'encrypted_fields':3,'files':1,'applied':False}
    assert original==(record.content,form.content,form.signature_data,path.read_bytes())
    rotate(db,tmp_path,apply=True)
    monkeypatch.setattr(settings,'MEDICAL_PREVIOUS_ENCRYPTION_KEYS','')
    assert decrypt_bytes(record.content.encode())==b'notes'
    assert decrypt_bytes(form.content.encode())==b'consent'
    assert decrypt_bytes(form.signature_data.encode())==b'sign'
    assert Fernet(new).decrypt(path.read_bytes())==b'file'
    rotate(db,tmp_path)  # Final verification works with only the new key.


def test_failed_preflight_does_not_modify_anything(db,legacy,tmp_path):
    record,form,path,_=legacy
    path.write_bytes(b'damaged')
    original=(record.content,form.content)
    with pytest.raises(InvalidToken):
        rotate(db,tmp_path,apply=True)
    assert original==(record.content,form.content)
    assert path.read_bytes()==b'damaged'
