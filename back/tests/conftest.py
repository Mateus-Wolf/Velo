import os
from datetime import date, time, timedelta

from cryptography.fernet import Fernet

# Never read or connect to the installation's database during regression tests.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "isolated-test-signing-key"
os.environ["MEDICAL_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
os.environ["MEDICAL_PREVIOUS_ENCRYPTION_KEYS"] = ""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import User, Workplace, Client, WorkplaceClient, StaffMember, StaffWorkplaceAccess, Appointment
from app.auth.security import create_access_token
from app.routers import auth, appointments, medical_records, public_appointments


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine, autoflush=False) as session:
        yield session
    engine.dispose()


@pytest.fixture
def seed(db):
    owner = User(name="Owner", email="owner@example.com", password_hash="unused")
    other = User(name="Other", email="other@example.com", password_hash="unused")
    db.add_all([owner, other])
    db.flush()
    workplaces = [Workplace(user_id=user.id, name=name, work_days="0,1,2,3,4,5,6",
                            start_time=time(0), end_time=time(23, 59), works_on_holidays=True)
                  for user, name in [(owner, "Allowed"), (owner, "Forbidden"), (other, "Foreign")]]
    clients = [Client(user_id=user.id, name=name) for user, name in [(owner, "Patient"), (owner, "Unlinked"), (other, "Foreign")]]
    db.add_all(workplaces + clients)
    db.flush()
    db.add_all([WorkplaceClient(client_id=clients[0].id, workplace_id=w.id) for w in workplaces[:2]])
    staff = StaffMember(admin_user_id=owner.id, name="Staff", email="staff@example.com", password_hash="unused",
                        can_access_documents=True, can_change_status=True)
    db.add(staff)
    db.flush()
    db.add(StaffWorkplaceAccess(staff_member_id=staff.id, workplace_id=workplaces[0].id))
    db.commit()
    return dict(owner=owner, other=other, wp=workplaces[0], hidden=workplaces[1], foreign_wp=workplaces[2],
                patient=clients[0], unlinked=clients[1], foreign_client=clients[2], staff=staff,
                day=date.today()+timedelta(days=14))


@pytest.fixture
def client(db, tmp_path, monkeypatch):
    app = FastAPI()
    for router in (auth.router, appointments.router, medical_records.router, public_appointments.router):
        app.include_router(router, prefix="/api/v1")
    def override_db():
        try:
            yield db
        except Exception:
            db.rollback()
            raise
    app.dependency_overrides[get_db] = override_db
    monkeypatch.setattr(medical_records, "MEDICAL_FILES_DIR", str(tmp_path))
    monkeypatch.setattr(appointments, "_notify_admin_appointment", lambda *args: None)
    monkeypatch.setattr(auth, "send_email", lambda *args, **kwargs: None)
    with TestClient(app) as test_client:
        yield test_client


def headers(seed, staff=False):
    data = {"sub": str(seed["owner"].id)}
    if staff:
        data.update(role="staff", staff_id=str(seed["staff"].id), admin_id=str(seed["owner"].id))
    return {"Authorization": "Bearer " + create_access_token(data)}


def payload(seed, **changes):
    result = dict(workplace_id=seed["wp"].id, client_id=seed["patient"].id,
                  date=seed["day"].isoformat(), start_time="09:00", end_time="10:00")
    result.update(changes)
    return result


def appointment(db, seed, **changes):
    values = dict(user_id=seed["owner"].id, workplace_id=seed["wp"].id, client_id=seed["patient"].id,
                  date=seed["day"], start_time=time(9), end_time=time(10), status="scheduled")
    values.update(changes)
    result = Appointment(**values)
    db.add(result)
    db.commit()
    return result
