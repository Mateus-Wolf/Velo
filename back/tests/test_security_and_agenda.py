from datetime import date, datetime, time, timedelta

import pytest
from app.auth.security import create_access_token, create_refresh_token, create_appointment_token
from app.models import Appointment, MedicalRecord, Attachment, ConsentForm
from app.services.security import encrypt_data
from app.services.appointment_service import generate_recurrence_dates
from conftest import headers, payload, appointment


@pytest.mark.parametrize("kind", ["2fa_login", "reset", "refresh", "appointment"])
def test_special_tokens_cannot_authenticate(client, seed, kind):
    token = create_access_token({"sub": str(seed["owner"].id), "type": kind})
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert client.post('/api/v1/auth/2fa/generate-activation', headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_two_factor_verification_still_issues_access_token(client, db, seed):
    seed['owner'].two_factor_code = '123456'
    seed['owner'].two_factor_expires_at = datetime.now()+timedelta(minutes=10)
    db.commit()
    token=create_access_token({'sub':str(seed['owner'].id),'type':'2fa_login'})
    response=client.post('/api/v1/auth/2fa/verify-login',json={'temp_token':token,'code':'123456','device_id':''})
    assert response.status_code == 200,response.text
    assert client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+response.json()['access_token']}).status_code==200


def test_password_reset_accepts_only_reset_token(client, seed, monkeypatch):
    from app.routers import auth
    monkeypatch.setattr(auth,'hash_password',lambda password:'test-hash')
    for kind,expected in [('access',400),('reset',200)]:
        token=create_access_token({'sub':str(seed['owner'].id),'type':kind})
        response=client.post('/api/v1/auth/reset-password',json={'reset_token':token,'new_password':'new-password'})
        assert response.status_code==expected,response.text


def test_refresh_still_works(client, seed):
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": create_refresh_token({"sub": str(seed['owner'].id)})})
    assert response.status_code == 200
    assert client.get('/api/v1/auth/me', headers={"Authorization": 'Bearer '+response.json()['access_token']}).status_code == 200


def test_staff_must_belong_to_token_admin(client, seed):
    token = create_access_token({"sub": str(seed['other'].id), "admin_id": str(seed['other'].id),
                                 "staff_id": str(seed['staff'].id), "role": "staff"})
    assert client.get('/api/v1/auth/me', headers={"Authorization": 'Bearer '+token}).status_code == 401


@pytest.fixture
def clinical(db, seed, tmp_path):
    appt = appointment(db, seed)
    record = MedicalRecord(client_id=seed['patient'].id, appointment_id=appt.id, type='evolution', content=encrypt_data('private').decode())
    form = ConsentForm(client_id=seed['patient'].id, appointment_id=appt.id, title='Consent', content=encrypt_data('consent').decode())
    db.add_all([record, form])
    db.flush()
    att = Attachment(medical_record_id=record.id, file_path='static/medical_records/test.pdf.enc', file_type='application/pdf')
    db.add(att)
    db.commit()
    (tmp_path / 'test.pdf.enc').write_bytes(encrypt_data(b'private-file'))
    return record, att, form, appt


@pytest.mark.parametrize('operation', ['list', 'create', 'delete', 'upload', 'rename', 'remove', 'download', 'consent', 'sign', 'check'])
@pytest.mark.parametrize('restriction', ['permission', 'workplace'])
def test_clinical_access_enforced(client, db, seed, clinical, operation, restriction):
    record, att, form, appt = clinical
    if restriction == 'permission':
        seed['staff'].can_access_documents = False
    else:
        appt.workplace_id = seed['hidden'].id
        # The patient is shared; appointment-specific documents must remain isolated.
    db.commit()
    base='/api/v1/medical-records'
    h=headers(seed, staff=True)
    actions={
        'list': lambda: client.get(f'{base}/client/{seed["patient"].id}', headers=h),
        'create': lambda: client.post(base+'/', headers=h, json=dict(client_id=seed['patient'].id, appointment_id=appt.id, type='evolution', content='x')),
        'delete': lambda: client.delete(f'{base}/{record.id}', headers=h),
        'upload': lambda: client.post(f'{base}/{record.id}/attachments', headers=h, data={'label':'test'}, files={'file':('test.pdf',b'test','application/pdf')}),
        'rename': lambda: client.put(f'{base}/attachments/{att.id}', headers=h, json={'label':'changed'}),
        'remove': lambda: client.delete(f'{base}/attachments/{att.id}', headers=h),
        'download': lambda: client.get(f'{base}/attachments/{att.id}/file', headers=h),
        'consent': lambda: client.post(base+'/consent', headers=h, json=dict(client_id=seed['patient'].id, appointment_id=appt.id, title='x', content='x')),
        'sign': lambda: client.put(f'{base}/consent/{form.id}/sign', headers=h, params={'signature_data':'x'}),
        'check': lambda: client.get(base+'/check-clinical-data', headers=h),
    }
    response=actions[operation]()
    if restriction == 'workplace' and operation in ('list', 'check'):
        assert response.status_code == 200
        if operation == 'list':
            assert response.json() == []
        else:
            assert response.json() == {'has_clinical_data': False}
    else:
        assert response.status_code == 403, response.text


