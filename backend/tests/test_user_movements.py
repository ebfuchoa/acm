from datetime import date

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.application import schemas
from app.application.services import CrudService
from app.domain.enums import UserMovementType, UserStatus
from app.infrastructure.db import models
from app.infrastructure.db.base import Base


def _create_session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def _create_unit(db) -> None:
    db.add(
        models.Unit(
            id=1,
            name="Unidade A",
            address="Rua A",
            district="Centro",
            city="Cidade",
            zip_code="00000-000",
            state="SP",
            phone="(11) 90000-0000",
            email="a@example.com",
            is_matrix=True,
        )
    )
    db.commit()


def _user_payload() -> schemas.UserCreate:
    return schemas.UserCreate(
        unit_id=1,
        name="Joao Silva",
        birth_date=date(2010, 1, 10),
        age=16,
        birth_place="Sao Paulo/SP",
        gender="Masculino",
        rg="1234567",
        rg_uf="SP",
        nis_number="123.45678.90-1",
        shift="Manha",
        father_name="Pai Exemplo",
        mother_name="Mae Exemplo",
        responsible_name="Responsavel Exemplo",
        responsible_age=40,
        responsible_gender="Feminino",
        responsible_birth_place="Sao Paulo/SP",
        responsible_marital_status="Casado",
        responsible_education="Medio",
        responsible_rg="9988776",
        responsible_issuing_agency_uf="SP",
        responsible_cpf="111.444.777-35",
        responsible_workplace="Empresa X",
        responsible_income=2000.50,
        responsible_state="SP",
        responsible_city="Sao Paulo",
        responsible_phone="(11) 99999-9999",
        responsible_schedule="08:30",
        responsible_notes="Observacao",
        residential_street="Rua A",
        residential_number="100",
        residential_complement="Casa",
        residential_district="Centro",
        residential_city="Sao Paulo",
        residential_zip_code="01234-567",
        residential_phone="(11) 99999-9999",
        residential_contact_notes="Contato",
        school_grade="6 ano",
        school_education_level="Fundamental",
        school_is_currently_enrolled="Sim",
        school_name="Escola A",
        school_type="Municipal",
        school_is_scholarship_holder="Sim",
        school_scholarship_percentage=50,
        school_schedule="13:00",
        school_notes="Obs",
        status="ativo",
    )


def _movement_types(db, user_id: int) -> list[str]:
    return list(
        db.scalars(
            select(models.UserMovement.movement_type)
            .where(models.UserMovement.user_id == user_id)
            .order_by(models.UserMovement.id.asc())
        )
    )


def test_create_user_registers_entry_movement() -> None:
    session_factory = _create_session_factory()
    with session_factory() as db:
        _create_unit(db)

        user = CrudService(db).create_user(_user_payload())

        movements = list(db.scalars(select(models.UserMovement)).all())
        assert len(movements) == 1
        assert movements[0].user_id == user.id
        assert movements[0].movement_type == UserMovementType.ENTRADA
        assert movements[0].movement_date == user.created_at.date()


def test_deactivate_and_reactivate_register_only_real_status_changes() -> None:
    session_factory = _create_session_factory()
    with session_factory() as db:
        _create_unit(db)
        service = CrudService(db)
        user = service.create_user(_user_payload())

        service.delete_user(user.id)
        service.delete_user(user.id)
        reactivated = service.activate_user(user.id)
        service.activate_user(user.id)

        assert reactivated.status == UserStatus.ACTIVE
        assert _movement_types(db, user.id) == [
            UserMovementType.ENTRADA,
            UserMovementType.SAIDA,
            UserMovementType.ENTRADA,
        ]


def test_create_user_persists_normalized_profile_sections() -> None:
    session_factory = _create_session_factory()
    with session_factory() as db:
        _create_unit(db)

        user = CrudService(db).create_user(_user_payload())

        responsible = db.scalar(
            select(models.UserResponsible).where(models.UserResponsible.user_id == user.id)
        )
        residential = db.scalar(
            select(models.UserResidential).where(models.UserResidential.user_id == user.id)
        )
        schooling = db.scalar(
            select(models.UserSchooling).where(models.UserSchooling.user_id == user.id)
        )

        assert responsible.name == "Responsavel Exemplo"
        assert responsible.cpf == "111.444.777-35"
        assert residential.street == "Rua A"
        assert residential.zip_code == "01234-567"
        assert schooling.name == "Escola A"
        assert schooling.schedule == "13:00"


def test_update_user_updates_normalized_profile_sections_without_duplicates() -> None:
    session_factory = _create_session_factory()
    with session_factory() as db:
        _create_unit(db)
        service = CrudService(db)
        user = service.create_user(_user_payload())
        payload_data = _user_payload().model_dump()
        payload_data["responsible_name"] = "Maria Silva"
        payload_data["residential_street"] = "Rua Nova"
        payload_data["school_name"] = "Escola Nova"

        service.update_user(user.id, schemas.UserUpdate(**payload_data))

        responsible_rows = list(
            db.scalars(select(models.UserResponsible).where(models.UserResponsible.user_id == user.id))
        )
        residential_rows = list(
            db.scalars(select(models.UserResidential).where(models.UserResidential.user_id == user.id))
        )
        schooling_rows = list(
            db.scalars(select(models.UserSchooling).where(models.UserSchooling.user_id == user.id))
        )

        assert len(responsible_rows) == 1
        assert len(residential_rows) == 1
        assert len(schooling_rows) == 1
        assert responsible_rows[0].name == "Maria Silva"
        assert residential_rows[0].street == "Rua Nova"
        assert schooling_rows[0].name == "Escola Nova"
