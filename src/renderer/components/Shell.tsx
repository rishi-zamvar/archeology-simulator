/**
 * Shell — root layout component.
 *
 * Full-screen three-column layout:
 *   [SidePanel left] [MapArea central] [SidePanel right]
 *
 * All layout concerns live here. The Shell is the single component that
 * wires useUIStore to the two SidePanels. Child routes/panels render inside
 * SidePanel children slots.
 *
 * Keyboard shortcuts:
 *   [ — toggle left panel
 *   ] — toggle right panel
 *
 * Left panel: PortInfoPanel + CargoHold + ProfitDisplay
 * Right panel: TradePanel (when a port is selected)
 */

import React, { useEffect, useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useGameState } from '../hooks/useGameState';
import SidePanel from './SidePanel';
import MapArea from './MapArea';
import PortInfoPanel from './PortInfoPanel';
import TradePanel from './TradePanel';
import CargoHold from './CargoHold';
import ProfitDisplay from './ProfitDisplay';
import ShipMarker from './ShipMarker';
import { useTradeState } from '../hooks/useTradeState';
import type { SailingState } from '../../game/types';

export default function Shell(): React.ReactElement {
  const {
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    selectedPortId,
    setSelectedPort,
  } = useUIStore();

  const { state: gameState } = useGameState();
  const { marketGoods, inventory, transactions } = useTradeState(selectedPortId);

  // Build port coordinates map from loaded ports for ShipMarker
  const [portCoords, setPortCoords] = React.useState<Map<string, [number, number]>>(new Map());

  useEffect(() => {
    window.api.game.getPorts().then((ports) => {
      const map = new Map<string, [number, number]>();
      ports.forEach((p) => map.set(p.id, [p.lat, p.lng]));
      setPortCoords(map);
    }).catch(() => {/* non-fatal: ship marker just won't animate */});
  }, []);

  // Keyboard shortcuts for panel toggling (accessibility requirement)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Do not intercept when focus is inside an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '[') {
        toggleLeftPanel();
      } else if (e.key === ']') {
        toggleRightPanel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLeftPanel, toggleRightPanel]);

  function handleNavigate(destinationPortId: string) {
    void window.api.game.action({
      type: 'SET_SAIL',
      destination: destinationPortId,
      eta: 0,
    });
  }

  const handleBuy = useCallback(async (goodId: string, qty: number) => {
    if (!selectedPortId) return;
    await window.api.game.buyGood(selectedPortId, goodId, qty);
  }, [selectedPortId]);

  const handleSell = useCallback(async (goodId: string, qty: number) => {
    if (!selectedPortId) return;
    await window.api.game.sellGood(selectedPortId, goodId, qty);
  }, [selectedPortId]);

  const isSailing = gameState?.type === 'sailing';
  const sailingState = isSailing ? (gameState as SailingState) : null;

  // Port display name for TradePanel header
  const portDisplayName = selectedPortId
    ? selectedPortId.charAt(0).toUpperCase() + selectedPortId.slice(1).replace(/_/g, ' ')
    : '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#f8edd8', /* parchment-100 */
        position: 'relative',
      }}
    >
      {/* Left side panel — port info + cargo hold + profit/loss */}
      <SidePanel
        side="left"
        isOpen={leftPanelOpen}
        onToggle={toggleLeftPanel}
      >
        {selectedPortId ? (
          <PortInfoPanel
            portId={selectedPortId}
            onClose={() => setSelectedPort(null)}
            onNavigate={handleNavigate}
          />
        ) : undefined}
        <CargoHold inventory={inventory} />
        <ProfitDisplay inventory={inventory} transactions={transactions} />
      </SidePanel>

      {/* Central map area — ShipMarker passed as child (needs MapContainer context) */}
      <MapArea>
        {sailingState && portCoords.size > 0 && (
          <ShipMarker
            sailingState={sailingState}
            portCoords={portCoords}
          />
        )}
      </MapArea>

      {/* Right side panel — trade panel when a port is selected */}
      <SidePanel
        side="right"
        isOpen={rightPanelOpen}
        onToggle={toggleRightPanel}
      >
        {selectedPortId ? (
          <TradePanel
            portId={selectedPortId}
            portName={portDisplayName}
            marketGoods={marketGoods}
            inventory={inventory}
            onBuy={handleBuy}
            onSell={handleSell}
          />
        ) : (
          <div
            style={{
              padding: '1.5rem 1rem',
              color: '#7a5c45',
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.875rem',
              fontStyle: 'italic',
              opacity: 0.7,
            }}
          >
            Select a port to trade.
          </div>
        )}
      </SidePanel>
    </div>
  );
}
