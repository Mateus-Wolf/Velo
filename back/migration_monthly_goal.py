import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql://postgres:1234@localhost:5432/Schedly"
engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.connect() as conn:
        try:
            # Add monthly_goal column
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS monthly_goal FLOAT NOT NULL DEFAULT 0.0;
            """))
            conn.commit()
            print("Migração concluída: coluna 'monthly_goal' adicionada à tabela users.")
        except Exception as e:
            print(f"Erro na migração: {e}")

if __name__ == "__main__":
    run_migration()
