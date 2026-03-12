/**
 * useTradeState — loads market prices, player inventory, and transaction history
 * for a given port. Subscribes to game:updated to auto-refresh after trades.
 *
 * Returns undefined when data is still loading. Returns an error string on failure.
 */

import { useState, useEffect, useCallback } from 'react';
import type { MarketGood, PlayerInventory, TransactionRecord } from '../../shared/ipc-types';

export interface TradeStateData {
  marketGoods: MarketGood[];
  inventory: PlayerInventory;
  transactions: TransactionRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTradeState(portId: string | null): TradeStateData {
  const [marketGoods, setMarketGoods] = useState<MarketGood[]>([]);
  const [inventory, setInventory] = useState<PlayerInventory>({
    gold: 500,
    cargoItems: [],
    cargoCapacity: 50,
    currentCargo: 0,
  });
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!portId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [goods, inv, txns] = await Promise.all([
        window.api.game.getMarketPrices(portId),
        window.api.game.getPlayerInventory(),
        window.api.game.getTransactionHistory(10),
      ]);
      setMarketGoods(goods);
      setInventory(inv);
      setTransactions(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [portId]);

  // Load on mount and when portId changes
  useEffect(() => {
    void load();
  }, [load]);

  // Subscribe to game:updated push events to refresh after trades
  useEffect(() => {
    const cleanup = window.api.subscribe('game:updated', () => {
      void load();
    });
    return cleanup;
  }, [load]);

  return { marketGoods, inventory, transactions, isLoading, error, refresh: load };
}
