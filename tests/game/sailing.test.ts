/**
 * Sailing utility tests — calculateAnimationDuration and interpolateLatLng.
 *
 * BDD naming convention: test_givenX_whenY_thenZ
 */

import { describe, it, expect } from 'vitest';
import { calculateAnimationDuration, interpolateLatLng } from '../../src/game/sailing';

describe('calculateAnimationDuration', () => {
  it('test_given1Turn_whenCalculating_thenReturns4000ms', () => {
    // 1 month voyage = 4 seconds animation
    expect(calculateAnimationDuration(1)).toBe(4000);
  });

  it('test_given2Turns_whenCalculating_thenReturns8000ms', () => {
    // 2 month voyage = 8 seconds animation
    expect(calculateAnimationDuration(2)).toBe(8000);
  });

  it('test_given3Turns_whenCalculating_thenReturnsClampedMaximum10000', () => {
    // 3 month voyage (rare, with weather) = clamped to 10s
    expect(calculateAnimationDuration(3)).toBe(10000);
  });
});

describe('interpolateLatLng', () => {
  it('test_givenStartAndEnd_whenTIs0_thenReturnsStart', () => {
    expect(interpolateLatLng([0, 0], [10, 20], 0)).toEqual([0, 0]);
  });

  it('test_givenStartAndEnd_whenTIs1_thenReturnsEnd', () => {
    expect(interpolateLatLng([0, 0], [10, 20], 1)).toEqual([10, 20]);
  });

  it('test_givenStartAndEnd_whenTIs05_thenReturnsMidpoint', () => {
    expect(interpolateLatLng([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
  });
});
