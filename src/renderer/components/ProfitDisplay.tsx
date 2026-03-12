/**
 * ProfitDisplay — running profit/loss and last 10 transaction history.
 *
 * Profit = current gold − 500 (starting amount).
 * Positive = green-sepia, negative = red-sepia.
 *
 * Transaction log shows each buy/sell with good, quantity, value, and sign.
 * Parchment aesthetic: Cinzel headings, Lora body, sepia palette.
 */

import React from 'react';
import type { PlayerInventory, TransactionRecord } from '../../shared/ipc-types';

interface ProfitDisplayProps {
  inventory: PlayerInventory;
  transactions: TransactionRecord[];
}

const STARTING_GOLD = 500;

const HEADING: React.CSSProperties = {
  fontFamily: "'Cinzel', 'Palatino Linotype', Georgia, serif",
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#5a3e2b',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
};

const BODY: React.CSSProperties = {
  fontFamily: "'Lora', Georgia, serif",
  fontSize: '0.75rem',
  color: '#7a5c45',
};

function formatGoodName(goodId: string): string {
  const names: Record<string, string> = {
    wheat: 'Wheat',
    olive_oil: 'Olive Oil',
    wine: 'Wine',
    textiles: 'Textiles',
    spices: 'Spices',
    bronze: 'Bronze',
    timber: 'Timber',
    pottery: 'Pottery',
  };
  return names[goodId] ?? goodId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProfitDisplay({
  inventory,
  transactions,
}: ProfitDisplayProps): React.ReactElement {
  const profit = inventory.gold - STARTING_GOLD;
  const isPositive = profit >= 0;

  return (
    <div style={{ padding: '1rem' }}>
      {/* Profit/loss summary */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ ...HEADING, marginBottom: '0.4rem' }}>Ledger</h3>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span style={BODY}>Gold</span>
          <span
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '1rem',
              fontWeight: 700,
              color: '#a07840',
            }}
          >
            {inventory.gold}g
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: '0.2rem',
          }}
        >
          <span style={BODY}>Profit / Loss</span>
          <span
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.9rem',
              fontWeight: 700,
              color: isPositive ? '#2b5c4a' : '#8b2e2e',
            }}
          >
            {isPositive ? '+' : ''}{profit}g
          </span>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h3 style={{ ...HEADING, marginBottom: '0.5rem', fontSize: '0.72rem' }}>
          Recent Trades
        </h3>

        {transactions.length === 0 ? (
          <div
            style={{
              ...BODY,
              fontStyle: 'italic',
              opacity: 0.6,
              fontSize: '0.72rem',
            }}
          >
            No trades yet.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
            }}
          >
            {transactions.map((txn, idx) => {
              const isBuy = txn.action === 'buy';
              return (
                <div
                  key={txn.id ?? idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isBuy ? '#fdf4ea' : '#f0faf4',
                    border: `1px solid ${isBuy ? '#e0cdb0' : '#b0d8c4'}`,
                    borderRadius: '2px',
                    padding: '0.25rem 0.4rem',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: "'Cinzel', Georgia, serif",
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase' as const,
                        color: isBuy ? '#7a5c2b' : '#2b5c4a',
                        marginRight: '0.3rem',
                      }}
                    >
                      {isBuy ? 'BUY' : 'SELL'}
                    </span>
                    <span style={{ ...BODY, fontSize: '0.72rem' }}>
                      {txn.quantity}× {formatGoodName(txn.goodId)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: isBuy ? '#8b2e2e' : '#2b5c4a',
                    }}
                  >
                    {isBuy ? '−' : '+'}{txn.totalValue}g
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
