-- Migration: Adiciona campos de pagamento na tabela appointments e cria tabela reviews
-- Execute no seu banco PostgreSQL

-- 1. Adicionar paid_value na tabela appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS paid_value NUMERIC(10, 2) NULL;

-- 2. Adicionar payment_method na tabela appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NULL;

-- 3. Criar tabela reviews
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_reviews_appointment_id ON reviews(appointment_id);
