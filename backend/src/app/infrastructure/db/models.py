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

from app.domain.enums import AttendanceStatus, JustificationStatus, ReportStatus, UserMovementType, UserStatus
from app.infrastructure.db.base import Base


class Unit(Base):
    __tablename__ = "unidade_social"

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
    __tablename__ = "atendimento"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unidade_social_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidade_social.id"))
    colaborador_id: Mapped[int | None] = mapped_column(
        "colaborador_id",
        ForeignKey("colaborador.id", ondelete="SET NULL"),
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
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unit_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidade_social.id"))
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
    movements = relationship("UserMovement", back_populates="user")
    responsible = relationship(
        "UserResponsible",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    residential = relationship(
        "UserResidential",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    schooling = relationship(
        "UserSchooling",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )

    @property
    def responsible_name(self) -> str | None:
        return self.responsible.name if self.responsible else None

    @property
    def responsible_age(self) -> int | None:
        return self.responsible.age if self.responsible else None

    @property
    def responsible_gender(self) -> str | None:
        return self.responsible.gender if self.responsible else None

    @property
    def responsible_birth_place(self) -> str | None:
        return self.responsible.birth_place if self.responsible else None

    @property
    def responsible_marital_status(self) -> str | None:
        return self.responsible.marital_status if self.responsible else None

    @property
    def responsible_education(self) -> str | None:
        return self.responsible.education if self.responsible else None

    @property
    def responsible_rg(self) -> str | None:
        return self.responsible.rg if self.responsible else None

    @property
    def responsible_issuing_agency_uf(self) -> str | None:
        return self.responsible.issuing_agency_uf if self.responsible else None

    @property
    def responsible_cpf(self) -> str | None:
        return self.responsible.cpf if self.responsible else None

    @property
    def responsible_workplace(self) -> str | None:
        return self.responsible.workplace if self.responsible else None

    @property
    def responsible_income(self) -> float | None:
        return self.responsible.income if self.responsible else None

    @property
    def responsible_state(self) -> str | None:
        return self.responsible.state if self.responsible else None

    @property
    def responsible_city(self) -> str | None:
        return self.responsible.city if self.responsible else None

    @property
    def responsible_phone(self) -> str | None:
        return self.responsible.phone if self.responsible else None

    @property
    def responsible_schedule(self) -> str | None:
        return self.responsible.schedule if self.responsible else None

    @property
    def responsible_notes(self) -> str | None:
        return self.responsible.notes if self.responsible else None

    @property
    def residential_street(self) -> str | None:
        return self.residential.street if self.residential else None

    @property
    def residential_number(self) -> str | None:
        return self.residential.number if self.residential else None

    @property
    def residential_complement(self) -> str | None:
        return self.residential.complement if self.residential else None

    @property
    def residential_district(self) -> str | None:
        return self.residential.district if self.residential else None

    @property
    def residential_city(self) -> str | None:
        return self.residential.city if self.residential else None

    @property
    def residential_zip_code(self) -> str | None:
        return self.residential.zip_code if self.residential else None

    @property
    def residential_phone(self) -> str | None:
        return self.residential.phone if self.residential else None

    @property
    def residential_contact_notes(self) -> str | None:
        return self.residential.contact_notes if self.residential else None

    @property
    def school_grade(self) -> str | None:
        return self.schooling.grade if self.schooling else None

    @property
    def school_education_level(self) -> str | None:
        return self.schooling.education_level if self.schooling else None

    @property
    def school_is_currently_enrolled(self) -> str | None:
        return self.schooling.is_currently_enrolled if self.schooling else None

    @property
    def school_name(self) -> str | None:
        return self.schooling.name if self.schooling else None

    @property
    def school_type(self) -> str | None:
        return self.schooling.type if self.schooling else None

    @property
    def school_is_scholarship_holder(self) -> str | None:
        return self.schooling.is_scholarship_holder if self.schooling else None

    @property
    def school_scholarship_percentage(self) -> int | None:
        return self.schooling.scholarship_percentage if self.schooling else None

    @property
    def school_schedule(self) -> str | None:
        return self.schooling.schedule if self.schooling else None

    @property
    def school_notes(self) -> str | None:
        return self.schooling.notes if self.schooling else None


class UserResponsible(Base):
    __tablename__ = "usuario_responsavel"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"), unique=True)
    name: Mapped[str] = mapped_column("nome", String(200))
    age: Mapped[int] = mapped_column("idade", Integer)
    gender: Mapped[str] = mapped_column("sexo", String(20))
    birth_place: Mapped[str] = mapped_column("naturalidade", String(150))
    marital_status: Mapped[str] = mapped_column("estado_civil", String(20))
    education: Mapped[str] = mapped_column("escolaridade", String(120))
    rg: Mapped[str] = mapped_column("rg", String(20))
    issuing_agency_uf: Mapped[str] = mapped_column("orgao_emissor_uf", String(40))
    cpf: Mapped[str] = mapped_column("cpf", String(14))
    workplace: Mapped[str | None] = mapped_column("local_trabalho", String(180), nullable=True)
    income: Mapped[float | None] = mapped_column("renda_bruta", Numeric(12, 2), nullable=True)
    state: Mapped[str | None] = mapped_column("estado", String(2), nullable=True)
    city: Mapped[str | None] = mapped_column("municipio", String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column("telefone", String(20), nullable=True)
    schedule: Mapped[str | None] = mapped_column("horario", String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column("observacao", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    user = relationship("User", back_populates="responsible")


class UserResidential(Base):
    __tablename__ = "usuario_residencial"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"), unique=True)
    street: Mapped[str] = mapped_column("logradouro", String(200))
    number: Mapped[str] = mapped_column("numero", String(20))
    complement: Mapped[str | None] = mapped_column("complemento", String(100), nullable=True)
    district: Mapped[str] = mapped_column("bairro", String(100))
    city: Mapped[str] = mapped_column("municipio", String(100))
    zip_code: Mapped[str] = mapped_column("cep", String(9))
    phone: Mapped[str] = mapped_column("telefone", String(20))
    contact_notes: Mapped[str | None] = mapped_column("contato_familia", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    user = relationship("User", back_populates="residential")


class UserSchooling(Base):
    __tablename__ = "usuario_escolaridade"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"), unique=True)
    grade: Mapped[str] = mapped_column("serie", String(40))
    education_level: Mapped[str] = mapped_column("ensino", String(20))
    is_currently_enrolled: Mapped[str] = mapped_column("esta_cursando", String(3))
    name: Mapped[str] = mapped_column("nome_escola", String(200))
    type: Mapped[str] = mapped_column("tipo", String(20))
    is_scholarship_holder: Mapped[str] = mapped_column("e_bolsista", String(3))
    scholarship_percentage: Mapped[int | None] = mapped_column("percentual_bolsa", Integer, nullable=True)
    schedule: Mapped[str] = mapped_column("horario", String(20))
    notes: Mapped[str | None] = mapped_column("observacao", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "atualizado_em",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    user = relationship("User", back_populates="schooling")


class UserMovement(Base):
    __tablename__ = "usuario_movimentacao"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("user_id", ForeignKey("usuario.id"), index=True)
    movement_type: Mapped[UserMovementType] = mapped_column(
        "movement_type",
        Enum(
            UserMovementType,
            name="tipo_movimentacao_usuario",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        index=True,
    )
    movement_date: Mapped[date] = mapped_column("movement_date", Date, index=True)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    user = relationship("User", back_populates="movements")


class ComposicaoFamiliar(Base):
    __tablename__ = "usuario_composicao_familiar"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"))
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
    __tablename__ = "usuario_situacao_habitacional"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"), unique=True)
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
    __tablename__ = "usuario_condicao_saude"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"), unique=True)
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
    __tablename__ = "usuario_situacao_familiar"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"), unique=True)
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
    __tablename__ = "usuario_parecer"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"), unique=True)
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
    __tablename__ = "atividade"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unit_id: Mapped[int | None] = mapped_column("unidade_social_id", ForeignKey("unidade_social.id"), nullable=True)
    group_id: Mapped[int | None] = mapped_column("grupo_id", ForeignKey("grupo.id"), nullable=True)
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
    __tablename__ = "grupo"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unit_id: Mapped[int | None] = mapped_column("unidade_social_id", ForeignKey("unidade_social.id"), nullable=True)
    name: Mapped[str] = mapped_column("nome", String(255))
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
    __tablename__ = "usuario_grupo"
    __table_args__ = (UniqueConstraint("usuario_id", "grupo_id", name="uq_usuario_grupo"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column("grupo_id", ForeignKey("grupo.id", ondelete="CASCADE"))
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
    __tablename__ = "atividade_grupo"
    __table_args__ = (UniqueConstraint("atividade_id", "grupo_id", name="uq_atividade_grupo"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    activity_id: Mapped[int] = mapped_column("atividade_id", ForeignKey("atividade.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column("grupo_id", ForeignKey("grupo.id", ondelete="CASCADE"))

    activity = relationship("Activity", back_populates="activity_groups")
    group = relationship("Group", back_populates="activity_groups")


class ActivityWeekday(Base):
    __tablename__ = "atividade_dia_semana"
    __table_args__ = (
        UniqueConstraint("atividade_id", "dia_semana", name="uq_atividade_dia_semana"),
    )

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    activity_id: Mapped[int] = mapped_column("atividade_id", ForeignKey("atividade.id", ondelete="CASCADE"))
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


class DailyActivityRecord(Base):
    __tablename__ = "registro_atividade_diaria"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    activity_date: Mapped[date] = mapped_column("data_atividade", Date)
    shift: Mapped[str] = mapped_column("turno", String(20))
    period: Mapped[str] = mapped_column("periodo", String(20))
    start_time: Mapped[str] = mapped_column("horario_inicio", String(5))
    end_time: Mapped[str] = mapped_column("horario_fim", String(5))
    educator_id: Mapped[int] = mapped_column("educadora_id", ForeignKey("colaborador.id"))
    activity_id: Mapped[int] = mapped_column("atividade_id", ForeignKey("atividade.id"))
    group_id: Mapped[int | None] = mapped_column("grupo_id", ForeignKey("grupo.id"), nullable=True)
    description: Mapped[str | None] = mapped_column("descricao_realizada", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )
    deleted_at: Mapped[datetime | None] = mapped_column("deleted_at", DateTime, nullable=True)
    created_by: Mapped[int | None] = mapped_column("created_by", ForeignKey("colaborador.id"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column("updated_by", ForeignKey("colaborador.id"), nullable=True)

    educator = relationship("Collaborator", foreign_keys=[educator_id])
    activity = relationship("Activity")
    group = relationship("Group")


class Enrollment(Base):
    __tablename__ = "inscricao"
    __table_args__ = (UniqueConstraint("usuario_id", "atividade_id", name="uq_usuario_atividade"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id"))
    activity_id: Mapped[int] = mapped_column("atividade_id", ForeignKey("atividade.id"))


class Attendance(Base):
    __tablename__ = "frequencia"
    __table_args__ = (UniqueConstraint("usuario_id", "atividade_id", "data_frequencia", name="uq_frequencia"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id"))
    activity_id: Mapped[int] = mapped_column("atividade_id", ForeignKey("atividade.id"))
    attendance_date: Mapped[date] = mapped_column("data_frequencia", Date)
    status: Mapped[AttendanceStatus] = mapped_column("status", Enum(AttendanceStatus))


class GroupAttendance(Base):
    __tablename__ = "frequencia_grupo"
    __table_args__ = (
        UniqueConstraint("usuario_id", "grupo_id", "turno", "data_frequencia", name="uq_frequencia_grupo"),
    )

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column("grupo_id", ForeignKey("grupo.id", ondelete="CASCADE"))
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
    __tablename__ = "justificativa_falta"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    attendance_id: Mapped[int] = mapped_column("frequencia_id", ForeignKey("frequencia.id"), unique=True)
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
    __tablename__ = "relatorio"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unit_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidade_social.id"))
    title: Mapped[str] = mapped_column("titulo", String(200))
    status: Mapped[ReportStatus] = mapped_column("status", Enum(ReportStatus), default=ReportStatus.DRAFT)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow)


class ReportVersion(Base):
    __tablename__ = "versao_relatorio"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column("relatorio_id", ForeignKey("relatorio.id"))
    version_number: Mapped[int] = mapped_column("numero_versao", Integer)
    content: Mapped[dict] = mapped_column("conteudo", JSON)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow)


class ReportApproval(Base):
    __tablename__ = "aprovacao_relatorio"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column("relatorio_id", ForeignKey("relatorio.id"))
    decision: Mapped[ReportStatus] = mapped_column("decisao", Enum(ReportStatus))
    reviewer_name: Mapped[str] = mapped_column("revisor_nome", String(120))
    reason: Mapped[str | None] = mapped_column("motivo", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow)


class Participant(Base):
    __tablename__ = "participante"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    unit_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidade_social.id"))
    full_name: Mapped[str] = mapped_column("nome_completo", String(180))
    birth_date: Mapped[date] = mapped_column("data_nascimento", Date)
    nis: Mapped[str | None] = mapped_column("nis", String(30), nullable=True)
    status: Mapped[str] = mapped_column("status", String(20), default="rascunho")
    current_data: Mapped[dict] = mapped_column("dados_atuais", JSON, default={})


class ParticipantVersion(Base):
    __tablename__ = "versao_participante"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    participant_id: Mapped[int] = mapped_column("participante_id", ForeignKey("participante.id"))
    version_number: Mapped[int] = mapped_column("numero_versao", Integer)
    payload: Mapped[dict] = mapped_column("payload", JSON)
    created_at: Mapped[datetime] = mapped_column("criado_em", DateTime, default=datetime.utcnow)


class ParticipantAttachment(Base):
    __tablename__ = "anexo_participante"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    participant_id: Mapped[int] = mapped_column("participante_id", ForeignKey("participante.id"))
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
    __tablename__ = "usuario_unidade_social"
    __table_args__ = (UniqueConstraint("usuario_id", "unidade_social_id", name="uq_usuario_unidade_social"),)

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("usuario_id", ForeignKey("usuario.id"))
    social_unit_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidade_social.id"))


class DonationCatalog(Base):
    __tablename__ = "catalogo_doacao"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    description: Mapped[str] = mapped_column("descricao", String(150))
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )
    created_by: Mapped[int | None] = mapped_column("created_by", ForeignKey("colaborador.id"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column("updated_by", ForeignKey("colaborador.id"), nullable=True)


class DonationReceipt(Base):
    __tablename__ = "doacao"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    donation_catalog_id: Mapped[int] = mapped_column("catalogo_doacao_id", ForeignKey("catalogo_doacao.id"))
    donation_date: Mapped[date] = mapped_column("data_doacao", Date)
    item_ns: Mapped[int | None] = mapped_column("item_ns", Integer, nullable=True)
    quilograma_kg: Mapped[float | None] = mapped_column("quilograma_kg", Numeric(12, 2), nullable=True)
    description: Mapped[str] = mapped_column("descricao", Text)
    donor_name: Mapped[str] = mapped_column("nome_doador", String(150))
    donor_type: Mapped[str | None] = mapped_column("tipo_doador", String(20), nullable=True)
    cpf: Mapped[str | None] = mapped_column("cpf", String(14), nullable=True)
    cnpj: Mapped[str | None] = mapped_column("cnpj", String(18), nullable=True)
    is_active: Mapped[bool] = mapped_column("ativo", Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        "updated_at",
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )
    created_by: Mapped[int | None] = mapped_column("created_by", ForeignKey("colaborador.id"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column("updated_by", ForeignKey("colaborador.id"), nullable=True)
    donation_catalog: Mapped[DonationCatalog] = relationship("DonationCatalog")


class Collaborator(Base):
    __tablename__ = "colaborador"

    id: Mapped[int] = mapped_column("id", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("nome", String(200))
    cpf: Mapped[str] = mapped_column("cpf", String(14), unique=True)
    role: Mapped[str] = mapped_column("funcao", String(80))
    social_unit_id: Mapped[int] = mapped_column("unidade_social_id", ForeignKey("unidade_social.id"))
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
