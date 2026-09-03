/** CSS class for Tutor/Listening header dots (on = accent, off = dark). */
export function voiceDotFillClass(on: boolean): string {
  return on ? "bg-[var(--color-accent)]" : "bg-[color-mix(in_srgb,#201f1d_85%,transparent)]";
}
