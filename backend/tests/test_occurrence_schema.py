from datetime import date

import pytest
from pydantic import ValidationError

from app.application.schemas import OccurrenceCreate


def valid_occurrence_payload() -> dict:
    return {
        "occurrence_date": date(2026, 9, 9),
        "occurrence_shift": "Manhã",
        "location": "Recepção",
        "category_id": 1,
        "severity": "Baixa",
        "description": "Ocorrência registrada para teste.",
    }


def test_occurrence_create_normalizes_description() -> None:
    payload = valid_occurrence_payload()
    payload["description"] = "  queda   sem ferimento  "

    occurrence = OccurrenceCreate(**payload)

    assert occurrence.description == "queda sem ferimento"
    assert occurrence.status == "Aberta"


def test_occurrence_resolved_requires_resolution() -> None:
    payload = valid_occurrence_payload()
    payload["status"] = "Resolvida"

    with pytest.raises(ValidationError, match="desfecho"):
        OccurrenceCreate(**payload)


def test_occurrence_cancelled_requires_cancellation_reason() -> None:
    payload = valid_occurrence_payload()
    payload["status"] = "Cancelada"

    with pytest.raises(ValidationError, match="motivo do cancelamento"):
        OccurrenceCreate(**payload)


def test_occurrence_create_normalizes_dynamic_location() -> None:
    payload = valid_occurrence_payload()
    payload["location"] = "  Sala   Multiuso  "

    occurrence = OccurrenceCreate(**payload)

    assert occurrence.location == "Sala Multiuso"
