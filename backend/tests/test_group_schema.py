from app.application.schemas import GroupCreate


def test_group_create_validates_age_range() -> None:
    try:
        GroupCreate(name="Grupo A", shift="Manha", initial_age=12, final_age=10)
    except Exception as exc:
        assert "Idade Final deve ser maior ou igual a Idade Inicial." in str(exc)
    else:
        raise AssertionError("GroupCreate deveria falhar para faixa etaria invalida.")


def test_group_create_normalizes_name_and_shift() -> None:
    payload = GroupCreate(name="  Grupo A  ", shift="tarde", initial_age=7, final_age=11)
    assert payload.name == "Grupo A"
    assert payload.shift == "Tarde"
