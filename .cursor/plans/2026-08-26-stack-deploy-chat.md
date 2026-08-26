---
name: 2026-08-26 stack-deploy-chat
overview: Stack/deploy/chat/agent decisions + hands-free Chat listening UX.
todos:
  - id: clarify
    content: Voice modes, Redis, Langfuse SoT, audio path, domains, admin, transcript
    status: completed
  - id: design
    content: Write stack-deploy-chat design spec
    status: completed
  - id: sync
    content: Sync architecture, UX, env.example
    status: completed
---

# Plan — stack / deploy / chat (2026-08-26)

## Decisions

| Topic | Choice |
|---|---|
| VOICE_MODE | Both; default speech_to_speech; env switch |
| Cold start | Accept + Waking up… |
| Redis | No MVP; Postgres jobs |
| Langfuse | Cloud; runtime prompt SoT |
| promptfoo | Repo fixtures |
| Audio | Live direct; chained via Render |
| Domains | langy + api-langy .fmazurkiewicz.dev |
| Save word | Live tool → backend |
| Transcript | Full text in Postgres |
| Admin | ALLOWED_ADMIN_EMAILS = fifmazurkiewicz@gmail.com |
| Chat listening | Optional on/off **toggle**; VAD when on; iOS gesture = toggle on |

## Artifacts

- `docs/superpowers/specs/2026-08-26-stack-deploy-chat-design.md`
- Updated architecture, UX, `.env.example`
