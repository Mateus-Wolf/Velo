"""
Migration: Adiciona coluna is_read na tabela notification_logs.

Executar com: python migration_add_is_read.py
"""

from sqlalchemy import text
from app.database import engine


def migrate():
    with engine.connect() as conn:
        # Verificar se a coluna já existe
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'notification_logs' AND column_name = 'is_read'
        """))
        
        if result.fetchone():
            print("Coluna 'is_read' ja existe na tabela notification_logs")
            return

        # Adicionar coluna
        conn.execute(text("""
            ALTER TABLE notification_logs 
            ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE
        """))
        conn.commit()
        print("Coluna 'is_read' adicionada com sucesso a tabela notification_logs")


if __name__ == "__main__":
    migrate()
