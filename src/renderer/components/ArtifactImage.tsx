/**
 * ArtifactImage — lazy-loading museum artifact thumbnail.
 *
 * Uses IntersectionObserver (rootMargin: 50px) so the image is only
 * fetched when it enters (or is near) the viewport. Until visible,
 * a static parchment-coloured shimmer placeholder is shown.
 *
 * On image load error (broken URL / CORS) or when the imageUrl is the
 * sentinel '/assets/placeholder-artifact.png', a parchment div with a
 * centred amphora glyph is rendered instead.
 *
 * IntersectionObserver is disconnected in useEffect cleanup to prevent
 * memory leaks across panel open/close cycles.
 *
 * Parchment palette: bg #fdf8f0, accent #c4956a, muted #7a5c45
 */

import React, { useEffect, useRef, useState } from 'react';
import type { CachedArtifact } from '../../shared/ipc-types';

interface ArtifactImageProps {
  artifact: CachedArtifact;
  className?: string;
}

const PLACEHOLDER_URL = '/assets/placeholder-artifact.png';

export default function ArtifactImage({ artifact }: ArtifactImageProps): React.ReactElement {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  const isPlaceholder =
    imgError || artifact.imageUrl === PLACEHOLDER_URL || artifact.museumId === 'placeholder';

  return (
    <figure
      ref={sentinelRef}
      style={{
        margin: '0.4rem 0 0.2rem 0',
        padding: 0,
        width: '120px',
        height: '120px',
        borderRadius: '4px',
        overflow: 'hidden',
        backgroundColor: '#f0d9b5',
        border: '1px solid #e0cdb0',
        flexShrink: 0,
        position: 'relative',
      }}
      title={artifact.title}
    >
      {/* Image area */}
      {!visible ? (
        // Not yet in viewport — shimmer placeholder
        <div
          style={{
            width: '100%',
            height: '100%',
            background:
              'linear-gradient(90deg, #f0d9b5 25%, #fdf8f0 50%, #f0d9b5 75%)',
            backgroundSize: '200% 100%',
            animation: 'artifact-shimmer 1.5s infinite',
          }}
        />
      ) : isPlaceholder ? (
        // Error or placeholder — amphora glyph fallback
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0d9b5',
          }}
        >
          {/* Simple SVG amphora placeholder */}
          <svg
            viewBox="0 0 24 24"
            width="40"
            height="40"
            fill="none"
            stroke="#c4956a"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Amphora body */}
            <path d="M8 3 C5 3 4 6 4 9 C4 14 7 18 9 19 L9 21 L15 21 L15 19 C17 18 20 14 20 9 C20 6 19 3 16 3 Z" />
            {/* Neck */}
            <line x1="9" y1="3" x2="15" y2="3" />
            {/* Handles */}
            <path d="M8 5 C6 5 5 7 6 9" />
            <path d="M16 5 C18 5 19 7 18 9" />
            {/* Bottom lip */}
            <line x1="9" y1="21" x2="15" y2="21" />
          </svg>
          <span
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: '0.55rem',
              color: '#7a5c45',
              marginTop: '4px',
              textAlign: 'center',
              padding: '0 4px',
              letterSpacing: '0.03em',
            }}
          >
            No image
          </span>
        </div>
      ) : (
        // Visible and URL is valid — load the image
        <img
          src={artifact.imageUrl}
          alt={artifact.title}
          onError={() => setImgError(true)}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '4px',
            display: 'block',
          }}
        />
      )}

      {/* Shimmer keyframes injected once via style tag */}
      <style>{`
        @keyframes artifact-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </figure>
  );
}

/**
 * Figcaption shown below the image thumbnail. Rendered separately so
 * TradePanel can compose it next to the image without layout coupling.
 */
export function ArtifactCaption({ artifact }: { artifact: CachedArtifact }): React.ReactElement {
  return (
    <figcaption
      style={{
        fontFamily: "'Lora', Georgia, serif",
        fontSize: '0.7rem',
        color: '#7a5c45',
        marginTop: '0.15rem',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        lineHeight: '1.3',
        maxWidth: '120px',
      }}
    >
      {artifact.museumId === 'placeholder' ? 'Artifact image unavailable' : artifact.title}
    </figcaption>
  );
}
