/**
 * Weather module tests — WX-01 through WX-04
 *
 * TDD: These tests were written BEFORE the implementation.
 * Run RED to confirm failure, then GREEN after implementing src/game/weather.ts.
 */

import { describe, it, expect, vi } from 'vitest';
import { getSeason, getWeatherModifiers, getSeasonalWeatherDescription } from '../../src/game/weather';
import { rollVoyageEvent } from '../../src/game/events';

// ── WX-01: Season derivation for all 12 Athenian months ──────────────────────

describe('WX-01: getSeason — Athenian calendar month-to-season mapping', () => {
  it('test_givenTurn0_whenGetSeason_thenSummerHekatombaion', () => {
    const result = getSeason(0);
    expect(result.season).toBe('summer');
    expect(result.monthName).toBe('Hekatombaion');
  });

  it('test_givenTurn1_whenGetSeason_thenSummerMetageitnion', () => {
    const result = getSeason(1);
    expect(result.season).toBe('summer');
    expect(result.monthName).toBe('Metageitnion');
  });

  it('test_givenTurn2_whenGetSeason_thenAutumnBoedromion', () => {
    const result = getSeason(2);
    expect(result.season).toBe('autumn');
    expect(result.monthName).toBe('Boedromion');
  });

  it('test_givenTurn3_whenGetSeason_thenAutumnPyanepsion', () => {
    const result = getSeason(3);
    expect(result.season).toBe('autumn');
    expect(result.monthName).toBe('Pyanepsion');
  });

  it('test_givenTurn4_whenGetSeason_thenWinterMaimakterion', () => {
    const result = getSeason(4);
    expect(result.season).toBe('winter');
    expect(result.monthName).toBe('Maimakterion');
  });

  it('test_givenTurn5_whenGetSeason_thenWinterPoseideon', () => {
    const result = getSeason(5);
    expect(result.season).toBe('winter');
    expect(result.monthName).toBe('Poseideon');
  });

  it('test_givenTurn6_whenGetSeason_thenWinterGamelion', () => {
    const result = getSeason(6);
    expect(result.season).toBe('winter');
    expect(result.monthName).toBe('Gamelion');
  });

  it('test_givenTurn7_whenGetSeason_thenWinterAnthesterion', () => {
    const result = getSeason(7);
    expect(result.season).toBe('winter');
    expect(result.monthName).toBe('Anthesterion');
  });

  it('test_givenTurn8_whenGetSeason_thenSpringElaphebolion', () => {
    const result = getSeason(8);
    expect(result.season).toBe('spring');
    expect(result.monthName).toBe('Elaphebolion');
  });

  it('test_givenTurn9_whenGetSeason_thenSpringMounichion', () => {
    const result = getSeason(9);
    expect(result.season).toBe('spring');
    expect(result.monthName).toBe('Mounichion');
  });

  it('test_givenTurn10_whenGetSeason_thenSpringThargelion', () => {
    const result = getSeason(10);
    expect(result.season).toBe('spring');
    expect(result.monthName).toBe('Thargelion');
  });

  it('test_givenTurn11_whenGetSeason_thenSummerSkirophorion', () => {
    const result = getSeason(11);
    expect(result.season).toBe('summer');
    expect(result.monthName).toBe('Skirophorion');
  });

  it('test_givenTurn12_whenGetSeason_thenWrapsToMonth0', () => {
    const result0 = getSeason(0);
    const result12 = getSeason(12);
    expect(result12.season).toBe(result0.season);
    expect(result12.monthName).toBe(result0.monthName);
  });

  it('test_givenTurn23_whenGetSeason_thenWrapsToMonth11', () => {
    const result11 = getSeason(11);
    const result23 = getSeason(23);
    expect(result23.season).toBe(result11.season);
    expect(result23.monthName).toBe(result11.monthName);
  });
});

// ── WX-02: Duration multipliers per season ───────────────────────────────────

describe('WX-02: getWeatherModifiers — duration multipliers', () => {
  it('test_givenSummerTurn0_whenGetWeatherModifiers_thenDurationMultiplier0point8', () => {
    expect(getWeatherModifiers(0).durationMultiplier).toBe(0.8);
  });

  it('test_givenWinterTurn4_whenGetWeatherModifiers_thenDurationMultiplier1point5', () => {
    expect(getWeatherModifiers(4).durationMultiplier).toBe(1.5);
  });

  it('test_givenSpringTurn8_whenGetWeatherModifiers_thenDurationMultiplier1point0', () => {
    expect(getWeatherModifiers(8).durationMultiplier).toBe(1.0);
  });

  it('test_givenAutumnTurn2_whenGetWeatherModifiers_thenDurationMultiplier1point0', () => {
    expect(getWeatherModifiers(2).durationMultiplier).toBe(1.0);
  });
});

