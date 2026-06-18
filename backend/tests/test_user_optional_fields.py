from datetime import date

from app.application.schemas import UserCreate


def _base_payload() -> dict:
    return {
        "unit_id": 1,
        "name": "Joao Silva",
        "birth_date": date(2010, 1, 10),
        "age": 16,
        "birth_place": "Sao Paulo/SP",
        "gender": "Masculino",
        "rg": "1234567",
        "rg_uf": "SP",
        "nis_number": "123.45678.90-1",
        "shift": "Manhã",
        "father_name": "Pai Exemplo",
        "mother_name": "Mae Exemplo",
        "responsible_name": "Responsavel Exemplo",
        "responsible_age": 40,
        "responsible_gender": "Feminino",
        "responsible_birth_place": "Sao Paulo/SP",
        "responsible_marital_status": "Casado",
        "responsible_education": "Medio",
        "responsible_rg": "9988776",
        "responsible_issuing_agency_uf": "SP",
        "responsible_cpf": "111.444.777-35",
        "responsible_workplace": "Empresa X",
        "responsible_income": 2000.50,
        "responsible_state": "SP",
        "responsible_city": "Sao Paulo",
        "responsible_phone": "(11) 99999-9999",
        "responsible_schedule": "08:30",
        "responsible_notes": "Observacao",
        "residential_street": "Rua A",
        "residential_number": "100",
        "residential_complement": "Casa",
        "residential_district": "Centro",
        "residential_city": "Sao Paulo",
        "residential_zip_code": "01234-567",
        "residential_phone": "(11) 99999-9999",
        "residential_contact_notes": "Contato",
        "school_grade": "6 ano",
        "school_education_level": "Fundamental",
        "school_is_currently_enrolled": "Sim",
        "school_name": "Escola A",
        "school_type": "Municipal",
        "school_is_scholarship_holder": "Sim",
        "school_scholarship_percentage": 50,
        "school_schedule": "13:00",
        "school_notes": "Obs",
        "status": "ativo",
    }


def test_user_create_allows_identification_optional_fields() -> None:
    payload = _base_payload()
    payload["father_name"] = None
    payload["mother_name"] = None
    user = UserCreate(**payload)
    assert user.father_name is None
    assert user.mother_name is None


def test_user_create_allows_responsible_observation_optional() -> None:
    payload = _base_payload()
    payload["responsible_notes"] = None
    user = UserCreate(**payload)
    assert user.responsible_notes is None


def test_user_create_allows_residential_optional_fields() -> None:
    payload = _base_payload()
    payload["residential_complement"] = None
    payload["residential_contact_notes"] = None
    user = UserCreate(**payload)
    assert user.residential_complement is None
    assert user.residential_contact_notes is None


def test_user_create_allows_school_optional_fields() -> None:
    payload = _base_payload()
    payload["school_scholarship_percentage"] = None
    payload["school_notes"] = None
    user = UserCreate(**payload)
    assert user.school_scholarship_percentage is None
    assert user.school_notes is None
