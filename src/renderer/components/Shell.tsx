/**
 * Shell — root layout component.
 *
 * Full-screen map with floating overlay panels:
 *   - Map fills the entire viewport as background
 *   - Port info panel floats top-left when a port is selected
 *   - Trade panel floats top-right when a port is selected (with buy/sell)
 *   - Cargo/ledger bar floats bottom-left
 *   - Tutorial modal floats bottom-center
 *
 * Keyboard shortcuts:
 *   [ — toggle left panel
 *   ] — toggle right panel
 */

import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useGameState } from '../hooks/useGameState';
import MapArea from './MapArea';
import PortInfoPanel from './PortInfoPanel';
import PortScene from './PortScene';
import TradePanel from './TradePanel';
import CargoHold from './CargoHold';
import ProfitDisplay from './ProfitDisplay';
import ShipMarker from './ShipMarker';
import SailingOverlay from './SailingOverlay';
import EventCard from './EventCard';
import TutorialModal from './TutorialModal';
import Logbook from './Logbook';
import MareClausumModal from './MareClausumModal';
import TitleScreen from './TitleScreen';
import { useTradeState } from '../hooks/useTradeState';
import { useGeneratedAmbient } from '../hooks/useGeneratedAmbient';
import { getWeatherModifiers, getSeasonalWeatherDescription } from '../../game/weather';
import type { Season } from '../../game/weather';
import type { SailingTurnResult } from '../../game/sailing';
import type { SailingState, TradingState } from '../../game/types';
import type { VoyageEvent, PortRegion } from '../../shared/game-types';

