/**
 * PortIllustration — SVG scene components for each Mediterranean port region.
 *
 * Renders a full-area SVG illustration keyed on the port's region. Six variants
 * (greece, egypt, levant, italy, iberia, north_africa) each use period-appropriate
 * silhouette elements so every port shows a historically flavored scene without
 * any external image dependencies.
 *
 * Color palette (parchment-consistent):
 *   Sky:          #d4e8f0  muted blue-grey
 *   Sea/water:    #7ab0c8  desaturated teal
 *   Earth/ground: #c4a882  warm ochre
 *   Stone:        #b8a090  grey-brown
 *   Foliage:      #7a9a60  olive green
 *   Parchment:    #f0d9b5
 *   Accent:       #8a6a4a
 */

import React from 'react';
import type { PortRegion } from '../../shared/game-types';

interface PortIllustrationProps {
  region: PortRegion;
}

export default function PortIllustration({ region }: PortIllustrationProps): React.ReactElement {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {region === 'greece' && <GreeceScene />}
      {region === 'egypt' && <EgyptScene />}
      {region === 'levant' && <LevantScene />}
      {region === 'italy' && <ItalyScene />}
      {region === 'iberia' && <IberiaScene />}
      {region === 'north_africa' && <NorthAfricaScene />}
      {/* Parchment overlay on all scenes */}
      <rect x="0" y="0" width="800" height="500" fill="rgba(240,217,181,0.12)" />
    </svg>
  );
}

