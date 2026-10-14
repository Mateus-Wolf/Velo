import json
from datetime import time
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app.models import Appointment
from app.routers import gemini
from app.services import gemini_service
from conftest import headers


@pytest.mark.parametrize("end_time", [None, "10:15"])
def test_chat_schedules_with_default_or_explicit_end_time(client, db, seed, monkeypatch, end_time):
    client.app.include_router(gemini.router, prefix="/api/v1")
    data = {
        "client_name": seed["patient"].name,
        "workplace_name": seed["wp"].name,
        "date": seed["day"].isoformat(),
        "start_time": "09:15",
        "end_time": end_time,
    }
    generate = Mock(return_value=SimpleNamespace(text=json.dumps({
        "intent": "AGENDAR_CONSULTA", "data": data,
    })))
    monkeypatch.setattr(gemini_service, "gemini_client", SimpleNamespace(
        models=SimpleNamespace(generate_content=generate),
    ))

    response = client.post("/api/v1/gemini/chat", headers=headers(seed), json={
        "message": "Agende uma consulta para o cliente às 09:15.",
    })

    assert response.status_code == 200, response.text
    assert "Consulta agendada com sucesso" in response.json()["reply"]
    created = db.query(Appointment).one()
    assert created.date == seed["day"]
    assert created.start_time == time(9, 15)
    assert created.end_time == time(10, 15)


@pytest.fixture
def assistant(monkeypatch):
    generate = Mock()
    monkeypatch.setattr(gemini_service, "gemini_client", SimpleNamespace(models=SimpleNamespace(generate_content=generate)))
    def respond(intent="AGENDAR_CONSULTA", **data):
        generate.return_value = SimpleNamespace(text=json.dumps({"intent": intent, "data": data}))
        return generate
    return respond


def schedule_data(seed, **changes):
    return dict(client_name=seed["patient"].name, workplace_name=seed["wp"].name,
                date=seed["day"].isoformat(), start_time="09:15", end_time="10:15", **changes)


def test_history_reaches_gemini_and_short_reply_completes_request(client, db, seed, assistant):
    client.app.include_router(gemini.router, prefix="/api/v1")
    generate = assistant(**schedule_data(seed))
    history = [{"role": "user", "text": "Agende Patient no dia " + seed["day"].isoformat() + " às 09:15 até 10:15"},
               {"role": "assistant", "text": "Qual local devo usar? Allowed; Forbidden"}]
    response = client.post("/api/v1/gemini/chat", headers=headers(seed), json={"message": "Allowed", "history": history})
    assert "sucesso" in response.json()["reply"]
    contents = generate.call_args.kwargs["contents"]
    assert [c.role for c in contents] == ["user", "model", "user"]
    assert [c.parts[0].text for c in contents] == [h["text"] for h in history] + ["Allowed"]
    assert generate.call_args.kwargs["config"].response_mime_type == "application/json"
    assert db.query(Appointment).count() == 1


def test_names_ignore_accents_case_and_spacing(db, seed, assistant):
    seed["wp"].name = "Hospital Baía Sul"
    seed["patient"].name = "André Luís Silveira"
    db.commit()
    data = schedule_data(seed)
    data.update(client_name="andre luis silveira", workplace_name="hospital baia sul")
    assistant(**data)
    reply = gemini_service.process_user_message(db, seed["owner"], "Agende")
    assert "sucesso" in reply
    assert db.query(Appointment).one().workplace_id == seed["wp"].id


@pytest.mark.parametrize("field,value,expected", [
    ("client_name", "Foreign", "Não encontrei"),
    ("client_name", "Unlinked", "não está vinculado"),
    ("workplace_name", None, "Qual local"),
    ("workplace_name", "Foreign", "Qual local"),
    ("date", "2026-02-30", "Confira a data"),
    ("start_time", "25:00", "Confira a data"),
    ("end_time", "08:00", "Confira a data"),
])
def test_invalid_or_foreign_data_never_creates(db, seed, assistant, field, value, expected):
    data = schedule_data(seed)
    data[field] = value
    assistant(**data)
    reply = gemini_service.process_user_message(db, seed["owner"], "Agende")
    assert expected in reply
    assert db.query(Appointment).count() == 0


def test_ambiguous_names_do_not_select_first(db, seed, assistant):
    seed["patient"].name = "André Silva"
    seed["unlinked"].name = "André Santos"
    db.commit()
    data = schedule_data(seed)
    data["client_name"] = "andre"
    assistant(**data)
    reply = gemini_service.process_user_message(db, seed["owner"], "Agende")
    assert "André Silva" in reply and "André Santos" in reply
    assert db.query(Appointment).count() == 0


