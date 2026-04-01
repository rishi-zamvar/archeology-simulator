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
import WeatherOverlay from './WeatherOverlay';
import EventCard from './EventCard';
import DialogueModal from './DialogueModal';
import TutorialModal from './TutorialModal';
import Logbook from './Logbook';
import MareClausumModal from './MareClausumModal';
import TitleScreen from './TitleScreen';
import IntroSequence from './IntroSequence';
import ConclusionScreen from './ConclusionScreen';
import type { JourneyStats } from './ConclusionScreen';
import { useTradeState } from '../hooks/useTradeState';
import { useGeneratedAmbient } from '../hooks/useGeneratedAmbient';
import { getWeatherModifiers, getSeasonalWeatherDescription } from '../../game/weather';
import type { Season } from '../../game/weather';
import type { SailingTurnResult } from '../../game/sailing';
import type { SailingState, TradingState } from '../../game/types';
import type { VoyageEvent, PortRegion, DialogueNode, DialogueChoice, QuestDefinition, QuestProgress } from '../../shared/game-types';

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
  const [screen, setScreen] = useState<'title' | 'intro' | 'game' | 'conclusion'>('title');
  const [hasSave, setHasSave] = useState(false);
  const [conclusionStats, setConclusionStats] = useState<JourneyStats | null>(null);

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
      if (res.success) setScreen('intro');
    }).catch((err: unknown) => showError('Failed to start new game: ' + (err instanceof Error ? err.message : 'Unknown error')));
  }, [showError]);

  // Full-map overlay — shown when player clicks mini-map from port scene
  const [showFullMap, setShowFullMap] = useState(false);
  // Mare clausum modal — set to destination port ID when navigating in winter
  const [mareClausumDest, setMareClausumDest] = useState<string | null>(null);

  // Phase 14: NPC dialogue state
  const [dialogueNpc, setDialogueNpc] = useState<{
    npcId: string;
    node: DialogueNode;
    choices: DialogueChoice[];
    portraitUrl: string | null;
  } | null>(null);
  const [availableNpcs, setAvailableNpcs] = useState<Array<{ npcId: string; name: string; portraitUrl: string | null }>>([]);

  // Phase 15: Active quest indicator and completion toast
  const [activeQuest, setActiveQuest] = useState<{ quest: QuestDefinition; progress: QuestProgress } | null>(null);
  const [allActiveQuests, setAllActiveQuests] = useState<Array<{ quest: QuestDefinition; progress: QuestProgress }>>([]);
  const [questToast, setQuestToast] = useState<{ name: string; historicalNote: string } | null>(null);
  const [showQuestDetails, setShowQuestDetails] = useState(false);
  const prevQuestRef = useRef<Array<{ quest: QuestDefinition; progress: QuestProgress }>>([]);

  // Phase 19: Port access level for NPC gating + auto-discover
  const [portAccessLevel, setPortAccessLevel] = useState<import('../../shared/game-types').PortAccessLevel>('unknown');
  const refreshAccessRef = useRef<(() => void) | null>(null);

  const handleRefreshAccessReady = useCallback((fn: () => void) => {
    refreshAccessRef.current = fn;
  }, []);

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

  function handleNavigate(destinationPortId: string, durationTurns: number = 1) {
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
      voyageTurnsTotal: Math.max(1, Math.ceil(durationTurns * mods.durationMultiplier)),
    }).catch((err: unknown) => showError('Failed to set sail: ' + (err instanceof Error ? err.message : 'Unknown error')));
  }

  function handleSailAnyway(destPortId: string) {
    setMareClausumDest(null);
    window.api.game.action({
      type: 'SET_SAIL',
      destination: destPortId,
      eta: 0,
      voyageTurnsTotal: 1,
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

  // Phase 14: Check for available NPCs when port selection changes
  useEffect(() => {
    if (isTrading && selectedPortId) {
      window.api.dialogue.getAvailableNpcs(selectedPortId).then((res) => {
        if (res.success) setAvailableNpcs(res.data);
        else setAvailableNpcs([]);
      }).catch(() => setAvailableNpcs([]));
    } else {
      setAvailableNpcs([]);
    }
  }, [isTrading, selectedPortId]);

  // Phase 19: Fetch port access level and auto-discover on arrival
  useEffect(() => {
    if (isTrading && selectedPortId) {
      // Fetch access level for NPC gating
      window.api.game.getPortAccessLevel(selectedPortId).then((res) => {
        if (res.success) {
          setPortAccessLevel(res.data);
          // Auto-discover if port is unknown
          if (res.data === 'unknown') {
            window.api.game.autoDiscoverPort(selectedPortId, gameState?.currentTurn ?? 0).then((discoverRes) => {
              if (discoverRes.success && discoverRes.data) {
                // Port was upgraded to discovered — refresh map markers and update local state
                setPortAccessLevel('discovered');
                refreshAccessRef.current?.();
              }
            }).catch(() => { /* non-fatal */ });
          }
        }
      }).catch(() => setPortAccessLevel('unknown'));
    } else {
      setPortAccessLevel('unknown');
    }
  // Justification: depends on isTrading, selectedPortId, and currentTurn for auto-discover timing
  }, [isTrading, selectedPortId, gameState?.currentTurn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 15: Fetch active quest for indicator on mount
  useEffect(() => {
    // Fetch ALL quests (active + not started) for the journey panel
    Promise.all([
      window.api.quest.getActive(),
      window.api.quest.getAll(),
    ]).then(([activeRes, allRes]) => {
      if (activeRes.success && activeRes.data.length > 0) {
        const subQuest = activeRes.data.find((q: { quest: QuestDefinition }) => q.quest.id !== 'merchants_odyssey') ?? activeRes.data[0];
        setActiveQuest(subQuest);
        prevQuestRef.current = activeRes.data;
      }
      if (allRes.success) {
        setAllActiveQuests(allRes.data);
      }
    });
  }, []);

  // Phase 15: Re-fetch active quest on game:updated; detect quest completion for toast
  useEffect(() => {
    const cleanup = window.api.subscribe('game:updated', () => {
      window.api.quest.getActive().then((res) => {
        if (res.success) {
          const subQuest = res.data.find((q: { quest: QuestDefinition }) => q.quest.id !== 'merchants_odyssey') ?? (res.data.length > 0 ? res.data[0] : null);
          setActiveQuest(subQuest);
          // Also refresh all quests for the journey panel
          window.api.quest.getAll().then(allRes => {
            if (allRes.success) setAllActiveQuests(allRes.data);
          }).catch(() => {});

          // Detect quest completion: quest was active before, not active now
          const prevIds = new Set(prevQuestRef.current.map(q => q.quest.id));
          const currIds = new Set(res.data.map((q: { quest: QuestDefinition; progress: QuestProgress }) => q.quest.id));
          for (const prev of prevQuestRef.current) {
            if (prevIds.has(prev.quest.id) && !currIds.has(prev.quest.id)) {
              // This quest was active and is no longer — check if completed
              window.api.quest.getAll().then((allRes) => {
                if (!allRes.success) return;
                const completed = allRes.data.find(
                  (q: { quest: QuestDefinition; progress: QuestProgress }) =>
                    q.quest.id === prev.quest.id && q.progress.status === 'completed'
                );
                if (completed) {
                  // Check if this is the merchants_odyssey meta-quest — trigger conclusion
                  if (completed.quest.id === 'merchants_odyssey') {
                    window.api.game.getJourneyStats().then((statsRes) => {
                      if (statsRes.success) {
                        setConclusionStats(statsRes.data);
                        setScreen('conclusion');
                      }
                    }).catch(() => { /* non-fatal: just show the toast instead */ });
                  }
                  setQuestToast({ name: completed.quest.name, historicalNote: completed.quest.historicalNote });
                  setTimeout(() => setQuestToast(null), 5000);
                }
              });
            }
          }

          prevQuestRef.current = res.data;
        }
      });
    });
    return cleanup;
  }, []);

  const handleTalkToNpc = useCallback(async (npcId: string) => {
    try {
      const res = await window.api.dialogue.getNodes(npcId);
      if (res.success) {
        setDialogueNpc({
          npcId,
          node: res.data.node,
          choices: res.data.availableChoices,
          portraitUrl: res.data.portraitUrl,
        });
      } else {
        showError(res.error ?? 'Failed to start dialogue');
      }
    } catch (err) {
      showError('Failed to start dialogue: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [showError]);

  const portDisplayName = selectedPortId
    ? selectedPortId.charAt(0).toUpperCase() + selectedPortId.slice(1).replace(/_/g, ' ')
    : '';

  // Gate: show title screen before gameplay
  if (screen === 'title') {
    return <TitleScreen hasSave={hasSave} onContinue={handleContinue} onNewGame={handleNewGame} />;
  }

  // Gate: show intro sequence after new game
  if (screen === 'intro') {
    return <IntroSequence onComplete={() => {
      // Auto-open Athens after intro — player starts at Piraeus
      window.api?.game?.action?.({ type: 'START_TRADE', port: 'athens' }).catch(() => {});
      setSelectedPort('athens');
      setScreen('game');
    }} />;
  }

  // Gate: show conclusion screen when merchants_odyssey completes
  if (screen === 'conclusion' && conclusionStats) {
    return (
      <ConclusionScreen
        stats={conclusionStats}
        onContinue={() => {
          setConclusionStats(null);
          setScreen('game');
        }}
      />
    );
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
        <MapArea
          onPortSelected={() => setShowFullMap(false)}
          onRefreshAccessReady={handleRefreshAccessReady}
          currentPortId={selectedPortId}
          questTargetPorts={(() => {
            const targets = new Set<string>();
            if (activeQuest) {
              const obj = activeQuest.quest.objectives[activeQuest.progress.currentObjective];
              if (obj?.portId) targets.add(obj.portId);
            }
            return targets;
          })()}
        >
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

      {/* ── Weather effects overlay (wind streaks, rain, doppler gradient) ── */}
      <WeatherOverlay
        season={weatherMods.season}
        stormWeight={weatherMods.stormWeight}
        isActive={isSailing}
      />

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

      {/* ── Talk to NPC button (top-center-left) — when NPCs available at port ── */}
      {isTrading && selectedPortId && !showFullMap && availableNpcs.length > 0 && portAccessLevel === 'unlocked' && !dialogueNpc && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {availableNpcs.map((npc) => (
            <button
              key={npc.npcId}
              type="button"
              onClick={() => void handleTalkToNpc(npc.npcId)}
              style={{
                backgroundColor: 'rgba(253, 248, 240, 0.95)',
                border: '1px solid #c4956a',
                borderRadius: 8,
                padding: '0.5rem 1.25rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(61, 43, 31, 0.18)',
                fontFamily: "'Cinzel', 'Times New Roman', serif",
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#5a3e2b',
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
              }}
            >
              Speak with {npc.name}
            </button>
          ))}
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

      {/* ── Active quest indicator (below Logbook) — clickable ──── */}
      {activeQuest && (
        <>
          <button
            type="button"
            onClick={() => setShowQuestDetails(prev => !prev)}
            style={{
              position: 'absolute',
              top: 56,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1150,
              backgroundColor: 'rgba(253, 248, 240, 0.9)',
              border: '1px solid rgba(196, 149, 106, 0.5)',
              borderRadius: 4,
              padding: '0.25rem 0.75rem',
              maxWidth: 400,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            <span style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: '0.5rem',
              fontWeight: 700,
              color: '#5a3e2b',
              letterSpacing: '0.06em',
            }}>
              {activeQuest.quest.name}
            </span>
            <span style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.48rem',
              color: '#7a5c45',
              marginLeft: '0.4rem',
            }}>
              {activeQuest.quest.objectives[activeQuest.progress.currentObjective]?.description ?? ''}
            </span>
          </button>

          {/* Quest details panel — shows ALL active quests with objectives */}
          {showQuestDetails && (
            <div
              style={{
                position: 'absolute',
                top: 88,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1200,
                backgroundColor: 'rgba(253, 248, 240, 0.96)',
                border: '1px solid #c4956a',
                borderRadius: 8,
                padding: '1rem 1.25rem',
                width: 400,
                maxHeight: 500,
                overflowY: 'auto',
                boxShadow: '0 4px 20px rgba(61, 43, 31, 0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#5a3e2b',
                  margin: 0,
                  letterSpacing: '0.04em',
                }}>
                  Your Journey
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuestDetails(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    color: '#7a5c45',
                    padding: '0 4px',
                  }}
                >
                  x
                </button>
              </div>

              {/* Show all quests — active first, then not_started, meta-quest last */}
              {[...allActiveQuests]
                .filter(({ quest: q }) => q.id !== 'merchants_odyssey')
                .sort((a, b) => {
                  const order = { active: 0, not_started: 1, completed: 2 };
                  return (order[a.progress.status as keyof typeof order] ?? 1) - (order[b.progress.status as keyof typeof order] ?? 1);
                })
                .map(({ quest: q, progress: p }) => (
                <div key={q.id} style={{
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #e8d5b8',
                }}>
                  {/* Quest name + status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <h4 style={{
                      fontFamily: "'Cinzel', Georgia, serif",
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: q.id === 'merchants_odyssey' ? '#7a5c45' : '#5a3e2b',
                      margin: 0,
                      letterSpacing: '0.04em',
                    }}>
                      {q.name}
                    </h4>
                    <span style={{
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      color: '#fdf8f0',
                      backgroundColor: p.status === 'active' ? '#c0392b' : p.status === 'completed' ? '#2b5c4a' : '#aaa',
                      padding: '1px 6px',
                      borderRadius: 3,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}>
                      {p.status === 'active' ? 'ACTIVE' : p.status === 'completed' ? 'DONE' : 'UPCOMING'}
                    </span>
                  </div>

                  <p style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.75rem',
                    color: '#5a3e2b',
                    lineHeight: 1.5,
                    margin: '0 0 0.5rem',
                  }}>
                    {q.description}
                  </p>

                  {/* Objectives with checkmarks */}
                  {q.objectives.map((obj, i) => {
                    const isComplete = i < p.currentObjective;
                    const isCurrent = i === p.currentObjective;
                    return (
                      <div key={obj.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.4rem',
                        marginBottom: '0.3rem',
                        marginLeft: '0.25rem',
                        opacity: isComplete ? 0.5 : 1,
                      }}>
                        <span style={{
                          fontSize: '0.65rem',
                          flexShrink: 0,
                          color: isComplete ? '#2b5c4a' : isCurrent ? '#c0392b' : '#7a5c45',
                        }}>
                          {isComplete ? '\u2713' : isCurrent ? '\u25B6' : '\u25CB'}
                        </span>
                        <span style={{
                          fontFamily: "'Lora', Georgia, serif",
                          fontSize: '0.7rem',
                          color: isCurrent ? '#5a3e2b' : '#7a5c45',
                          fontWeight: isCurrent ? 600 : 400,
                          textDecoration: isComplete ? 'line-through' : 'none',
                        }}>
                          {obj.description}
                        </span>
                      </div>
                    );
                  })}

                  {/* Historical note */}
                  {p.status === 'active' && q.historicalNote && (
                    <p style={{
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: '0.65rem',
                      fontStyle: 'italic',
                      color: '#9a8570',
                      lineHeight: 1.5,
                      marginTop: '0.5rem',
                      padding: '0.4rem 0.5rem',
                      backgroundColor: 'rgba(196, 149, 106, 0.08)',
                      borderRadius: 4,
                    }}>
                      {q.historicalNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Quest completion toast ──────────────────────────────── */}
      {questToast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 11000,
            background: 'linear-gradient(135deg, rgba(196, 165, 106, 0.95), rgba(180, 150, 90, 0.95))',
            color: '#3d2b1f',
            padding: '0.8rem 1.5rem',
            borderRadius: 6,
            border: '1px solid #c4956a',
            maxWidth: 420,
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(61, 43, 31, 0.35)',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '0.3rem',
          }}>
            Quest Complete: {questToast.name}
          </div>
          {questToast.historicalNote && (
            <div style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.6rem',
              fontStyle: 'italic',
              lineHeight: 1.5,
              color: '#5a3e2b',
            }}>
              {questToast.historicalNote}
            </div>
          )}
        </div>
      )}

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

      {/* ── NPC dialogue modal ──────────────────────────────────────── */}
      {dialogueNpc && (
        <DialogueModal
          npcId={dialogueNpc.npcId}
          initialNode={dialogueNpc.node}
          initialChoices={dialogueNpc.choices}
          portraitUrl={dialogueNpc.portraitUrl}
          onDismiss={() => {
            setDialogueNpc(null);
            // Re-check available NPCs after dialogue (conditions may have changed)
            if (selectedPortId) {
              window.api.dialogue.getAvailableNpcs(selectedPortId).then((res) => {
                if (res.success) setAvailableNpcs(res.data);
                else setAvailableNpcs([]);
              }).catch(() => setAvailableNpcs([]));
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
