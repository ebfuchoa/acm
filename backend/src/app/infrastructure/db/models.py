from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import AttendanceStatus, JustificationStatus, ReportStatus, UserStatus
from app.infrastructure.db.base import Base


class Unit(Base):
    __tablename__ = "unidades_sociais"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("nome", String(150), unique=True)
    address: Mapped[str] = mapped_column("endereco", String(255))
    district: Mapped[str] = mapped_column("bairro", String(100))
    city: Mapped[str] = mapped_column("cidade", String(100))
    zip_code: Mapped[str] = mapped_column("cep", String(9))
    state: Mapped[str] = mapped_column("estado", String(2))
    phone: Mapped[str] = mapped_column("telefone", String(20))
    email: Mapped[str] = mapped_column("email", String(150), unique=True)
    is_matrix: Mapped[bool] = mapped_column("e_matriz", Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )


class Atendimento(Base):
    __tablename__ = "atendimentos"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unidade_social_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidades_sociais.id"))
    colaborador_id: Mapped[int | None] = mapped_column(
        "colaborador_id",
        ForeignKey("colaboradores.id", ondelete="SET NULL"),
        nullable=True,
    )
    atendente_nome: Mapped[str] = mapped_column("atendente_nome", String(200))
    atendente_funcao: Mapped[str] = mapped_column("atendente_funcao", String(80))
    data_atendimento: Mapped[date] = mapped_column("data_atendimento", Date)
    nome: Mapped[str] = mapped_column("nome", String(200))
    demanda: Mapped[str] = mapped_column("demanda", Text)
    criado_em: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )


