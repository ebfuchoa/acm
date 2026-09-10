# Regras do Sistema

## Registro de Ocorrências

- Ocorrência é independente de atividades, atendimentos e agenda programada.
- Toda ocorrência pertence à unidade social do colaborador que realizou o registro.
- Usuários não administradores acessam apenas ocorrências da própria unidade social.
- Toda ocorrência inicia como `Aberta`, salvo quando o usuário autorizado registrar diretamente como `Resolvida` ou `Cancelada` com as informações obrigatórias.
- Ocorrência `Resolvida` exige desfecho/resolução.
- Ocorrência `Cancelada` exige motivo de cancelamento.
- Ocorrências não são excluídas fisicamente; cancelamento preserva o histórico institucional.
- Alterações relevantes geram registros em `ocorrencia_historico`.
