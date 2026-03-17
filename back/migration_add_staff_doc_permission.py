"""
Migration: Adicionar coluna can_access_documents na tabela staff_members.
Executar: python migration_add_staff_doc_permission.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from sqlalchemy import text

def run():
    print("Iniciando migração: Adicionar can_access_documents...")
    with engine.connect() as conn:
        try:
            # Adicionar a coluna can_access_documents
            conn.execute(
                text("""
                    ALTER TABLE staff_members 
                    ADD COLUMN IF NOT EXISTS can_access_documents BOOLEAN NOT NULL DEFAULT FALSE;
                """)
            )
            print("[OK] Coluna can_access_documents adicionada/verificada.")
            
            conn.commit()
            print("[DONE] Migração concluída com sucesso!")
        except Exception as e:
            print(f"[ERRO] Falha na migração: {e}")
            sys.exit(1)

if __name__ == "__main__":
    run()
