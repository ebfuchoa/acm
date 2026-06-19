from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.db import models


RESPONSIBLE_FIELDS = {
    "responsible_name": "name",
    "responsible_age": "age",
    "responsible_gender": "gender",
    "responsible_birth_place": "birth_place",
    "responsible_marital_status": "marital_status",
    "responsible_education": "education",
    "responsible_rg": "rg",
    "responsible_issuing_agency_uf": "issuing_agency_uf",
    "responsible_cpf": "cpf",
    "responsible_workplace": "workplace",
    "responsible_income": "income",
    "responsible_state": "state",
    "responsible_city": "city",
    "responsible_phone": "phone",
    "responsible_schedule": "schedule",
    "responsible_notes": "notes",
}

RESIDENTIAL_FIELDS = {
    "residential_street": "street",
    "residential_number": "number",
    "residential_complement": "complement",
    "residential_district": "district",
    "residential_city": "city",
    "residential_zip_code": "zip_code",
    "residential_phone": "phone",
    "residential_contact_notes": "contact_notes",
}

SCHOOLING_FIELDS = {
    "school_grade": "grade",
    "school_education_level": "education_level",
    "school_is_currently_enrolled": "is_currently_enrolled",
    "school_name": "name",
    "school_type": "type",
    "school_is_scholarship_holder": "is_scholarship_holder",
    "school_scholarship_percentage": "scholarship_percentage",
    "school_schedule": "schedule",
    "school_notes": "notes",
}

NORMALIZED_USER_SECTION_FIELDS = (
    set(RESPONSIBLE_FIELDS)
    | set(RESIDENTIAL_FIELDS)
    | set(SCHOOLING_FIELDS)
)


class UserProfileSectionsRepository:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _map_fields(payload_data: dict, field_map: dict[str, str]) -> dict:
        return {
            target_field: payload_data[source_field]
            for source_field, target_field in field_map.items()
        }

    def upsert_for_user(self, user_id: int, payload_data: dict) -> None:
        self._upsert_section(
            models.UserResponsible,
            user_id,
            self._map_fields(payload_data, RESPONSIBLE_FIELDS),
        )
        self._upsert_section(
            models.UserResidential,
            user_id,
            self._map_fields(payload_data, RESIDENTIAL_FIELDS),
        )
        self._upsert_section(
            models.UserSchooling,
            user_id,
            self._map_fields(payload_data, SCHOOLING_FIELDS),
        )

    def _upsert_section(self, model_class, user_id: int, data: dict) -> None:
        section = self.db.scalar(select(model_class).where(model_class.user_id == user_id))
        if section is None:
            self.db.add(model_class(user_id=user_id, **data))
            return

        for field_name, value in data.items():
            setattr(section, field_name, value)
