from app.application.schemas import LocalCreate


def test_local_create_trims_and_collapses_name() -> None:
    payload = LocalCreate(name="  Sala   de Atendimento  ", unit_id=2)
    assert payload.name == "Sala de Atendimento"
    assert payload.unit_id == 2


def test_local_create_requires_name() -> None:
    try:
        LocalCreate(name="   ", unit_id=2)
    except Exception as exc:
        assert "Informe o local." in str(exc)
    else:
        raise AssertionError("LocalCreate deveria falhar para local vazio.")
