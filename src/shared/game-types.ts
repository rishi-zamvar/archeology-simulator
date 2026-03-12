/**
 * Game domain types shared between main process logic and renderer.
 *
 * GamePhase is the FSM discriminant — the set of mutually exclusive
 * game states. Using a union type prevents impossible combinations at
 * compile time (you cannot be both 'trading' and 'sailing').
 */

export type GamePhase = 'idle' | 'trading' | 'sailing' | 'encountered';

export type Port = {
  id: string;
  name: string;
  ancientName: string;
  lat: number;
  lng: number;
};

export type Good = {
  id: string;
  name: string;
  basePrice: number;
  unit: string;
};
