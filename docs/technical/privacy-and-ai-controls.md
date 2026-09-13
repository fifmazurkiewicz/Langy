# Privacy and AI controls

Langy exposes a public bilingual privacy notice at `/privacy`. Chat requires a versioned first-use AI disclosure. This acknowledgement records that the disclosure was shown; it is not consent to optional processing.

Authenticated users can export application data as JSON and delete their Langy account from Menu → Privacy & data. The export covers the application database. Provider-side and infrastructure backups remain subject to the configured provider contracts and expiry periods.

Langy stores conversation transcripts and derived learning data. The current application does not upload or persist raw microphone recordings. Live audio may be processed by the browser speech service or Google Gemini Live, depending on the selected voice path.

## Configuration

- `PRIVACY_CONTACT_EMAIL`: controller/privacy contact shown by the backend and used operationally.
- `SUPABASE_SERVICE_ROLE_KEY`: required for production deletion of the Supabase Auth identity.
- `CONVERSATION_RETENTION_DAYS`: completed-conversation retention, default 365 days.

Run retention with `python -m scripts.purge_expired_data`. Schedule it on Render. Retention of infrastructure backups and third-party provider data must be configured and verified separately.

## Security properties

- All export, acknowledgement, and deletion endpoints require an approved authenticated user.
- Account deletion requires an exact confirmation string.
- Export queries are always scoped to the authenticated user.
- Production account deletion refuses to start without the Supabase service-role configuration.
