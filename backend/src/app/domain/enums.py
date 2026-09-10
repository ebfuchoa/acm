from enum import Enum


class UserStatus(str, Enum):
    ACTIVE = "ativo"
    INACTIVE = "inativo"
    SUSPENDED = "suspenso"
    DISMISSED = "desligado"


class UserMovementType(str, Enum):
    ENTRADA = "ENTRADA"
    SAIDA = "SAIDA"


class ReportStatus(str, Enum):
    DRAFT = "rascunho"
    SENT = "enviado_para_matriz"
    IN_REVIEW = "em_analise_matriz"
    APPROVED = "aprovado"
    REJECTED = "reprovado"
