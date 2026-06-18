# PRD — Sistema de Gestão de Usuários, Atividades, Frequência e Faltas
## ACM-SP (Divisão de Desenvolvimento Social)

## 1. Contexto
A ACM-SP possui uma estrutura com **Matriz** e diversas **Unidades Sociais** no estado de São Paulo.
O sistema deverá suportar gestão de usuários, atividades, presença/faltas e um fluxo institucional de relatórios entre unidades sociais e matriz, com aprovação formal e rastreável.

---

## 2. Objetivo do Produto
Construir um sistema web para:
- Gerenciar usuários atendidos pela ACM.
- Gerenciar atividades diárias (esportes, lúdicas, oficinas de pintura e outras).
- Registrar frequência (presença/falta) por atividade e data.
- Registrar **justificativa de falta** quando aplicável.
- Aplicar políticas de desligamento parametrizáveis por motivos como: excesso de faltas (evasão), desistência, mudança de endereço, transferência e saída da faixa etária de atendimento.
- Permitir emissão, impressão e tramitação de relatórios entre unidades sociais e matriz.
- Garantir à Matriz acesso consolidado e auditável às informações de gestão de todas as unidades sociais (quantidade de usuários por unidade social, faltas, atividades, desligamentos e demais indicadores operacionais).

---

## 3. Escopo da Versão Inicial (MVP Completo)
Inclui:
- Cadastro de unidades sociais, usuários e atividades.
- Controle de acesso por perfil e escopo.
- Registro de frequência por atividade e data.
- Registro e gestão de **justificativas de falta**.
- Regra de faltas por período e atividade.
- Relatórios operacionais/institucionais, impressão e fluxo de aprovação Matriz/Unidade Social.

Não inclui no MVP:
- Desligamento automático definitivo (somente elegibilidade + ação manual autorizada).
- SLA automatizado de aprovação de relatórios.

---

## 4. Perfis de Acesso (RBAC + Escopo)

### 4.1 Administrador Matriz
- Acesso total a todas as unidades sociais.
- Configura parâmetros institucionais.
- Analisa/aprova/reprova relatórios enviados pelas unidades sociais.

### 4.2 Gestor Unidade Social
- Acesso completo aos dados da própria unidade social.
- Supervisiona usuários, atividades, frequência, faltas e relatórios.
- Pode enviar relatórios para matriz.

### 4.3 Operador Unidade Social
- Acesso operacional da própria unidade social.
- Registra presença/falta e justificativas de falta.
- Gera e imprime relatórios.

**Regra obrigatória:** toda operação de leitura/escrita valida `perfil + escopo de unidade social`.

---

## 5. Requisitos Funcionais

### RF-01 — Gestão Organizacional
- Cadastrar e manter Matriz e Unidades Sociais.
- Associar usuários, atividades e dados operacionais à unidade social correta.

### RF-02 — Gestão de Usuários
- Cadastrar usuário com dados pessoais, contatos e status.
- Status: `ativo`, `suspenso`, `desligado`.
- Histórico de status com data, motivo e responsável.

### RF-03 — Gestão de Atividades
- Cadastrar atividades por unidade social (tipo, horário, capacidade, faixa etária).
- Vincular usuários às atividades.
- Ativar/inativar atividade sem perda de histórico.

### RF-04 — Registro de Frequência (Presença/Falta)
- Lançar frequência por usuário/atividade/data.
- Status permitidos: `presente` ou `falta`.
- Permitir lançamento individual e em lote.

### RF-05 — Justificativa de Falta
- Justificativa vinculada a uma **falta já registrada**.
- Campos mínimos: motivo textual obrigatório, data da justificativa, autor.
- Anexo opcional (atestado/declaração).
- Falta passa a estado `falta_justificada` somente após registro válido da justificativa.
- Permitir fluxo de análise da justificativa (quando aplicável): `pendente`, `aceita`, `recusada`.

### RF-06 — Política de Faltas Parametrizável
- Definir regra por atividade e período (ex.: X faltas em Y dias).
- Permitir padrão da Matriz com override por unidade social.
- Cálculo automático de faltas na janela de tempo.
- Considerar no cálculo a política definida para falta justificada (configurável: contar totalmente, parcialmente ou não contar).
- Sinalizar risco e elegibilidade para desligamento.

### RF-07 — Processo de Desligamento
- Desligamento não automático no MVP.
- Exige ação manual de perfil autorizado.
- Registro obrigatório de motivo, data e responsável.

### RF-08 — Relatórios Operacionais
- Indicadores por unidade social: presença, faltas, faltas justificadas, faltas não justificadas, usuários em risco.
- Visão consolidada da matriz com filtros por período, unidade social, atividade, status e motivo de desligamento.
- Painel consolidado da Matriz com, no mínimo: quantidade de usuários por unidade social, quantidade de faltas, taxa de presença, volume de atividades, desligamentos por motivo e pendências operacionais.
- Exportação CSV/PDF.

