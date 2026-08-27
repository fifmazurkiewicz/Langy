import pytest
from pydantic import ValidationError

from app.domain.correction.schemas import AddCorrectionPendingRequest, CorrectionRequest


def test_correction_request_rejects_blank_text():
    with pytest.raises(ValidationError):
        CorrectionRequest(text="  ", language="en-GB")


def test_add_correction_pending_requires_corrected_text():
    with pytest.raises(ValidationError):
        AddCorrectionPendingRequest(original_text="hi", corrected_text="  ", language="en-GB")
