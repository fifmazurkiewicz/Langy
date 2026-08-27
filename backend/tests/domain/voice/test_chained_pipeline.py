from unittest.mock import MagicMock, patch

from app.domain.voice.chained_pipeline import chained_user_turn


class FakeUser:
    id = "00000000-0000-4000-8000-000000000001"
    spend_cap_usd = 10


def test_chained_runs_correction_before_reply():
    db = MagicMock()
    db.scalar.return_value = 0.0
    with patch("app.domain.voice.chained_pipeline.run_correction") as mock_corr:
        mock_corr.return_value.is_corrected = False
        mock_corr.return_value.corrected_text = None
        correction, reply = chained_user_turn(db, FakeUser(), "hello", "en-GB")
        mock_corr.assert_called_once()
        assert reply
        assert correction is mock_corr.return_value
