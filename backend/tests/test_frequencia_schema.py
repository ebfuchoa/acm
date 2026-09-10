import pytest
from pydantic import ValidationError

from app.application.schemas import FrequenciaSemanaUsuarioPayload


def test_frequencia_payload_normalizes_absence_justification() -> None:
    payload = FrequenciaSemanaUsuarioPayload(
        usuario_id=1,
        dias={"segunda": False},
        justificativa="  consulta   médica  ",
    )

    assert payload.justificativa == "consulta médica"


def test_frequencia_payload_allows_empty_absence_justification() -> None:
    payload = FrequenciaSemanaUsuarioPayload(
        usuario_id=1,
        dias={"segunda": False},
        justificativa="   ",
    )

    assert payload.justificativa is None


def test_frequencia_payload_limits_absence_justification_size() -> None:
    with pytest.raises(ValidationError) as exc_info:
        FrequenciaSemanaUsuarioPayload(
            usuario_id=1,
            dias={"segunda": False},
            justificativa="a" * 501,
        )

    assert "String should have at most 500 characters" in str(exc_info)
