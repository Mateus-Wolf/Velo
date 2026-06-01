import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql://postgres:1234@localhost:5432/Velo"
engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.connect() as conn:
        try:
            # 1. Índices compostos na tabela appointments
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_appointments_user_status 
                ON appointments (user_id, status);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_appointments_user_date 
                ON appointments (user_id, date);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_appointments_workplace_date_status 
                ON appointments (workplace_id, date, status);
            """))
            # Índice simples na coluna status
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_appointments_status 
                ON appointments (status);
            """))

            # 2. Índice composto na tabela notification_logs
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_notif_log_appt_read 
                ON notification_logs (appointment_id, is_read);
            """))

            conn.commit()
            print("[OK] Migracao de indices concluida com sucesso!")
            print("  - ix_appointments_user_status")
            print("  - ix_appointments_user_date")
            print("  - ix_appointments_workplace_date_status")
            print("  - ix_appointments_status")
            print("  - ix_notif_log_appt_read")
        except Exception as e:
            print(f"[ERRO] Erro na migracao: {e}")

if __name__ == "__main__":
    run_migration()
