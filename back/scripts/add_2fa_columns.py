"""
Script temporário para atualizar o banco de dados e inserir colunas e tabelas do 2FA.
Recomendável usar em desenvolvimento e executar apenas uma vez.
"""
import sys
import os

# Adiciona o diretório `back` (pai da pasta scripts) ao PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, Base

# Importa todos os models para que o Base.metadata reconheça e crie a nova tabela
import app.models

def upgrade():
    with engine.connect() as conn:
        print("Adicionando coluna two_factor_enabled...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;"))
            print("  -> Sucesso!")
        except Exception as e:
            print(f"  -> Ignorado/Erro: Ocorreu erro ao tentar criar (talvez já exista): {e}")

        print("Adicionando coluna two_factor_code...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN two_factor_code VARCHAR(10);"))
            print("  -> Sucesso!")
        except Exception as e:
            print(f"  -> Ignorado/Erro: Ocorreu erro ao tentar criar (talvez já exista): {e}")

        print("Adicionando coluna two_factor_expires_at...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN two_factor_expires_at TIMESTAMP;"))
            print("  -> Sucesso!")
        except Exception as e:
            print(f"  -> Ignorado/Erro: Ocorreu erro ao tentar criar (talvez já exista): {e}")
        
        conn.commit()
    
    # Cria novas tabelas definidas nos models (como recognized_devices)
    print("\nCriando novas tabelas que não existam (ex: recognized_devices)...")
    Base.metadata.create_all(bind=engine)
    print("Concluído!")

if __name__ == "__main__":
    upgrade()
