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

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useGameState } from '../hooks/useGameState';
import SidePanel from './SidePanel';
import MapArea from './MapArea';
import PortInfoPanel from './PortInfoPanel';
import PortScene from './PortScene';
import TradePanel from './TradePanel';
import CargoHold from './CargoHold';
import ProfitDisplay from './ProfitDisplay';
import ShipMarker from './ShipMarker';
import EventCard from './EventCard';
import TutorialModal from './TutorialModal';
import { useTradeState } from '../hooks/useTradeState';
import { useAudioManager } from '../hooks/useAudioManager';
import type { SailingState, TradingState } from '../../game/types';
import type { VoyageEvent } from '../../shared/game-types';

export default function Shell(): React.ReactElement {
  const {
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    selectedPortId,
    setSelectedPort,
    openLeftPanel,
    openRightPanel,
  } = useUIStore();

  const { state: gameState } = useGameState();
  const { marketGoods, inventory, transactions } = useTradeState(selectedPortId);

  // Ambient audio — start on first user interaction (browser autoplay policy)
  const audio = useAudioManager();
  const ambientStarted = useRef(false);
  const handleFirstInteraction = useCallback(() => {
    if (!ambientStarted.current) {
      ambientStarted.current = true;
      void audio.playAmbient('/audio/ambient-port.mp3');
    }
  }, [audio]);

  // Voyage event state
  const [pendingEvent, setPendingEvent] = useState<VoyageEvent | null>(null);
  const [eventToast, setEventToast] = useState<string | null>(null);

  // Build port coordinates map from loaded ports for ShipMarker
  const [portCoords, setPortCoords] = React.useState<Map<string, [number, number]>>(new Map());

  useEffect(() => {
    window.api.game.getPorts().then((ports) => {
      const map = new Map<string, [number, number]>();
      ports.forEach((p) => map.set(p.id, [p.lat, p.lng]));
      setPortCoords(map);
    }).catch(() => {/* non-fatal: ship marker just won't animate */});
  }, []);

  // Sync trading port into uiStore so panels know which port to display
  const tradingState = gameState?.type === 'trading' ? (gameState as TradingState) : null;
  useEffect(() => {
    if (tradingState) {
      setSelectedPort(tradingState.selectedPort);
    }
    // Do NOT clear selectedPortId when leaving trading — panels may still be open
    // and user may want to sail from PortInfoPanel destinations list
  }, [tradingState?.selectedPort, setSelectedPort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for EncounteredState transitions and fetch the pending event
  useEffect(() => {
    if (gameState?.type === 'encountered') {
      window.api.game.getPendingEvent().then((event) => {
        if (event) setPendingEvent(event);
      }).catch(() => {/* non-fatal: event card won't show */});
    } else {
      // Game left encountered state (resolved or rolled back)
      // Don't clear pendingEvent here — EventCard manages its own dismissal
      // to avoid a flash when the state updates before the 2-second timer fires
    }
  }, [gameState?.type]);

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
  const isTrading = gameState?.type === 'trading';

  // Port display name for TradePanel header and PortScene banner
  const portDisplayName = selectedPortId
    ? selectedPortId.charAt(0).toUpperCase() + selectedPortId.slice(1).replace(/_/g, ' ')
    : '';

  return (
    <div
      onClick={handleFirstInteraction}
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
      {/* Wrapper div: flex:1 so it fills the row, relative so PortScene can overlay */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <MapArea>
          {sailingState && portCoords.size > 0 && (
            <ShipMarker
              sailingState={sailingState}
              portCoords={portCoords}
            />
          )}
        </MapArea>

        {/* Port scene overlay — shown when player has arrived at a port */}
        {isTrading && selectedPortId && (
          <PortScene
            portId={selectedPortId}
            portName={portDisplayName}
            onOpenMarket={openRightPanel}
            onOpenHarbor={openLeftPanel}
          />
        )}
      </div>

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

      {/* Voyage event modal — blocking overlay during EncounteredState */}
      {pendingEvent && (
        <EventCard
          event={pendingEvent}
          onResolved={(message) => {
            setPendingEvent(null);
            if (message) {
              setEventToast(message);
              // Dismiss toast after 3 seconds
              setTimeout(() => setEventToast(null), 3000);
            }
          }}
        />
      )}

      {/* Event result toast — shown after EventCard is dismissed */}
      {eventToast && !pendingEvent && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1500,
            background: 'rgba(26, 15, 10, 0.88)',
            color: '#fdf5e6',
            padding: '0.6rem 1.25rem',
            borderRadius: 6,
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.85rem',
            fontStyle: 'italic',
            maxWidth: 400,
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        >
          {eventToast}
        </div>
      )}

      {/* Tutorial overlay — self-hides when tutorialPhase is completed or undefined */}
      {!pendingEvent && <TutorialModal />}
    </div>
  );
}
