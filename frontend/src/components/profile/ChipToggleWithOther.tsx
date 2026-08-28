"use client";

type Props = {
  label: string;
  selected: boolean;
  onToggle: () => void;
  otherText?: string;
  onOtherTextChange?: (value: string) => void;
};

export function ChipToggleWithOther({ label, selected, onToggle, otherText, onOtherTextChange }: Props) {
  const isOther = label === "other";
  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={`classical-btn px-3 py-1 text-sm capitalize ${selected ? "classical-btn-primary" : ""}`}
        onClick={onToggle}
      >
        {isOther ? "Other…" : label}
      </button>
      {isOther && selected && onOtherTextChange ? (
        <input
          className="classical-input text-sm"
          placeholder="Describe…"
          value={otherText ?? ""}
          onChange={(e) => onOtherTextChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}

export function resolveChipValues(
  selected: string[],
  otherTexts: Record<string, string>,
  otherKey: string
): string[] {
  return selected.map((v) => {
    if (v !== "other") return v;
    const trimmed = (otherTexts[otherKey] ?? "").trim();
    return trimmed ? `other:${trimmed}` : "other";
  });
}