### RF-09 a RF-14 — Módulo de Relatórios Institucionais (Matriz x Unidade Social)
- Geração, impressão, envio, aprovação/reprovação, reenvio e versionamento.
- Fluxo de status: `rascunho`, `enviado_para_matriz`, `em_analise_matriz`, `aprovado`, `reprovado`.
- Reprovação exige motivo obrigatório e mantém pendência visível na unidade social.
- Matriz deve ter acesso a relatórios consolidados e detalhados de todas as unidades sociais para auditoria e acompanhamento contínuo da operação.

---

## 6. Regras de Negócio Críticas
- **Justificativa é da falta, não da frequência em geral.**
- Não existe “justificativa de presença”.
- Não pode existir justificativa sem falta prévia vinculada.
- Matriz enxerga tudo; unidade social enxerga apenas seu escopo.
- Elegibilidade para desligamento é automática; desligamento efetivo é manual.
- Reprovação de relatório exige motivo obrigatório.
- Histórico e auditoria não podem ser apagados logicamente para fins de rastreio.

---

## 7. Requisitos Não Funcionais
- Segurança (autenticação/autorização), LGPD, trilha de auditoria.
- Isolamento de dados por unidade social.
- Usabilidade para operação diária (desktop e mobile).
- Impressão com padronização institucional e legibilidade.
- A implementação técnica deverá seguir obrigatoriamente as diretrizes definidas na **Seção 12 — Diretrizes Técnicas da Solução**.

---

## 8. Entidades e Interfaces Principais

### 8.1 Entidades
- `Unidade Social`
- `Usuario`
- `Atividade`
- `InscricaoAtividade`
- `Frequencia` (presença/falta)
- `JustificativaFalta` (sempre vinculada a falta)
- `RegraFaltas`
- `HistoricoStatusUsuario`
- `Relatorio`
- `RelatorioVersao`
- `RelatorioAprovacao`
- `RelatorioStatusHistorico`

### 8.2 APIs/Serviços mínimos
- CRUD organizacional/cadastros.
- Registro de frequência (individual/lote).
- Registro e decisão de justificativa de falta.
- Configuração e cálculo de regras de faltas.
- Relatórios: gerar, exportar, imprimir, enviar, aprovar/reprovar, reenviar.
- Painéis de pendência por perfil.

---

## 9. Critérios de Aceite (MVP)

1. Sistema registra presença/falta por usuário, atividade e data.
2. Sistema bloqueia justificativa sem falta previamente registrada.
3. Ao justificar uma falta, o estado passa para `falta_justificada` e mantém auditoria.
4. Regras de desligamento consideram faltas conforme política configurada para faltas justificadas.
5. Matriz visualiza todas as unidades sociais; unidade social não acessa outras.
6. Unidade Social gera e imprime relatório institucional.
7. Relatório enviado entra na fila da matriz.
8. Reprovação sem motivo é bloqueada.
9. Reprovação com motivo aparece como pendência para unidade social.
10. Reenvio cria nova versão preservando histórico completo.

---

## 10. Assunções e Defaults
- Escopo inicial é MVP completo.
- Perfis oficiais: `Administrador Matriz`, `Gestor Unidade Social`, `Operador Unidade Social`.
- Política de faltas é por período e atividade.
- Regra padrão da Matriz pode ser sobrescrita por unidade social.
- Justificativa textual obrigatória; anexo opcional.
- Impressão usa versão institucional em PDF.

---

## 11. Incremento do PRD — Cadastro Socioassistencial Completo do Participante

### 11.1 Visão de Negócio
- Padronizar o cadastro social entre todas as unidades sociais, reduzindo retrabalho e inconsistências do formulário físico.
- Permitir diagnóstico social mais preciso para atendimento, encaminhamento e tomada de decisão.
- Garantir rastreabilidade histórica (atualizações cadastrais, alterações e desligamento) para auditoria institucional e prestação de contas à Matriz.

### 11.2 Estrutura Funcional do Formulário (seções obrigatórias)
- Identificação do participante: nome, idade, data de nascimento, naturalidade, sexo, RG, UF, NIS, filiação (pai e mãe).
- Identificação e situação de trabalho do responsável: nome, idade, sexo, naturalidade, estado civil, escolaridade, RG, CPF, local de trabalho, renda mensal, endereço, telefone, horário, observações.
- Endereço residencial: rua, número, complemento, bairro, município, CEP, telefones de contato.
- Escolaridade do participante: série, tipo de ensino, situação escolar, nome da escola, tipo da escola, bolsa de estudo, horário escolar, observações.
- Composição familiar: múltiplos membros com nome, parentesco, sexo, idade, naturalidade, estado civil, escolaridade.
- Renda familiar: quantidade de pessoas que trabalham, lista de trabalhadores, tipo de atividade, salário, benefícios governamentais, aposentadoria, pensão, renda familiar, renda per capita.
- Condição de saúde: assistência médica, problemas de saúde, alergias, medicamentos, doenças, fraturas, cirurgias, deficiências, observações.
- Situação habitacional: tipo de habitação, tipo de ocupação, quantidade de cômodos, observações.
- Situação familiar e parecer social: informações complementares, expectativas da família, parecer técnico, responsáveis pelo preenchimento, assinaturas.
- Autorizações: participação em atividades externas, saída desacompanhada, responsável legal.
- Desligamento: data, motivo, histórico.

