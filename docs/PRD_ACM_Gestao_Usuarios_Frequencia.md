# PRD  Sistema ACM de Gestão Social, Frequência, Cadastros e Relatórios

## 1. Contexto
A ACM-SP opera um sistema web para gestão social, com foco em cadastro de usuários, atividades, frequência, relatórios institucionais, acompanhamento de unidade, gestão operacional e cadastro socioassistencial do participante.

A solução foi implementada com arquitetura full stack baseada em:
- Frontend: React + Vite
- Backend: Python + FastAPI + SQLAlchemy
- Banco de dados: PostgreSQL
- Organização em camadas: domain, application, infrastructure, interfaces

---

## 2. Objetivo do produto
O sistema deve permitir que a Matriz e as Unidades Sociais realizem, de forma integrada e auditável, as operações abaixo:
- cadastro e manutenção de unidades sociais, usuários, colaboradores, atividades e grupos;
- inscrição de usuários em atividades;
- registro de frequência individual e em lote;
- justificativa de faltas por semana/grupo/turno;
- acompanhamento operacional da unidade;
- gestão de doações (catálogo e recebimento);
- geração, envio, revisão e aprovação de relatórios institucionais;
- cadastro socioassistencial completo do participante com etapas, histórico e versionamento;
- classificação de usuários por grupos e acompanhamento de faixa etária.

---

## 3. Visão geral do sistema atual
A implementação atual contempla um monolito modularizado, com módulos funcionais que atendem a diferentes perfis da organização.

### 3.1 Módulos implementados
1. Gestão organizacional
   - unidades sociais
   - usuários
   - colaboradores
   - perfis e permissões
   - autenticação e escopo por unidade

2. Gestão de atividades e grupos
   - cadastro de atividades
   - cadastro de grupos
   - classificação por grupo
   - vínculo de usuários a grupos e atividades

3. Frequência e faltas
   - frequência por usuário/atividade/data
   - frequência por grupo/turno/semana
   - justificativa de falta por semana
   - manutenção de justificativa e exclusão

4. Registro de atividades diária
   - registro por unidade, atividade, data e turno
   - acompanhamento de ausência ou presença por período

5. Relatórios e acompanhamento
   - geração de relatórios
   - envio para matriz
   - revisão e aprovação/reprovação
   - dashboard de acompanhamento da unidade

6. Cadastro socioassistencial do participante
   - cadastro por etapas
   - conclusão de cadastro
   - histórico e versionamento
   - anexos

7. Gestão de doações
   - catálogo de doações
   - recebimento de doações

8. Atendimentos
   - registro de atendimentos
   - dados básicos do atendente e demanda

---

## 4. Funcionalidades do sistema

### 4.1 Gestão Organizacional

#### RF-01  unidades sociais
- cadastro de unidade social
- consulta de unidade social
- atualização de dados
- exclusão com validação de dependências

#### RF-02  usuários
- cadastro de usuário
- consulta/listagem
- atualização
- exclusão lógica/operacional com validação
- suporte a status do usuário, como ativo, suspenso e desligado
- histórico de movimentações e status

#### RF-03  colaboradores
- cadastro de colaboradores
- associação de função/role
- consulta e atualização
- remoção com controle de integridade

#### RF-04  perfis, permissões e autenticação
- autenticação por login
- perfis com regras de acesso
- escopo por unidade social
- bloqueio funcional conforme perfil e unidade

**Perfis atualmente reconhecidos na aplicação e na navegação:**
- administrador do sistema
- coordenador/coordenadora
- secretaria executiva
- secretaria administrativa
- educador/educadora
- técnico/técnica

---

### 4.2 Gestão de atividades, grupos e inscrições

#### RF-05  atividades
- cadastro de atividades
- consulta e atualização
- ativação/inativação
- vínculo com unidade social
- regra de unicidade por nome e unidade

#### RF-06  grupos
- cadastro de grupos
- consulta/listagem
- atualização
- exclusão com validação de vínculos
- relação com unidade social

#### RF-07  inscrição em atividades
- inscrição de usuário em atividade
- listagem e remoção de inscrições
- unicidade por usuário/atividade

#### RF-08  classificação por grupos
- classificação de usuários por grupo
- vínculo e desvinculação de usuários a grupos
- consulta de classificação por grupo

---

### 4.3 Frequência, faltas e justificativas

#### RF-09  frequência por atividade
- registro de frequência por usuário, atividade e data
- suporte a frequência individual e em lote
- status disponível: presente / falta

#### RF-10  frequência por grupo
- consulta de grupos por turno
- listagem de usuários do grupo por turno
- consulta semanal de frequência por turno
- armazenamento de frequência por usuário/grupo/turno/data

#### RF-11  justificativa de falta
- justificativa vinculada às faltas registradas no contexto semanal/grupo
- campo de justificativa com limite de 500 caracteres
- normalização de espaços em branco
- exclusão de justificativa

