from app.domain.selection.normalize import dedup_key, normalize_span


def test_normalize_trims_and_collapses_whitespace():
    assert normalize_span("  hello   world\n") == "hello world"


def test_normalize_empty_or_whitespace_is_empty():
    assert normalize_span("   \t") == ""


def test_dedup_key_is_casefold():
    a = dedup_key("u1", "en-GB", "Café")
    b = dedup_key("u1", "en-GB", "café")
    assert a == b
    assert a == ("u1", "en-GB", "café")
