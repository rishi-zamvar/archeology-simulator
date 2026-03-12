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

export default function Shell(): React.ReactElement {
  const {
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
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
      {/* Left side panel — inventory, ship status */}
      <SidePanel
        side="left"
        isOpen={leftPanelOpen}
        onToggle={toggleLeftPanel}
      />

      {/* Central map area — Leaflet mounts here in Phase 2 */}
      <MapArea />

      {/* Right side panel — port info, trade log */}
      <SidePanel
        side="right"
        isOpen={rightPanelOpen}
        onToggle={toggleRightPanel}
      />
    </div>
  );
}
