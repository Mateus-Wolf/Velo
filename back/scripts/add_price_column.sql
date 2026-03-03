-- Migration: Adicionar campos de preço e versão de token aos agendamentos
-- Executar no banco de dados PostgreSQL antes de reiniciar a API

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS confirmation_token_version INTEGER NOT NULL DEFAULT 1;
