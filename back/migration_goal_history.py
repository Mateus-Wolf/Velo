"""
Migração: Criar tabela goal_history para histórico de metas de faturamento.
Execute: python migration_goal_history.py
"""
from app.database import engine
import sqlalchemy as sa


def run():
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS goal_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    goal_value FLOAT NOT NULL,
                    achieved BOOLEAN NOT NULL DEFAULT FALSE,
                    revenue_at_close FLOAT NOT NULL DEFAULT 0.0,
                    month_ref VARCHAR(10) NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """))
            conn.execute(sa.text("""
                CREATE INDEX IF NOT EXISTS idx_goal_history_user_id ON goal_history(user_id);
            """))
            print("Migração concluída: tabela 'goal_history' criada com sucesso.")


if __name__ == "__main__":
    run()
