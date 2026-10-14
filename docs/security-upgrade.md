# Atualização de segurança e agenda

## Chave clínica obrigatória

A API agora exige `MEDICAL_ENCRYPTION_KEY` e não usa chave fixa como alternativa.
O valor é carregado pelo mesmo Settings que lê `back/.env`. A pasta de anexos
clínicos deixou de ser pública; o download autenticado continua funcionando.

Para uma instalação nova, gere uma chave e guarde-a em `back/.env`:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Guarde uma cópia segura da chave junto à estratégia de backup. Não a versione.

## Instalação com dados existentes

1. Pare a API e faça backup do banco, de `back/static/medical_records` e das chaves atuais.
2. Gere uma nova chave para `MEDICAL_ENCRYPTION_KEY`.
3. Configure `MEDICAL_PREVIOUS_ENCRYPTION_KEYS` com a chave efetivamente usada antes.
   Se a instalação usava a chave fixa, recupere esse valor de
   `back/app/services/security.py` da versão anterior e configure-o explicitamente
   como chave anterior. Nunca use a chave antiga para novas gravações.
4. No diretório `back`, execute `python scripts/rotate_medical_encryption.py`.
   A conferência deve terminar sem erros; ela verifica todos os textos, assinaturas
   e anexos referenciados sem alterar dados. Se falhar, corrija a chave ou restaure
   o arquivo ausente antes de continuar.
5. Execute `python scripts/rotate_medical_encryption.py --apply`.
6. Esvazie `MEDICAL_PREVIOUS_ENCRYPTION_KEYS` e execute a conferência novamente.
   Só reinicie a API quando ela passar usando exclusivamente a chave nova.

As substituições de arquivos são atômicas individualmente e a atualização do banco
é transacional. Banco e disco não compartilham uma transação: se houver interrupção,
mantenha ambas as chaves e repita a operação. Nunca descarte a chave anterior antes
da conferência final. Backups antigos ainda dependem das chaves antigas.

## Contrato de agendamentos

`POST /api/v1/appointments/?include_summary=true` retorna `appointments` e `skipped`
(data e motivo). O calendário usa esse formato e apresenta o resultado até o usuário
fechá-lo, inclusive quando nenhuma data pôde ser criada. Sem o parâmetro, a resposta
permanece uma lista para compatibilidade. Domingo aceita 0 (interface) ou 7 (legado).

Cliente e local precisam pertencer ao profissional, estar ativos e estar vinculados.
A equipe precisa ter acesso tanto ao local atual como ao destino de uma alteração.
Consultas finalizadas não aceitam confirmação/cancelamento por links públicos.
Reagendamento, troca de cliente/local, preço e encerramento invalidam links antigos.

## Verificação local

```powershell
cd back
python -m pip install -r requirements-test.txt
python -m pytest
cd ../front
npm ci
npm run build
```

Os testes usam SQLite em memória e chaves temporárias; não acessam o banco real,
não enviam e-mails e não iniciam o scheduler. A serialização de gravações por
profissional usa bloqueio de linha no PostgreSQL; concorrência real nesse banco
requer um teste de integração no ambiente de homologação.
