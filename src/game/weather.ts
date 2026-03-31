/**
 * Weather module — Season derivation and weather modifier pure functions.
 *
 * Pure functions only. No side effects, no Node.js imports.
 * Importable from both main and renderer processes.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface WeatherModifiers {
  season: Season;
  monthName: string;
  durationMultiplier: number;
  stormWeight: number;
  calmWeight: number;
  pirateWeight: number;
  isMareClasum: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Athenian calendar months in order, matching turnToDate() in Logbook.tsx. */
const MONTH_NAMES = [
  'Hekatombaion',   // 0
  'Metageitnion',   // 1
  'Boedromion',     // 2
  'Pyanepsion',     // 3
  'Maimakterion',   // 4
  'Poseideon',      // 5
  'Gamelion',       // 6
  'Anthesterion',   // 7
  'Elaphebolion',   // 8
  'Mounichion',     // 9
  'Thargelion',     // 10
  'Skirophorion',   // 11
] as const;

/** Month index -> season mapping (matches turnToDate() order). */
const MONTH_TO_SEASON: Season[] = [
  'summer',  // 0: Hekatombaion
  'summer',  // 1: Metageitnion
  'autumn',  // 2: Boedromion
  'autumn',  // 3: Pyanepsion
  'winter',  // 4: Maimakterion
  'winter',  // 5: Poseideon
  'winter',  // 6: Gamelion
  'winter',  // 7: Anthesterion
  'spring',  // 8: Elaphebolion
  'spring',  // 9: Mounichion
  'spring',  // 10: Thargelion
  'summer',  // 11: Skirophorion
];

/** Season-specific modifiers. Weights sum to 100 for each season. */
const SEASON_CONFIG: Record<Season, Omit<WeatherModifiers, 'season' | 'monthName'>> = {
  winter:  { durationMultiplier: 1.5, stormWeight: 40, calmWeight: 30, pirateWeight: 30, isMareClasum: true },
  autumn:  { durationMultiplier: 1.0, stormWeight: 20, calmWeight: 50, pirateWeight: 30, isMareClasum: false },
  spring:  { durationMultiplier: 1.0, stormWeight: 10, calmWeight: 60, pirateWeight: 30, isMareClasum: false },
  summer:  { durationMultiplier: 0.8, stormWeight: 5,  calmWeight: 70, pirateWeight: 25, isMareClasum: false },
};

/** Historically grounded weather descriptions per season (randomly selected). */
const SEASONAL_DESCRIPTIONS: Record<Season, string[]> = {
  winter: [
    'Harsh winter squalls batter the coast. Poseidon tests the courage of sailors.',
    'Dark storm clouds hang low over churning seas. The harbor chains rattle in the gale.',
    'Freezing rain lashes the deck. Winter storms make even the bravest captains cautious.',
    'A harsh squall sweeps across the harbor. The sea is angry and unforgiving.',
    'Bitter winds howl through the rigging. Only the desperate sail in winter.',
  ],
  spring: [
    'Gentle spring winds favor the voyage. The seas open once more.',
    'Fair breezes carry the scent of blossoms from shore. The sailing season begins.',
    'The first gentle zephyrs ripple across calm waters. Spring merchants ready their vessels.',
    'Spring rains have passed. Clear skies and favorable currents beckon.',
    'Fair spring weather returns. Dolphins leap alongside the hull as life returns to the sea.',
  ],
  summer: [
    'Clear skies and steady winds speed the journey.',
    'The summer sun blazes overhead. A hot, dry etesian wind fills the sail.',
    'Calm seas glitter under a cloudless sky. Perfect conditions for trade.',
    'Warm Mediterranean breezes push the vessel along at a fine clip.',
    'The sea is as smooth as hammered bronze beneath the summer sun.',
  ],
  autumn: [
    'Autumn mists gather on the water. The season of storms approaches.',
    'The winds shift unpredictably as summer yields to autumn chill.',
    'Scattered autumn clouds race across the sky. The sea grows restless.',
    'A distant rumble of autumn thunder warns of the changing season.',
    'Cool autumn air sweeps in from the north. Experienced sailors watch the horizon warily.',
  ],
};

// ── Public Functions ─────────────────────────────────────────────────────────

/**
 * Derive the season and month name from a turn number.
 * Uses modular arithmetic to wrap around the 12-month Athenian calendar.
 */
export function getSeason(turn: number): { season: Season; monthName: string } {
  const monthIndex = ((turn % 12) + 12) % 12; // handles negative turns safely
  return {
    season: MONTH_TO_SEASON[monthIndex],
    monthName: MONTH_NAMES[monthIndex],
  };
}

/**
 * Get all weather modifiers for a given turn.
 * Includes season, month name, duration multiplier, event weights, and mare clausum status.
 */
export function getWeatherModifiers(turn: number): WeatherModifiers {
  const { season, monthName } = getSeason(turn);
  return { season, monthName, ...SEASON_CONFIG[season] };
}

/**
 * Get a historically grounded weather description for the current turn's season.
 * Returns a randomly selected string from a pool of descriptions per season.
 */
export function getSeasonalWeatherDescription(turn: number): string {
  const { season } = getSeason(turn);
  const descriptions = SEASONAL_DESCRIPTIONS[season];
  const index = Math.floor(Math.random() * descriptions.length);
  return descriptions[index];
}
