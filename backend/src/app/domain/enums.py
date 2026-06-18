from enum import Enum


class UserStatus(str, Enum):
    ACTIVE = "ativo"
    INACTIVE = "inativo"
    SUSPENDED = "suspenso"
    DISMISSED = "desligado"


class AttendanceStatus(str, Enum):
    PRESENT = "presente"
    ABSENT = "falta"
    JUSTIFIED_ABSENT = "falta_justificada"


class JustificationStatus(str, Enum):
    PENDING = "pendente"
    ACCEPTED = "aceita"
    REJECTED = "recusada"


class ReportStatus(str, Enum):
    DRAFT = "rascunho"
    SENT = "enviado_para_matriz"
    IN_REVIEW = "em_analise_matriz"
    APPROVED = "aprovado"
    REJECTED = "reprovado"
