# ACM - Sistema de Gestao Social (PRD)

Implementacao full stack baseada no PRD em `docs/PRD_ACM_Gestao_Usuarios_Frequencia.md`.

## Stack
- Frontend: React + Vite
- Backend: Python + FastAPI + SQLAlchemy
- Banco: PostgreSQL

## Arquitetura
O backend foi estruturado com separacao em camadas:
- `domain`: enums e regras centrais do negocio
- `application`: contratos/schemas e casos de uso (services)
- `infrastructure`: persistencia, modelos ORM e sessao de banco
- `interfaces`: API HTTP (routers/controllers)

## Estrutura de Pastas

```text
.
|-- backend
|   |-- requirements.txt
|   |-- src
|   |   |-- app
|   |   |   |-- application
|   |   |   |-- domain
|   |   |   |-- infrastructure
|   |   |   `-- interfaces
|   |   `-- seed.py
|   `-- tests
|-- database
|   `-- init.sql
|-- docs
|   `-- PRD_ACM_Gestao_Usuarios_Frequencia.md
|-- frontend
|   |-- package.json
|   `-- src
|-- compose.yml
`-- docker-compose.yml
```

## Funcionalidades Implementadas
- Cadastro de unidades sociais
- Cadastro de usuarios e atividades
- Inscricao em atividades
- Registro de frequencia individual e em lote
- Justificativa de falta vinculada exclusivamente a falta registrada
- Regras de faltas parametrizaveis
- Fluxo de relatorios institucionais (criacao, envio, aprovacao/reprovacao)
- Cadastro socioassistencial de participante por etapas, conclusao e historico/versionamento

## Pre-requisitos
- Python 3.11+
- Node.js 20+
- PostgreSQL local (porta `5432`)

## Subida Rapida (Windows + PostgreSQL local)
Use 2 terminais PowerShell.

### Terminal 1 - Backend
```powershell
cd c:\workspace\acm\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:PYTHONPATH='src'
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2 - Frontend
```powershell
cd c:\workspace\acm\frontend
npm install
$env:VITE_API_URL='http://127.0.0.1:8000/api/v1'
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

### URLs
- Frontend: `http://127.0.0.1:5173`
- Backend (Swagger): `http://127.0.0.1:8000/docs`

Se a porta `5173` estiver ocupada, finalize o processo que esta usando a porta e rode novamente
com `--strictPort` para evitar CORS por troca automatica de porta.

### Banco local esperado
O backend usa por padrao:
`postgresql+psycopg://postgres:admin123@localhost:5432/acm`

Se precisar, ajuste em `backend/.env` no campo `DATABASE_URL`.

## Configuracao
1. Copie variaveis de ambiente:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

2. (Opcional) Suba o PostgreSQL por container:

```bash
podman compose up -d postgres
```

3. Verifique se o container subiu:

```bash
podman compose ps
```

## Rodando o Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=src uvicorn app.main:app --reload --port 8000
```

Em outro terminal, para seed inicial:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=src python src/seed.py
```

API docs: `http://localhost:8000/docs`

## Rodando o Frontend

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000/api/v1 npm run dev
```

Frontend: `http://localhost:5173`

## Testes

```bash
cd backend
source .venv/bin/activate
pytest
```

## Endpoints principais
Base: `/api/v1`
- `POST /units`
- `GET /units`
- `GET /units/{id}`
- `PUT /units/{id}`
- `DELETE /units/{id}`
- `POST/GET /users`
- `POST/GET /activities`
- `POST /enrollments`
- `POST /attendances`
- `POST /attendances/bulk`
- `POST /justifications`
- `PATCH /justifications/{id}`
- `POST/GET /absence-rules`
- `POST /reports`
- `POST /reports/{id}/send`
- `POST /reports/{id}/review`
- `POST /participants`
- `PUT /participants/{id}/stages`
- `POST /participants/{id}/conclude`
- `GET /participants`
- `GET /participants/{id}/history`

## Migration (Units)
Para ambientes existentes, execute a migration SQL:

```bash
psql -d acm -f database/migrations/20260528_alter_units_add_full_fields.sql
```

## Observacoes
- Codigo Python seguindo PEP 8 e estrutura modular.
- Regras centrais do PRD implementadas com validacoes de negocio no servico de aplicacao.
- Persistencia em PostgreSQL com constraints de unicidade e integridade referencial.
- O projeto usa `compose.yml` (compativel com Podman Compose). O arquivo `docker-compose.yml` foi mantido para compatibilidade.
