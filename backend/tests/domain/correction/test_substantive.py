from app.domain.correction.substantive import is_substantive_diff


def test_case_only_not_substantive():
    assert is_substantive_diff("Hello", "hello") is False


def test_punct_only_not_substantive():
    assert is_substantive_diff("Hello", "Hello?") is False


def test_word_change_is_substantive():
    assert is_substantive_diff("I go shop", "I go to the shop") is True
