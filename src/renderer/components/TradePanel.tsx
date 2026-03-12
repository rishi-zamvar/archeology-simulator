/**
 * TradePanel — right-panel trade UI for a port.
 *
 * Shows all goods available at the port with current buy/sell prices,
 * a quantity input, and buy/sell buttons.
 *
 * Buy is disabled when insufficient gold or cargo space.
 * Sell is disabled when the player is not carrying any of that good.
 * Feedback messages shown inline after each action.
 *
 * Parchment aesthetic: Cinzel headings, Lora body, sepia palette.
 */

import React, { useState, useCallback } from 'react';
import type { MarketGood, PlayerInventory } from '../../shared/ipc-types';
import TradeGoodIcon from './TradeGoodIcon';
import ArtifactImage, { ArtifactCaption } from './ArtifactImage';
import { useArtifactImages } from '../hooks/useArtifactImages';

interface TradePanelProps {
  portId: string;
  portName: string;
  marketGoods: MarketGood[];
  inventory: PlayerInventory;
  onBuy: (goodId: string, qty: number) => Promise<void>;
  onSell: (goodId: string, qty: number) => Promise<void>;
}

const HEADING: React.CSSProperties = {
  fontFamily: "'Cinzel', 'Palatino Linotype', Georgia, serif",
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#5a3e2b',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: '0.25rem',
};

const SUBTEXT: React.CSSProperties = {
  fontFamily: "'Lora', Georgia, serif",
  fontSize: '0.75rem',
  color: '#7a5c45',
};

const ROW_STYLE: React.CSSProperties = {
  borderBottom: '1px solid #e0cdb0',
  paddingBottom: '0.75rem',
  marginBottom: '0.75rem',
};

