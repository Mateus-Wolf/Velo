import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import time, date, timedelta
from app.database import SessionLocal
from app.models.user import User
from app.models.workplace import Workplace
from app.services.appointment_service import _validate_appointment

db = SessionLocal()

user = db.query(User).first()
if not user:
    print("Nenhum usuario no banco, impossivel testar.")
    exit(0)

wp = Workplace(
    user_id=user.id,
    name="Test WP Intervalo",
    work_days="1,2,3,4,5,6,0",
    start_time=time(8, 0),
    end_time=time(18, 0),
    break_start_time=time(12, 0),
    break_end_time=time(13, 0),
    is_active=True
)
db.add(wp)
db.commit()
db.refresh(wp)

test_date = date.today() + timedelta(days=1)

try:
    # Test 1
    data1 = {"workplace_id": wp.id, "date": test_date, "start_time": time(10, 0), "end_time": time(11, 0)}
    _validate_appointment(db, user.id, data1)
    print("Test 1 PASS: 10:00 - 11:00 is valid")

    # Test 2
    try:
        data2 = {"workplace_id": wp.id, "date": test_date, "start_time": time(12, 0), "end_time": time(12, 30)}
        _validate_appointment(db, user.id, data2)
        print("Test 2 FAIL: 12:00 - 12:30 allowed but shouldn't be")
    except Exception as e:
        print(f"Test 2 PASS: {getattr(e, 'detail', str(e))}")

    # Test 3
    try:
        data3 = {"workplace_id": wp.id, "date": test_date, "start_time": time(11, 30), "end_time": time(12, 30)}
        _validate_appointment(db, user.id, data3)
        print("Test 3 FAIL: 11:30 - 12:30 allowed but shouldn't be")
    except Exception as e:
        print(f"Test 3 PASS: {getattr(e, 'detail', str(e))}")
        
    # Test 4
    try:
        data4 = {"workplace_id": wp.id, "date": test_date, "start_time": time(19, 0), "end_time": time(20, 0)}
        _validate_appointment(db, user.id, data4)
        print("Test 4 FAIL: 19:00 - 20:00 allowed but shouldn't be")
    except Exception as e:
        print(f"Test 4 PASS: {getattr(e, 'detail', str(e))}")

    # Test 5
    data5 = {"workplace_id": wp.id, "date": test_date, "start_time": time(13, 0), "end_time": time(14, 0)}
    _validate_appointment(db, user.id, data5)
    print("Test 5 PASS: 13:00 - 14:00 is valid")
    
finally:
    db.delete(wp)
    db.commit()
    db.close()
