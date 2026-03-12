/**
 * Shell — root layout component.
 *
 * Full-screen three-column layout:
 *   [SidePanel left] [MapArea central] [SidePanel right]
 *
 * All layout concerns live here. The Shell is the single component that
 * wires useUIStore to the two SidePanels. Child routes/panels render inside
 * SidePanel children slots (Phase 2+).
 *
 * Keyboard shortcuts:
 *   [ — toggle left panel
 *   ] — toggle right panel
 */

import React, { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import SidePanel from './SidePanel';
import MapArea from './MapArea';
import PortInfoPanel from './PortInfoPanel';

export default function Shell(): React.ReactElement {
  const {
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    selectedPortId,
    setSelectedPort,
  } = useUIStore();

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
    // Dispatch SET_SAIL action to the main process
    // eta is calculated by the main process from voyage data; we pass 0 as placeholder
    window.api.game.action({
      type: 'SET_SAIL',
      destination: destinationPortId,
      eta: 0,
    });
  }

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
      {/* Left side panel — port info when a port is selected */}
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
      </SidePanel>

      {/* Central map area */}
      <MapArea />

      {/* Right side panel — trade log */}
      <SidePanel
        side="right"
        isOpen={rightPanelOpen}
        onToggle={toggleRightPanel}
      />
    </div>
  );
}
