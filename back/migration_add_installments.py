import os
import sys

# Adicionar o diretório raiz ao PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "")))

from sqlalchemy import text
from app.database import engine

def migrate():
    print("Iniciando migração: Adicionando coluna 'installments' na tabela 'appointments'")
    
    try:
        with engine.connect() as conn:
            # Verifica se a coluna já existe
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='appointments' AND column_name='installments'"))
            row = result.fetchone()
            
            if not row:
                print("Adicionando coluna 'installments'...")
                conn.execute(text("ALTER TABLE appointments ADD COLUMN installments INTEGER NULL"))
                print("Coluna 'installments' adicionada com sucesso.")
            else:
                print("A coluna 'installments' já existe na tabela.")

            conn.commit()
            print("Migração concluída com sucesso.")
            
    except Exception as e:
        print(f"Erro durante a migração: {e}")

if __name__ == "__main__":
    migrate()