#### RF-12  regra de frequência semanal
- cada usuário pode ter frequência por dia da semana
- justificativa só é aplicada quando há ausência na semana
- o sistema guarda a justificativa por usuário, grupo, turno e semana de referência

#### RF-13  frequência semanal em tela
- geração de tabela com dias da semana e datas
- edição de presença/falta por usuário em uma semana
- modal de justificativa para faltas
- botão de visualização/exclusão de justificativa

---

### 4.4 Registro de atividades diárias

#### RF-14  registro de atividades diárias
- registro de atividades programadas por data
- validação da atividade conforme calendário e dia da semana
- associação de grupo à atividade
- listagem de registros diários
- atualização e exclusão de registros

#### RF-15  acompanhamento da unidade
- dashboard com alertas e indicadores por mês
- acompanhamento de atividades registradas
- indicadores operacionais por unidade social

---

### 4.5 Relatórios

#### RF-16  relatórios institucionais
- criação de relatório por unidade
- envio para matriz
- revisão por perfil autorizado
- aprovação/reprovação com motivo
- versionamento do conteúdo do relatório

#### RF-17  estados do relatório
- rascunho
- enviado para matriz
- em análise pela matriz
- aprovado
- reprovado

#### RF-18  histórico e auditoria
- manutenção de versões do relatório
- rastreabilidade de aprovações e reprovações

---

### 4.6 Cadastro socioassistencial do participante

#### RF-19  cadastro por etapas
- etapa inicial com identificação do participante
- etapa de dados essenciais
- etapa de diagnóstico social
- etapa de parecer técnico
- etapa de revisão e conclusão

#### RF-20  versionamento e histórico
- cada alteração gera nova versão do cadastro
- histórico de versões disponível por participante

#### RF-21  anexos
- upload e armazenamento de anexos do participante
- consulta dos anexos por participante

#### RF-22  conclusão do cadastro
- o participante pode ser concluído com validação do processo
- status do participante registra rascunho ou concluído

#### RF-23  desligamento
- suporte a registro de desligamento do participante
- motivo e data obrigatórios
- histórico de desligamento

---

### 4.7 Gestão de doações

#### RF-24  catálogo de doações
- cadastro de item do catálogo
- consulta, edição e exclusão
- validação de descrição e unicidade

#### RF-25  recebimento de doações
- registro de recebimento
- associação com catálogo de doação
- controle de dados do doador
- gerenciamento por perfil autorizado

---

### 4.8 Atendimentos

#### RF-26  atendimentos
- cadastro de atendimento
- consulta por unidade e período
- atualização
- remoção
- relação com colaborador e função do atendente

---

## 5. Regras de negócio críticas
- a justificativa é sempre da falta, não da presença;
- não pode existir justificativa sem ausência previamente registrada no contexto do grupo/semana;
- a matriz tem visão consolidada dos dados de todas as unidades;
- a unidade social só acessa o escopo da própria unidade;
- o relatório pode ser reprovado apenas com motivo obrigatório;
- o histórico e versões devem ser preservados para auditoria;
- o cadastro do participante mantém registro histórico e versionamento por etapa;
- o sistema valida permissões por perfil e escopo funcional.

---

## 6. Perfis e permissões

### 6.1 Administrador do sistema
- acesso total do sistema
- gerenciamento do conjunto de unidades e dados globais

### 6.2 Coordenador / Coordenadora
- acompanhamento da unidade
- acesso a dashboards e recursos de gestão

### 6.3 Secretaria Executiva
- acesso à gestão de unidades e dados institucionais

### 6.4 Secretaria Administrativa
- acesso a gestão administrativa e recursos de unidade

### 6.5 Educador / Educadora
- acesso a registros diários e gestão operacional de atividades

### 6.6 Técnico / Técnica
- acesso operacional e de acompanhamento de unidades

---

## 7. Estrutura técnica atual

### 7.1 Stack obrigatória
- Frontend: React + Vite
- Backend: Python + FastAPI + SQLAlchemy
- Banco: PostgreSQL

### 7.2 Arquitetura em camadas
- domain: enums e regras centrais do negócio
- application: schemas e services
- infrastructure: modelos ORM, sessão de banco e persistência
- interfaces: routers/controllers da API HTTP

### 7.3 Estrutura de pastas
```text
backend/
  src/
    app/
      application/
      domain/
      infrastructure/
      interfaces/
  tests/
frontend/
  src/
    pages/
    components/
    services/
    api/
```

---

## 8. APIs principais implementadas
Base: `/api/v1`

### 8.1 Organização e cadastros
- `POST /unidades-sociais`
- `GET /unidades-sociais`
- `GET /unidades-sociais/{unit_id}`
- `PUT /unidades-sociais/{unit_id}`
- `DELETE /unidades-sociais/{unit_id}`

- `POST /usuarios`
- `GET /usuarios`
- `GET /usuarios/{user_id}`
- `PUT /usuarios/{user_id}`
- `DELETE /usuarios/{user_id}`

- `POST /colaboradores`
- `GET /colaboradores`
- `GET /colaboradores/{collaborator_id}`
- `PUT /colaboradores/{collaborator_id}`
- `DELETE /colaboradores/{collaborator_id}`