### 11.3 Organização em Etapas Inteligentes de Preenchimento
1. Pré-cadastro: identificação do participante + responsável principal + unidade social.
2. Dados essenciais: endereço, escolaridade e autorizações mínimas.
3. Diagnóstico social: composição familiar, renda, saúde, situação habitacional.
4. Parecer técnico: situação familiar, observações e assinaturas.
5. Revisão e conclusão: validação automática, pendências e confirmação.
6. Pós-cadastro: atualização cadastral, versionamento e desligamento.

### 11.4 Fluxo de Navegação e UX
- Fluxo em wizard por etapas, com barra de progresso e indicador de campos pendentes.
- Salvamento automático por etapa e preenchimento parcial com retomada futura.
- “Rascunho” e “Concluído” como estados do cadastro.
- Busca de CEP para autocompletar endereço e máscaras para CPF/RG/NIS/telefone.
- Experiência responsiva web (desktop/tablet/mobile), priorizando uso por operadores administrativos.
- Acesso rápido a histórico, documentos anexos e situação de aprovação/assinatura.

### 11.5 Regras de Validação (automáticas e de negócio)
- Obrigatórios mínimos para conclusão: identificação do participante, responsável legal, endereço, escolaridade básica, autorizações e parecer técnico.
- Validações sintáticas: CPF válido, CEP válido, formato de telefone, UF com 2 caracteres, datas válidas.
- Validações semânticas: idade coerente com data de nascimento; responsável obrigatório para menor de idade.
- Justificativa de falta permanece vinculada somente à falta registrada.
- Desligamento exige data, motivo padronizado e responsável pelo registro.
- Atualização cadastral exige nova vigência e mantém histórico imutável de versões anteriores.

### 11.6 Modelo de Entidades (visão técnica)
- `Participante`
- `Responsavel`
- `ParticipanteResponsavel` (N:N com papel: legal, financeiro, contato)
- `EnderecoParticipante`
- `EscolaridadeParticipante`
- `ComposicaoFamiliarItem`
- `RendaFamiliar`
- `RendaTrabalhadorItem`
- `SaudeParticipante`
- `SituacaoHabitacional`
- `ParecerSocial`
- `AutorizacaoParticipante`
- `CadastroVersao` (snapshot/versionamento)
- `DesligamentoParticipante`
- `DocumentoAnexo`
- `AssinaturaEletronicaSimples`

### 11.7 Estratégia de Armazenamento
- Banco relacional oficial da solução: PostgreSQL, responsável por entidades transacionais e histórico.
- Armazenamento de anexos em objeto (bucket) com metadados no banco.
- Versionamento por registro lógico (`cadastro_id` + `versao`) e trilha de alterações por campo.
- Soft delete apenas para entidades administrativas; dados socioassistenciais com retenção auditável.

### 11.8 APIs Sugeridas (mínimo)
- `POST /participantes` (pré-cadastro)
- `PUT /participantes/{id}/etapas/{etapa}` (salvar etapa parcial)
- `POST /participantes/{id}/concluir` (fecha cadastro após validações)
- `POST /participantes/{id}/anexos` e `GET /participantes/{id}/anexos`
- `POST /participantes/{id}/assinatura-simples`
- `POST /participantes/{id}/desligamentos`
- `GET /participantes` com filtros avançados
- `GET /participantes/{id}/historico` (versionamento + auditoria)

### 11.9 Permissões e Perfis (cadastro)
- Operador Unidade Social: cria/edita rascunho, anexa documentos, solicita conclusão.
- Gestor Unidade Social: valida cadastro, conclui, atualiza cadastro e inicia desligamento.
- Administrador Matriz: leitura global, auditoria, parâmetros e supervisão de conformidade.
- Regra de escopo: unidade social só acessa seus registros; Matriz tem visão consolidada.

### 11.10 Auditoria, Versionamento e LGPD
- Auditoria por evento: criação, edição, assinatura, atualização cadastral, desligamento, anexos.
- Histórico por campo com `valor_anterior`, `valor_novo`, autor e timestamp.
- Base legal e finalidade por tipo de dado sensível; minimização de coleta.
- Controle de acesso a dados sensíveis de saúde e parecer social por permissão explícita.
- Política de retenção, anonimização para relatórios analíticos e registro de consentimento quando aplicável.