def test_closed_day_explains_and_offers_valid_alternatives(db, seed, assistant):
    day = seed["day"]
    seed["wp"].work_days = str((day.isoweekday() + 1) % 7)
    db.commit()
    assistant(**schedule_data(seed))
    reply = gemini_service.process_user_message(db, seed["owner"], "Agende")
    assert day.strftime("%d/%m/%Y") in reply
    assert "não funciona" in reply
    assert "Alternativas disponíveis" in reply
    assert (day + gemini_service.timedelta(days=1)).strftime("%d/%m/%Y") in reply
    assert db.query(Appointment).count() == 0


def test_conflict_alternatives_do_not_write(db, seed, assistant):
    from conftest import appointment
    appointment(db, seed)
    assistant(**schedule_data(seed))
    reply = gemini_service.process_user_message(db, seed["owner"], "Agende")
    assert "Conflito" in reply and "Alternativas" in reply
    assert db.query(Appointment).count() == 1


@pytest.mark.parametrize("raw", ['[]', '{"intent":"AGENDAR_CONSULTA","data":null}', 'invalid', '{"intent":"DELETE"}'])
def test_bad_model_response_is_safe(db, seed, assistant, raw):
    generate = assistant()
    generate.return_value = SimpleNamespace(text=raw)
    assert "segurança" in gemini_service.process_user_message(db, seed["owner"], "Agende")
    assert db.query(Appointment).count() == 0


def test_lookup_invalid_date_does_not_broaden_search(db, seed, assistant):
    assistant("BUSCAR_CONSULTAS", date="invalid")
    assert "inválida" in gemini_service.process_user_message(db, seed["owner"], "Busque")


def test_cpf_lookup_is_explained_without_using_nonexistent_field(db, seed, assistant):
    assistant("BUSCAR_CONSULTAS", cpf="12345678900")
    assert "CPF não está disponível" in gemini_service.process_user_message(db, seed["owner"], "Busque")


def test_local_lookup_uses_real_schedule(db, seed, assistant):
    assistant("CONSULTAR_LOCAL", workplace_name="allowed")
    reply = gemini_service.process_user_message(db, seed["owner"], "Qual expediente?")
    assert "Allowed" in reply and "23:59" in reply
    assert db.query(Appointment).count() == 0


def test_date_without_year_is_next_occurrence():
    from datetime import date
    assert gemini_service._resolve_date("31/10", date(2026, 10, 14)) == date(2026, 10, 31)
    assert gemini_service._resolve_date("01/01", date(2026, 10, 14)) == date(2027, 1, 1)
    assert gemini_service._resolve_date("29/02", date(2026, 10, 14)) == date(2028, 2, 29)
    assert gemini_service._resolve_date("31/10/2025", date(2026, 10, 14)) == date(2025, 10, 31)


def test_api_rejects_unbounded_or_invalid_history(client, seed):
    client.app.include_router(gemini.router, prefix="/api/v1")
    for payload in ({"message": " "}, {"message": "x", "history": [{"role": "system", "text": "x"}]},
                    {"message": "x", "history": [{"role": "user", "text": "x"}] * 21}):
        assert client.post("/api/v1/gemini/chat", headers=headers(seed), json=payload).status_code == 422


@pytest.mark.parametrize("resource", ["patient", "wp"])
def test_inactive_resources_are_not_selected(db, seed, assistant, resource):
    seed[resource].is_active = False
    db.commit()
    assistant(**schedule_data(seed))
    assert "sucesso" not in gemini_service.process_user_message(db, seed["owner"], "Agende")
    assert db.query(Appointment).count() == 0


def test_search_is_scoped_to_owner_and_reports_status(db, seed, assistant):
    from conftest import appointment
    appointment(db, seed, status="confirmed")
    appointment(db, seed, user_id=seed["other"].id, client_id=seed["foreign_client"].id, workplace_id=seed["foreign_wp"].id)
    generate = assistant("BUSCAR_CONSULTAS", date=seed["day"].isoformat())
    reply = gemini_service.process_user_message(db, seed["owner"], "Busque as consultas")
    assert "Patient" in reply and "confirmada" in reply and "Foreign" not in reply
    assert generate.call_count == 1


def test_explicit_user_year_overrides_model_inference(db, seed, assistant):
    assistant(**schedule_data(seed))
    reply = gemini_service.process_user_message(db, seed["owner"], "Agende em 31/10/2020")
    assert "31/10/2020" in reply and "passado" in reply
    assert db.query(Appointment).count() == 0


def test_provider_failure_does_not_expose_details(db, seed, assistant):
    generate = assistant()
    generate.side_effect = RuntimeError("private-provider-error")
    reply = gemini_service.process_user_message(db, seed["owner"], "Agende")
    assert "indisponível" in reply and "private-provider-error" not in reply
    assert db.query(Appointment).count() == 0


def test_staff_cannot_access_assistant(client, seed, assistant):
    client.app.include_router(gemini.router, prefix="/api/v1")
    generate = assistant()
    response = client.post("/api/v1/gemini/chat", headers=headers(seed, staff=True), json={"message": "Agende"})
    assert response.status_code == 403
    generate.assert_not_called()
