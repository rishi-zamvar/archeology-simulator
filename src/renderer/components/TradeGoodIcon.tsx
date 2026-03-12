/**
 * TradeGoodIcon — hand-drawn style SVG icons for each trade good.
 *
 * Each icon is designed to clearly represent the actual trade good
 * in a rustic, parchment-appropriate style.
 */

import React from 'react';

interface TradeGoodIconProps {
  goodId: string;
  size?: number;
}

export default function TradeGoodIcon({ goodId, size = 40 }: TradeGoodIconProps): React.ReactElement {
  const icon = ICONS[goodId];
  if (!icon) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 4,
        backgroundColor: '#f0d9b5', border: '1px solid #c4956a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Cinzel', serif", fontSize: size * 0.4,
        color: '#5a3e2b', fontWeight: 700, flexShrink: 0,
      }}>
        {goodId.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: 4,
      backgroundColor: '#faf3e6', border: '1px solid #d4b896',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
    }}>
      <svg viewBox="0 0 48 48" width={size - 4} height={size - 4}>
        {icon}
      </svg>
    </div>
  );
}

const ICONS: Record<string, React.ReactElement> = {
  wheat: (
    <>
      {/* Wheat sheaf */}
      <path d="M24 42V18" stroke="#8b6914" strokeWidth="1.5" fill="none" />
      <path d="M20 42V22" stroke="#8b6914" strokeWidth="1" fill="none" />
      <path d="M28 42V22" stroke="#8b6914" strokeWidth="1" fill="none" />
      {/* Grain heads */}
      <ellipse cx="24" cy="14" rx="2.5" ry="5" fill="#d4a020" />
      <ellipse cx="20" cy="17" rx="2" ry="4.5" fill="#c89818" transform="rotate(-12 20 17)" />
      <ellipse cx="28" cy="17" rx="2" ry="4.5" fill="#c89818" transform="rotate(12 28 17)" />
      <ellipse cx="17" cy="21" rx="1.8" ry="3.5" fill="#b88a10" transform="rotate(-20 17 21)" />
      <ellipse cx="31" cy="21" rx="1.8" ry="3.5" fill="#b88a10" transform="rotate(20 31 21)" />
      {/* Awns */}
      <line x1="24" y1="9" x2="24" y2="5" stroke="#a08020" strokeWidth="0.7" />
      <line x1="20" y1="12" x2="17" y2="8" stroke="#a08020" strokeWidth="0.7" />
      <line x1="28" y1="12" x2="31" y2="8" stroke="#a08020" strokeWidth="0.7" />
      {/* Tie */}
      <path d="M18 36 Q24 34 30 36" stroke="#8b6914" strokeWidth="1.2" fill="none" />
    </>
  ),
  olive_oil: (
    <>
      {/* Amphora body */}
      <path d="M18 14 C16 18, 14 24, 14 30 C14 36, 18 40, 24 40 C30 40, 34 36, 34 30 C34 24, 32 18, 30 14"
        fill="#6b8c3f" stroke="#4a6628" strokeWidth="1.2" />
      {/* Neck */}
      <rect x="20" y="9" width="8" height="6" rx="1.5" fill="#5a7a30" stroke="#4a6628" strokeWidth="0.8" />
      {/* Lip */}
      <rect x="19" y="8" width="10" height="2" rx="1" fill="#7a9c48" stroke="#4a6628" strokeWidth="0.6" />
      {/* Handles */}
      <path d="M14 18 C10 18, 10 28, 14 28" fill="none" stroke="#4a6628" strokeWidth="1.5" />
      <path d="M34 18 C38 18, 38 28, 34 28" fill="none" stroke="#4a6628" strokeWidth="1.5" />
      {/* Oil sheen */}
      <ellipse cx="22" cy="28" rx="3" ry="4" fill="#8aac58" opacity="0.4" />
      {/* Olive branch decoration */}
      <ellipse cx="24" cy="22" rx="1.5" ry="1" fill="#3a5a18" />
      <ellipse cx="27" cy="21" rx="1.5" ry="1" fill="#3a5a18" transform="rotate(20 27 21)" />
    </>
  ),
  wine: (
    <>
      {/* Krater body */}
      <path d="M16 16 C14 22, 12 30, 14 36 L34 36 C36 30, 34 22, 32 16"
        fill="#7a2842" stroke="#5a1830" strokeWidth="1.2" />
      {/* Wide rim */}
      <ellipse cx="24" cy="16" rx="10" ry="2.5" fill="#8a3852" stroke="#5a1830" strokeWidth="0.8" />
      {/* Base */}
      <rect x="18" y="36" width="12" height="3" rx="1" fill="#6a2038" stroke="#5a1830" strokeWidth="0.8" />
      {/* Wine surface */}
      <ellipse cx="24" cy="18" rx="7" ry="1.5" fill="#4a0820" opacity="0.5" />
      {/* Grape decoration */}
      <circle cx="22" cy="26" r="1.5" fill="#9a4860" />
      <circle cx="25" cy="25" r="1.5" fill="#9a4860" />
      <circle cx="24" cy="28" r="1.5" fill="#9a4860" />
      <circle cx="27" cy="27" r="1.2" fill="#9a4860" />
      {/* Vine leaf */}
      <path d="M28 24 C30 22, 32 23, 30 25" fill="#4a6628" stroke="none" />
    </>
  ),
  textiles: (
    <>
      {/* Rolled/folded purple cloth */}
      <path d="M10 34 L18 12 L38 12 L30 34 Z" fill="#7e3f98" stroke="#5a2870" strokeWidth="1" />
      {/* Fabric folds */}
      <path d="M14 23 L34 23" stroke="#9a58b0" strokeWidth="0.6" />
      <path d="M12 29 L32 29" stroke="#9a58b0" strokeWidth="0.6" />
      <path d="M16 17 L36 17" stroke="#9a58b0" strokeWidth="0.6" />
      {/* Weave pattern */}
      <path d="M20 14 L20 32" stroke="#6a2f80" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
      <path d="M25 13 L23 33" stroke="#6a2f80" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
      <path d="M30 12 L26 34" stroke="#6a2f80" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
      {/* Gold trim */}
      <path d="M10 34 L30 34" stroke="#c4956a" strokeWidth="1.5" />
      <path d="M18 12 L38 12" stroke="#c4956a" strokeWidth="1.5" />
      {/* Murex shell hint */}
      <circle cx="33" cy="38" r="3" fill="#b06090" stroke="#7a3060" strokeWidth="0.5" />
      <path d="M31 38 Q33 36 35 38" stroke="#7a3060" strokeWidth="0.5" fill="none" />
    </>
  ),
  spices: (
    <>
      {/* Open sack */}
      <path d="M12 20 C12 16, 16 12, 24 12 C32 12, 36 16, 36 20 L34 40 L14 40 Z"
        fill="#c4956a" stroke="#8b6a3e" strokeWidth="1" />
      {/* Sack opening fold */}
      <path d="M14 20 C14 17, 18 14, 24 14 C30 14, 34 17, 34 20"
        fill="#d4a57a" stroke="#8b6a3e" strokeWidth="0.6" />
      {/* Spice mound */}
      <path d="M16 22 C18 18, 30 18, 32 22 L30 24 L18 24 Z" fill="#b85c20" />
      {/* Individual spice bits */}
      <circle cx="20" cy="26" r="1.2" fill="#8b3a10" />
      <circle cx="24" cy="25" r="1" fill="#a04a18" />
      <circle cx="28" cy="26" r="1.2" fill="#c06020" />
      <circle cx="22" cy="28" r="0.8" fill="#8b3a10" />
      <circle cx="26" cy="28" r="0.9" fill="#a04a18" />
      {/* Cinnamon sticks */}
      <rect x="17" y="30" width="14" height="2" rx="1" fill="#8b4520" transform="rotate(-8 24 31)" />
      <rect x="18" y="33" width="12" height="2" rx="1" fill="#7a3a18" transform="rotate(5 24 34)" />
      {/* Aroma lines */}
      <path d="M22 14 Q21 10 22 8" stroke="#c4956a" strokeWidth="0.5" fill="none" opacity="0.6" />
      <path d="M26 14 Q27 10 26 8" stroke="#c4956a" strokeWidth="0.5" fill="none" opacity="0.6" />
    </>
  ),
  bronze: (
    <>
      {/* Stack of ingots */}
      <path d="M8 30 L16 20 L40 20 L32 30 Z" fill="#b8860b" stroke="#8b6508" strokeWidth="1" />
      <path d="M32 30 L40 20 L42 24 L34 34 Z" fill="#9a7209" stroke="#8b6508" strokeWidth="0.8" />
      <path d="M8 30 L32 30 L34 34 L10 34 Z" fill="#a07a0a" stroke="#8b6508" strokeWidth="0.8" />
      {/* Second ingot behind */}
      <path d="M12 26 L18 18 L38 18 L32 26 Z" fill="#c89e0e" stroke="#8b6508" strokeWidth="0.6" />
      {/* Metal sheen */}
      <line x1="18" y1="24" x2="30" y2="24" stroke="#d4aa14" strokeWidth="0.5" opacity="0.6" />
      <line x1="20" y1="27" x2="28" y2="27" stroke="#d4aa14" strokeWidth="0.5" opacity="0.4" />
      {/* Patina spots */}
      <circle cx="22" cy="25" r="1" fill="#5a8a5a" opacity="0.3" />
      <circle cx="28" cy="23" r="0.8" fill="#5a8a5a" opacity="0.25" />
    </>
  ),
  timber: (
    <>
      {/* Log stack */}
      <ellipse cx="16" cy="32" rx="8" ry="6" fill="#8b6040" stroke="#5a3a20" strokeWidth="1" />
      <ellipse cx="16" cy="32" rx="5" ry="4" fill="none" stroke="#6b4a30" strokeWidth="0.5" />
      <ellipse cx="16" cy="32" rx="2.5" ry="2" fill="none" stroke="#6b4a30" strokeWidth="0.5" />
      <circle cx="16" cy="32" r="1" fill="#5a3a20" />
      {/* Second log */}
      <ellipse cx="32" cy="32" rx="8" ry="6" fill="#7a5038" stroke="#5a3a20" strokeWidth="1" />
      <ellipse cx="32" cy="32" rx="5" ry="4" fill="none" stroke="#6b4a30" strokeWidth="0.5" />
      <ellipse cx="32" cy="32" rx="2.5" ry="2" fill="none" stroke="#6b4a30" strokeWidth="0.5" />
      <circle cx="32" cy="32" r="1" fill="#5a3a20" />
      {/* Top log */}
      <ellipse cx="24" cy="22" rx="9" ry="6" fill="#9a7050" stroke="#5a3a20" strokeWidth="1" />
      <ellipse cx="24" cy="22" rx="6" ry="4" fill="none" stroke="#7a5a38" strokeWidth="0.5" />
      <ellipse cx="24" cy="22" rx="3" ry="2" fill="none" stroke="#7a5a38" strokeWidth="0.5" />
      <circle cx="24" cy="22" r="1.2" fill="#5a3a20" />
      {/* Bark texture */}
      <path d="M15 22 L33 22" stroke="#6b4a30" strokeWidth="0.3" />
    </>
  ),
  pottery: (
    <>
      {/* Greek amphora */}
      <path d="M19 10 C17 14, 14 20, 13 26 C12 32, 15 38, 18 40 L30 40 C33 38, 36 32, 35 26 C34 20, 31 14, 29 10"
        fill="#d4854a" stroke="#8b5a2e" strokeWidth="1.2" />
      {/* Neck */}
      <rect x="20" y="6" width="8" height="5" rx="1" fill="#c47540" stroke="#8b5a2e" strokeWidth="0.8" />
      {/* Lip */}
      <rect x="18" y="5" width="12" height="2" rx="1" fill="#d49058" stroke="#8b5a2e" strokeWidth="0.6" />
      {/* Handles */}
      <path d="M13 16 C9 16, 9 26, 13 26" fill="none" stroke="#8b5a2e" strokeWidth="1.8" />
      <path d="M35 16 C39 16, 39 26, 35 26" fill="none" stroke="#8b5a2e" strokeWidth="1.8" />
      {/* Black-figure decoration band */}
      <rect x="14" y="22" width="20" height="8" rx="0" fill="#2a1a0e" opacity="0.8" />
      {/* Greek key pattern in decoration */}
      <path d="M16 24 L18 24 L18 26 L16 26 M20 24 L22 24 L22 26 L20 26 M24 24 L26 24 L26 26 L24 26 M28 24 L30 24 L30 26 L28 26"
        stroke="#d4854a" strokeWidth="0.5" fill="none" />
      {/* Base */}
      <rect x="20" y="40" width="8" height="2" rx="1" fill="#b06838" stroke="#8b5a2e" strokeWidth="0.5" />
    </>
  ),
};
