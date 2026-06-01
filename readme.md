# 📅 Velo — Sistema Web de Agenda Profissional

> Sistema web responsivo de agendamento para profissionais autônomos que atuam em múltiplos locais de trabalho.

---

## ✨ Visão Geral

O **Velo** é uma plataforma full-stack de gestão de agenda profissional, construída para profissionais autônomos e liberais (psicólogos, médicos, fisioterapeutas, personal trainers, etc.) que precisam organizar clientes, horários e históricos de atendimento de forma centralizada e segura.

**Principais diferenciais:**

- 📍 Suporte a **múltiplos locais de trabalho** com horários independentes
- 🧠 Assistente de IA integrado via **Gemini** para agendamento em linguagem natural
- 🔔 **Notificações push** via Firebase Cloud Messaging
- 🌍 **Internacionalização** completa (PT-BR, EN, ES)
- 📊 **Dashboard financeiro e de métricas** com exportação em Excel e PDF
- 📁 **Prontuários clínicos** com upload criptografado
- 👥 **Gestão de equipe** com controle de permissões por local
- 📱 Interface **100% responsiva**, otimizada para desktop e mobile

---

## 🛠️ Stack Tecnológica

### Backend

| Tecnologia | Versão | Uso |
|---|---|---|
| Python | 3.11+ | Linguagem principal |
| FastAPI | 0.115 | Framework REST |
| SQLAlchemy | 2.0 | ORM |
| Pydantic v2 | 2.9 | Validação e settings |
| PostgreSQL | 14+ | Banco de dados |
| Alembic | 1.13 | Migrações |
| python-jose | 3.3 | JWT (access + refresh token) |
| passlib + bcrypt | — | Hash de senhas |
| APScheduler | 3.10 | Jobs agendados (alertas, notificações) |
| google-generativeai | latest | Integração Gemini AI |
| Uvicorn | 0.30 | Servidor ASGI |

### Frontend

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 19 | UI Framework |
| Vite | 7 | Build tool |
| TailwindCSS | 4 | Estilização |
| Zustand | 5 | Gerenciamento de estado |
| React Router | 7 | Roteamento SPA |
| Axios | 1.13 | Cliente HTTP |
| Firebase JS SDK | 12 | Push Notifications |
| Framer Motion | 12 | Animações |
| i18next | 25 | Internacionalização |
| jsPDF + xlsx | — | Exportação de relatórios |
| react-hot-toast | 2.6 | Notificações toast |

---

## 🏗️ Arquitetura

```
PROJET-WEB-SITE-VELO/
├── back/                        # API REST (FastAPI)
│   ├── app/
│   │   ├── auth/                # Autenticação JWT + 2FA + recuperação de senha
│   │   ├── models/              # Modelos SQLAlchemy
│   │   ├── routers/             # Endpoints REST (16 routers)
│   │   ├── schemas/             # Schemas Pydantic
│   │   ├── services/            # Lógica de negócio
│   │   ├── config.py            # Settings via variáveis de ambiente
│   │   └── database.py          # Sessão do banco
│   ├── static/
│   │   ├── avatars/             # Fotos de perfil (geradas em runtime, fora do git)
│   │   └── medical_records/     # Prontuários criptografados (gerados em runtime, fora do git)
│   ├── main.py                  # Ponto de entrada da API
│   ├── migration*.py            # Scripts de migração incremental
│   ├── requirements.txt
│   └── .env.example             # Modelo de variáveis de ambiente
│
├── front/                       # SPA React
│   ├── src/
│   │   ├── components/          # Componentes reutilizáveis (12 componentes)
│   │   ├── pages/               # Páginas da aplicação (17 páginas)
│   │   ├── services/            # Clientes de API e push notifications
│   │   ├── store/               # Estado global (Zustand)
│   │   ├── locales/             # Traduções (pt, en, es)
│   │   ├── utils/               # Utilitários
│   │   └── App.jsx              # Roteamento principal
│   ├── public/
│   │   ├── manifest.json        # PWA manifest
│   │   └── firebase-messaging-sw.js  # Service Worker para push
│   ├── package.json
│   └── .env.example
│
├── popular_banco.sql            # Script de seed para desenvolvimento
└── README.md
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+

---

### 1. Clone o repositório

```bash
git clone https://github.com/Mateus-Wolf/Velo.git
cd Velo
```

---

### 2. Backend

```bash
cd back

# Criar e ativar ambiente virtual
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Linux/macOS

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
copy .env.example .env      # Windows
# cp .env.example .env      # Linux/macOS
# Edite o .env com suas credenciais (ver seção abaixo)

# Iniciar a API
uvicorn main:app --reload --port 8000
```

A API estará disponível em `http://localhost:8000`.  
Documentação automática (Swagger): `http://localhost:8000/docs`

---

### 3. Frontend

```bash
cd front

# Instalar dependências
npm install

# Configurar variáveis de ambiente
copy .env.example .env      # Windows
# cp .env.example .env      # Linux/macOS
# Edite VITE_API_URL se necessário

# Iniciar em modo desenvolvimento
npm run dev
```

A aplicação estará em `http://localhost:5173`.

---

### 4. Banco de Dados

Crie um banco PostgreSQL e configure a `DATABASE_URL` no `.env` do backend.

As tabelas são criadas automaticamente pelo SQLAlchemy na primeira execução (`main.py`).

Para popular com dados de desenvolvimento:

```sql
-- Execute no seu cliente PostgreSQL (psql, DBeaver, etc.)
\i popular_banco.sql
```

---

## 🔐 Variáveis de Ambiente

### `back/.env` (obrigatório)