class User(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unit_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidades_sociais.id"))
    name: Mapped[str] = mapped_column("nome", String(200))
    age: Mapped[int] = mapped_column("idade", Integer)
    birth_date: Mapped[date] = mapped_column("data_nascimento", Date)
    birth_place: Mapped[str] = mapped_column("naturalidade", String(150))
    gender: Mapped[str] = mapped_column("sexo", String(20))
    rg: Mapped[str] = mapped_column("rg", String(20), unique=True)
    rg_uf: Mapped[str] = mapped_column("rg_uf", String(2))
    nis_number: Mapped[str] = mapped_column("numero_nis", String(20), unique=True)
    shift: Mapped[str] = mapped_column("turno", String(20))
    father_name: Mapped[str | None] = mapped_column("nome_pai", String(200), nullable=True)
    mother_name: Mapped[str | None] = mapped_column("nome_mae", String(200), nullable=True)
    responsible_name: Mapped[str] = mapped_column("responsavel_nome", String(200))
    responsible_age: Mapped[int] = mapped_column("responsavel_idade", Integer)
    responsible_gender: Mapped[str] = mapped_column("responsavel_sexo", String(20))
    responsible_birth_place: Mapped[str] = mapped_column("responsavel_naturalidade", String(150))
    responsible_marital_status: Mapped[str] = mapped_column("responsavel_estado_civil", String(20))
    responsible_education: Mapped[str] = mapped_column("responsavel_escolaridade", String(120))
    responsible_rg: Mapped[str] = mapped_column("responsavel_rg", String(20))
    responsible_issuing_agency_uf: Mapped[str] = mapped_column("responsavel_orgao_emissor_uf", String(40))
    responsible_cpf: Mapped[str] = mapped_column("responsavel_cpf", String(14))
    responsible_workplace: Mapped[str | None] = mapped_column("responsavel_local_trabalho", String(180), nullable=True)
    responsible_income: Mapped[float | None] = mapped_column("responsavel_renda_bruta", Numeric(12, 2), nullable=True)
    responsible_state: Mapped[str | None] = mapped_column("responsavel_estado", String(2), nullable=True)
    responsible_city: Mapped[str | None] = mapped_column("responsavel_municipio", String(100), nullable=True)
    responsible_phone: Mapped[str | None] = mapped_column("responsavel_telefone", String(20), nullable=True)
    responsible_schedule: Mapped[str | None] = mapped_column("responsavel_horario", String(20), nullable=True)
    responsible_notes: Mapped[str | None] = mapped_column("responsavel_observacao", Text, nullable=True)
    residential_street: Mapped[str] = mapped_column("residencial_logradouro", String(200))
    residential_number: Mapped[str] = mapped_column("residencial_numero", String(20))
    residential_complement: Mapped[str | None] = mapped_column("residencial_complemento", String(100), nullable=True)
    residential_district: Mapped[str] = mapped_column("residencial_bairro", String(100))
    residential_city: Mapped[str] = mapped_column("residencial_municipio", String(100))
    residential_zip_code: Mapped[str] = mapped_column("residencial_cep", String(9))
    residential_phone: Mapped[str] = mapped_column("residencial_telefone", String(20))
    residential_contact_notes: Mapped[str | None] = mapped_column("residencial_contato_familia", Text, nullable=True)
    school_grade: Mapped[str] = mapped_column("escolaridade_serie", String(40))
    school_education_level: Mapped[str] = mapped_column("escolaridade_ensino", String(20))
    school_is_currently_enrolled: Mapped[str] = mapped_column("escolaridade_esta_cursando", String(3))
    school_name: Mapped[str] = mapped_column("escolaridade_nome_escola", String(200))
    school_type: Mapped[str] = mapped_column("escolaridade_tipo", String(20))
    school_is_scholarship_holder: Mapped[str] = mapped_column("escolaridade_e_bolsista", String(3))
    school_scholarship_percentage: Mapped[int | None] = mapped_column("escolaridade_percentual_bolsa", Integer, nullable=True)
    school_schedule: Mapped[str] = mapped_column("escolaridade_horario", String(20))
    school_notes: Mapped[str | None] = mapped_column("escolaridade_observacao", Text, nullable=True)
    status: Mapped[UserStatus] = mapped_column(
        "status",
        Enum(
            UserStatus,
            name="userstatus",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        default=UserStatus.ACTIVE.value,
    )
    status_updated_at: Mapped[datetime | None] = mapped_column(
        "data_atualizacao_status",
        DateTime,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    unit = relationship("Unit")
    composicao_familiar = relationship(
        "ComposicaoFamiliar",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
    situacao_habitacional = relationship(
        "SituacaoHabitacional",
        back_populates="usuario",
        cascade="all, delete-orphan",
        uselist=False,
    )
    condicao_saude = relationship(
        "CondicaoSaude",
        back_populates="usuario",
        cascade="all, delete-orphan",
        uselist=False,
    )
    situacao_familiar = relationship(
        "SituacaoFamiliar",
        back_populates="usuario",
        cascade="all, delete-orphan",
        uselist=False,
    )
    parecer = relationship(
        "ParecerUsuario",
        back_populates="usuario",
        cascade="all, delete-orphan",
        uselist=False,
    )
    user_groups = relationship(
        "UserGroup",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class ComposicaoFamiliar(Base):
    __tablename__ = "composicoes_familiares"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"))
    nome: Mapped[str] = mapped_column("nome", String(200))
    parentesco: Mapped[str] = mapped_column("parentesco", String(80))
    sexo: Mapped[str] = mapped_column("sexo", String(20))
    idade: Mapped[int] = mapped_column("idade", Integer)
    naturalidade: Mapped[str] = mapped_column("naturalidade", String(150))
    estado_civil: Mapped[str] = mapped_column("estado_civil", String(40))
    escolaridade: Mapped[str] = mapped_column("escolaridade", String(120))
    criado_em: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    usuario = relationship("User", back_populates="composicao_familiar")


class SituacaoHabitacional(Base):
    __tablename__ = "situacoes_habitacionais"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True)
    tipo_habitacao: Mapped[str | None] = mapped_column("tipo_habitacao", String(40), nullable=True)
    tipo_habitacao_outro: Mapped[str | None] = mapped_column("tipo_habitacao_outro", String(120), nullable=True)
    ocupacao: Mapped[str | None] = mapped_column("ocupacao", String(60), nullable=True)
    valor_imovel_em_pagamento: Mapped[float | None] = mapped_column("valor_imovel_em_pagamento", Numeric(12, 2), nullable=True)
    valor_aluguel: Mapped[float | None] = mapped_column("valor_aluguel", Numeric(12, 2), nullable=True)
    ocupacao_outro: Mapped[str | None] = mapped_column("ocupacao_outro", String(120), nullable=True)
    numero_comodos: Mapped[str | None] = mapped_column("numero_comodos", String(20), nullable=True)
    observacoes: Mapped[str | None] = mapped_column("observacoes", Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    usuario = relationship("User", back_populates="situacao_habitacional")


class CondicaoSaude(Base):
    __tablename__ = "condicoes_saude"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True)
    assistencia_medica: Mapped[str | None] = mapped_column("assistencia_medica", Text, nullable=True)
    problema_saude: Mapped[str | None] = mapped_column("problema_saude", Text, nullable=True)
    alergia: Mapped[str | None] = mapped_column("alergia", Text, nullable=True)
    medicamento: Mapped[str | None] = mapped_column("medicamento", Text, nullable=True)
    doencas_anteriores: Mapped[str | None] = mapped_column("doencas_anteriores", Text, nullable=True)
    fratura: Mapped[str | None] = mapped_column("fratura", Text, nullable=True)
    cirurgia: Mapped[str | None] = mapped_column("cirurgia", Text, nullable=True)
    deficiencia: Mapped[str | None] = mapped_column("deficiencia", Text, nullable=True)
    observacoes: Mapped[str | None] = mapped_column("observacoes", Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    usuario = relationship("User", back_populates="condicao_saude")


class SituacaoFamiliar(Base):
    __tablename__ = "situacao_familiar"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True)
    informacoes_situacao_familiar: Mapped[str | None] = mapped_column("informacoes_situacao_familiar", Text, nullable=True)
    expectativas_participacao_projeto: Mapped[str | None] = mapped_column("expectativas_participacao_projeto", Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    usuario = relationship("User", back_populates="situacao_familiar")


class ParecerUsuario(Base):
    __tablename__ = "parecer"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True)
    parecer: Mapped[str | None] = mapped_column("parecer", Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    usuario = relationship("User", back_populates="parecer")


class Activity(Base):
    __tablename__ = "atividades"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unit_id: Mapped[int | None] = mapped_column("unidade_social_id", ForeignKey("unidades_sociais.id"), nullable=True)
    group_id: Mapped[int | None] = mapped_column("grupo_id", ForeignKey("grupos.id"), nullable=True)
    name: Mapped[str] = mapped_column("nome", String(255))
    description: Mapped[str | None] = mapped_column("descricao", Text, nullable=True)
    category: Mapped[str] = mapped_column("categoria", String(80))
    schedule: Mapped[str] = mapped_column("horario", String(80))
    min_age: Mapped[int] = mapped_column("idade_minima", Integer, default=0)
    max_age: Mapped[int] = mapped_column("idade_maxima", Integer, default=120)
    capacity: Mapped[int] = mapped_column("capacidade", Integer, default=30)
    is_active: Mapped[bool] = mapped_column("ativo", Boolean, default=True)
    created_at: Mapped[datetime | None] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )
    activity_groups = relationship(
        "ActivityGroup",
        back_populates="activity",
        cascade="all, delete-orphan",
    )
    activity_weekdays = relationship(
        "ActivityWeekday",
        back_populates="activity",
        cascade="all, delete-orphan",
    )

    @property
    def group_ids(self) -> list[int]:
        if self.activity_groups:
            return [item.group_id for item in self.activity_groups]
        if self.group_id is not None:
            return [self.group_id]
        return []

    @property
    def dias_semana(self) -> list[str]:
        return [item.weekday for item in self.activity_weekdays or []]


class Group(Base):
    __tablename__ = "grupos"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("nome", String(255), unique=True)
    shift: Mapped[str] = mapped_column("turno", String(50))
    initial_age: Mapped[int] = mapped_column("idade_inicial", Integer)
    final_age: Mapped[int] = mapped_column("idade_final", Integer)
    created_at: Mapped[datetime | None] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )
    activity_groups = relationship(
        "ActivityGroup",
        back_populates="group",
        cascade="all, delete-orphan",
    )
    user_groups = relationship(
        "UserGroup",
        back_populates="group",
        cascade="all, delete-orphan",
    )


class UserGroup(Base):
    __tablename__ = "usuarios_grupos"
    __table_args__ = (UniqueConstraint("usuario_id", "grupo_id", name="uq_usuario_grupo"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column("grupo_id", ForeignKey("grupos.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    user = relationship("User", back_populates="user_groups")
    group = relationship("Group", back_populates="user_groups")


class ActivityGroup(Base):
    __tablename__ = "atividades_grupos"
    __table_args__ = (UniqueConstraint("atividade_id", "grupo_id", name="uq_atividade_grupo"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    activity_id: Mapped[int] = mapped_column("atividade_id", ForeignKey("atividades.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column("grupo_id", ForeignKey("grupos.id", ondelete="CASCADE"))

    activity = relationship("Activity", back_populates="activity_groups")
    group = relationship("Group", back_populates="activity_groups")


class ActivityWeekday(Base):
    __tablename__ = "atividades_dias_semana"
    __table_args__ = (
        UniqueConstraint("atividade_id", "dia_semana", name="uq_atividade_dia_semana"),
    )

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    activity_id: Mapped[int] = mapped_column("atividade_id", ForeignKey("atividades.id", ondelete="CASCADE"))
    weekday: Mapped[str] = mapped_column("dia_semana", String(20))
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    activity = relationship("Activity", back_populates="activity_weekdays")


class Enrollment(Base):
    __tablename__ = "inscricoes"
    __table_args__ = (UniqueConstraint("usuario_id", "atividade_id", name="uq_usuario_atividade"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuarios.id"))
    activity_id: Mapped[int] = mapped_column("atividade_id", ForeignKey("atividades.id"))


class Attendance(Base):
    __tablename__ = "frequencias"
    __table_args__ = (UniqueConstraint("usuario_id", "atividade_id", "data_frequencia", name="uq_frequencia"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuarios.id"))
    activity_id: Mapped[int] = mapped_column("atividade_id", ForeignKey("atividades.id"))
    attendance_date: Mapped[date] = mapped_column("data_frequencia", Date)
    status: Mapped[AttendanceStatus] = mapped_column("status", Enum(AttendanceStatus))


class GroupAttendance(Base):
    __tablename__ = "frequencias_grupos"
    __table_args__ = (
        UniqueConstraint("usuario_id", "grupo_id", "turno", "data_frequencia", name="uq_frequencia_grupo"),
    )

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column("grupo_id", ForeignKey("grupos.id", ondelete="CASCADE"))
    shift: Mapped[str] = mapped_column("turno", String(20))
    attendance_date: Mapped[date] = mapped_column("data_frequencia", Date)
    present: Mapped[bool] = mapped_column("presente", Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )


class AbsenceJustification(Base):
    __tablename__ = "justificativas_falta"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    attendance_id: Mapped[int] = mapped_column("frequencia_id", ForeignKey("frequencias.id"), unique=True)
    reason: Mapped[str] = mapped_column("motivo", Text)
    author_name: Mapped[str] = mapped_column("autor_nome", String(120))
    justification_date: Mapped[date] = mapped_column("data_justificativa", Date)
    attachment_url: Mapped[str | None] = mapped_column("url_anexo", String(255), nullable=True)
    status: Mapped[JustificationStatus] = mapped_column(
        "status",
        Enum(JustificationStatus),
        default=JustificationStatus.PENDING,
    )


class Report(Base):
    __tablename__ = "relatorios"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unit_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidades_sociais.id"))
    title: Mapped[str] = mapped_column("titulo", String(200))
    status: Mapped[ReportStatus] = mapped_column("status", Enum(ReportStatus), default=ReportStatus.DRAFT)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow)


class ReportVersion(Base):
    __tablename__ = "versoes_relatorio"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column("relatorio_id", ForeignKey("relatorios.id"))
    version_number: Mapped[int] = mapped_column("numero_versao", Integer)
    content: Mapped[dict] = mapped_column("conteudo", JSON)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow)


class ReportApproval(Base):
    __tablename__ = "aprovacoes_relatorio"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column("relatorio_id", ForeignKey("relatorios.id"))
    decision: Mapped[ReportStatus] = mapped_column("decisao", Enum(ReportStatus))
    reviewer_name: Mapped[str] = mapped_column("revisor_nome", String(120))
    reason: Mapped[str | None] = mapped_column("motivo", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow)


class Participant(Base):
    __tablename__ = "participantes"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unit_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidades_sociais.id"))
    full_name: Mapped[str] = mapped_column("nome_completo", String(180))
    birth_date: Mapped[date] = mapped_column("data_nascimento", Date)
    nis: Mapped[str | None] = mapped_column("nis", String(30), nullable=True)
    status: Mapped[str] = mapped_column("status", String(20), default="rascunho")
    current_data: Mapped[dict] = mapped_column("dados_atuais", JSON, default={})


class ParticipantVersion(Base):
    __tablename__ = "versoes_participante"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    participant_id: Mapped[int] = mapped_column("participante_id", ForeignKey("participantes.id"))
    version_number: Mapped[int] = mapped_column("numero_versao", Integer)
    payload: Mapped[dict] = mapped_column("payload", JSON)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow)


class ParticipantAttachment(Base):
    __tablename__ = "anexos_participante"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    participant_id: Mapped[int] = mapped_column("participante_id", ForeignKey("participantes.id"))
    file_name: Mapped[str] = mapped_column("nome_arquivo", String(180))
    url: Mapped[str] = mapped_column("url", String(255))
    uploaded_at: Mapped[datetime] = mapped_column("enviado_em", DateTime, default=datetime.utcnow)


class Profile(Base):
    __tablename__ = "perfis"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("nome", String(100), unique=True)
    description: Mapped[str | None] = mapped_column("descricao", Text, nullable=True)


class Permission(Base):
    __tablename__ = "permissoes"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    code: Mapped[str] = mapped_column("codigo", String(120), unique=True)
    description: Mapped[str | None] = mapped_column("descricao", Text, nullable=True)


class ProfilePermission(Base):
    __tablename__ = "perfis_permissoes"
    __table_args__ = (UniqueConstraint("perfil_id", "permissao_id", name="uq_perfil_permissao"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column("perfil_id", ForeignKey("perfis.id"))
    permission_id: Mapped[int] = mapped_column("permissao_id", ForeignKey("permissoes.id"))


class UserSocialUnit(Base):
    __tablename__ = "usuarios_unidades_sociais"
    __table_args__ = (UniqueConstraint("usuario_id", "unidade_social_id", name="uq_usuario_unidade_social"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuarios.id"))
    social_unit_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidades_sociais.id"))


class Collaborator(Base):
    __tablename__ = "colaboradores"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("nome", String(200))
    cpf: Mapped[str] = mapped_column("cpf", String(14), unique=True)
    role: Mapped[str] = mapped_column("funcao", String(80))
    social_unit_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidades_sociais.id"))
    email: Mapped[str] = mapped_column("email", String(180), unique=True)
    password_hash: Mapped[str] = mapped_column("hash_senha", String(255))
    is_active: Mapped[bool] = mapped_column("ativo", Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column("administrador", Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )
