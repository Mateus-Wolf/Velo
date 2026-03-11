"""
Migration: Adiciona campos de pagamento na tabela appointments e cria tabela reviews.

Executar com: python migration_add_payment_and_reviews.py
"""

from sqlalchemy import text
from app.database import engine


def migrate():
    with engine.connect() as conn:
        # ---- 1. Adicionar paid_value na tabela appointments ----
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'paid_value'
        """))
        if result.fetchone():
            print("Coluna 'paid_value' ja existe na tabela appointments")
        else:
            conn.execute(text("""
                ALTER TABLE appointments 
                ADD COLUMN paid_value NUMERIC(10, 2) NULL
            """))
            print("Coluna 'paid_value' adicionada com sucesso")

        # ---- 2. Adicionar payment_method na tabela appointments ----
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'payment_method'
        """))
        if result.fetchone():
            print("Coluna 'payment_method' ja existe na tabela appointments")
        else:
            conn.execute(text("""
                ALTER TABLE appointments 
                ADD COLUMN payment_method VARCHAR(20) NULL
            """))
            print("Coluna 'payment_method' adicionada com sucesso")

        # ---- 3. Criar tabela reviews ----
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'reviews'
        """))
        if result.fetchone():
            print("Tabela 'reviews' ja existe")
        else:
            conn.execute(text("""
                CREATE TABLE reviews (
                    id SERIAL PRIMARY KEY,
                    appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id),
                    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                    comment TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE INDEX ix_reviews_appointment_id ON reviews(appointment_id)
            """))
            print("Tabela 'reviews' criada com sucesso")

        conn.commit()
        print("\nMigration concluida!")


if __name__ == "__main__":
    migrate()