### 11.11 Estratégia de Busca, Filtros, Dashboards e Relatórios
- Busca por nome, NIS, RG/CPF do responsável, unidade social e status.
- Filtros por faixa etária, escolaridade, renda per capita, condição de saúde, situação habitacional e vigência cadastral.
- Dashboard operacional da unidade social: cadastros pendentes, incompletos, vigências cadastrais vencendo, desligamentos por motivo.
- Dashboard da Matriz: comparativo entre unidades sociais, taxa de conclusão cadastral, motivos de desligamento, qualidade de dados.
- Dashboard consolidado da Matriz: quantidade de usuários por unidade social, faltas por período, atividades realizadas por unidade social, desligamentos por motivo e visão geral de conformidade cadastral.
- Relatórios com impressão padronizada e exportação CSV/PDF.

### 11.12 Riscos Técnicos e Operacionais + Mitigações
- Risco de baixa qualidade de dados na migração do formulário físico: mitigar com validações, campos obrigatórios e revisão por gestor.
- Risco de lentidão no preenchimento longo: mitigar com etapas, autosave e retomada.
- Risco de exposição de dados sensíveis: mitigar com criptografia em trânsito/repouso, controle de acesso e trilha de auditoria.
- Risco de inconsistência entre versões de cadastro: mitigar com versionamento imutável e diff por campo.
- Risco operacional em anexos ilegíveis: mitigar com padrão de qualidade, tamanho e formato permitidos.

### 11.13 Melhorias propostas sobre o formulário físico
- Validação automática em tempo real.
- Campos condicionais para reduzir erro de preenchimento.
- Cálculo automático de renda per capita.
- Histórico completo e comparativo entre versões cadastrais.
- Assinatura eletrônica simples para conclusão de etapas.
- Pendências visíveis por etapa com checklist e responsáveis.

### 11.14 Possibilidades de Evolução Futura
- Integração com CadÚnico/NIS e serviços de validação documental.
- Integração com sistemas educacionais para atualização de escolaridade.
- Módulo de atendimento social com plano individual e encaminhamentos.
- Alertas proativos (mudança de faixa etária, atualização cadastral pendente, risco de evasão).
- BI institucional com indicadores preditivos de permanência/desligamento.

---

## 12. Diretrizes Técnicas da Solução

### 12.1 Arquitetura da Solução
A solução deverá ser desenvolvida no formato de sistema web, adotando arquitetura moderna, modular e escalável, garantindo manutenibilidade, padronização de código, desacoplamento entre componentes e facilidade de evolução da plataforma.

### 12.2 Stack Tecnológica Obrigatória
A implementação da solução deverá utilizar obrigatoriamente as seguintes tecnologias:
- Frontend: React.
- Backend: Python.
- Banco de Dados: PostgreSQL.

### 12.3 Diretrizes de Desenvolvimento Backend
O desenvolvimento backend deverá seguir rigorosamente as recomendações estabelecidas pelo guia oficial **PEP 8 — Style Guide for Python Code**, garantindo padronização, legibilidade, organização e consistência do código-fonte.

Além disso, a implementação deverá adotar:
- **Clean Architecture**, promovendo separação de responsabilidades, independência entre camadas, desacoplamento de regras de negócio e facilidade de manutenção.
- **Princípios SOLID**, assegurando flexibilidade, extensibilidade e redução de acoplamento entre os componentes da aplicação.

### 12.4 Estrutura Arquitetural em Camadas
A arquitetura da solução deverá ser organizada de forma desacoplada, segregando claramente:
- Camada de apresentação.
- Camada de aplicação.
- Camada de domínio.
- Camada de infraestrutura.
- Camada de persistência de dados.

As regras de negócio deverão permanecer isoladas de frameworks, bibliotecas externas e detalhes de infraestrutura, garantindo independência tecnológica e maior capacidade de evolução da solução.

### 12.5 Diretrizes de Banco de Dados
O sistema deverá utilizar o PostgreSQL como banco de dados relacional oficial da solução, sendo responsável pelo armazenamento persistente das informações da aplicação.

A modelagem de dados deverá considerar:
- Integridade relacional.
- Escalabilidade.
- Performance de consultas.
- Normalização adequada.
- Controle transacional.
- Segurança e consistência dos dados.

### 12.6 Boas Práticas Gerais
O desenvolvimento deverá seguir boas práticas de engenharia de software, incluindo:
- Padronização de nomenclatura.
- Modularização de componentes.
- Tratamento estruturado de exceções.
- Separação entre regras de negócio e infraestrutura.
- Reutilização de código.
- Facilidade de testes unitários e integração.
- Organização orientada à manutenibilidade e escalabilidade da solução.
