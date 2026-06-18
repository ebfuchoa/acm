from datetime import date

import pytest
from pydantic import ValidationError

from app.application.schemas import AtendimentoCreate


def test_atendimento_create_normalizes_text_fields() -> None:
    payload = AtendimentoCreate(
        data_atendimento=date(2026, 6, 2),
        nome="  Maria da Silva  ",
        demanda="  Orientacao familiar.  ",
    )

    assert payload.nome == "Maria da Silva"
    assert payload.demanda == "Orientacao familiar."


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("nome", "   ", "Informe o nome."),
        ("demanda", "   ", "Informe a demanda."),
    ],
)
def test_atendimento_create_rejects_empty_text_fields(field: str, value: str, message: str) -> None:
    values = {
        "data_atendimento": date(2026, 6, 2),
        "nome": "Maria da Silva",
        "demanda": "Orientacao familiar.",
    }
    values[field] = value

    with pytest.raises(ValidationError, match=message):
        AtendimentoCreate(**values)
