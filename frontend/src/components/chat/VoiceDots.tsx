"use client";

import { voiceDotFillClass } from "@/components/chat/voiceDotFill";

type Props = {
  tutorVoice: boolean;
  listening: boolean;
  disabled?: boolean;
  onToggleTutorVoice: () => void;
  onToggleListening: () => void;
};

function DotButton({
  pressed,
  label,
  disabled,
  onClick,
}: {
  pressed: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-50"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      <span className={`h-3.5 w-3.5 rounded-full ring-1 ring-[var(--color-divider)] ${voiceDotFillClass(pressed)}`} />
    </button>
  );
}

export function VoiceDots({
  tutorVoice,
  listening,
  disabled,
  onToggleTutorVoice,
  onToggleListening,
}: Props) {
  return (
    <div className="flex items-center justify-end gap-0.5" role="group" aria-label="Voice controls">
      <DotButton
        pressed={tutorVoice}
        label={tutorVoice ? "Tutor voice on" : "Tutor voice off"}
        disabled={disabled}
        onClick={onToggleTutorVoice}
      />
      <DotButton
        pressed={listening}
        label={listening ? "Listening on" : "Listening off"}
        disabled={disabled}
        onClick={onToggleListening}
      />
    </div>
  );
}