Copie `back/.env.example` e preencha:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL |
| `SECRET_KEY` | Chave JWT (gere com `python -c "import secrets; print(secrets.token_urlsafe(32))"`) |
| `ALGORITHM` | Algoritmo JWT (padrão: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiração do access token |
| `MAIL_FROM` | E-mail remetente (Gmail) |
| `MAIL_PASSWORD` | Senha de app do Gmail |
| `MAIL_SERVER` | Servidor SMTP |
| `MAIL_PORT` | Porta SMTP (587) |
| `GEMINI_API_KEY` | Chave da API do Google AI Studio |
| `FIREBASE_CREDENTIALS_JSON` | JSON da service account do Firebase (como string) |

> **Como obter as credenciais:**
> - **Gmail App Password**: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
> - **Gemini API Key**: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
> - **Firebase Service Account**: Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada

### `front/.env` (obrigatório)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base da API (ex: `http://localhost:8000/api/v1`) |

---

## 📋 Funcionalidades

### 🔑 Autenticação & Segurança
- Registro e login com JWT (access + refresh token)
- Autenticação de dois fatores (2FA) por e-mail
- Recuperação de senha via e-mail
- Reconhecimento de dispositivos confiáveis
- Proteção de rotas no frontend

### 🏢 Locais de Trabalho
- Cadastro com nome, descrição, endereço e horários por dia da semana
- Upload de foto do local
- Tempo de buffer entre atendimentos configurável
- Meta mensal de atendimentos por local
- Múltiplos locais por profissional

### 👥 Clientes
- CRUD completo com soft delete
- Vínculo de clientes a múltiplos locais
- Histórico de atendimentos por cliente
- Prontuários clínicos com upload criptografado de documentos

### 📆 Agendamentos
- Criação com validação automática de conflitos
- Validação de dias e horários do local
- Status: agendado, cancelado, concluído
- Alertas configuráveis antes do horário
- Visualização em calendário mensal
- Agendamentos públicos (link compartilhável para clientes)
- Suporte a parcelamento de pagamentos

### 👩‍⚕️ Equipe (Staff)
- Cadastro de membros da equipe
- Controle de acesso por local de trabalho
- Permissões de documentos clínicos

### 💰 Financeiro
- Registro de pagamentos por atendimento
- Controle de parcelas
- Relatório financeiro com exportação Excel/PDF

### 📊 Métricas & Dashboard
- Visão geral de agendamentos e receita
- Metas mensais com acompanhamento histórico
- Avaliações de clientes
- Gráficos e indicadores de performance

### 🤖 Assistente IA (Gemini)
- Chatbot integrado para criar agendamentos em linguagem natural
- Conversão de texto para payload de agendamento validado

### 🔔 Notificações
- Push notifications via Firebase Cloud Messaging
- Central de notificações in-app
- Preferências configuráveis por tipo de evento

### 🌍 Internacionalização
- Português (PT-BR) — padrão
- Inglês (EN)
- Espanhol (ES)

---

## 🗄️ Modelos Principais do Banco

| Tabela | Descrição |
|---|---|
| `users` | Profissionais cadastrados |
| `workplaces` | Locais de trabalho |
| `clients` | Clientes dos profissionais |
| `workplace_clients` | Vínculo N:N local ↔ cliente |
| `appointments` | Agendamentos |
| `alerts` | Alertas de agendamento |
| `staff_members` | Membros da equipe |
| `staff_workplace_access` | Acesso da equipe por local |
| `medical_records` | Prontuários clínicos |
| `push_subscriptions` | Tokens FCM dos dispositivos |
| `notification_logs` | Histórico de notificações |
| `password_resets` | Tokens de recuperação de senha |
| `recognized_devices` | Dispositivos confiáveis (2FA) |
| `reviews` | Avaliações de clientes |

---

## 🔒 Segurança

- Senhas armazenadas com **bcrypt**
- Autenticação via **JWT** com tokens de curta duração
- **Refresh token** em cookie `httpOnly`
- Verificação de **propriedade do recurso** em todos os endpoints (nenhum usuário acessa dados de outro)
- Prontuários armazenados **criptografados** em disco
- Variáveis sensíveis exclusivamente via **variáveis de ambiente** (nunca hardcoded)
- **CORS** configurado explicitamente
- Arquivos de mídia gerados em runtime **excluídos do repositório** via `.gitignore`

---

## 📁 Routers da API

| Router | Prefixo | Descrição |
|---|---|---|
| auth | `/api/v1/auth` | Autenticação, 2FA, refresh, dispositivos |
| workplaces | `/api/v1/workplaces` | CRUD de locais de trabalho |
| clients | `/api/v1/clients` | CRUD de clientes |
| appointments | `/api/v1/appointments` | Agendamentos e validações |
| public_appointments | `/api/v1/public` | Link público para agendamento |
| alerts | `/api/v1/alerts` | Alertas de agendamento |
| dashboard | `/api/v1/dashboard` | Resumo do painel |
| financial | `/api/v1/financial` | Controle financeiro |
| medical_records | `/api/v1/medical-records` | Prontuários clínicos |
| staff | `/api/v1/staff` | Gestão de equipe |
| notifications | `/api/v1/notifications` | Central de notificações |
| push | `/api/v1/push` | Subscriptions FCM |
| profile | `/api/v1/profile` | Perfil do usuário |
| reviews | `/api/v1/reviews` | Avaliações |
| gemini | `/api/v1/gemini` | Assistente IA |

---

## 📄 Licença

Este projeto é de uso privado. Todos os direitos reservados ao autor.

---

*Desenvolvido com 💙 por [Mateus Wolf](https://github.com/Mateus-Wolf)*
