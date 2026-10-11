const CANCELLATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const COD_RESTRICTION_MS = 90 * 24 * 60 * 60 * 1000;
const CANCELLATIONS_TO_RESTRICT = 4;

export function codRestrictionUntil(
  cancellationTimes: string[],
  now = Date.now(),
): number | null {
  const times = cancellationTimes
    .map((value) => Date.parse(value))
    .filter((time) => Number.isFinite(time) && time <= now)
    .sort((a, b) => b - a);
  let latestUntil: number | null = null;

  for (let index = 0; index <= times.length - CANCELLATIONS_TO_RESTRICT; index += 1) {
    const newest = times[index]!;
    const fourth = times[index + CANCELLATIONS_TO_RESTRICT - 1]!;
    if (newest - fourth > CANCELLATION_WINDOW_MS) continue;
    const until = fourth + COD_RESTRICTION_MS;
    if (until > now && (latestUntil === null || until > latestUntil)) latestUntil = until;
  }

  return latestUntil;
}
