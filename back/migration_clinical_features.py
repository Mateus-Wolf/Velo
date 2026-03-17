import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine

SQL = """
DO $$
BEGIN
    -- Adicionar nicho ao usuário
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'niche'
    ) THEN
        ALTER TABLE users ADD COLUMN niche VARCHAR(50) NOT NULL DEFAULT 'general';
    END IF;

    -- Adicionar categoria ao cliente
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'category'
    ) THEN
        ALTER TABLE clients ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'client';
    END IF;

    -- Tabela medical_records
    CREATE TABLE IF NOT EXISTS medical_records (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
        type VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_medical_records_client_id ON medical_records(client_id);
    CREATE INDEX IF NOT EXISTS ix_medical_records_appointment_id ON medical_records(appointment_id);
    CREATE INDEX IF NOT EXISTS ix_medical_records_type ON medical_records(type);

    -- Tabela medical_attachments
    CREATE TABLE IF NOT EXISTS medical_attachments (
        id SERIAL PRIMARY KEY,
        medical_record_id INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        label VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_medical_attachments_medical_record_id ON medical_attachments(medical_record_id);

    -- Tabela consent_forms
    CREATE TABLE IF NOT EXISTS consent_forms (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        signature_data TEXT,
        signed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_consent_forms_client_id ON consent_forms(client_id);
    CREATE INDEX IF NOT EXISTS ix_consent_forms_appointment_id ON consent_forms(appointment_id);

END $$;
"""

if __name__ == "__main__":
    with engine.connect() as conn:
        conn.execute(__import__("sqlalchemy").text(SQL))
        conn.commit()
    print("Migration clinical_features concluida com sucesso!")
