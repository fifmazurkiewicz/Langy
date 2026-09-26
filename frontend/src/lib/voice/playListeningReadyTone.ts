/** A short, unobtrusive cue that the microphone is now listening. */
export function playListeningReadyTone(): void {
  if (typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) return;

  try {
    const context = new AudioContextCtor();
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    gain.gain.setValueAtTime(0.035, context.currentTime);
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.07);
    oscillator.onended = () => void context.close();
  } catch {
    // Audio may be unavailable until a user gesture; listening still works without the cue.
  }
}
