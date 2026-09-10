# AGENTS.md

## Regras gerais

- Respeite a arquitetura real do projeto: monolito modularizado em Python/FastAPI + SQLAlchemy + PostgreSQL, com frontend em React/Vite.
- Reutilize componentes, serviços, utilitários, schemas e padrões já existentes antes de criar novos artefatos.
- Não introduza novas tecnologias, bibliotecas ou padrões sem requisito explícito.
- Quando a mudança afetar banco, schema, APIs, frontend ou segurança, avalie impacto sistêmico antes de implementar.

## Roteamento por tipo de tarefa

- Arquitetura, desenho de solução, trade-offs, impacto sistêmico, governança técnica → Solution Architect
- Backend, APIs, regras de negócio, persistência, integração com banco e serviços → Backend Principal Engineer
- Frontend, telas, componentes, UX mobile-first, integração com API e apresentação de dados → Frontend Principal Engineer
- Testes, regressão, risco, validação e estratégia de qualidade → Senior QA Engineer
- Banco de dados, migrations, schema, índices, performance e integridade transacional → Senior DBA
- Segurança, autenticação, autorização, validação, proteção de dados e hardening → Security Engineer
- Decisões estratégicas, revisões técnicas, governança, aprovação/reprovação de soluções → Staff Tech Lead

## Como usar os agentes

### Quando pedir mudanças de funcionalidade
- Se for backend/API: use `Backend Principal Engineer`
- Se for frontend/tela/componente: use `Frontend Principal Engineer`
- Se for arquitetura/impacto/sistema: use `Solution Architect`
- Se for testes/regressão: use `Senior QA Engineer`
- Se for banco/schema/migration: use `Senior DBA`
- Se for segurança: use `Security Engineer`
- Se for revisão final e decisão: use `Staff Tech Lead`

### Quando a tarefa cruzar áreas
Combine os agentes de forma coerente, por exemplo:
- backend + frontend + QA
- backend + DBA + segurança
- arquitetura + tech lead + QA

## Padrões esperados de resposta

- Sempre responda com implementação prática, análise técnica e impacto do que foi pedido.
- Priorize a solução mais simples, segura e aderente ao código existente.
- Quando for relevante, mencione os arquivos/áreas do projeto que serão afetados.

## Exemplos de prompts úteis

- “Crie uma nova funcionalidade de cadastro de usuários no ACM.” → use `Backend Principal Engineer` e, se houver frontend, `Frontend Principal Engineer`
- “Adicione testes para essa correção no backend.” → use `Senior QA Engineer`
- “Reveja a arquitetura dessa mudança no sistema.” → use `Solution Architect` ou `Staff Tech Lead`
- “Preciso ajustar o schema do banco com migration.” → use `Senior DBA`
- “Quero revisar a segurança desse fluxo.” → use `Security Engineer`
- “Crie a tela de acompanhamento de unidade e ajuste a API necessária.” → use `Frontend Principal Engineer` + `Backend Principal Engineer`

## Resumo prático

Para o Codex, o ideal é enviar prompts específicos e nomear o agente relevante quando a tarefa for ampla ou cruzada.