export default function TradePanel({
  portId,
  portName,
  marketGoods,
  inventory,
  onBuy,
  onSell,
}: TradePanelProps): React.ReactElement {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, { msg: string; ok: boolean }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const artifactMap = useArtifactImages(marketGoods.map((g) => g.id));

  // Trade good icons rendered inline (no API fetch needed)

  const getQty = (goodId: string) => quantities[goodId] ?? 1;

  const setQty = (goodId: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [goodId]: Math.max(1, Math.min(val, 99)) }));
  };

  const setMsg = (goodId: string, msg: string, ok: boolean) => {
    setFeedback((prev) => ({ ...prev, [goodId]: { msg, ok } }));
    setTimeout(() => {
      setFeedback((prev) => {
        const next = { ...prev };
        delete next[goodId];
        return next;
      });
    }, 3000);
  };

  const handleBuy = useCallback(
    async (goodId: string) => {
      const qty = getQty(goodId);
      setBusy(goodId + ':buy');
      try {
        await onBuy(goodId, qty);
        setMsg(goodId, `Bought ${qty} unit${qty > 1 ? 's' : ''}.`, true);
      } catch (err) {
        setMsg(goodId, err instanceof Error ? err.message : 'Buy failed.', false);
      } finally {
        setBusy(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onBuy, quantities]
  );

  const handleSell = useCallback(
    async (goodId: string) => {
      const qty = getQty(goodId);
      setBusy(goodId + ':sell');
      try {
        await onSell(goodId, qty);
        setMsg(goodId, `Sold ${qty} unit${qty > 1 ? 's' : ''}.`, true);
      } catch (err) {
        setMsg(goodId, err instanceof Error ? err.message : 'Sell failed.', false);
      } finally {
        setBusy(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSell, quantities]
  );

  const getCarried = (goodId: string) =>
    inventory.cargoItems
      .filter((c) => c.goodId === goodId)
      .reduce((s, c) => s + c.quantity, 0);

  const freeSpace = inventory.cargoCapacity - inventory.currentCargo;

  return (
    <div
      style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <h2
          style={{
            ...HEADING,
            fontSize: '0.9rem',
            marginBottom: '0.2rem',
          }}
        >
          Market — {portName}
        </h2>
        <div style={SUBTEXT}>
          <span style={{ color: '#a07840', fontWeight: 600 }}>{inventory.gold}</span>
          {' '}gold · {inventory.currentCargo}/{inventory.cargoCapacity} cargo
        </div>
      </div>

      {/* Goods list */}
      {marketGoods.length === 0 ? (
        <div style={{ ...SUBTEXT, fontStyle: 'italic', opacity: 0.7 }}>
          No goods available at this port.
        </div>
      ) : (
        marketGoods.map((good) => {
          const carried = getCarried(good.id);
          const qty = getQty(good.id);
          const canBuy = inventory.gold >= good.currentPrice * qty && freeSpace >= qty && busy === null;
          const canSell = carried >= qty && busy === null;
          const fb = feedback[good.id];

          return (
            <div key={good.id} style={ROW_STYLE}>
              {/* Museum artifact thumbnail (lazy-loaded; falls back to SVG amphora) */}
              {(() => {
                const artifacts = artifactMap.get(good.id);
                const artifact = artifacts?.[0];
                if (!artifact) return null;
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <div>
                      <ArtifactImage artifact={artifact} />
                      <ArtifactCaption artifact={artifact} />
                    </div>
                  </div>
                );
              })()}

              {/* Good icon + name + price */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  marginBottom: '0.25rem',
                }}
              >
                <TradeGoodIcon goodId={good.id} size={40} />
                <span style={{ ...HEADING, fontSize: '0.75rem', marginBottom: 0, flex: 1 }}>
                  {good.name}
                </span>
                <span
                  style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#a07840',
                  }}
                >
                  {good.currentPrice}g
                </span>
              </div>

              {/* Carrying indicator */}
              {carried > 0 && (
                <div
                  style={{
                    ...SUBTEXT,
                    fontSize: '0.7rem',
                    marginBottom: '0.3rem',
                    color: '#5a7a45',
                  }}
                >
                  Carrying: {carried}
                </div>
              )}

              {/* Quantity + buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {/* Quantity stepper */}
                <button
                  type="button"
                  onClick={() => setQty(good.id, qty - 1)}
                  style={stepperBtn}
                  aria-label={`Decrease quantity for ${good.name}`}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={qty}
                  onChange={(e) => setQty(good.id, parseInt(e.target.value, 10) || 1)}
                  style={{
                    width: '2.5rem',
                    textAlign: 'center',
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.8rem',
                    color: '#5a3e2b',
                    backgroundColor: '#fdf8f0',
                    border: '1px solid #c4956a',
                    borderRadius: '2px',
                    padding: '1px 2px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setQty(good.id, qty + 1)}
                  style={stepperBtn}
                  aria-label={`Increase quantity for ${good.name}`}
                >
                  +
                </button>

                {/* Buy button */}
                <button
                  type="button"
                  onClick={() => { void handleBuy(good.id); }}
                  disabled={!canBuy}
                  title={
                    !canBuy
                      ? inventory.gold < good.currentPrice * qty
                        ? 'Insufficient gold'
                        : freeSpace < qty
                        ? 'Not enough cargo space'
                        : ''
                      : `Buy ${qty} × ${good.name} for ${good.currentPrice * qty}g`
                  }
                  style={{
                    ...actionBtn,
                    backgroundColor: canBuy ? '#7a5c2b' : '#c4b09a',
                    cursor: canBuy ? 'pointer' : 'not-allowed',
                    flex: 1,
                  }}
                >
                  Buy
                </button>

                {/* Sell button */}
                <button
                  type="button"
                  onClick={() => { void handleSell(good.id); }}
                  disabled={!canSell}
                  title={
                    !canSell
                      ? carried === 0
                        ? `Not carrying any ${good.name}`
                        : `Carrying only ${carried}`
                      : `Sell ${qty} × ${good.name} for ${good.currentPrice * qty}g`
                  }
                  style={{
                    ...actionBtn,
                    backgroundColor: canSell ? '#2b5c4a' : '#9ab0aa',
                    cursor: canSell ? 'pointer' : 'not-allowed',
                    flex: 1,
                  }}
                >
                  Sell
                </button>
              </div>

              {/* Inline feedback */}
              {fb && (
                <div
                  style={{
                    ...SUBTEXT,
                    fontSize: '0.7rem',
                    marginTop: '0.25rem',
                    color: fb.ok ? '#2b5c4a' : '#8b2e2e',
                    fontStyle: 'italic',
                  }}
                >
                  {fb.msg}
                </div>
              )}

            </div>
          );
        })
      )}

      {/* Hidden portId reference for data contract — not rendered visibly */}
      <span data-portid={portId} style={{ display: 'none' }} />
    </div>
  );
}

const stepperBtn: React.CSSProperties = {
  width: '1.4rem',
  height: '1.4rem',
  lineHeight: '1',
  backgroundColor: '#f0e4cc',
  border: '1px solid #c4956a',
  borderRadius: '2px',
  cursor: 'pointer',
  fontFamily: "'Lora', Georgia, serif",
  fontSize: '0.9rem',
  color: '#5a3e2b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

const actionBtn: React.CSSProperties = {
  padding: '0.2rem 0.4rem',
  border: 'none',
  borderRadius: '2px',
  fontFamily: "'Cinzel', Georgia, serif",
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  color: '#fdf8f0',
  textTransform: 'uppercase' as const,
  transition: 'opacity 0.15s',
};
