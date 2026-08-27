import pytest
from pydantic import ValidationError

from app.domain.selection.schemas import TranslateSelectionRequest


def test_translate_request_rejects_blank_span():
    with pytest.raises(ValidationError):
        TranslateSelectionRequest(span="  ", language="en-GB")
