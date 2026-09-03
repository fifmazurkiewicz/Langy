/** Suspend mic recognition around async TTS without flipping the user's Listening preference. */
export async function withMicSuspended<T>(
  listeningOn: boolean,
  setSuspended: (value: boolean) => void,
  work: () => Promise<T>
): Promise<T> {
  if (!listeningOn) {
    return work();
  }
  setSuspended(true);
  try {
    return await work();
  } finally {
    setSuspended(false);
  }
}