def test_authorized_clinical_read_keeps_database_encrypted(client, db, seed, clinical):
    record, att, _, _ = clinical
    response=client.get(f'/api/v1/medical-records/client/{seed["patient"].id}', headers=headers(seed, True))
    assert response.json()[0]['content']=='private'
    db.commit()
    db.refresh(record)
    assert record.content != 'private'
    assert client.get(f'/api/v1/medical-records/attachments/{att.id}/file', headers=headers(seed,True)).content==b'private-file'


@pytest.mark.parametrize('change', ['foreign_wp','foreign_client','unlinked'])
def test_create_checks_ownership_and_link(client, seed, change):
    override = {'workplace_id':seed[change].id} if change=='foreign_wp' else {'client_id':seed[change].id}
    response=client.post('/api/v1/appointments/', headers=headers(seed), json=payload(seed,**override))
    assert response.status_code in (400,404)


@pytest.mark.parametrize('operation', ['edit','cancel','complete','resolve'])
def test_staff_cannot_mutate_other_workplace(client, db, seed, operation):
    appt=appointment(db,seed,workplace_id=seed['hidden'].id, status='pending' if operation=='resolve' else 'scheduled')
    path=f'/api/v1/appointments/{appt.id}'
    if operation=='edit':
        response=client.put(path,headers=headers(seed,True),json={'price':100})
    else:
        response=client.patch(path+'/'+operation,headers=headers(seed,True),json={'new_status':'completed'} if operation=='resolve' else {})
    assert response.status_code==403


def test_staff_cannot_move_to_forbidden_workplace(client, db, seed):
    appt=appointment(db,seed)
    response=client.put(f'/api/v1/appointments/{appt.id}',headers=headers(seed,True),json={'workplace_id':seed['hidden'].id})
    assert response.status_code==403


def test_zero_buffer_still_blocks_cross_workplace_overlap(client, db, seed):
    appointment(db,seed,workplace_id=seed['hidden'].id)
    response=client.post('/api/v1/appointments/',headers=headers(seed),json=payload(seed))
    assert response.status_code==409
    response=client.post('/api/v1/appointments/',headers=headers(seed),json=payload(seed,start_time='10:00',end_time='11:00'))
    assert response.status_code==201


def test_buffer_from_other_workplace_crossing_midnight(client,db,seed):
    seed['hidden'].buffer_time=30
    appointment(db,seed,workplace_id=seed['hidden'].id,date=seed['day']-timedelta(days=1), start_time=time(23),end_time=time(23,50))
    response=client.post('/api/v1/appointments/',headers=headers(seed),json=payload(seed,start_time='00:10',end_time='00:40'))
    assert response.status_code==409


@pytest.mark.parametrize('status',['completed','no_show','canceled_user','canceled_client','pending'])
@pytest.mark.parametrize('action',['confirm','cancel'])
def test_public_links_cannot_change_closed_or_pending_appointments(client,db,seed,status,action):
    appt=appointment(db,seed,status=status)
    token=create_appointment_token(appt.id,action,appt.confirmation_token_version)
    response=client.post('/api/v1/public/appointments/'+action,params={'token':token})
    assert response.status_code==400
    db.refresh(appt)
    assert appt.status==status


