from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        # Verificar se a coluna já existe
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'multiple_workplaces'
        """))
        
        if result.fetchone():
            print("Coluna 'multiple_workplaces' ja existe na tabela users")
            return

        # Adicionar coluna
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN multiple_workplaces BOOLEAN DEFAULT FALSE
        """))
        conn.commit()
        print("Coluna 'multiple_workplaces' adicionada com sucesso a tabela users")

if __name__ == "__main__":
    migrate()
