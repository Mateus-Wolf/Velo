import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql://postgres:1234@localhost:5432/Schedly"
engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.connect() as conn:
        try:
            # 1. Adicionar coluna rescheduled (boolean)
            conn.execute(text("""
                ALTER TABLE appointments 
                ADD COLUMN IF NOT EXISTS rescheduled BOOLEAN NOT NULL DEFAULT FALSE;
            """))
            
            # 2. Aumentar tamanho da coluna status para comportar novos valores
            conn.execute(text("""
                ALTER TABLE appointments 
                ALTER COLUMN status TYPE VARCHAR(30);
            """))
            
            # 3. Migrar status 'canceled' antigo para 'canceled_user'
            conn.execute(text("""
                UPDATE appointments 
                SET status = 'canceled_user' 
                WHERE status = 'canceled';
            """))
            
            # 4. Migrar status 'rescheduled' antigo para 'scheduled' + flag rescheduled=true
            conn.execute(text("""
                UPDATE appointments 
                SET status = 'scheduled', rescheduled = TRUE 
                WHERE status = 'rescheduled';
            """))
            
            conn.commit()
            print("Migração de status concluída com sucesso!")
            print("  - Coluna 'rescheduled' adicionada")
            print("  - Status 'canceled' migrado para 'canceled_user'")
            print("  - Status 'rescheduled' migrado para 'scheduled' + rescheduled=true")
        except Exception as e:
            print(f"Erro na migração: {e}")

if __name__ == "__main__":
    run_migration()
