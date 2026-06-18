from app.application.schemas import ActivityCreate, ActivityUpdate


def test_activity_create_trims_name_and_description() -> None:
    payload = ActivityCreate(
        group_ids=[1],
        dias_semana=["segunda", "quarta"],
        name="  Oficina de Musica  ",
        description="  Turma infantil  ",
    )
    assert payload.name == "Oficina de Musica"
    assert payload.description == "Turma infantil"


def test_activity_create_allows_empty_description() -> None:
    payload = ActivityCreate(group_ids=[1], dias_semana=["terca"], name="Atividade A", description="   ")
    assert payload.description is None


def test_activity_update_requires_name() -> None:
    try:
        ActivityUpdate(group_ids=[1], dias_semana=["quinta"], name="   ", description="Teste")
    except Exception as exc:  # pydantic ValidationError
        assert "Campo Nome e obrigatorio." in str(exc)
    else:
        raise AssertionError("ActivityUpdate deveria falhar para nome vazio.")


def test_activity_create_requires_weekday() -> None:
    try:
        ActivityCreate(group_ids=[1], dias_semana=[], name="Atividade A")
    except Exception as exc:
        assert "Selecione pelo menos um dia da semana." in str(exc)
    else:
        raise AssertionError("ActivityCreate deveria falhar sem dia da semana.")
