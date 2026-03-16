import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine

SQL = """
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'buffer_time'
    ) THEN
        ALTER TABLE users DROP COLUMN buffer_time;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workplaces' AND column_name = 'buffer_time'
    ) THEN
        ALTER TABLE workplaces ADD COLUMN buffer_time INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;
"""

if __name__ == "__main__":
    with engine.connect() as conn:
        conn.execute(__import__("sqlalchemy").text(SQL))
        conn.commit()
    print("Migration move_buffer_time concluida com sucesso!")
