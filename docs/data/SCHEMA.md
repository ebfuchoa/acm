# Schema de Dados

## Registro de Ocorrências

A funcionalidade utiliza tabelas próprias e mantém histórico institucional sem exclusão física da ocorrência.

- `ocorrencia_categoria`: categorias configuráveis de ocorrência, com `ativo`, `criado_em` e `atualizado_em`.
- `ocorrencia`: registro principal, com número único `OC-AAAA-000000`, unidade social, data e turno do acontecimento, local, categoria, gravidade, status, resolução/cancelamento e auditoria de responsáveis.
- `ocorrencia_pessoa`: pessoas envolvidas, permitindo vínculo com `usuario` ou registro textual para visitante/familiar/pessoa externa.
- `ocorrencia_servico_externo`: acionamentos externos relacionados à ocorrência.
- `ocorrencia_colaborador`: colaboradores envolvidos no atendimento da ocorrência.
- `ocorrencia_historico`: eventos relevantes da ocorrência, como criação, edição, mudança de status, resolução e cancelamento.

O número da ocorrência é gerado pelo backend usando a sequence PostgreSQL `ocorrencia_numero_seq`, evitando `MAX(id) + 1`.
