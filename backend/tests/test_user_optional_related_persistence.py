from app.application.services import CrudService


def test_has_meaningful_data_returns_false_for_empty_related_payloads() -> None:
    assert CrudService._has_meaningful_data(None) is False
    assert CrudService._has_meaningful_data({}) is False
    assert CrudService._has_meaningful_data({"parecer": None}) is False
    assert CrudService._has_meaningful_data({"parecer": "   "}) is False
    assert CrudService._has_meaningful_data({"observacoes": "", "valor_aluguel": None}) is False


def test_has_meaningful_data_returns_true_when_any_field_is_filled() -> None:
    assert CrudService._has_meaningful_data({"parecer": "Apto"}) is True
    assert CrudService._has_meaningful_data({"valor_aluguel": 0}) is True
    assert CrudService._has_meaningful_data({"assistencia_medica": "Nao"}) is True
