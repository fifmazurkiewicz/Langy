# Privacy and AI controls implementation

## Goal

Add truthful privacy transparency and working data-subject controls to Langy without introducing unnecessary consent friction.

## Requirements

- Given any visitor, when they open `/privacy`, then the bilingual privacy information is available without authentication.
- Given a user opening Chat for the first time, when the current AI notice has not been acknowledged, then Langy shows the disclosure before a session can start.
- Given a tutor-generated turn, when it is rendered, then it is visibly identified as AI-generated.
- Given a signed-in user, when they request a data export, then Langy returns their stored account and learning data in portable JSON.
- Given a signed-in user, when they confirm account deletion, then Langy deletes user-owned application data and requests deletion of the Supabase Auth identity in production.
- Given a notice acknowledgement, when it is submitted repeatedly, then one versioned record per user and notice is retained.
- Given an expired conversation, when the retention command runs, then related conversation data is removed according to configured retention.

## Decisions

- 2026-09-13: AI disclosure is acknowledgement, not optional-processing consent. Core AI processing is necessary to provide Chat.
- 2026-09-13: No cookie banner until non-essential tracking is introduced.
- 2026-09-13: Raw audio is not described as stored because no active storage path was found; transcripts are described as stored.
- 2026-09-13: Export is synchronous JSON for MVP.
- 2026-09-13: Account deletion requires the literal confirmation `DELETE` and a configured Supabase service-role key in production.
- 2026-09-13: Conversation retention defaults to 365 days and is operator-configurable; this is disclosed as the current application default.

## Tasks

- [x] Contract and migration
- [x] Backend privacy endpoints and services
- [x] Public privacy route and route-gate exception
- [x] Privacy & Data menu flow
- [x] First-use disclosure and AI labels
- [x] Tests and documentation
- [x] Full verification
