# UX / UI Specification — MVP

Skonsolidowana wersja ustaleń UX/UI. Opis biznesowo-techniczny: [`../architecture-for-cursor.md`](../architecture-for-cursor.md). Kierunek wizualny SoT: [`ux-ui-decisions.md`](./ux-ui-decisions.md) (Classical).

## 1. Zakres MVP (Etap 1)

Fokus na **wersji czatowej**. W zakładce Memo → **Flashcards** w MVP:

- Kandydaci z rozmowy (`chat_extraction`) — user **akceptuje albo odrzuca** każde słowo
- Słowa zapisane przez Agenta na komendę głosową („zapisz mi to słowo…”) — `agent_save`
- Słownictwo z kategorii tematycznych + „Generate new” (`category_generated`)
- Zaznaczenie w transkrypcie → Add to learning (`transcript_selection`) → Pending
- Słówka z opcjonalnych lekcji planu (`lesson`) → Pending
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
| **Memo** | Hub nauki: **Flashcards** · **Shadowing** · **Mnemonics** |
| **Menu** | Konto, języki, profil per język, Plan, **Memory**, wygląd, Admin |

### Memo — Flashcards

Dawne Words: Due today | Categories | Pending | eksport Quizlet `.txt`. Badge Pending na zakładce Memo. Na karcie **Due**: przycisk **Mnemonic** (skrót do tego samego panelu co zakładka Mnemonics).

### Memo — Shadowing

Osobny tryb: agent dopytuje tematykę → dialog wygenerowany **lub** wybór past conversation → setup (show-text on/off, TTS\|Live) → pętla play→repeat→feedback → End z batch trudnych linii → Pending (`shadowing`). Spec: [`../superpowers/specs/2026-08-27-shadowing-memo-design.md`](../superpowers/specs/2026-08-27-shadowing-memo-design.md).

### Memo — Mnemonics

Biblioteka skojarzeń dźwiękowych (GenAI, PL) dla **zaakceptowanych** terminów bez cache: lista → **Generate** / podgląd → **Regenerate** (koszt GenAI, cap). Bez obrazków; bez wpisywania własnych. Spec: [`../superpowers/specs/2026-08-27-mnemonics-design.md`](../superpowers/specs/2026-08-27-mnemonics-design.md).

## 4. Language Switcher — jedno miejsce, skutek wszędzie

- **Jedyny** kontroler aktywnego języka nauki. Zmiana aktualizuje jednocześnie Chat, Memo (Flashcards / Shadowing / Mnemonics) i kontekst profilu.
- Widoczny w headerze powierzchni nauki (Chat / Memo); nie duplikować osobnych switcherów.
- Wizualnie: znaczniki Classical (**GB / US / DE / ES / IT**), **bez emoji flag**, + nazwa języka.
- British i American English = dwa osobne wpisy.
- „Add a language” w switcherze i w Menu → Languages.

## 5. Onboarding — wywiad zależny od języka

Wizard przed pierwszym Chat. Kolejność:

1. **Language selection** (obowiązkowy) — multi-select: English (British), English (American), German, Spanish, Italian. Znaczniki Classical, nie emoji.
2. Dla **każdego** wybranego języka (lub w pętli / zakładkach):
   - **Motivation** — career, travel, relocation, family, academic, culture, heritage, fun + Other
   - **Interests** — technology, sports, movies, music, books, travel, food, business, science, gaming, art, nature + Other → tworzą startowe zestawy Flashcards **dla tego języka**
   - **Self-assessment** — Reading / Speaking / Writing / Listening / Vocabulary, skala 1–5 z kotwicami opisowymi

Kroki Motivation / Interests / Self-assessment mają „Skip for now”. Po wywiadach: **opcjonalny** CEFR placement A1–C2 + intensywność planu **4 / 8 / 12 / 16** tygodni (Skip = brak planu). Potem **jawny wybór `active_language`**. Dodanie języka później: tylko brakujące kroki dla **tego** języka, potem ewentualna zmiana aktywnego w switcherze.

Po Interests: w tle **Generate first words** → wyniki w Pending (nie auto-accept).

Język ojczysty: **zawsze polski** — bez pytania w onboardingu.

Self-assessment 1–5 i CEFR są **osobne** (bez automatycznego mapowania).

## 6. Chat