// ── WX-03: Seasonal event weights ────────────────────────────────────────────

describe('WX-03: getWeatherModifiers — storm and event weights', () => {
  it('test_givenWinterTurn4_whenGetWeatherModifiers_thenStormWeight40', () => {
    expect(getWeatherModifiers(4).stormWeight).toBe(40);
  });

  it('test_givenSummerTurn0_whenGetWeatherModifiers_thenStormWeight5', () => {
    expect(getWeatherModifiers(0).stormWeight).toBe(5);
  });

  it('test_givenSpringTurn8_whenGetWeatherModifiers_thenStormWeight10', () => {
    expect(getWeatherModifiers(8).stormWeight).toBe(10);
  });

  it('test_givenAutumnTurn2_whenGetWeatherModifiers_thenStormWeight20', () => {
    expect(getWeatherModifiers(2).stormWeight).toBe(20);
  });

  it('test_givenWinterSeason_whenWeightsChecked_thenStormPlusCalmPlusPirateEquals100', () => {
    const mods = getWeatherModifiers(4);
    expect(mods.stormWeight + mods.calmWeight + mods.pirateWeight).toBe(100);
  });

  it('test_givenSummerSeason_whenWeightsChecked_thenStormPlusCalmPlusPirateEquals100', () => {
    const mods = getWeatherModifiers(0);
    expect(mods.stormWeight + mods.calmWeight + mods.pirateWeight).toBe(100);
  });

  it('test_givenSpringSeason_whenWeightsChecked_thenStormPlusCalmPlusPirateEquals100', () => {
    const mods = getWeatherModifiers(8);
    expect(mods.stormWeight + mods.calmWeight + mods.pirateWeight).toBe(100);
  });

  it('test_givenAutumnSeason_whenWeightsChecked_thenStormPlusCalmPlusPirateEquals100', () => {
    const mods = getWeatherModifiers(2);
    expect(mods.stormWeight + mods.calmWeight + mods.pirateWeight).toBe(100);
  });
});

// ── WX-04: Mare clausum ───────────────────────────────────────────────────────

describe('WX-04: getWeatherModifiers — mare clausum (winter sailing closure)', () => {
  it('test_givenMaimakterionTurn4_whenGetWeatherModifiers_thenIsMareClasum', () => {
    expect(getWeatherModifiers(4).isMareClasum).toBe(true);
  });

  it('test_givenAnthesterionTurn7_whenGetWeatherModifiers_thenIsMareClasum', () => {
    expect(getWeatherModifiers(7).isMareClasum).toBe(true);
  });

  it('test_givenElaphebolionTurn8_whenGetWeatherModifiers_thenNotMareClasum', () => {
    expect(getWeatherModifiers(8).isMareClasum).toBe(false);
  });

  it('test_givenPyanepsionTurn3_whenGetWeatherModifiers_thenNotMareClasum', () => {
    expect(getWeatherModifiers(3).isMareClasum).toBe(false);
  });

  it('test_givenSummerTurn0_whenGetWeatherModifiers_thenNotMareClasum', () => {
    expect(getWeatherModifiers(0).isMareClasum).toBe(false);
  });

  it('test_givenAllWinterMonths_whenGetWeatherModifiers_thenAllAreMareClasum', () => {
    // Months 4-7: Maimakterion, Poseideon, Gamelion, Anthesterion
    for (let month = 4; month <= 7; month++) {
      expect(getWeatherModifiers(month).isMareClasum).toBe(true);
    }
  });

  it('test_givenAllNonWinterMonths_whenGetWeatherModifiers_thenNoneAreMareClasum', () => {
    const nonWinterMonths = [0, 1, 2, 3, 8, 9, 10, 11];
    for (const month of nonWinterMonths) {
      expect(getWeatherModifiers(month).isMareClasum).toBe(false);
    }
  });
});

// ── Seasonal weather descriptions ─────────────────────────────────────────────

