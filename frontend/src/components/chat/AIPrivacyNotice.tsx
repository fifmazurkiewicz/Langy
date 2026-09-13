import Link from "next/link";
import { ClassicalBottomSheet } from "@/components/chat/ClassicalBottomSheet";

type Props = {
  open: boolean;
  onContinue: () => void;
};

export function AIPrivacyNotice({ open, onContinue }: Props) {
  return (
    <ClassicalBottomSheet
      open={open}
      title="Before you practise"
      onClose={() => undefined}
      footer={
        <button type="button" className="classical-btn classical-btn-primary w-full" onClick={onContinue}>
          I understand, continue
        </button>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-[var(--color-soft)]">
        <p>You are interacting with an AI tutor. Its corrections and answers may be inaccurate.</p>
        <p>
          Langy stores chat transcripts and learning data. Depending on your settings, text or live audio may be processed by configured AI and speech providers.
        </p>
        <p>
          Use fictional names in examples. Do not share passwords, financial details, confidential information, or another person&apos;s personal data.
        </p>
        <Link href="/privacy" className="inline-block text-[var(--color-accent)] underline-offset-4 hover:underline">
          Read the Privacy Policy
        </Link>
      </div>
    </ClassicalBottomSheet>
  );
}
