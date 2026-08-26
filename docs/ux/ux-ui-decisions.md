# Langy — UX/UI, mobile MVP

Zapis stanu prac na ekranach mobilnych. Plansza: `screens/Chat Mobile.dc.html`.

## Kierunek wizualny

Design system **Classical**: Cormorant Garamond / Lora, hairlines, złoto tylko jako obrys. **Bez emoji** — języki jako GB / US / DE / ES / IT. Dark: #16130f / #1e1a15.

Classical jest SoT wizualnym (nadpisuje wcześniejszą ostrożność §11.6 w starym specu względem krem+serif).

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

### Language switcher

Jeden arkusz z nagłówka nauki — **zmiana skutkuje wszędzie** (Chat + Words + kontekst profilu). „Add a language” na dole.

### Words — `screens/WordsScreen.dc.html`

Due today + Categories. Interwały FSRS z silnika (nie hardcode 1m/8m/…).

**Do dodania w mockach:**

- Sub-widok **Pending** + badge na Words
- Accept/Reject + źródło (chat / category)
- Export Quizlet (tab + newline)
- Banner miesięcznego cap ($10 default)
- Onboarding: ekran wyboru aktywnego języka

### Menu — `screens/MenuScreen.dc.html`

Languages · Profile (Motivation / Interests / Self-assessment **per język**) · **Memory** (global facts edit/delete + summaries) · Appearance · Admin · Sign out. Auto-save przy edycji.

### Onboarding — `screens/OnboardingScreen.dc.html`

Języki → dla każdego języka: Motivation → Interests → Self-assessment (Skip na opcjonalnych). L1 niepytany (zawsze PL).

### Admin — `screens/AdminPanel.dc.html`

Monthly spend cap + used this month. Copy limitu: kosztowe funkcje pauzują do **następnego miesiąca kalendarzowego**; review zostaje; nic nie usuwamy.

## Ton copy

Angielski UI. Błędy = co się stało + co zrobić. Puste stany afirmatywne. Bez zawstydzania.

## Do domknięcia (UX mocki)

- Formularz „Add your own category” + loading Generate
- Accept/Reject + export `.txt` w mockach Words / Session end
- Desktop Chat/Words
- PWA: mic prompt, A2HS, offline
- Tokeny CSS zamiast hardcode Classical
- Banner spend cap

## Pliki

| Plik | Zawartość |
| --- | --- |
| `screens/Chat Mobile.dc.html` | plansza |
| `screens/ChatScreen.dc.html` | Chat |
| `screens/WordsScreen.dc.html` | Words |
| `screens/MenuScreen.dc.html` | Menu |
| `screens/OnboardingScreen.dc.html` | wizard |
| `screens/AdminPanel.dc.html` | admin |
| `ux-ui-spec.md` | kontrakt UX |
| `screens/_ds/classical-…/` | Classical DS |