### 8.2 Atividades, grupos e inscrições
- `POST /atividades`
- `GET /atividades`
- `GET /atividades/{activity_id}`
- `PUT /atividades/{activity_id}`
- `DELETE /atividades/{activity_id}`

- `POST /grupos`
- `GET /grupos`
- `GET /grupos/{group_id}`
- `PUT /grupos/{group_id}`
- `DELETE /grupos/{group_id}`

- `POST /inscricoes`
- `GET /inscricoes`
- `DELETE /inscricoes/{enrollment_id}`

### 8.3 Frequência
- `POST /frequencias`
- `POST /frequencias/lote`
- `GET /frequencias/grupos`
- `GET /frequencias/usuarios`
- `GET /frequencias/semanal`
- `POST /frequencias/semanal`
- `DELETE /frequencias/semanal/justificativa`

### 8.4 Registro diário de atividades
- `GET /registro-atividades-diarias/atividades`
- `GET /registro-atividades-diarias`
- `GET /registro-atividades-diarias/{record_id}`
- `POST /registro-atividades-diarias`
- `PUT /registro-atividades-diarias/{record_id}`
- `DELETE /registro-atividades-diarias/{record_id}`

### 8.5 Relatórios
- `POST /relatorios`
- `POST /relatorios/{report_id}/enviar`
- `POST /relatorios/{report_id}/revisar`

### 8.6 Participantes
- `POST /participantes`
- `PUT /participantes/{participant_id}/etapas`
- `POST /participantes/{participant_id}/concluir`
- `GET /participantes`
- `GET /participantes/{participant_id}/historico`

### 8.7 Doações
- `GET /catalogo-doacoes`
- `GET /catalogo-doacoes/{catalog_id}`
- `POST /catalogo-doacoes`
- `PUT /catalogo-doacoes/{catalog_id}`
- `DELETE /catalogo-doacoes/{catalog_id}`

- `GET /recebimento-doacoes`
- `GET /recebimento-doacoes/{receipt_id}`
- `POST /recebimento-doacoes`
- `PUT /recebimento-doacoes/{receipt_id}`
- `DELETE /recebimento-doacoes/{receipt_id}`

### 8.8 Atendimentos
- `POST /atendimentos`
- `GET /atendimentos`
- `GET /atendimentos/{atendimento_id}`
- `PUT /atendimentos/{atendimento_id}`
- `DELETE /atendimentos/{atendimento_id}`

### 8.9 Gestão de unidades e acompanhamento
- `GET /gestao-unidades`
- `GET /gestao-unidades/{unit_id}`
- `GET /acompanhamento/dashboard`

### 8.10 Classificação por grupo
- `GET /classificacao-grupos`
- `GET /classificacao-grupos/{group_id}`
- `POST /classificacao-grupos/vincular-usuario`
- `DELETE /classificacao-grupos/desvincular-usuario`

---

## 9. Requisitos não funcionais
- segurança por autenticação e autorização
- segregação de escopo por unidade social
- manutenção de histórico e versionamento
- consistência de integridade relacional em PostgreSQL
- padronização do código em Python seguindo PEP 8
- desacoplamento via clean architecture
- baixo acoplamento entre frontend, backend e banco
- disponibilidade de testes automatizados no backend

---

## 10. Critérios de aceite do sistema atual
1. O sistema realiza cadastro de unidades sociais, usuários, colaboradores, atividades e grupos.
2. O usuário pode ser inscrito em atividades e ter frequência registrada por atividade/data.
3. A frequência semanal permite registrar presença/falta e justificar faltas por grupo/turno/semana.
4. O registro de atividades diárias é suportado com validação por data e programação da atividade.
5. O sistema permite criação, envio, revisão e aprovação/reprovação de relatórios institucionais.
6. O cadastro socioassistencial do participante suporta etapas, conclusão, anexos e histórico/versionamento.
7. O módulo de doações permite catálogo e recebimento com validação do perfil do usuário.
8. O sistema mantém acesso restringido por perfil e unidade social.
9. O frontend expõe rotas de gestão, acompanhamento, frequência, relatórios, participantes e controle.
10. O banco de dados preserva integridade referencial, unicidade e histórico de alterações relevantes.

---

## 11. Pendências e evoluções possíveis
- expansão da lógica de desligamento com regras automatizadas mais robustas
- possibilidade de integração com sistemas externos para validação documental e socioassistencial
- melhor detalhamento de indicadores analíticos e dashboards gerenciais
- evolução do fluxo de parecer e assinatura para cenários mais complexos
- refinamento das políticas de retenção e anonimização de dados sensíveis

---

## 12. Conclusão
Este PRD descreve a solução que foi implementada no repositório atual do ACM, incluindo gestão administrativa, frequência, relatórios, cadastro socioassistencial, acompanhamento operacional e módulos de apoio. O documento reflete o estado real do sistema e deve ser usado como referência para manutenção, evolução e novas implementações.
