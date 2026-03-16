"""
Migration: Criar tabelas staff_members e staff_workplace_access para RBAC.
Executar: python migration_add_staff.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine


def run():
    with engine.connect() as conn:
        # Tabela staff_members
        conn.execute(
            __import__("sqlalchemy").text("""
                CREATE TABLE IF NOT EXISTS staff_members (
                    id SERIAL PRIMARY KEY,
                    admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    can_change_status BOOLEAN NOT NULL DEFAULT FALSE,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
        )
        print("[OK] Tabela staff_members criada/verificada.")

        # Índice no email
        conn.execute(
            __import__("sqlalchemy").text("""
                CREATE INDEX IF NOT EXISTS ix_staff_members_email ON staff_members (email);
            """)
        )

        # Índice no admin_user_id
        conn.execute(
            __import__("sqlalchemy").text("""
                CREATE INDEX IF NOT EXISTS ix_staff_members_admin_user_id ON staff_members (admin_user_id);
            """)
        )

        # Tabela de associação
        conn.execute(
            __import__("sqlalchemy").text("""
                CREATE TABLE IF NOT EXISTS staff_workplace_access (
                    staff_member_id INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
                    workplace_id INTEGER NOT NULL REFERENCES workplaces(id) ON DELETE CASCADE,
                    PRIMARY KEY (staff_member_id, workplace_id)
                );
            """)
        )
        print("[OK] Tabela staff_workplace_access criada/verificada.")

        conn.commit()
    print("[DONE] Migration RBAC concluida com sucesso!")


if __name__ == "__main__":
    run()