- **Listening toggle (opcjonalny):** on = VAD hands-free; off = mic idle. iOS unlock = toggle on.
- Cold API: **Waking up…**
- **Pierwsza tura Agenta:** różne sformułowania pytania „o czym dziś / czego się uczymy?” — **bez** listy Interests. Interests tylko miękko przy ciszy / „nie wiem”.
- Agenda dostaje też **pamięć globalną** (fakty + ostatnie skróty sesji).
- Transkrypt **zawsze widoczny** w aktywnej sesji (linie User / Agent).
- Zaznaczenie (1 słowo / kilka / zdanie) → **Translate** | **Add to learning** (Package 1). Na **własnej** linii usera także **Check** (Package 2).
- Auto-korekta po turze usera (tylko substantive): tip pod linią (zwinięty: corrected L2 + typ; PL po rozwinięciu) + opcjonalne Add → Pending (`correction`). Live: równolegle z odpowiedzią; chained: po STT przed LLM.
- **End session** → Idle; w tle: ekstrakcja słów + update pamięci.
- Polski: tylko na wyraźną prośbę.
- „Zapisz słowo” (głos): Live tool → `agent_save` (accepted, nie Pending).
- Voice: Live direct / chained per `VOICE_MODE`.

## 7. Memo → Flashcards

- Sub-widoki: **Due today** | **Pending** | **Generate** (generowanie słów z kategorii / interests).
- **Vocabulary** (osobny tab Memo) — wszystkie `accepted` dla aktywnego języka; wyszukiwarka lokalna; Mnemonic per słowo.
- **Due today** — tylko `accepted` + FSRS; interwały dynamiczne.
- **Categories** — zestawy z interests + custom; „Generate new” → Pending.
- **Pending** — Accept / Reject dla `chat_extraction`, `category_generated`, `transcript_selection`, `lesson`, `correction`, `shadowing` (źródło widoczne). Nie wygasa. Badge z liczbą na zakładce Memo.
- Pusta ekstrakcja po czacie → toast „No new words from that chat”.
- Przy **spend cap**: Chat / Generate / selection Translate+Add / correction auto+Check / Shadowing start zablokowane; review OK. Nowy user: default **$10**/miesiąc.
- **Export to Quizlet** — `term<TAB>definition`, nowa linia = nowa fiszka (jak import Quizlet / paste z Excela). Download i/lub copy.

## 8. Dark mode

System / Light / Dark — pełna obsługa. Paleta Classical (patrz decisions).

## 9. Język produktu

UI copy i kod po **angielsku**. Rozmowa o projekcie może być po polsku; L1 w produkcie = polski.

## 10. Auth i admin

- Google OAuth (Supabase).
- Admin: tylko emaile z `ALLOWED_ADMIN_EMAILS` (prod: `fifmazurkiewicz@gmail.com`).
- Admin UI (desktop): miesięczny spend cap + used this month (TTS + ASR + GenAI).
- Po limicie do końca miesiąca: kosztowe off; Memo Flashcards review on. TZ: Europe/Warsaw.

## 11. Wireframe addendum

### 11.1 Chat

Header: język → switcher. Stany: Waking up… → Idle z **opcjonalnym listening toggle** → Listening/Thinking/Speaking (VAD, bez mic per turn) → End session → Idle. Mic blocked sheet. Badge Memo gdy Pending.

### 11.2 Memo

Sub-tabs: **Flashcards** | **Vocabulary** | **Shadowing** | **Mnemonics**.

**Flashcards:** Due Today | Pending | Generate (category vocab generation). Badge na tabie Memo. Export (tab-separated). Cap banner. Due card: **Mnemonic** button.

**Vocabulary:** all accepted words for active language; local search; Mnemonic shortcut per term.

**Shadowing:** topic intake → generate or pick conversation → show-text + TTS|Live → loop → end hard-line batch → Pending.

**Mnemonics:** needs-mnemonic list → Generate/Regenerate panel (PL association + example).

### 11.3 Menu

Account · Languages · Profile (per język) · **Plan** (opcjonalny: placement / intensywność / lekcje) · **Memory** (facts: edit/delete; recent summaries) · Appearance · Admin · Sign out.

Plan nie jest czwartą zakładką dolnego paska. Brak planu nie blokuje Chat/Memo.

### 11.4 Onboarding

Jak §5 + opcjonalny placement CEFR + intensywność + finalny ekran wyboru aktywnego języka.

### 11.5 Admin

Name | Email | Monthly spend cap | Used this month | Edit cap. Wyróżnienie „At cap”. Dialog: „Costly features pause until next calendar month. Reviews stay available. Nothing is deleted.”

### 11.6 Kierunek wizualny

SoT: **Classical** (decisions). Spec funkcjonalny nie narzuca innej palety — Classical wygrywa kolizję z wcześniejszą wskazówką „unikaj krem+serif”.
