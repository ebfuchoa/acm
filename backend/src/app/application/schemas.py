from datetime import date, datetime

import re
import unicodedata

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.enums import AttendanceStatus, JustificationStatus, ReportStatus, UserStatus


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AtendimentoCreate(BaseSchema):
    data_atendimento: date
    nome: str = Field(min_length=1, max_length=200)
    demanda: str = Field(min_length=1)

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Informe o nome.")
        return cleaned

    @field_validator("demanda")
    @classmethod
    def validate_demanda(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Informe a demanda.")
        return cleaned


class AtendimentoUpdate(AtendimentoCreate):
    pass


class AtendimentoRead(AtendimentoCreate):
    id: int
    unidade_social_id: int
    colaborador_id: int | None = None
    atendente_nome: str
    atendente_funcao: str
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None


class UnitCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=150)
    address: str = Field(min_length=1, max_length=255)
    district: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=100)
    zip_code: str = Field(pattern=r"^\d{5}-\d{3}$")
    state: str = Field(pattern=r"^[A-Z]{2}$")
    phone: str = Field(pattern=r"^\(\d{2}\)\s\d{5}-\d{4}$")
    email: str = Field(min_length=3, max_length=150)
    is_matrix: bool = False

    @field_validator("name", "address", "district", "city", "zip_code", "state", "phone")
    @classmethod
    def strip_and_require_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Campo obrigatório.")
        return cleaned

    @field_validator("state")
    @classmethod
    def uppercase_state(cls, value: str) -> str:
        return value.upper()

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, value: str) -> str:
        cleaned = value.strip()
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", cleaned):
            raise ValueError("E-mail inválido.")
        return cleaned


class UnitRead(UnitCreate):
    id: int


class UnitUpdate(UnitCreate):
    pass


class UnitManagementRead(BaseSchema):
    id: int
    name: str
    city: str | None = None
    state: str | None = None
    status: str | None = None
    logo_path: str | None = None


class DonationCatalogCreate(BaseSchema):
    description: str = Field(min_length=1, max_length=150)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Informe a descrição.")
        return cleaned


class DonationCatalogUpdate(DonationCatalogCreate):
    pass


class DonationCatalogRead(BaseSchema):
    id: int
    description: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: int | None = None
    updated_by: int | None = None


class DonationCatalogListResponse(BaseSchema):
    items: list[DonationCatalogRead]
    total: int
    page: int
    page_size: int


def _digits_only(value: str | None) -> str:
    return re.sub(r"\D", "", value or "")


def _is_valid_cpf(value: str) -> bool:
    digits = _digits_only(value)
    if len(digits) != 11 or digits == digits[0] * 11:
        return False
    total = sum(int(digits[i]) * (10 - i) for i in range(9))
    check = (total * 10) % 11
    if check == 10:
        check = 0
    if check != int(digits[9]):
        return False
    total = sum(int(digits[i]) * (11 - i) for i in range(10))
    check = (total * 10) % 11
    if check == 10:
        check = 0
    return check == int(digits[10])


