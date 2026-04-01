/**
 * ShipStatus — displays ship hull condition and crew morale indicators.
 *
 * Phase 27: GAME-03 (hull wear) and GAME-04 (crew morale).
 *
 * Hull bar: green when healthy, amber below 50, red below 30.
 * Morale indicator: text label with color coding.
 * Repair button: shown when at port and hull < 100.
 *
 * Parchment aesthetic: Cinzel headings, Lora body, sepia palette.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { ShipCrewStatus } from '../../shared/game-types';

interface ShipStatusProps {
  /** Whether the player is currently at a port (enables repair button) */
  atPort: boolean;
  /** Called after successful repair to refresh parent state */
  onRepair?: () => void;
}

const HEADING: React.CSSProperties = {
  fontFamily: "'Cinzel', 'Palatino Linotype', Georgia, serif",
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#5a3e2b',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: '0.5rem',
};

const BODY: React.CSSProperties = {
  fontFamily: "'Lora', Georgia, serif",
  fontSize: '0.75rem',
  color: '#7a5c45',
};

function getHullColor(hull: number): string {
  if (hull < 30) return '#8b2e2e';   // critical: red-sepia
  if (hull < 50) return '#a07840';    // warning: amber
  return '#2b5c4a';                    // healthy: green-sepia
}

function getMoraleColor(level: string): string {
  if (level === 'enthusiastic') return '#2b5c4a';
  if (level === 'disgruntled') return '#8b2e2e';
  return '#7a5c45';
}

function getMoraleLabel(level: string): string {
  if (level === 'enthusiastic') return 'Enthusiastic';
  if (level === 'disgruntled') return 'Disgruntled';
  return 'Steady';
}

export default function ShipStatus({ atPort, onRepair }: ShipStatusProps): React.ReactElement {
  const [status, setStatus] = useState<ShipCrewStatus | null>(null);
  const [repairing, setRepairing] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await window.api.game.getShipCrewStatus();
      if (res.success) {
        setStatus(res.data);
      }
    } catch {
      // Non-fatal: status display is supplementary
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const cleanup = window.api.subscribe('game:updated', () => {
      void loadStatus();
    });
    return cleanup;
  }, [loadStatus]);

  const handleRepair = useCallback(async () => {
    setRepairing(true);
    try {
      const res = await window.api.game.repairHull();
      if (res.success) {
        void loadStatus();
        onRepair?.();
      }
    } catch {
      // Non-fatal
    } finally {
      setRepairing(false);
    }
  }, [loadStatus, onRepair]);

  if (!status) return <div />;

  const hullColor = getHullColor(status.hullCondition);
  const moraleColor = getMoraleColor(status.moraleLevel);
  const moraleLabel = getMoraleLabel(status.moraleLevel);
  const needsRepair = atPort && status.hullCondition < 100;

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #e0cdb0',
      }}
    >
      <h3 style={HEADING}>Ship & Crew</h3>

      {/* Hull Condition */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            ...BODY,
            marginBottom: '0.2rem',
          }}
        >
          <span>Hull</span>
          <span style={{ fontWeight: 600, color: hullColor }}>
            {status.hullCondition}%
          </span>
        </div>
        <div
          style={{
            height: '6px',
            backgroundColor: '#e0cdb0',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${status.hullCondition}%`,
              backgroundColor: hullColor,
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        {status.hullWarning && (
          <div
            style={{
              ...BODY,
              fontSize: '0.65rem',
              color: '#8b2e2e',
              fontStyle: 'italic',
              marginTop: '0.2rem',
            }}
          >
            {status.canSail
              ? 'Hull damaged -- repairs recommended before sailing.'
              : 'Hull critically damaged! Cannot sail until repaired.'}
          </div>
        )}
      </div>

      {/* Crew Morale */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            ...BODY,
            marginBottom: '0.2rem',
          }}
        >
          <span>Crew Morale</span>
          <span style={{ fontWeight: 600, color: moraleColor }}>
            {moraleLabel}
          </span>
        </div>
        <div
          style={{
            height: '6px',
            backgroundColor: '#e0cdb0',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${status.crewMorale}%`,
              backgroundColor: moraleColor,
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        {status.moraleLevel === 'disgruntled' && (
          <div
            style={{
              ...BODY,
              fontSize: '0.65rem',
              color: '#8b2e2e',
              fontStyle: 'italic',
              marginTop: '0.2rem',
            }}
          >
            Crew is disgruntled. Speed reduced, trades cost more.
          </div>
        )}
        {status.moraleLevel === 'enthusiastic' && (
          <div
            style={{
              ...BODY,
              fontSize: '0.65rem',
              color: '#2b5c4a',
              fontStyle: 'italic',
              marginTop: '0.2rem',
            }}
          >
            Crew is enthusiastic! Speed bonus active.
          </div>
        )}
      </div>

      {/* Repair Button */}
      {needsRepair && (
        <button
          type="button"
          onClick={handleRepair}
          disabled={repairing || status.repairCost <= 0}
          style={{
            width: '100%',
            padding: '0.4rem 0.5rem',
            backgroundColor: repairing ? '#e0cdb0' : '#5a3e2b',
            color: repairing ? '#7a5c45' : '#fdf8f0',
            border: '1px solid #c4956a',
            borderRadius: '4px',
            cursor: repairing ? 'not-allowed' : 'pointer',
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
          }}
        >
          {repairing ? 'Repairing...' : `Repair Hull (${status.repairCost}g)`}
        </button>
      )}
    </div>
  );
}