describe('getSeasonalWeatherDescription — historically grounded descriptions', () => {
  it('test_givenSummerTurn0_whenGetDescription_thenNonEmptyString', () => {
    const desc = getSeasonalWeatherDescription(0);
    expect(typeof desc).toBe('string');
    expect(desc.length).toBeGreaterThan(0);
    expect(desc).not.toContain('undefined');
  });

  it('test_givenWinterTurn4_whenGetDescription_thenReferencesWinterConditions', () => {
    const desc = getSeasonalWeatherDescription(4);
    expect(typeof desc).toBe('string');
    expect(desc.length).toBeGreaterThan(0);
    // Should reference winter-related content (storms, squalls, Poseidon, harsh, etc.)
    const lowerDesc = desc.toLowerCase();
    const hasWinterReference =
      lowerDesc.includes('winter') ||
      lowerDesc.includes('storm') ||
      lowerDesc.includes('squall') ||
      lowerDesc.includes('harsh') ||
      lowerDesc.includes('poseidon');
    expect(hasWinterReference).toBe(true);
  });

  it('test_givenSpringTurn8_whenGetDescription_thenReferencesSpringConditions', () => {
    const desc = getSeasonalWeatherDescription(8);
    expect(typeof desc).toBe('string');
    expect(desc.length).toBeGreaterThan(0);
    const lowerDesc = desc.toLowerCase();
    const hasSpringReference =
      lowerDesc.includes('spring') ||
      lowerDesc.includes('gentle') ||
      lowerDesc.includes('open') ||
      lowerDesc.includes('favorable') ||
      lowerDesc.includes('fair');
    expect(hasSpringReference).toBe(true);
  });

  it('test_givenAllSeasons_whenGetDescription_thenAllReturnNonEmptyStrings', () => {
    // One representative turn per season
    const turns = [0, 2, 4, 8]; // summer, autumn, winter, spring
    for (const turn of turns) {
      const desc = getSeasonalWeatherDescription(turn);
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    }
  });
});

// ── Seasonal weights integration with rollVoyageEvent ────────────────────────

describe('rollVoyageEvent — seasonal weights parameter', () => {
  it('test_givenNoSeasonalWeights_whenRollVoyageEvent_thenReturnsValidEventOrNull', () => {
    // Ensure backward compatibility: calling without seasonalWeights still works
    let gotEvent = false;
    let gotNull = false;
    for (let i = 0; i < 200; i++) {
      const result = rollVoyageEvent(0);
      if (result === null) {
        gotNull = true;
      } else {
        gotEvent = true;
        expect(['storm', 'pirate', 'calm']).toContain(result.type);
        expect(result.id).toBeDefined();
        expect(result.title).toBeDefined();
      }
      if (gotEvent && gotNull) break;
    }
    // With 70% event chance over 200 rolls, we should see both outcomes
    expect(gotEvent).toBe(true);
  });

  it('test_givenWinterWeights_whenRollVoyageEvent1000Times_thenStormRateHigherThanSummer', () => {
    const winterWeights = { storm: 40, pirate: 30, calm: 30 };
    const summerWeights = { storm: 5, pirate: 25, calm: 70 };

    let winterStorms = 0;
    let winterTotal = 0;
    let summerStorms = 0;
    let summerTotal = 0;

    // Force event occurrence by mocking the first Math.random call
    const originalRandom = Math.random;
    let callCount = 0;
    Math.random = () => {
      callCount++;
      // First call is the 70% occurrence check — return 0.5 to always trigger
      if (callCount % 3 === 1) return 0.5;
      // Remaining calls: pseudo-random based on counter for weight selection + pool pick
      return ((callCount * 7919) % 997) / 997;
    };

    for (let i = 0; i < 1000; i++) {
      callCount = i * 3;
      const result = rollVoyageEvent(4, undefined, undefined, winterWeights);
      if (result) {
        winterTotal++;
        if (result.type === 'storm') winterStorms++;
      }
    }

    for (let i = 0; i < 1000; i++) {
      callCount = i * 3;
      const result = rollVoyageEvent(0, undefined, undefined, summerWeights);
      if (result) {
        summerTotal++;
        if (result.type === 'storm') summerStorms++;
      }
    }

    Math.random = originalRandom;

    // Winter storm rate should be significantly higher than summer
    const winterStormRate = winterStorms / winterTotal;
    const summerStormRate = summerStorms / summerTotal;
    expect(winterStormRate).toBeGreaterThan(summerStormRate);
  });
});
