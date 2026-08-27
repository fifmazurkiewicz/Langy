# Langy — UX/UI, mobile MVP

Zapis stanu prac na ekranach mobilnych. Plansza: `screens/Chat Mobile.dc.html`.

## Kierunek wizualny

Design system **Classical**: Cormorant Garamond / Lora, hairlines, złoto tylko jako obrys. **Bez emoji** — języki jako GB / US / DE / ES / IT. Dark: #16130f / #1e1a15.

Classical jest SoT wizualnym (nadpisuje wcześniejszą ostrożność §11.6 w starym specu względem krem+serif).

## IA (2026-08-27)

Dolny pasek: **Chat / Memo / Menu**. Memo ma sub-taby: **Flashcards** · **Shadowing** · **Mnemonics**. Flashcards: Due / Categories / Pending / export.

## Ekrany

Kanwa 390 × 844 (mobile), admin 1180 × 760. Hit targets ≥ 44 px.

### Chat — `screens/ChatScreen.dc.html`

Wskaźnik Agenta: **Breath**. Stany: Idle, Listening, Thinking, Speaking, Session end, Mic blocked.

**Do aktualizacji mocków (delta domain + stack 2026-08-26):**

- **Listening toggle** (on/off, opcjonalny) — nie „Tap to start” jako obowiązek, nie mic per turn
- Stan **Waking up…** (Render cold start)
- **End session** CTA; po End → Idle (bez Accept na Chacie)
- Switcher Classical; jeden kontroler
- Zapis słowa przez Agenta (tool), nie UI picker
- Transkrypt zawsze widoczny (Package 1)

### Language switcher

Jeden arkusz z nagłówka nauki — **zmiana skutkuje wszędzie** (Chat + Memo + kontekst profilu). „Add a language” na dole.

### Memo — `screens/MemoScreen.dc.html`

Sub-taby Memo: Flashcards (Due / Categories / Pending) · Shadowing · Mnemonics.

**Flashcards mock (MemoScreen, stan flashcards):**

- Due today + Categories + **Pending** (third sub-tab)
- Badge Pending na dolnym **Memo**
- Interwały FSRS z silnika (nie hardcode 1m/8m/…)
- Przycisk **Mnemonic** na karcie Due (back state)
- Accept/Reject + źródło (chat / category / transcript / …)
- Export Quizlet (tab + newline)
- Banner miesięcznego cap ($10 default)

**Shadowing / Mnemonics:** osobne stany mocka lub osobne pliki — do domknięcia w kolejnych turach UX.

### Menu — `screens/MenuScreen.dc.html`

Languages · Profile (Motivation / Interests / Self-assessment **per język**) · **Plan** (opcjonalny) · **Memory** · Appearance · Admin · Sign out. Auto-save przy edycji.

### Onboarding — `screens/OnboardingScreen.dc.html`

Języki → dla każdego języka: Motivation → Interests → Self-assessment (Skip na opcjonalnych). L1 niepytany (zawsze PL). CEFR placement opcjonalny (Skip).

### Admin — `screens/AdminPanel.dc.html`

Monthly spend cap + used this month. Copy limitu: kosztowe funkcje pauzują do **następnego miesiąca kalendarzowego**; review zostaje; nic nie usuwamy.

## Ton copy

Angielski UI. Błędy = co się stało + co zrobić. Puste stany afirmatywne. Bez zawstydzania.

## Do domknięcia (UX mocki)

- Shadowing + Mnemonics pełne ekrany
- Formularz „Add your own category” + loading Generate
- Desktop Chat/Memo
- PWA: mic prompt, A2HS, offline
- Tokeny CSS zamiast hardcode Classical

## Pliki

| Plik | Zawartość |
| --- | --- |
| `screens/Chat Mobile.dc.html` | plansza |
| `screens/ChatScreen.dc.html` | Chat |
| `screens/MemoScreen.dc.html` | Memo (Flashcards focus) |
| `screens/WordsScreen.dc.html` | **deprecated** — alias do MemoScreen |
| `screens/MenuScreen.dc.html` | Menu |
| `screens/OnboardingScreen.dc.html` | wizard |
| `screens/AdminPanel.dc.html` | admin |
| `ux-ui-spec.md` | kontrakt UX |
| `screens/_ds/classical-…/` | Classical DS |
