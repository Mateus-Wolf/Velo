import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql://postgres:1234@localhost:5432/Schedly"
engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE workplaces ADD COLUMN works_on_holidays BOOLEAN NOT NULL DEFAULT FALSE;"))
            conn.commit()
            print("Migração bem sucedida!")
        except Exception as e:
            print(f"Erro na migração: {e}")

if __name__ == "__main__":
    run_migration()
