from app.models import VocabItem


def test_quizlet_export_format():
    items = [
        VocabItem(term="hello", translation="cześć"),
        VocabItem(term="world", translation="świat"),
    ]
    from app.domain.vocab.export import format_quizlet_export

    text = format_quizlet_export(items)
    assert text == "hello\tcześć\nworld\tświat"
