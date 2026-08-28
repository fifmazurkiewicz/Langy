from app.domain.languages import interest_category_key
from app.domain.profile.service import ensure_flashcard_sets_for_interests


def test_interest_category_key():
    assert interest_category_key("travel") == "travel"
    assert interest_category_key("travel:Europe") == "travel"


def test_ensure_flashcard_sets_empty_interests():
    class FakeQuery:
        def filter(self, *args, **kwargs):
            return self

        def first(self):
            return None

    class FakeDb:
        def query(self, model):
            return FakeQuery()

        def add(self, obj):
            pass

        def flush(self):
            pass

    keys = ensure_flashcard_sets_for_interests(FakeDb(), "00000000-0000-4000-8000-000000000001", "en-GB", [])
    assert keys == []