/* ── Shared floating panel style ─────────────────────────────────────── */
const FLOAT_PANEL: React.CSSProperties = {
  position: 'absolute',
  backgroundColor: 'rgba(253, 248, 240, 0.95)',
  border: '1px solid #c4956a',
  borderRadius: 8,
  boxShadow: '0 4px 20px rgba(61, 43, 31, 0.18)',
  overflowY: 'auto',
  overflowX: 'hidden',
  zIndex: 1000,
};

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
    errorToast,
    showError,
    clearError,
  } = useUIStore();

  // Title screen gating — show title before gameplay
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [hasSave, setHasSave] = useState(false);

  // Check for existing save on mount (lightweight IPC, no game state loading)
  useEffect(() => {
    window.api?.game?.hasSave?.().then(res => {
      if (res.success) setHasSave(res.data);
    }).catch(() => { /* non-fatal: defaults to false, hiding Continue */ });
  }, []);

  const handleContinue = useCallback(() => {
    setScreen('game');
  }, []);

  const handleNewGame = useCallback(() => {
    window.api?.game?.newGame?.().then(res => {
      if (res.success) setScreen('game');
    }).catch((err: unknown) => showError('Failed to start new game: ' + (err instanceof Error ? err.message : 'Unknown error')));
  }, [showError]);

  // Full-map overlay — shown when player clicks mini-map from port scene
  const [showFullMap, setShowFullMap] = useState(false);
  // Mare clausum modal — set to destination port ID when navigating in winter
  const [mareClausumDest, setMareClausumDest] = useState<string | null>(null);

  const { state: gameState } = useGameState();
  const { marketGoods, inventory, transactions, error: tradeError } = useTradeState(selectedPortId);

  // Ambient audio — start on first user interaction (browser autoplay policy)
  const generatedAmbient = useGeneratedAmbient();
  const ambientStarted = useRef(false);
  const handleFirstInteraction = useCallback(() => {
    if (!ambientStarted.current) {
      ambientStarted.current = true;
      void generatedAmbient.start();
    }
  }, [generatedAmbient]);

  // Surface trade data errors to user via error toast
  useEffect(() => {
    if (tradeError) showError(tradeError);
  }, [tradeError, showError]);

  // Voyage event state
  const [pendingEvent, setPendingEvent] = useState<VoyageEvent | null>(null);
  const [eventToast, setEventToast] = useState<string | null>(null);

  // Sailing overlay data (fed by ShipMarker callbacks)
  const [sailingOverlayData, setSailingOverlayData] = useState<{
    currentTurn: number;
    totalTurns: number;
    weatherDescription: string;
    season: Season;
    monthName: string;
    lastEventMessage?: string;
  } | null>(null);

  const handleTurnAdvanced = useCallback((result: SailingTurnResult) => {
    setSailingOverlayData({
      currentTurn: result.turnNumber,
      totalTurns: result.totalTurns,
      weatherDescription: result.weatherDescription,
      season: result.season,
      monthName: result.monthName,
      lastEventMessage: result.event ? undefined : 'Uneventful sailing...',
    });
  }, []);

  const handleVoyageStarted = useCallback((totalTurns: number) => {
    const mods = getWeatherModifiers(gameState?.currentTurn ?? 0);
    const desc = getSeasonalWeatherDescription(gameState?.currentTurn ?? 0);
    setSailingOverlayData({
      currentTurn: 0,
      totalTurns,
      weatherDescription: desc,
      season: mods.season,
      monthName: mods.monthName,
    });
  }, [gameState?.currentTurn]);

  // Build port coordinates map from loaded ports for ShipMarker
  const [portCoords, setPortCoords] = React.useState<Map<string, [number, number]>>(new Map());
  // Build port regions map for PortScene illustration variant
  const [portRegions, setPortRegions] = React.useState<Map<string, PortRegion>>(new Map());

  useEffect(() => {
    window.api.game.getPorts().then((res) => {
      if (!res.success) return;
      const coords = new Map<string, [number, number]>();
      const regions = new Map<string, PortRegion>();
      res.data.forEach((p) => {
        coords.set(p.id, [p.lat, p.lng]);
        regions.set(p.id, p.region);
      });
      setPortCoords(coords);
      setPortRegions(regions);
    }).catch((err: unknown) => { /* non-fatal: ship marker just won't animate */ console.warn('Ship animation failed:', err); });
  }, []);

  // Sync trading port into uiStore so panels know which port to display
  const tradingState = gameState?.type === 'trading' ? (gameState as TradingState) : null;
  useEffect(() => {
    if (tradingState) {
      setSelectedPort(tradingState.selectedPort);
    }
  // Justification: intentionally depends only on tradingState?.selectedPort, not the full tradingState object, to avoid infinite re-render loop when tradingState reference changes
  }, [tradingState?.selectedPort, setSelectedPort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for EncounteredState transitions and fetch the pending event
  useEffect(() => {
    if (gameState?.type === 'encountered') {
      window.api.game.getPendingEvent().then((res) => {
        if (res.success && res.data) setPendingEvent(res.data);
      }).catch((err: unknown) => { console.warn('Failed to check pending event:', err); });
    }
  }, [gameState?.type]);

  // Keyboard shortcuts for panel toggling
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '[') toggleLeftPanel();
      else if (e.key === ']') toggleRightPanel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLeftPanel, toggleRightPanel]);

  function handleNavigate(destinationPortId: string) {
    setShowFullMap(false);
    const mods = getWeatherModifiers(gameState?.currentTurn ?? 0);
    if (mods.isMareClasum) {
      setMareClausumDest(destinationPortId);
      return;
    }
    window.api.game.action({
      type: 'SET_SAIL',
      destination: destinationPortId,
      eta: 0,
    }).catch((err: unknown) => showError('Failed to set sail: ' + (err instanceof Error ? err.message : 'Unknown error')));
  }

  function handleSailAnyway(destPortId: string) {
    setMareClausumDest(null);
    window.api.game.action({
      type: 'SET_SAIL',
      destination: destPortId,
      eta: 0,
    }).catch((err: unknown) => showError('Failed to set sail: ' + (err instanceof Error ? err.message : 'Unknown error')));
  }

  function handleWaitForSpring() {
    setMareClausumDest(null);
    window.api.game.waitForSpring().catch((err: unknown) =>
      showError('Failed to wait for spring: ' + (err instanceof Error ? err.message : 'Unknown error'))
    );
  }

  const handleBuy = useCallback(async (goodId: string, qty: number) => {
    if (!selectedPortId) return;
    const res = await window.api.game.buyGood(selectedPortId, goodId, qty);
    if (!res.success) throw new Error(res.error);
  }, [selectedPortId]);

  const handleSell = useCallback(async (goodId: string, qty: number) => {
    if (!selectedPortId) return;
    const res = await window.api.game.sellGood(selectedPortId, goodId, qty);
    if (!res.success) throw new Error(res.error);
  }, [selectedPortId]);

  // Derive seasonal weather modifiers for header display and mare clausum checks
  const weatherMods = getWeatherModifiers(gameState?.currentTurn ?? 0);

  const SEASON_TINTS: Record<string, string> = {
    summer: 'rgba(255, 200, 80, 0.15)',
    winter: 'rgba(100, 130, 180, 0.15)',
    spring: 'rgba(100, 180, 100, 0.1)',
    autumn: 'rgba(200, 140, 60, 0.1)',
  };

  const isSailing = gameState?.type === 'sailing';

  // Clear overlay data when no longer sailing
  useEffect(() => {
    if (!isSailing) setSailingOverlayData(null);
  }, [isSailing]);
  const sailingState = isSailing ? (gameState as SailingState) : null;

  // Determine water animation class based on sailing + weather
  const sailingWeatherClass = isSailing
    ? weatherMods.stormWeight > 25
      ? 'sailing-active sailing-storm'
      : weatherMods.season === 'winter'
        ? 'sailing-active sailing-winter'
        : 'sailing-active sailing-calm'
    : '';
  const isTrading = gameState?.type === 'trading';

  const portDisplayName = selectedPortId
    ? selectedPortId.charAt(0).toUpperCase() + selectedPortId.slice(1).replace(/_/g, ' ')
    : '';

  // Gate: show title screen before gameplay
  if (screen === 'title') {
    return <TitleScreen hasSave={hasSave} onContinue={handleContinue} onNewGame={handleNewGame} />;
  }

  return (
    <div
      className={sailingWeatherClass}
      onClick={handleFirstInteraction}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Full-screen map (background layer) ──────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapArea onPortSelected={() => setShowFullMap(false)}>
          {sailingState && portCoords.size > 0 && (
            <ShipMarker
              sailingState={sailingState}
              portCoords={portCoords}
              onTurnAdvanced={handleTurnAdvanced}
              onVoyageStarted={handleVoyageStarted}
            />
          )}
        </MapArea>
      </div>

      {/* ── Sailing overlay (top-center, above map) ──────────────────── */}
      {isSailing && sailingOverlayData && sailingState && (
        <SailingOverlay
          departurePort={
            sailingState.departurePortId
              ? sailingState.departurePortId.charAt(0).toUpperCase() + sailingState.departurePortId.slice(1).replace(/_/g, ' ')
              : 'Unknown'
          }
          destinationPort={
            sailingState.destination.charAt(0).toUpperCase() + sailingState.destination.slice(1).replace(/_/g, ' ')
          }
          currentTurn={sailingOverlayData.currentTurn}
          totalTurns={sailingOverlayData.totalTurns}
          weatherDescription={sailingOverlayData.weatherDescription}
          season={sailingOverlayData.season}
          monthName={sailingOverlayData.monthName}
          lastEventMessage={sailingOverlayData.lastEventMessage}
          stormWeight={weatherMods.stormWeight}
          durationMultiplier={weatherMods.durationMultiplier}
        />
      )}

      {/* ── Port scene overlay on map when at port ──────────────────── */}
      {isTrading && selectedPortId && !showFullMap && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <PortScene
            portId={selectedPortId}
            portName={portDisplayName}
            region={portRegions.get(selectedPortId) ?? 'greece'}
            onOpenMarket={toggleRightPanel}
            onOpenHarbor={toggleLeftPanel}
          />
        </div>
      )}

      {/* ── Floating Port Info Panel (top-left) — only on port scene ── */}
      {selectedPortId && leftPanelOpen && isTrading && !showFullMap && (
        <div
          style={{
            ...FLOAT_PANEL,
            top: 16,
            left: 16,
            width: 320,
            maxHeight: 'calc(100vh - 120px)',
          }}
        >
          <PortInfoPanel
            portId={selectedPortId}
            currentTurn={gameState?.currentTurn ?? 0}
            onClose={() => { setSelectedPort(null); toggleLeftPanel(); }}
            onNavigate={handleNavigate}
          />
        </div>
      )}

      {/* ── Floating Trade Panel (top-right) — only on port scene ──── */}
      {selectedPortId && rightPanelOpen && isTrading && !showFullMap && (
        <div
          style={{
            ...FLOAT_PANEL,
            top: 16,
            right: 16,
            width: 340,
            maxHeight: 'calc(100vh - 120px)',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={toggleRightPanel}
            aria-label="Close trade panel"
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#7a5c45',
              fontSize: '1rem',
              zIndex: 2,
              padding: '2px 6px',
            }}
          >
            ×
          </button>
          <TradePanel
            portId={selectedPortId}
            portName={portDisplayName}
            marketGoods={marketGoods}
            inventory={inventory}
            onBuy={handleBuy}
            onSell={handleSell}
          />
        </div>
      )}

      {/* ── Mini-map widget (bottom-right) when at port ────────────── */}
      {isTrading && selectedPortId && !showFullMap && (
        <button
          type="button"
          onClick={() => setShowFullMap(true)}
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            width: 120,
            height: 90,
            zIndex: 1000,
            border: '2px solid #c4956a',
            borderRadius: 6,
            overflow: 'hidden',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(61, 43, 31, 0.25)',
            padding: 0,
            background: '#e8d5b8',
          }}
          aria-label="Open full map"
        >
          {/* Mini map preview image */}
          <div style={{
            width: '100%',
            height: '100%',
            backgroundImage: 'url(https://tile.openstreetmap.org/3/4/2.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'sepia(0.6) saturate(0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.55rem',
              fontWeight: 700,
              color: '#3d2b1f',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              backgroundColor: 'rgba(253,248,240,0.85)',
              padding: '2px 8px',
              borderRadius: 3,
            }}>
              Map
            </span>
          </div>
        </button>
      )}

      {/* ── Port scene mini-button (bottom-right) when full map is open ── */}
      {isTrading && selectedPortId && showFullMap && (
        <button
          type="button"
          onClick={() => setShowFullMap(false)}
          aria-label={`Return to ${portDisplayName}`}
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            width: 120,
            height: 90,
            zIndex: 1100,
            border: '2px solid #c4956a',
            borderRadius: 6,
            overflow: 'hidden',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(61, 43, 31, 0.25)',
            padding: 0,
            background: '#f0d9b5',
          }}
        >
          <div style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(/assets/ports/${selectedPortId}.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#f0d9b5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.5rem',
              fontWeight: 700,
              color: '#3d2b1f',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              backgroundColor: 'rgba(253,248,240,0.88)',
              padding: '2px 8px',
              borderRadius: 3,
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {portDisplayName}
            </span>
          </div>
        </button>
      )}

      {/* ── Logbook dropdown (top-center) ──────────────────────── */}
      <Logbook
        currentTurn={gameState?.currentTurn ?? 0}
        gameStateType={gameState?.type ?? 'idle'}
        portName={portDisplayName || undefined}
        season={weatherMods.season}
        monthName={weatherMods.monthName}
        seasonTint={SEASON_TINTS[weatherMods.season]}
      />

      {/* ── Cargo + Ledger drop-up (bottom-left) ────────────────── */}
      <CargoDropUp inventory={inventory} transactions={transactions} />

      {/* ── Voyage event modal ──────────────────────────────────────── */}
      {pendingEvent && (
        <EventCard
          event={pendingEvent}
          onResolved={(message) => {
            setPendingEvent(null);
            if (message) {
              setEventToast(message);
              setTimeout(() => setEventToast(null), 3000);
            }
          }}
        />
      )}

      {/* ── Event result toast ──────────────────────────────────────── */}
      {eventToast && !pendingEvent && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 11000,
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

      {/* ── Error toast (top-right) ───────────────────────────────────── */}
      {errorToast && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 12000,
            background: 'rgba(139, 46, 46, 0.92)',
            color: '#fdf5e6',
            padding: '0.6rem 2rem 0.6rem 1rem',
            borderRadius: 6,
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.85rem',
            maxWidth: 400,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {errorToast}
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss error"
            style={{
              position: 'absolute',
              top: 4,
              right: 6,
              background: 'none',
              border: 'none',
              color: '#fdf5e6',
              fontSize: '1rem',
              cursor: 'pointer',
              padding: '2px 4px',
              lineHeight: 1,
            }}
          >
            x
          </button>
        </div>
      )}

      {/* ── Mare clausum warning modal ────────────────────────────────── */}
      {mareClausumDest && (
        <MareClausumModal
          destinationPortId={mareClausumDest}
          currentTurn={gameState?.currentTurn ?? 0}
          onSailAnyway={handleSailAnyway}
          onWaitForSpring={handleWaitForSpring}
          onDismiss={() => setMareClausumDest(null)}
        />
      )}

      {/* ── Tutorial modal (bottom-center, above everything) ────────── */}
      {!pendingEvent && <TutorialModal />}
    </div>
  );
}

