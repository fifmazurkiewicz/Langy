import Link from "next/link";

export const metadata = { title: "Privacy Policy | Langy" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2 border-t border-[var(--color-divider)] pt-5">
    <h2 className="font-serif text-xl">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-[var(--color-soft)]">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-5 py-10">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">Effective 13 September 2026</p>
        <h1 className="font-serif text-3xl">Privacy Policy / Polityka prywatności</h1>
        <p className="text-sm text-[var(--color-soft)]">This page explains how Langy handles personal data and generative AI. Ta strona wyjaśnia, jak Langy przetwarza dane osobowe i wykorzystuje generatywną AI.</p>
      </div>

      <Section title="Controller and contact / Administrator i kontakt">
        <p>The controller is the operator of Langy. Privacy requests: <a className="text-[var(--color-accent)] hover:underline" href="mailto:fifmazurkiewicz@gmail.com">fifmazurkiewicz@gmail.com</a>.</p>
        <p>Administratorem danych jest operator Langy. Wnioski dotyczące prywatności można przesyłać na powyższy adres.</p>
      </Section>
      <Section title="Data and purposes / Dane i cele">
        <p>We process Google account details, language profiles, interests, skill self-assessments, chat transcripts, corrections, vocabulary, memory facts, study plans, shadowing activity, service logs, and usage costs to provide, secure, personalize, and operate Langy.</p>
        <p>Przetwarzamy dane konta Google, profile językowe, zainteresowania, samoocenę umiejętności, transkrypcje rozmów, korekty, słownictwo, pamięć, plany nauki, aktywność shadowing, logi i koszty użycia w celu świadczenia, zabezpieczenia i personalizacji usługi.</p>
      </Section>
      <Section title="AI and voice / AI i głos">
        <p>Langy clearly identifies AI-generated tutor content. AI output can be incomplete, biased, or wrong and is not an authoritative language assessment.</p>
        <p>Depending on configuration, necessary excerpts are processed by OpenRouter, Google Gemini, ElevenLabs, and Langfuse. Microphone audio may also be processed by the browser speech service. Langy stores transcripts; the current application does not persist raw microphone recordings.</p>
        <p>Treści nauczyciela są generowane przez AI i mogą zawierać błędy. Zależnie od konfiguracji niezbędne fragmenty mogą być przetwarzane przez wskazanych dostawców. Langy zapisuje transkrypcje, ale obecna aplikacja nie utrwala surowych nagrań z mikrofonu.</p>
      </Section>
      <Section title="Legal grounds / Podstawy prawne">
        <p>Core account and learning processing is necessary to provide the service requested by the user. Security and limited operational logging rely on the controller&apos;s legitimate interests. Where optional processing requiring consent is introduced, it will remain off until consent is given and can be withdrawn.</p>
        <p>Podstawowe przetwarzanie jest niezbędne do świadczenia usługi. Bezpieczeństwo i ograniczone logi operacyjne opierają się na prawnie uzasadnionym interesie. Opcjonalne operacje wymagające zgody pozostaną wyłączone do czasu jej udzielenia.</p>
      </Section>
      <Section title="Recipients and transfers / Odbiorcy i transfery">
        <p>Infrastructure and processing may involve Supabase, Render, Vercel, Cloudflare, OpenRouter, Google, ElevenLabs, and Langfuse. Some providers may process data outside the EEA under their applicable contractual safeguards. The exact active providers depend on production configuration.</p>
        <p>Dane mogą być powierzane wymienionym dostawcom, także poza EOG z zastosowaniem odpowiednich zabezpieczeń umownych. Aktywny zestaw dostawców zależy od konfiguracji produkcyjnej.</p>
      </Section>
      <Section title="Retention and controls / Retencja i kontrola">
        <p>Completed conversations are retained for up to 365 days by the application default unless deleted earlier. Account and learning data remain while the account is active or until deletion is requested. Provider logs and backups expire under their configured schedules.</p>
        <p>Zakończone rozmowy są domyślnie przechowywane do 365 dni, chyba że użytkownik usunie je wcześniej. Dane konta i nauki pozostają do czasu usunięcia konta lub danych. Kopie zapasowe i logi dostawców wygasają zgodnie z ich konfiguracją.</p>
        <p>Signed-in users can delete conversations and memory items, export their application data, or delete the account from Menu → Privacy & data.</p>
      </Section>
      <Section title="Your rights / Twoje prawa">
        <p>You may request access, portability, correction, deletion, restriction, objection, or withdrawal of consent where applicable. You may complain to the Polish President of the Personal Data Protection Office (UODO).</p>
        <p>Możesz żądać dostępu, przeniesienia, sprostowania, usunięcia lub ograniczenia danych, wnieść sprzeciw, wycofać zgodę oraz złożyć skargę do Prezesa UODO.</p>
      </Section>
      <Section title="Use data carefully / Ostrożne korzystanie">
        <p>Use fictional names where identity is unnecessary. Do not enter passwords, payment data, confidential documents, unnecessary identifiers, sensitive data, or another person&apos;s data without permission.</p>
        <p>Używaj fikcyjnych imion, gdy tożsamość nie jest potrzebna. Nie podawaj haseł, danych płatniczych, poufnych dokumentów, zbędnych identyfikatorów, danych wrażliwych ani danych innych osób bez podstawy.</p>
      </Section>
      <Link href="/" className="classical-btn inline-block">Return to Langy</Link>
    </main>
  );
}
