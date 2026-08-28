import { CEFR_LEVELS, clampSkillLevel, skillLevelToCefr } from "@/lib/constants/profile";

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export function SkillCefrSlider({ label, value, onChange }: Props) {
  const level = clampSkillLevel(value);

  return (
    <label className="block text-sm">
      <span className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{skillLevelToCefr(level)}</span>
      </span>
      <input
        type="range"
        min={1}
        max={CEFR_LEVELS.length}
        value={level}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
      />
    </label>
  );
}
