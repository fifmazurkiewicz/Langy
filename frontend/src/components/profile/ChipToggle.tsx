"use client";

type Props = {
  label: string;
  selected: boolean;
  onToggle: () => void;
};

export function ChipToggle({ label, selected, onToggle }: Props) {
  return (
    <button
      type="button"
      className={`classical-btn min-h-[40px] px-3 py-1 text-sm capitalize ${
        selected ? "classical-btn-primary" : ""
      }`}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}