@pytest.mark.parametrize('action',['complete','cancel','resolve','reschedule'])
def test_old_links_are_invalidated(client,db,seed,action):
    appt=appointment(db,seed,status='pending' if action=='resolve' else 'scheduled')
    old=appt.confirmation_token_version
    token=create_appointment_token(appt.id,'cancel',old)
    path=f'/api/v1/appointments/{appt.id}'
    if action=='reschedule':
        response=client.put(path,headers=headers(seed),json={'start_time':'10:00','end_time':'11:00'})
    else:
        response=client.patch(path+'/'+action,headers=headers(seed),json={'new_status':'completed'} if action=='resolve' else {})
    assert response.status_code==200,response.text
    assert response.json()['status'] in ('scheduled','completed','canceled_user')
    db.refresh(appt)
    assert appt.confirmation_token_version==old+1
    assert client.post('/api/v1/public/appointments/cancel',params={'token':token}).status_code==400


def test_pending_count_updates_expired_and_scopes_staff(client,db,seed):
    appointment(db,seed,date=date.today()-timedelta(days=1))
    appointment(db,seed,workplace_id=seed['hidden'].id,status='pending')
    response=client.get('/api/v1/appointments/pending-count',headers=headers(seed,True))
    assert response.status_code==200
    assert response.json()=={'count':1}


def test_recurrence_returns_created_and_skipped_dates(client,db,seed):
    appointment(db,seed)
    response=client.post('/api/v1/appointments/?include_summary=true',headers=headers(seed),json=payload(seed,
        is_recurring=True,recurrence_type='weekly',recurrence_value=str(seed['day'].isoweekday())))
    assert response.status_code==201,response.text
    body=response.json()
    assert len(body['appointments'])==8
    assert body['skipped'][0]['date']==seed['day'].isoformat()
    assert 'Conflito' in body['skipped'][0]['reason']


def test_all_dates_refused_are_reported(client,db,seed):
    seed['wp'].start_time=time(12)
    db.commit()
    response=client.post('/api/v1/appointments/?include_summary=true',headers=headers(seed),json=payload(seed,
        is_recurring=True,recurrence_type='weekly',recurrence_value=str(seed['day'].isoweekday())))
    assert response.status_code==201
    assert response.json()['appointments']==[]
    assert len(response.json()['skipped'])==9


@pytest.mark.parametrize('day',['-1','8','bad',None])
def test_invalid_recurrence_is_rejected(client,seed,day):
    response=client.post('/api/v1/appointments/',headers=headers(seed),json=payload(seed,
        is_recurring=True,recurrence_type='weekly',recurrence_value=day))
    assert response.status_code==422


def test_sunday_zero_and_seven_are_equivalent():
    assert generate_recurrence_dates(date(2030,1,1),60,'weekly',0)==generate_recurrence_dates(date(2030,1,1),60,'weekly',7)


def test_public_confirmation_then_cancellation_still_works(client, db, seed):
    appt=appointment(db,seed)
    for action in ('confirm','cancel'):
        token=create_appointment_token(appt.id,action,1)
        assert client.post('/api/v1/public/appointments/'+action,params={'token':token}).status_code==200


def test_staff_cannot_cancel_recurrence_with_forbidden_locations(client,db,seed):
    appt=appointment(db,seed,recurrence_id='shared')
    appointment(db,seed,recurrence_id='shared',workplace_id=seed['hidden'].id,date=seed['day']+timedelta(days=7))
    response=client.patch(f'/api/v1/appointments/{appt.id}/cancel?cancel_all_future=true',headers=headers(seed,True))
    assert response.status_code==403
    db.refresh(appt)
    assert appt.status=='scheduled'


def test_edit_checks_client_ownership(client,db,seed):
    appt=appointment(db,seed)
    response=client.put(f'/api/v1/appointments/{appt.id}',headers=headers(seed),json={'client_id':seed['foreign_client'].id})
    assert response.status_code==404


@pytest.mark.parametrize('start,end,expected', [('10:00','11:00',201),('12:00','12:30',400),('11:30','12:30',400),('13:00','14:00',201),('10:00','09:00',422)])
def test_workplace_break_and_interval_validation(client,db,seed,start,end,expected):
    seed['wp'].break_start_time=time(12)
    seed['wp'].break_end_time=time(13)
    db.commit()
    response=client.post('/api/v1/appointments/',headers=headers(seed),json=payload(seed,start_time=start,end_time=end))
    assert response.status_code==expected,response.text