/* ── CargoDropUp — collapsible bottom-right cargo/ledger ─────────────── */

import type { PlayerInventory, TransactionRecord } from '../../shared/ipc-types';

function CargoDropUp({
  inventory,
  transactions,
}: {
  inventory: PlayerInventory;
  transactions: TransactionRecord[];
}) {
  const [open, setOpen] = useState(false);
  const profit = inventory.gold - 500;

  return (
    <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000 }}>
      {/* Expanded panel */}
      {open && (
        <div
          style={{
            ...FLOAT_PANEL,
            position: 'absolute',
            bottom: 48,
            left: 0,
            width: 280,
            maxHeight: 400,
            marginBottom: 4,
          }}
        >
          <CargoHold inventory={inventory} />
          <ProfitDisplay inventory={inventory} transactions={transactions} />
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'rgba(253, 248, 240, 0.95)',
          border: '1px solid #c4956a',
          borderRadius: 8,
          padding: '0.5rem 1rem',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(61, 43, 31, 0.18)',
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#5a3e2b',
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
        }}
      >
        <span style={{ fontSize: '1rem' }}>{open ? '▾' : '▴'}</span>
        <span>{inventory.gold}g</span>
        <span style={{ color: '#7a5c45', fontWeight: 400 }}>·</span>
        <span>{inventory.currentCargo}/{inventory.cargoCapacity} cargo</span>
        {profit !== 0 && (
          <span style={{ color: profit >= 0 ? '#2b5c4a' : '#8b2e2e', fontWeight: 600 }}>
            {profit >= 0 ? '+' : ''}{profit}g
          </span>
        )}
      </button>
    </div>
  );
}
