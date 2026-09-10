# Copilot Instructions para ACM

## Regras gerais

- Sempre respeite a arquitetura real do projeto: monolito modularizado em Python/FastAPI + SQLAlchemy + PostgreSQL, com frontend em React/Vite.
- Priorize reutilização de componentes, serviços, utilitários, schemas e padrões já existentes antes de criar novos artefatos.
- Não introduza novas tecnologias, bibliotecas ou padrões sem requisito explícito.
- Quando a mudança afetar banco, schema, APIs, frontend ou segurança, avalie impacto sistêmico antes de implementar.

## Roteamento de agentes

Use o agente apropriado conforme o tipo da tarefa:

- Arquitetura, desenho de solução, trade-offs, impacto sistêmico, governança técnica: `Solution Architect`
- Backend, APIs, regras de negócio, persistência, integração com banco e serviços: `Backend Principal Engineer`
- Frontend, telas, componentes, UX mobile-first, integração com API e apresentação de dados: `Frontend Principal Engineer`
- Testes, regressão, risco, validação e estratégia de qualidade: `Senior QA Engineer`
- Banco de dados, migrations, schema, índices, performance e integridade transacional: `Senior DBA`
- Segurança, autenticação, autorização, validação, proteção de dados e hardening: `Security Engineer`
- Decisões estratégicas, revisões técnicas, governança, aprovação/reprovação de soluções: `Staff Tech Lead`

## Quando usar cada agente

### Arquitetura
Use `Solution Architect` quando o pedido envolver:
- desenho de solução
- divisão de responsabilidades
- alternativas arquiteturais
- integração entre módulos, APIs ou serviços
- impacto de uma funcionalidade no sistema atual

### Backend
Use `Backend Principal Engineer` quando o pedido envolver:
- criar ou alterar endpoints
- evoluir services, repositories, schemas ou regras de negócio
- ajustar persistência em SQLAlchemy
- alterar fluxos do backend

### Frontend
Use `Frontend Principal Engineer` quando o pedido envolver:
- criar ou alterar telas
- desenvolver componentes e páginas
- ajustar rotas, formulários, listagens e UX
- integrar o frontend com APIs existentes

### Testes
Use `Senior QA Engineer` quando o pedido envolver:
- testes unitários ou de integração
- validação de regressão
- análise de risco
- estratégia de testes da mudança

### Banco de dados
Use `Senior DBA` quando o pedido envolver:
- migrations
- schema
- índices
- consultas e performance
- integridade e concorrência

### Segurança
Use `Security Engineer` quando o pedido envolver:
- autenticação/autorização
- dados sensíveis
- validação de entrada
- logs e exposição de informação
- hardening do sistema

### Tech Lead
Use `Staff Tech Lead` quando o pedido envolver:
- revisão de solução
- aprovação ou reprovação arquitetural
- trade-offs
- governança técnica
- análise de riscos sistêmicos

## Padrões de resposta esperados

- Sempre que possível, responda com implementação prática, análise técnica e impacto do que foi pedido.
- Quando uma tarefa cruzar áreas, combine os agentes de forma coerente: por exemplo, backend + testes + segurança ou frontend + QA.
- Sempre priorize a solução mais simples, segura e aderente ao código existente.

## Exemplos de prompts úteis

- “Crie uma nova funcionalidade de cadastro de usuários no ACM.” → use `Backend Principal Engineer` e, se houver frontend, `Frontend Principal Engineer`
- “Adicione testes para essa correção no backend.” → use `Senior QA Engineer`
- “Reveja a arquitetura dessa mudança no sistema.” → use `Solution Architect` ou `Staff Tech Lead`
- “Preciso ajustar o schema do banco com migration.” → use `Senior DBA`
- “Quero revisar a segurança desse fluxo.” → use `Security Engineer`
- “Crie a tela de acompanhamento de unidade e ajuste a API necessária.” → use `Frontend Principal Engineer` + `Backend Principal Engineer`

## Resumo prático

Para o Codex, o ideal é enviar prompts específicos e nomear o agente relevante quando a tarefa for ampla ou cruzada.
