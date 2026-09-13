import Link from "next/link";
import { ClassicalBottomSheet } from "@/components/chat/ClassicalBottomSheet";

type Props = { open: boolean; onContinue: () => void; onCancel: () => void };

export function MicrophonePrivacyNotice({ open, onContinue, onCancel }: Props) {
  return (
    <ClassicalBottomSheet
      open={open}
      title="Use your microphone?"
      onClose={onCancel}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="classical-btn" onClick={onCancel}>Not now</button>
          <button type="button" className="classical-btn classical-btn-primary" onClick={onContinue}>Continue</button>
        </div>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-[var(--color-soft)]">
        <p>Your browser will ask for microphone access. Speech is transcribed so the tutor can respond.</p>
        <p>Audio may be processed by your browser&apos;s speech service or Google Gemini Live. Langy stores the resulting transcript, not a raw recording.</p>
        <p>You can keep Listening off and use typed chat instead.</p>
        <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Privacy details</Link>
      </div>
    </ClassicalBottomSheet>
  );
}
