/**
 * Sailing utility tests — calculateAnimationDuration and interpolateLatLng.
 *
 * BDD naming convention: test_givenX_whenY_thenZ
 */

import { describe, it, expect } from 'vitest';
import { calculateAnimationDuration, interpolateLatLng } from '../../src/game/sailing';

describe('calculateAnimationDuration', () => {
  it('test_given1Turn_whenCalculating_thenReturnsClampedMinimum2000', () => {
    expect(calculateAnimationDuration(1)).toBe(2000);
  });

  it('test_given4Turns_whenCalculating_thenReturns2000EqualsMin', () => {
    expect(calculateAnimationDuration(4)).toBe(2000);
  });

  it('test_given5Turns_whenCalculating_thenReturns2500', () => {
    expect(calculateAnimationDuration(5)).toBe(2500);
  });

  it('test_given10Turns_whenCalculating_thenReturns5000', () => {
    expect(calculateAnimationDuration(10)).toBe(5000);
  });

  it('test_given20Turns_whenCalculating_thenReturnsClampedMaximum8000', () => {
    expect(calculateAnimationDuration(20)).toBe(8000);
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