/* ── Greece — Aegean coast with columned temple ─────────────────────────── */
function GreeceScene(): React.ReactElement {
  return (
    <>
      {/* Sky gradient */}
      <defs>
        <linearGradient id="greece-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8d4e8" />
          <stop offset="100%" stopColor="#d4e8f0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="800" height="350" fill="url(#greece-sky)" />

      {/* Sea */}
      <rect x="0" y="350" width="800" height="150" fill="#7ab0c8" />
      {/* Wave lines on sea */}
      <line x1="30" y1="370" x2="120" y2="370" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="160" y1="385" x2="280" y2="385" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="320" y1="375" x2="440" y2="375" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="500" y1="390" x2="600" y2="390" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="640" y1="372" x2="740" y2="372" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="60" y1="410" x2="200" y2="410" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.5" />
      <line x1="350" y1="420" x2="500" y2="420" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.5" />
      <line x1="560" y1="440" x2="680" y2="440" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.5" />

      {/* Rocky hillside */}
      <polygon points="0,350 0,220 100,260 200,200 320,240 400,180 500,230 600,200 700,250 800,210 800,350" fill="#c4a882" />

      {/* Temple platform base */}
      <rect x="280" y="155" width="240" height="20" fill="#b8a090" />
      <rect x="270" y="175" width="260" height="12" fill="#b8a090" />

      {/* Temple columns (6 columns) */}
      <rect x="285" y="95" width="14" height="60" fill="#c8b09a" />
      <rect x="325" y="95" width="14" height="60" fill="#c8b09a" />
      <rect x="365" y="95" width="14" height="60" fill="#c8b09a" />
      <rect x="405" y="95" width="14" height="60" fill="#c8b09a" />
      <rect x="445" y="95" width="14" height="60" fill="#c8b09a" />
      <rect x="485" y="95" width="14" height="60" fill="#c8b09a" />

      {/* Triangular pediment */}
      <polygon points="270,95 400,40 530,95" fill="#b8a090" />
      <polygon points="278,95 400,48 522,95" fill="#c8b09a" />

      {/* Architrave */}
      <rect x="270" y="87" width="260" height="8" fill="#b0998a" />

      {/* Sailing vessel in harbor */}
      <polygon points="550,380 620,380 600,420 560,420" fill="#8a6a4a" />
      {/* Mast */}
      <line x1="580" y1="340" x2="580" y2="380" stroke="#8a6a4a" strokeWidth="3" />
      {/* Sail */}
      <polygon points="582,342 582,375 620,360" fill="#e0cba8" opacity="0.85" />
      {/* Boom */}
      <line x1="555" y1="360" x2="618" y2="360" stroke="#8a6a4a" strokeWidth="1.5" />

      {/* Cypress trees — left side */}
      <polygon points="60,350 70,230 80,350" fill="#7a9a60" />
      <polygon points="100,350 110,250 120,350" fill="#7a9a60" />
      <polygon points="140,350 148,265 156,350" fill="#6a8a50" />

      {/* Cypress trees — right side */}
      <polygon points="680,350 690,240 700,350" fill="#7a9a60" />
      <polygon points="720,350 730,255 740,350" fill="#6a8a50" />

      {/* Foreground ground */}
      <rect x="0" y="340" width="800" height="15" fill="#c4a882" opacity="0.7" />
    </>
  );
}

/* ── Egypt — Alexandria harbor with lighthouse ──────────────────────────── */
function EgyptScene(): React.ReactElement {
  return (
    <>
      {/* Warm sandy sky */}
      <rect x="0" y="0" width="800" height="375" fill="#e8dcc8" />

      {/* Desert sand dunes */}
      <polygon points="0,375 0,280 100,250 200,290 350,240 500,270 650,235 800,260 800,375" fill="#d4b882" />

      {/* Low flat-roofed buildings — background */}
      <rect x="20" y="290" width="80" height="50" fill="#c4a882" />
      <rect x="40" y="275" width="40" height="15" fill="#c4a882" />
      <rect x="120" y="300" width="60" height="40" fill="#c0a47e" />
      <rect x="140" y="288" width="30" height="12" fill="#c0a47e" />
      <rect x="600" y="285" width="90" height="55" fill="#c4a882" />
      <rect x="650" y="270" width="50" height="15" fill="#c4a882" />
      <rect x="700" y="295" width="70" height="45" fill="#c0a47e" />

      {/* Pharos lighthouse — tiered rectangular tower */}
      {/* Base tier */}
      <rect x="335" y="200" width="130" height="100" fill="#b8a090" />
      {/* Middle tier */}
      <rect x="355" y="140" width="90" height="60" fill="#c0a898" />
      {/* Top tier */}
      <rect x="375" y="100" width="50" height="40" fill="#b8a090" />
      {/* Flame at top */}
      <polygon points="390,100 400,70 410,100" fill="#e8a040" />
      <polygon points="393,100 400,78 407,100" fill="#f0c060" opacity="0.8" />
      {/* Windows on lighthouse */}
      <rect x="360" y="215" width="15" height="20" fill="#8a7060" />
      <rect x="390" y="215" width="15" height="20" fill="#8a7060" />
      <rect x="420" y="215" width="15" height="20" fill="#8a7060" />
      <rect x="368" y="155" width="12" height="16" fill="#8a7060" />
      <rect x="398" y="155" width="12" height="16" fill="#8a7060" />

      {/* Harbor water */}
      <rect x="0" y="375" width="800" height="125" fill="#7ab0c8" />
      <line x1="40" y1="395" x2="150" y2="395" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="200" y1="408" x2="320" y2="408" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="480" y1="398" x2="600" y2="398" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="660" y1="415" x2="760" y2="415" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />

      {/* Palm trees */}
      {/* Left palm */}
      <rect x="190" y="270" width="8" height="80" fill="#8a6a4a" />
      <polygon points="194,270 160,250 172,268" fill="#7a9a60" />
      <polygon points="194,270 225,248 212,266" fill="#7a9a60" />
      <polygon points="194,270 180,240 196,260" fill="#6a8a50" />
      <polygon points="194,270 208,238 198,258" fill="#6a8a50" />
      {/* Right palm */}
      <rect x="550" y="265" width="8" height="85" fill="#8a6a4a" />
      <polygon points="554,265 520,245 532,263" fill="#7a9a60" />
      <polygon points="554,265 585,243 572,261" fill="#7a9a60" />
      <polygon points="554,265 540,235 556,255" fill="#6a8a50" />
      <polygon points="554,265 568,233 558,253" fill="#6a8a50" />
      {/* Far right palm */}
      <rect x="740" y="280" width="7" height="70" fill="#8a6a4a" />
      <polygon points="744,280 716,262 726,278" fill="#7a9a60" />
      <polygon points="744,280 770,260 758,276" fill="#7a9a60" />
    </>
  );
}

/* ── Levant — Phoenician port with cedar hills ──────────────────────────── */
function LevantScene(): React.ReactElement {
  return (
    <>
      {/* Sky */}
      <rect x="0" y="0" width="800" height="350" fill="#c8d8e8" />

      {/* Green cedar-covered hills */}
      <polygon points="0,350 0,200 100,240 200,180 350,220 450,160 600,200 750,170 800,200 800,350" fill="#7a9a60" />
      <polygon points="0,350 0,230 80,260 160,210 250,250 380,200 500,240 650,210 800,230 800,350" fill="#8aaa70" opacity="0.6" />

      {/* Limestone city walls */}
      <rect x="150" y="260" width="500" height="80" fill="#b8a090" />
      {/* Crenellations along top */}
      {[150, 182, 214, 246, 278, 310, 342, 374, 406, 438, 470, 502, 534, 566, 598].map((x, i) => (
        <rect key={i} x={x} y="248" width="20" height="12" fill="#b8a090" />
      ))}
      {/* Gate */}
      <rect x="370" y="285" width="60" height="55" fill="#8a7060" />
      <rect x="375" y="285" width="50" height="40" rx="25" fill="#8a7060" />

      {/* Harbor water */}
      <rect x="0" y="350" width="800" height="150" fill="#7ab0c8" />
      <line x1="50" y1="372" x2="160" y2="372" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="200" y1="390" x2="320" y2="390" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="500" y1="378" x2="620" y2="378" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="680" y1="395" x2="780" y2="395" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />

      {/* Phoenician merchant ship — round-hulled */}
      <ellipse cx="250" cy="400" rx="60" ry="22" fill="#8a6a4a" />
      <ellipse cx="250" cy="396" rx="55" ry="18" fill="#9a7a5a" />
      {/* Mast */}
      <line x1="250" y1="348" x2="250" y2="393" stroke="#8a6a4a" strokeWidth="3" />
      {/* Sail */}
      <polygon points="252,350 252,388 295,370" fill="#e0cba8" opacity="0.85" />
      {/* Boom/yard */}
      <line x1="215" y1="362" x2="290" y2="362" stroke="#8a6a4a" strokeWidth="2" />

      {/* Market stalls */}
      {/* Stall 1 */}
      <rect x="500" y="308" width="50" height="30" fill="#c4a882" />
      <polygon points="495,308 525,290 555,308" fill="#b03030" opacity="0.7" />
      {/* Stall 2 */}
      <rect x="570" y="305" width="45" height="33" fill="#c4a882" />
      <polygon points="565,305 592,287 620,305" fill="#8a5030" opacity="0.7" />
      {/* Stall 3 */}
      <rect x="620" y="308" width="40" height="30" fill="#c4a882" />
      <polygon points="616,308 640,292 664,308" fill="#b03030" opacity="0.7" />
    </>
  );
}

/* ── Italy — Roman/Tyrrhenian port with hills ───────────────────────────── */
function ItalyScene(): React.ReactElement {
  return (
    <>
      {/* Sky */}
      <rect x="0" y="0" width="800" height="370" fill="#ccd8e8" />

      {/* Rolling green hills */}
      <polygon points="0,370 0,230 120,260 240,200 380,250 520,190 680,240 800,210 800,370" fill="#7a9a60" />
      <polygon points="0,370 0,260 100,290 220,240 360,280 500,230 660,270 800,250 800,370" fill="#8aaa70" opacity="0.5" />

      {/* Red terracotta roof buildings — background */}
      <rect x="40" y="285" width="70" height="60" fill="#c4a882" />
      <polygon points="35,285 75,260 115,285" fill="#b85030" />
      <rect x="120" y="295" width="55" height="55" fill="#c0a47e" />
      <polygon points="115,295 147,273 180,295" fill="#b85030" />
      <rect x="580" y="280" width="65" height="60" fill="#c4a882" />
      <polygon points="575,280 612,256 650,280" fill="#b85030" />
      <rect x="660" y="290" width="70" height="60" fill="#c0a47e" />
      <polygon points="655,290 695,266 735,290" fill="#b85030" />

      {/* Roman arch gateway */}
      {/* Left pillar */}
      <rect x="310" y="220" width="40" height="120" fill="#b8a090" />
      {/* Right pillar */}
      <rect x="450" y="220" width="40" height="120" fill="#b8a090" />
      {/* Arch (semi-circle) */}
      <path d="M310,260 A90,90 0 0,1 490,260" fill="#b8a090" />
      <path d="M318,262 A82,82 0 0,1 482,262" fill="#ccc0b0" />
      {/* Arch keystone accent */}
      <rect x="395" y="170" width="10" height="30" fill="#a89080" />

      {/* Harbor water */}
      <rect x="0" y="370" width="800" height="130" fill="#7ab0c8" />
      <line x1="60" y1="390" x2="180" y2="390" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="240" y1="405" x2="370" y2="405" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="480" y1="395" x2="590" y2="395" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />
      <line x1="650" y1="412" x2="760" y2="412" stroke="#5c9ab5" strokeWidth="1.5" opacity="0.6" />

      {/* Roman galley — long low hull with oar banks */}
      <polygon points="120,430 600,430 570,460 150,460" fill="#8a6a4a" />
      <polygon points="120,430 580,430 560,445 140,445" fill="#9a7a5a" />
      {/* Oar banks */}
      {[160, 200, 240, 280, 320, 360, 400, 440, 480, 520].map((x, i) => (
        <line key={i} x1={x} y1="443" x2={x - 20} y2="468" stroke="#7a5a3a" strokeWidth="2" opacity="0.7" />
      ))}
      {/* Mast */}
      <line x1="350" y1="375" x2="350" y2="430" stroke="#8a6a4a" strokeWidth="4" />
      {/* Sail */}
      <polygon points="352,378 352,425 410,405" fill="#e0cba8" opacity="0.8" />
      {/* Ram */}
      <polygon points="120,438 80,445 120,452" fill="#7a5a3a" />
    </>
  );
}

/* ── Iberia — Atlantic/Carthaginian port ────────────────────────────────── */
function IberiaScene(): React.ReactElement {
  return (
    <>
      {/* Cooler Atlantic sky */}
      <rect x="0" y="0" width="800" height="325" fill="#b8cce0" />

      {/* Cliffside coastline */}
      <polygon points="0,325 0,200 80,230 160,180 280,220 380,160 480,210 580,180 680,220 800,190 800,325" fill="#c4a882" />
      <polygon points="0,325 0,240 70,260 150,220 260,255 360,200 460,240 560,210 660,250 760,220 800,240 800,325" fill="#b89870" opacity="0.7" />

      {/* Stone fortified tower */}
      <rect x="340" y="125" width="120" height="160" fill="#b8a090" />
      {/* Battlements */}
      <rect x="335" y="113" width="20" height="12" fill="#b8a090" />
      <rect x="363" y="113" width="20" height="12" fill="#b8a090" />
      <rect x="391" y="113" width="20" height="12" fill="#b8a090" />
      <rect x="419" y="113" width="20" height="12" fill="#b8a090" />
      <rect x="447" y="113" width="20" height="12" fill="#b8a090" />
      {/* Tower door */}
      <rect x="385" y="235" width="30" height="50" fill="#7a6050" />
      {/* Tower windows */}
      <rect x="358" y="155" width="18" height="22" fill="#7a6050" />
      <rect x="390" y="155" width="18" height="22" fill="#7a6050" />
      <rect x="422" y="155" width="18" height="22" fill="#7a6050" />
      <rect x="390" y="195" width="18" height="18" fill="#7a6050" />

      {/* Atlantic sea — deeper blue */}
      <rect x="0" y="325" width="800" height="175" fill="#5a90b8" />
      {/* Wave lines */}
      <line x1="30" y1="345" x2="140" y2="345" stroke="#4a80a8" strokeWidth="2" opacity="0.6" />
      <line x1="180" y1="362" x2="310" y2="362" stroke="#4a80a8" strokeWidth="2" opacity="0.6" />
      <line x1="360" y1="350" x2="490" y2="350" stroke="#4a80a8" strokeWidth="2" opacity="0.6" />
      <line x1="530" y1="368" x2="650" y2="368" stroke="#4a80a8" strokeWidth="2" opacity="0.6" />
      <line x1="700" y1="355" x2="790" y2="355" stroke="#4a80a8" strokeWidth="2" opacity="0.6" />
      <line x1="60" y1="390" x2="200" y2="390" stroke="#4a80a8" strokeWidth="2" opacity="0.5" />
      <line x1="280" y1="408" x2="420" y2="408" stroke="#4a80a8" strokeWidth="2" opacity="0.5" />
      <line x1="500" y1="425" x2="640" y2="425" stroke="#4a80a8" strokeWidth="2" opacity="0.5" />

      {/* Low scrub vegetation */}
      <ellipse cx="80" cy="318" rx="28" ry="14" fill="#7a9a60" opacity="0.8" />
      <ellipse cx="130" cy="322" rx="22" ry="11" fill="#6a8a50" opacity="0.8" />
      <ellipse cx="170" cy="316" rx="18" ry="10" fill="#7a9a60" opacity="0.7" />
      <ellipse cx="600" cy="315" rx="25" ry="13" fill="#7a9a60" opacity="0.8" />
      <ellipse cx="648" cy="320" rx="20" ry="10" fill="#6a8a50" opacity="0.8" />
      <ellipse cx="700" cy="314" rx="30" ry="12" fill="#7a9a60" opacity="0.7" />
      <ellipse cx="740" cy="318" rx="18" ry="9" fill="#6a8a50" opacity="0.8" />

      {/* Simple fishing huts */}
      {/* Hut 1 */}
      <rect x="510" y="278" width="55" height="40" fill="#c4a882" />
      <polygon points="505,278 537,258 570,278" fill="#9a7060" />
      {/* Hut 2 */}
      <rect x="580" y="282" width="45" height="35" fill="#c0a47e" />
      <polygon points="576,282 602,264 626,282" fill="#8a6050" />
    </>
  );
}

/* ── North Africa — Carthage/Berber coast ───────────────────────────────── */
function NorthAfricaScene(): React.ReactElement {
  return (
    <>
      {/* Bright hot sky */}
      <rect x="0" y="0" width="800" height="300" fill="#e8e0c0" />

      {/* Sandy beach foreground */}
      <rect x="0" y="400" width="800" height="100" fill="#e0c890" />

      {/* Flat desert plateau */}
      <rect x="0" y="240" width="800" height="160" fill="#d4b882" />
      {/* Plateau edge */}
      <polygon points="0,240 800,240 800,260 0,260" fill="#c8a870" />

      {/* Low whitewashed buildings */}
      <rect x="50" y="185" width="90" height="55" fill="#fdf8f0" />
      <rect x="80" y="170" width="35" height="15" fill="#fdf8f0" />
      {/* Building accent lines */}
      <line x1="55" y1="200" x2="135" y2="200" stroke="#c4956a" strokeWidth="1" opacity="0.5" />
      <line x1="55" y1="215" x2="135" y2="215" stroke="#c4956a" strokeWidth="1" opacity="0.5" />
      <rect x="100" y="195" width="16" height="20" fill="#b0988a" />

      <rect x="160" y="190" width="75" height="50" fill="#fdf8f0" />
      <line x1="165" y1="205" x2="230" y2="205" stroke="#c4956a" strokeWidth="1" opacity="0.5" />
      <rect x="182" y="202" width="13" height="18" fill="#b0988a" />

      <rect x="580" y="180" width="95" height="60" fill="#fdf8f0" />
      <rect x="615" y="165" width="30" height="15" fill="#fdf8f0" />
      <line x1="585" y1="198" x2="670" y2="198" stroke="#c4956a" strokeWidth="1" opacity="0.5" />
      <rect x="610" y="200" width="16" height="20" fill="#b0988a" />

      <rect x="685" y="188" width="80" height="52" fill="#fdf8f0" />
      <line x1="690" y1="205" x2="760" y2="205" stroke="#c4956a" strokeWidth="1" opacity="0.5" />
      <rect x="710" y="198" width="14" height="22" fill="#b0988a" />

      {/* Carthaginian cothon — circular harbor */}
      {/* Outer ring */}
      <ellipse cx="400" cy="340" rx="130" ry="65" fill="none" stroke="#b8a090" strokeWidth="8" />
      {/* Inner basin */}
      <ellipse cx="400" cy="340" rx="90" ry="45" fill="#7ab0c8" />
      {/* Island in center */}
      <ellipse cx="400" cy="340" rx="35" ry="18" fill="#d4b882" />
      {/* Dock spokes */}
      <line x1="400" y1="295" x2="400" y2="322" stroke="#b8a090" strokeWidth="4" />
      <line x1="445" y1="308" x2="428" y2="330" stroke="#b8a090" strokeWidth="4" />
      <line x1="455" y1="345" x2="435" y2="343" stroke="#b8a090" strokeWidth="4" />
      <line x1="440" y1="372" x2="425" y2="357" stroke="#b8a090" strokeWidth="4" />
      <line x1="355" y1="308" x2="372" y2="330" stroke="#b8a090" strokeWidth="4" />
      <line x1="344" y1="345" x2="364" y2="343" stroke="#b8a090" strokeWidth="4" />

      {/* Date palm trees */}
      {/* Left palm */}
      <rect x="268" y="200" width="8" height="80" fill="#8a6a4a" />
      <circle cx="272" cy="198" r="18" fill="#7a9a60" />
      {/* Right palm */}
      <rect x="520" y="195" width="8" height="85" fill="#8a6a4a" />
      <circle cx="524" cy="193" r="18" fill="#7a9a60" />
      {/* Far left palm */}
      <rect x="480" y="200" width="7" height="75" fill="#8a6a4a" />
      <circle cx="484" cy="198" r="15" fill="#6a8a50" />
    </>
  );
}
