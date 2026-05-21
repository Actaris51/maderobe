import type { Season } from '@/types';

/** Current meteorological season for the user (France-centric: northern hemisphere). */
export function currentSeason(now: Date = new Date()): Season {
  const m = now.getMonth(); // 0..11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}
