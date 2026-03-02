# 📅 Sistema Web de Agenda Profissional

## 1. Visão Geral do Projeto

Este projeto consiste em um **sistema web responsivo de agenda profissional**, voltado para profissionais autônomos ou liberais que atuam em **um ou mais locais de trabalho** e precisam organizar clientes, horários e históricos de atendimento de forma centralizada.

O sistema será acessível via navegador em **desktop e dispositivos móveis**, sem necessidade de instalação.

O foco do projeto é:

* Organização
* Confiabilidade de horários
* Regras de negócio bem definidas
* Escalabilidade futura (SaaS-ready)

---

## 2. Objetivos

* Permitir que profissionais gerenciem seus compromissos com segurança
* Evitar conflitos de agenda
* Facilitar o gerenciamento de múltiplos locais de trabalho
* Centralizar histórico de atendimentos
* Oferecer boa experiência mobile
* Servir como base sólida para futuras integrações (IA, notificações, planos)

---

## 3. Público-Alvo

* Profissionais autônomos
* Prestadores de serviço
* Profissionais que atuam em múltiplos locais (clínicas, estúdios, consultórios, etc)

---

## 4. Stack Tecnológica

### Backend

* **Linguagem:** Python
* **Framework:** FastAPI
* **ORM:** SQLAlchemy
* **Validação:** Pydantic
* **Autenticação:** JWT
* **Jobs agendados:** Background Tasks / Celery (futuro)

### Banco de Dados

* **PostgreSQL**

### Frontend

* **React**
* **Vite**
* **TailwindCSS**
* **Gerenciamento de estado:** Context API ou Zustand

### Integrações

* **IA:** Gemini Flash (fase avançada)

### Infraestrutura

* Deploy backend: Render / Railway
* Deploy frontend: Vercel / Netlify

---

## 5. Arquitetura Geral

* Frontend SPA consumindo API REST
* Backend desacoplado
* API versionada
* Separação clara entre domínio, regras e infraestrutura

---

## 6. Modelagem do Banco de Dados

### 6.1 users

Representa o profissional.

Campos:

* id (PK)
* name
* email (unique)
* password_hash
* created_at
* updated_at

---

### 6.2 workplaces

Locais onde o profissional trabalha.

Campos:

* id (PK)
* user_id (FK → users.id)
* name
* description
* photo_url (nullable)
* address (nullable)
* work_days (array/int mask)
* start_time
* end_time
* created_at

---

### 6.3 clients

Clientes do profissional.

Campos:

* id (PK)
* user_id (FK → users.id)
* name
* contact (nullable)
* notes (nullable)
* is_active
* created_at

---

### 6.4 workplace_clients

Tabela de relacionamento N:N entre clientes e locais de trabalho.

Campos:

* id (PK)
* workplace_id (FK)
* client_id (FK)

Permite:

* Compartilhar clientes entre locais
* Copiar ou transferir vínculo

---

### 6.5 appointments

Agendamentos.

Campos:

* id (PK)
* user_id (FK)
* workplace_id (FK)
* client_id (FK)
* date
* start_time
* end_time
* status (scheduled | canceled | completed)
* created_at

---

### 6.6 alerts

Alertas configuráveis de agendamento.

Campos:

* id (PK)
* appointment_id (FK)
* alert_datetime
* is_triggered

---

## 7. Regras de Negócio

### 7.1 Agendamentos

* Não é permitido agendar no passado
* Não é permitido agendar fora do horário do local de trabalho
* Não é permitido conflito de horário **no mesmo local**
* É permitido conflito entre locais diferentes, porém:

  * O sistema deve alertar se o intervalo entre agendamentos for menor que o tempo mínimo configurado
* Horários respeitam os dias da semana configurados no local

---

### 7.2 Locais de Trabalho

* Cada local possui dias e horários próprios
* Um local não depende de endereço obrigatório
* Endereço é usado apenas para alertas de logística

---

### 7.3 Clientes

* Clientes pertencem ao profissional
* Clientes podem ser vinculados a múltiplos locais
* Exclusão lógica (soft delete)

---

## 8. Funcionalidades do Sistema

### 8.1 Autenticação

* Cadastro
* Login
* Logout
* Refresh token

---

### 8.2 Gestão de Locais de Trabalho

* Criar local
* Editar local
* Remover local (soft delete)
* Listagem com:

  * Busca por nome
  * Filtro por dia da semana

---

### 8.3 Gestão de Clientes

* Criar cliente
* Editar cliente
* Ativar/desativar cliente
* Vincular cliente a local
* Copiar cliente entre locais
* Listagem com busca e ordenação

---

### 8.4 Gestão de Agendamentos

* Criar agendamento
* Editar agendamento
* Cancelar agendamento
* Listagem geral
* Listagem por local
* Validações automáticas

---

### 8.5 Histórico

#### Histórico Geral

* Todos os atendimentos realizados
* Filtros por:

  * Cliente
  * Data
  * Local

#### Histórico por Cliente

* Atendimentos de um cliente específico

#### Histórico por Local

* Atendimentos realizados em um local

---

### 8.6 Alertas

* Configuração no momento do agendamento
* Disparo próximo ao horário
* Exibição visual no sistema

---

### 8.7 Integração com IA (Futuro)

* Entrada em linguagem natural
* Conversão para payload de agendamento
* Validação antes de salvar

---

## 9. Fluxos Principais

### 9.1 Criar Agendamento

1. Usuário seleciona local
2. Seleciona cliente
3. Escolhe data e hora
4. Sistema valida regras
5. Sistema alerta se necessário
6. Usuário confirma
7. Agendamento é salvo

---

### 9.2 Copiar Cliente entre Locais

1. Usuário seleciona cliente
2. Escolhe novo local
3. Sistema cria vínculo

---

## 10. Requisitos Não Funcionais

* Interface responsiva
* Performance aceitável para até milhares de registros
* Código organizado e modular
* Logs básicos
* Tratamento global de erros
