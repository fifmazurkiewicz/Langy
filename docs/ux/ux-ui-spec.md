# UX / UI Specification — MVP

Skonsolidowana wersja ustaleń UX/UI. Opis biznesowo-techniczny: [`../architecture-for-cursor.md`](../architecture-for-cursor.md). Kierunek wizualny SoT: [`ux-ui-decisions.md`](./ux-ui-decisions.md) (Classical).

## 1. Zakres MVP (Etap 1)

Fokus na **wersji czatowej**. W zakładce Words w MVP:

- Kandydaci z rozmowy (`chat_extraction`) — user **akceptuje albo odrzuca** każde słowo
- Słowa zapisane przez Agenta na komendę głosową („zapisz mi to słowo…”) — `agent_save`
- Słownictwo z kategorii tematycznych + „Generate new” (`category_generated`)
- **Eksport** fiszek do pliku `.txt` pod wklejenie do Quizleta (outbound only)

**Poza MVP (Etap 2):** ręczne dodawanie fiszek w stylu Quizlet oraz **import** zestawów z Quizleta do Langy.

## 2. Platforma

- Jedna responsywna PWA (Next.js) — desktop i telefon.
- Na telefonie: manifest + service worker, `standalone`, touch targets ≥ 44 px, safe-area.
- Bez sklepów / natywnych app.

## 3. Nawigacja — dolny pasek, 3 zakładki

| Zakładka | Zawartość |
|---|---|
| **Chat** | Rozmowa głosowa — ekran domyślny po zalogowaniu |
| **Words** | Due today (FSRS) + Categories + Generate new + eksport `.txt` |
| **Menu** | Konto, języki, profil per język, **Memory** (fakty + skróty), wygląd, Admin |

## 4. Language Switcher — jedno miejsce, skutek wszędzie

- **Jedyny** kontroler aktywnego języka nauki. Zmiana aktualizuje jednocześnie Chat, Words (talię/kategorie) i kontekst profilu.
- Widoczny w headerze powierzchni nauki (Chat / Words); nie duplikować osobnych switcherów.
- Wizualnie: znaczniki Classical (**GB / US / DE / ES / IT**), **bez emoji flag**, + nazwa języka.
- British i American English = dwa osobne wpisy.
- „Add a language” w switcherze i w Menu → Languages.

## 5. Onboarding — wywiad zależny od języka

Wizard przed pierwszym Chat. Kolejność:

1. **Language selection** (obowiązkowy) — multi-select: English (British), English (American), German, Spanish, Italian. Znaczniki Classical, nie emoji.
2. Dla **każdego** wybranego języka (lub w pętli / zakładkach):
   - **Motivation** — career, travel, relocation, family, academic, culture, heritage, fun + Other
   - **Interests** — technology, sports, movies, music, books, travel, food, business, science, gaming, art, nature + Other → tworzą startowe zestawy Words **dla tego języka**
   - **Self-assessment** — Reading / Speaking / Writing / Listening / Vocabulary, skala 1–5 z kotwicami opisowymi

Kroki Motivation / Interests / Self-assessment mają „Skip for now”. Po wywiadach: **jawny wybór `active_language`**. Dodanie języka później: tylko brakujące kroki dla **tego** języka, potem ewentualna zmiana aktywnego w switcherze.

Po Interests: w tle **Generate first words** → wyniki w Pending (nie auto-accept).

Język ojczysty: **zawsze polski** — bez pytania w onboardingu.

## 6. Chat

- **Listening toggle (opcjonalny):** on = VAD hands-free; off = mic idle. iOS unlock = toggle on.
- Cold API: **Waking up…**
- **Pierwsza tura Agenta:** różne sformułowania pytania „o czym dziś / czego się uczymy?” — **bez** listy Interests. Interests tylko miękko przy ciszy / „nie wiem”.
- Agenda dostaje też **pamięć globalną** (fakty + ostatnie skróty sesji).
- Mało tekstu: opcjonalny live transcript (domyślnie ukryty).
- **End session** → Idle; w tle: ekstrakcja słów + update pamięci.
- Polski: tylko na wyraźną prośbę.
- „Zapisz słowo”: Live tool → `agent_save`.
- Voice: Live direct / chained per `VOICE_MODE`.

## 7. Words

- Sub-widoki: **Due today** | **Categories** | **Pending** (wspólna kolejka).
- **Due today** — tylko `accepted` + FSRS; interwały dynamiczne.
- **Categories** — zestawy z interests + custom; „Generate new” → Pending.
- **Pending** — Accept / Reject dla `chat_extraction` i `category_generated` (źródło widoczne). Nie wygasa. Badge z liczbą na zakładce Words.
- Pusta ekstrakcja po czacie → toast „No new words from that chat”.
- Przy **spend cap**: Chat / Generate zablokowane; review OK. Nowy user: default **$10**/miesiąc.
- **Export to Quizlet** — `term<TAB>definition`, nowa linia = nowa fiszka (jak import Quizlet / paste z Excela). Download i/lub copy.

## 8. Dark mode

System / Light / Dark — pełna obsługa. Paleta Classical (patrz decisions).

## 9. Język produktu

UI copy i kod po **angielsku**. Rozmowa o projekcie może być po polsku; L1 w produkcie = polski.

## 10. Auth i admin

- Google OAuth (Supabase).
- Admin: tylko emaile z `ALLOWED_ADMIN_EMAILS` (prod: `fifmazurkiewicz@gmail.com`).
- Admin UI (desktop): miesięczny spend cap + used this month (TTS + ASR + GenAI).
- Po limicie do końca miesiąca: kosztowe off; Words review on. TZ: Europe/Warsaw.

## 11. Wireframe addendum

### 11.1 Chat

Header: język → switcher. Stany: Waking up… → Idle z **opcjonalnym listening toggle** → Listening/Thinking/Speaking (VAD, bez mic per turn) → End session → Idle. Mic blocked sheet. Badge Words gdy Pending.

### 11.2 Words

Due Today | Categories | Pending. Badge na tabie. Export (tab-separated). Cap banner. Stany puste afirmatywne.

### 11.3 Menu

Account · Languages · Profile (per język) · **Memory** (facts: edit/delete; recent summaries) · Appearance · Admin · Sign out.

### 11.4 Onboarding

Jak §5 + finalny ekran wyboru aktywnego języka.

### 11.5 Admin

Name | Email | Monthly spend cap | Used this month | Edit cap. Wyróżnienie „At cap”. Dialog: „Costly features pause until next calendar month. Reviews stay available. Nothing is deleted.”

### 11.6 Kierunek wizualny

SoT: **Classical** (decisions). Spec funkcjonalny nie narzuca innej palety — Classical wygrywa kolizję z wcześniejszą wskazówką „unikaj krem+serif”.