def _is_valid_cnpj(value: str) -> bool:
    digits = _digits_only(value)
    if len(digits) != 14 or digits == digits[0] * 14:
        return False

    def calc_digit(base: str, weights: list[int]) -> str:
        total = sum(int(number) * weight for number, weight in zip(base, weights))
        remainder = total % 11
        return "0" if remainder < 2 else str(11 - remainder)

    first = calc_digit(digits[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    second = calc_digit(digits[:12] + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return digits[-2:] == first + second


class DonationReceiptBase(BaseSchema):
    donation_catalog_id: int
    donation_date: date
    item_ns: int | None = Field(default=None, gt=0)
    quilograma_kg: float | None = Field(default=None, gt=0)
    description: str = Field(min_length=1, max_length=1000)
    donor_name: str = Field(min_length=1, max_length=150)
    donor_type: str | None = None
    cpf: str | None = None
    cnpj: str | None = None

    @field_validator("description", "donor_name")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Campo obrigatório.")
        return cleaned

    @field_validator("donor_type")
    @classmethod
    def validate_donor_type(cls, value: str | None) -> str | None:
        cleaned = (value or "").strip()
        if not cleaned:
            return None
        if cleaned not in {"Pessoa Física", "Pessoa Jurídica"}:
            raise ValueError("Tipo de doador inválido.")
        return cleaned

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, value: str | None) -> str | None:
        cleaned = (value or "").strip()
        if not cleaned:
            return None
        if not _is_valid_cpf(cleaned):
            raise ValueError("CPF inválido.")
        return cleaned

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, value: str | None) -> str | None:
        cleaned = (value or "").strip()
        if not cleaned:
            return None
        if not _is_valid_cnpj(cleaned):
            raise ValueError("CNPJ inválido.")
        return cleaned


class DonationReceiptCreate(DonationReceiptBase):
    pass


class DonationReceiptUpdate(DonationReceiptBase):
    pass


class DonationReceiptRead(DonationReceiptBase):
    id: int
    donation_catalog_description: str | None = None
    status: str
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: int | None = None
    updated_by: int | None = None


class DonationReceiptListResponse(BaseSchema):
    items: list[DonationReceiptRead]
    total: int
    page: int
    page_size: int


class UserCreate(BaseSchema):
    unit_id: int
    name: str = Field(min_length=3, max_length=200)
    birth_date: date
    age: int = Field(gt=0)
    birth_place: str = Field(min_length=2, max_length=150)
    gender: str
    rg: str
    rg_uf: str = Field(pattern=r"^[A-Z]{2}$")
    nis_number: str
    shift: str
    father_name: str | None = Field(default=None, max_length=200)
    mother_name: str | None = Field(default=None, max_length=200)
    responsible_name: str = Field(min_length=3, max_length=200)
    responsible_age: int = Field(gt=0)
    responsible_gender: str
    responsible_birth_place: str = Field(min_length=2, max_length=150)
    responsible_marital_status: str
    responsible_education: str = Field(min_length=2, max_length=120)
    responsible_rg: str
    responsible_issuing_agency_uf: str = Field(min_length=2, max_length=40)
    responsible_cpf: str
    responsible_workplace: str | None = Field(default=None, max_length=180)
    responsible_income: float | None = None
    responsible_state: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    responsible_city: str | None = Field(default=None, max_length=100)
    responsible_phone: str | None = Field(default=None, pattern=r"^\(\d{2}\)\s\d{5}-\d{4}$")
    responsible_schedule: str | None = None
    responsible_notes: str | None = None
    residential_street: str = Field(min_length=1, max_length=200)
    residential_number: str = Field(min_length=1, max_length=20)
    residential_complement: str | None = Field(default=None, max_length=100)
    residential_district: str = Field(min_length=1, max_length=100)
    residential_city: str = Field(min_length=1, max_length=100)
    residential_zip_code: str = Field(pattern=r"^\d{5}-\d{3}$")
    residential_phone: str = Field(pattern=r"^\(\d{2}\)\s\d{5}-\d{4}$")
    residential_contact_notes: str | None = None
    school_grade: str = Field(min_length=1, max_length=40)
    school_education_level: str
    school_is_currently_enrolled: str
    school_name: str = Field(min_length=1, max_length=200)
    school_type: str
    school_is_scholarship_holder: str
    school_scholarship_percentage: int | None = None
    school_schedule: str
    school_notes: str | None = None
    composicao_familiar: list["ComposicaoFamiliarCreate"] = []
    situacao_habitacional: "SituacaoHabitacionalCreate | None" = None
    condicao_saude: "CondicaoSaudeCreate | None" = None
    situacao_familiar: "SituacaoFamiliarCreate | None" = None
    parecer: "ParecerCreate | None" = None
    status: UserStatus = UserStatus.ACTIVE

    @field_validator(
        "name",
        "father_name",
        "mother_name",
        "responsible_name",
    )
    @classmethod
    def validate_person_name_like_fields(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Campo obrigatório.")
        if not all(ch.isalpha() or ch in {" ", "'", "-"} for ch in cleaned):
            raise ValueError("Use apenas letras e caracteres válidos de nome.")
        return cleaned

    @field_validator("birth_place", "responsible_birth_place")
    @classmethod
    def validate_place_like_fields(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Campo obrigatório.")
        if not all(ch.isalpha() or ch in {" ", "'", "-", "/", "."} for ch in cleaned):
            raise ValueError("Use apenas letras e caracteres válidos de localidade.")
        return cleaned

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"masculino", "feminino"}:
            raise ValueError("Sexo deve ser Masculino ou Feminino.")
        return cleaned.capitalize()

    @field_validator("responsible_gender")
    @classmethod
    def validate_responsible_gender(cls, value: str) -> str:
        return cls.validate_gender(value)

    @field_validator("rg")
    @classmethod
    def validate_rg(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 5 or len(cleaned) > 20:
            raise ValueError("RG deve ter entre 5 e 20 caracteres.")
        return cleaned

    @field_validator("nis_number")
    @classmethod
    def validate_nis_number(cls, value: str) -> str:
        cleaned = value.strip()
        if not re.match(r"^\d{3}\.\d{5}\.\d{2}-\d$", cleaned):
            raise ValueError("NIS deve estar no formato 000.00000.00-0.")
        return cleaned

    @field_validator("shift")
    @classmethod
    def validate_shift(cls, value: str) -> str:
        cleaned = unicodedata.normalize("NFKD", value.strip()).encode("ascii", "ignore").decode("ascii").lower()
        if cleaned not in {"manha", "tarde"}:
            raise ValueError("Turno deve ser Manhã ou Tarde.")
        return "Manhã" if cleaned == "manha" else "Tarde"

    @field_validator("responsible_rg")
    @classmethod
    def validate_responsible_rg(cls, value: str) -> str:
        return cls.validate_rg(value)

    @field_validator("rg_uf", "responsible_issuing_agency_uf")
    @classmethod
    def validate_uf_fields(cls, value: str) -> str:
        cleaned = value.strip().upper()
        if len(cleaned) != 2 or not cleaned.isalpha():
            raise ValueError("UF deve conter 2 letras.")
        return cleaned

    @field_validator("responsible_cpf")
    @classmethod
    def validate_cpf(cls, value: str) -> str:
        cleaned = value.strip()
        if not re.match(r"^\d{3}\.\d{3}\.\d{3}-\d{2}$", cleaned):
            raise ValueError("CPF deve estar no formato 000.000.000-00.")
        digits = re.sub(r"\D", "", cleaned)
        if len(digits) != 11 or digits == digits[0] * 11:
            raise ValueError("CPF inválido.")
        sum1 = sum(int(digits[i]) * (10 - i) for i in range(9))
        d1 = (sum1 * 10) % 11
        d1 = 0 if d1 == 10 else d1
        sum2 = sum(int(digits[i]) * (11 - i) for i in range(10))
        d2 = (sum2 * 10) % 11
        d2 = 0 if d2 == 10 else d2
        if d1 != int(digits[9]) or d2 != int(digits[10]):
            raise ValueError("CPF inválido.")
        return cleaned

    @field_validator("responsible_marital_status")
    @classmethod
    def validate_marital_status(cls, value: str) -> str:
        cleaned = unicodedata.normalize("NFKD", value.strip()).encode("ascii", "ignore").decode("ascii").lower()
        if cleaned not in {"casado", "solteiro", "viuvo", "separado"}:
            raise ValueError("Estado civil invalido.")
        return "Viuvo" if cleaned == "viuvo" else cleaned.capitalize()

    @field_validator("school_education_level")
    @classmethod
    def validate_school_education_level(cls, value: str) -> str:
        cleaned = unicodedata.normalize("NFKD", value.strip()).encode("ascii", "ignore").decode("ascii").lower()
        if cleaned not in {"fundamental", "medio"}:
            raise ValueError("Ensino deve ser Fundamental ou Medio.")
        return "Medio" if cleaned == "medio" else "Fundamental"

    @field_validator("school_is_currently_enrolled", "school_is_scholarship_holder")
    @classmethod
    def validate_yes_no(cls, value: str) -> str:
        cleaned = unicodedata.normalize("NFKD", value.strip()).encode("ascii", "ignore").decode("ascii").lower()
        if cleaned not in {"sim", "nao"}:
            raise ValueError("Valor deve ser Sim ou Não.")
        return "Não" if cleaned == "nao" else "Sim"

    @field_validator("school_type")
    @classmethod
    def validate_school_type(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"municipal", "estadual", "particular"}:
            raise ValueError("Tipo da escola inválido.")
        return cleaned.capitalize()

    @field_validator("responsible_schedule", "school_schedule")
    @classmethod
    def validate_time_format(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", cleaned):
            raise ValueError("Horário deve estar no formato HH:MM.")
        return cleaned

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Data de nascimento não pode estar no futuro.")
        return value

    @field_validator("age")
    @classmethod
    def validate_age_consistency(cls, value: int, info) -> int:
        birth_date = info.data.get("birth_date")
        if birth_date is None:
            return value
        today = date.today()
        calculated_age = today.year - birth_date.year - (
            (today.month, today.day) < (birth_date.month, birth_date.day)
        )
        if value != calculated_age:
            raise ValueError("Idade deve ser compatível com a data de nascimento.")
        return value

    @field_validator("school_scholarship_percentage")
    @classmethod
    def validate_scholarship_percentage(cls, value: int | None, info):
        scholarship = info.data.get("school_is_scholarship_holder")
        if scholarship == "Sim":
            if value is not None and (value < 0 or value > 100):
                raise ValueError("Percentual deve estar entre 0 e 100.")
            return value
        return value

    @field_validator("responsible_workplace", "responsible_city")
    @classmethod
    def normalize_optional_text_fields(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("responsible_income")
    @classmethod
    def validate_optional_income(cls, value: float | None) -> float | None:
        if value is None:
            return None
        if value < 0:
            raise ValueError("Renda nao pode ser negativa.")
        return value


class UserRead(UserCreate):
    id: int
    status_updated_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class UserUpdate(UserCreate):
    pass


class ComposicaoFamiliarCreate(BaseSchema):
    nome: str = Field(min_length=2, max_length=200)
    parentesco: str = Field(min_length=2, max_length=80)
    sexo: str
    idade: int = Field(gt=0)
    naturalidade: str = Field(min_length=2, max_length=150)
    estado_civil: str = Field(min_length=2, max_length=40)
    escolaridade: str = Field(min_length=2, max_length=120)

    @field_validator("nome", "parentesco", "naturalidade", "estado_civil", "escolaridade")
    @classmethod
    def trim_required_composicao(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Campo obrigatório.")
        return cleaned

    @field_validator("parentesco")
    @classmethod
    def validate_parentesco(cls, value: str) -> str:
        cleaned = value.strip().lower()
        allowed = {
            "pai": "Pai",
            "mãe": "Mãe",
            "mae": "Mãe",
            "irmão": "Irmão",
            "irmao": "Irmão",
            "irmã": "Irmã",
            "irma": "Irmã",
            "primo": "Primo",
            "prima": "Prima",
            "padrasto": "Padrasto",
            "madrasta": "Madrasta",
            "tio": "Tio",
            "tia": "Tia",
            "avô": "Avô",
            "avo": "Avô",
            "avó": "Avó",
            "avoa": "Avó"
        }
        if cleaned not in allowed:
            raise ValueError("Parentesco inválido.")
        return allowed[cleaned]

    @field_validator("sexo")
    @classmethod
    def validate_sexo_composicao(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"masculino", "feminino"}:
            raise ValueError("Sexo deve ser Masculino ou Feminino.")
        return cleaned.capitalize()


class ComposicaoFamiliarRead(ComposicaoFamiliarCreate):
    id: int
    usuario_id: int
    criado_em: datetime
    atualizado_em: datetime


class SituacaoHabitacionalCreate(BaseSchema):
    tipo_habitacao: str | None = Field(default=None, max_length=40)
    tipo_habitacao_outro: str | None = Field(default=None, max_length=120)
    ocupacao: str | None = Field(default=None, max_length=60)
    valor_imovel_em_pagamento: float | None = None
    valor_aluguel: float | None = None
    ocupacao_outro: str | None = Field(default=None, max_length=120)
    numero_comodos: str | None = Field(default=None, max_length=20)
    observacoes: str | None = None

    @field_validator("tipo_habitacao", "ocupacao", "numero_comodos")
    @classmethod
    def normalize_optionals(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("tipo_habitacao_outro", "ocupacao_outro", "observacoes")
    @classmethod
    def normalize_texts(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("valor_imovel_em_pagamento", "valor_aluguel")
    @classmethod
    def validate_money_values(cls, value: float | None) -> float | None:
        if value is None:
            return None
        if value < 0:
            raise ValueError("Valor não pode ser negativo.")
        return value


class SituacaoHabitacionalRead(SituacaoHabitacionalCreate):
    id: int
    usuario_id: int
    criado_em: datetime
    atualizado_em: datetime


class CondicaoSaudeCreate(BaseSchema):
    assistencia_medica: str | None = None
    problema_saude: str | None = None
    alergia: str | None = None
    medicamento: str | None = None
    doencas_anteriores: str | None = None
    fratura: str | None = None
    cirurgia: str | None = None
    deficiencia: str | None = None
    observacoes: str | None = None

    @field_validator(
        "assistencia_medica",
        "problema_saude",
        "alergia",
        "medicamento",
        "doencas_anteriores",
        "fratura",
        "cirurgia",
        "deficiencia",
        "observacoes",
    )
    @classmethod
    def normalize_health_texts(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class CondicaoSaudeRead(CondicaoSaudeCreate):
    id: int
    usuario_id: int
    criado_em: datetime
    atualizado_em: datetime


class SituacaoFamiliarCreate(BaseSchema):
    informacoes_situacao_familiar: str | None = None
    expectativas_participacao_projeto: str | None = None

    @field_validator("informacoes_situacao_familiar", "expectativas_participacao_projeto")
    @classmethod
    def normalize_family_texts(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class SituacaoFamiliarRead(SituacaoFamiliarCreate):
    id: int
    usuario_id: int
    criado_em: datetime
    atualizado_em: datetime


class ParecerCreate(BaseSchema):
    parecer: str | None = None

    @field_validator("parecer")
    @classmethod
    def normalize_parecer(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class ParecerRead(ParecerCreate):
    id: int
    usuario_id: int
    criado_em: datetime
    atualizado_em: datetime


class LoginRequest(BaseSchema):
    email: str
    password: str
    social_unit_id: int | None = None


class LoginResponse(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str
    profile: str | None = None
    is_admin: bool
    social_unit_id: int | None = None
    social_unit_name: str | None = None
    permissions: list[str] = []


class SocialUnitOption(BaseSchema):
    id: int
    name: str


class ProfileOption(BaseSchema):
    id: int
    name: str
    description: str | None = None


class CollaboratorCreate(BaseSchema):
    name: str = Field(min_length=3, max_length=200)
    cpf: str
    role: str = Field(min_length=2, max_length=80)
    social_unit_id: int
    email: str
    password: str = Field(min_length=6, max_length=120)
    is_active: bool = True
    is_admin: bool = False

    @field_validator("name", "role")
    @classmethod
    def trim_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Campo obrigatorio.")
        return cleaned

    @field_validator("cpf")
    @classmethod
    def validate_cpf_format(cls, value: str) -> str:
        cleaned = value.strip()
        if not re.match(r"^\d{3}\.\d{3}\.\d{3}-\d{2}$", cleaned):
            raise ValueError("CPF deve estar no formato 000.000.000-00.")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_collaborator_email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", cleaned):
            raise ValueError("E-mail invalido.")
        return cleaned


class CollaboratorRead(BaseSchema):
    id: int
    name: str
    cpf: str
    role: str
    social_unit_id: int
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime


class CollaboratorUpdate(CollaboratorCreate):
    password: str | None = None


class ActivityCreate(BaseSchema):
    unit_id: int | None = None
    group_ids: list[int]
    dias_semana: list[str] = []
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    category: str = "Geral"
    schedule: str = "00:00"
    min_age: int = 0
    max_age: int = 120
    capacity: int = 30

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Campo Nome e obrigatorio.")
        return cleaned

    @field_validator("group_ids")
    @classmethod
    def validate_group_ids(cls, value: list[int]) -> list[int]:
        if not value:
            raise ValueError("Campo Grupo e obrigatorio.")
        if any(item <= 0 for item in value):
            raise ValueError("Campo Grupo e obrigatorio.")
        return sorted(list(set(value)))

    @field_validator("dias_semana")
    @classmethod
    def validate_weekdays(cls, value: list[str]) -> list[str]:
        cleaned = validate_activity_weekdays(value)
        if not cleaned:
            raise ValueError("Selecione pelo menos um dia da semana.")
        return cleaned

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class ActivityUpdate(BaseSchema):
    group_ids: list[int]
    dias_semana: list[str] = []
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Campo Nome e obrigatorio.")
        return cleaned

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("group_ids")
    @classmethod
    def validate_group_ids(cls, value: list[int]) -> list[int]:
        if not value:
            raise ValueError("Campo Grupo e obrigatorio.")
        if any(item <= 0 for item in value):
            raise ValueError("Campo Grupo e obrigatorio.")
        return sorted(list(set(value)))

    @field_validator("dias_semana")
    @classmethod
    def validate_weekdays(cls, value: list[str]) -> list[str]:
        cleaned = validate_activity_weekdays(value)
        if not cleaned:
            raise ValueError("Selecione pelo menos um dia da semana.")
        return cleaned


class ActivityRead(BaseSchema):
    id: int
    unit_id: int | None = None
    group_id: int | None = None
    group_ids: list[int] = []
    dias_semana: list[str] = []
    name: str
    description: str | None = None
    category: str
    schedule: str
    min_age: int
    max_age: int
    capacity: int
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None


ALLOWED_WEEKDAYS = {"segunda", "terca", "quarta", "quinta", "sexta"}


def validate_activity_weekdays(value: list[str]) -> list[str]:
    cleaned = [item.strip().lower() for item in value if item and item.strip()]
    if any(item not in ALLOWED_WEEKDAYS for item in cleaned):
        raise ValueError("Selecione pelo menos um dia da semana.")
    return list(dict.fromkeys(cleaned))


class GroupCreate(BaseSchema):
    unit_id: int | None = None
    name: str = Field(min_length=1, max_length=255)
    shift: str = Field(min_length=1, max_length=50)
    initial_age: int
    final_age: int

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Campo Nome e obrigatorio.")
        return cleaned

    @field_validator("shift")
    @classmethod
    def validate_shift(cls, value: str) -> str:
        cleaned = unicodedata.normalize("NFKD", value.strip()).encode("ascii", "ignore").decode("ascii").lower()
        if not cleaned:
            raise ValueError("Campo Turno e obrigatorio.")
        if cleaned not in {"manha", "tarde"}:
            raise ValueError("Turno invalido.")
        return "Manhã" if cleaned == "manha" else "Tarde"

    @field_validator("initial_age", "final_age")
    @classmethod
    def validate_ages_non_negative(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Idade nao pode ser negativa.")
        return value

    @field_validator("final_age")
    @classmethod
    def validate_age_range(cls, value: int, info):
        initial_age = info.data.get("initial_age")
        if initial_age is not None and value < initial_age:
            raise ValueError("Idade Final deve ser maior ou igual a Idade Inicial.")
        return value


class GroupUpdate(GroupCreate):
    pass


class GroupRead(GroupCreate):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class EnrollmentCreate(BaseSchema):
    user_id: int
    activity_id: int


class EnrollmentRead(EnrollmentCreate):
    id: int


class GroupClassificationUser(BaseSchema):
    user_id: int
    name: str
    age: int
    shift: str
    status: str


class GroupClassificationItem(BaseSchema):
    group_id: int
    group_name: str
    shift: str
    initial_age: int
    final_age: int
    age_range: str
    users: list[GroupClassificationUser] = []


class GroupClassificationLinkPayload(BaseSchema):
    user_id: int
    group_id: int


class AttendanceCreate(BaseSchema):
    user_id: int
    activity_id: int
    attendance_date: date
    status: AttendanceStatus


class AttendanceRead(AttendanceCreate):
    id: int


class FrequenciaGrupoRead(BaseSchema):
    id: int
    nome: str
    turno: str
    faixa_etaria: str


class FrequenciaUsuarioRead(BaseSchema):
    usuario_id: int
    nome: str
    idade: int
    grupo_id: int
    grupo_nome: str
    turno: str


class FrequenciaSemanaUsuarioRead(BaseSchema):
    usuario_id: int
    dias: dict[str, bool]


class FrequenciaSemanaRead(BaseSchema):
    semana_referencia: date
    grupo_id: int
    turno: str
    frequencias: list[FrequenciaSemanaUsuarioRead]


class FrequenciaSemanaUsuarioPayload(BaseSchema):
    usuario_id: int
    dias: dict[str, bool]


class FrequenciaSemanaSavePayload(BaseSchema):
    semana_referencia: date
    grupo_id: int
    turno: str
    frequencias: list[FrequenciaSemanaUsuarioPayload]


class JustificationCreate(BaseSchema):
    attendance_id: int
    reason: str = Field(min_length=5)
    author_name: str
    justification_date: date
    attachment_url: str | None = None


class JustificationDecision(BaseSchema):
    status: JustificationStatus


class JustificationRead(JustificationCreate):
    id: int
    status: JustificationStatus


class ReportCreate(BaseSchema):
    unit_id: int
    title: str
    content: dict


class ReportDecision(BaseSchema):
    reviewer_name: str
    decision: ReportStatus
    reason: str | None = None


class ReportRead(BaseSchema):
    id: int
    unit_id: int
    title: str
    status: ReportStatus


class ParticipantCreate(BaseSchema):
    unit_id: int
    full_name: str
    birth_date: date
    nis: str | None = None


class ParticipantStageUpdate(BaseSchema):
    stage: str
    data: dict


class ParticipantConclude(BaseSchema):
    reviewer_name: str


class ParticipantRead(ParticipantCreate):
    id: int
    status: str
    current_data: dict



