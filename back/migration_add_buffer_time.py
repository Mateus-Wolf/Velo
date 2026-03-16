"""
Migration: Adiciona coluna buffer_time à tabela users.
buffer_time = intervalo em minutos entre agendamentos (padrão: 0).
"""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine

SQL = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'buffer_time'
    ) THEN
        ALTER TABLE users ADD COLUMN buffer_time INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;
"""

if __name__ == "__main__":
    with engine.connect() as conn:
        conn.execute(__import__("sqlalchemy").text(SQL))
        conn.commit()
    print("Migration buffer_time concluída com sucesso!")
