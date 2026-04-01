/**
 * DialogueModal — NPC conversation overlay.
 *
 * Full-screen modal that displays NPC dialogue with branching choices.
 * Parchment-styled to match the game's aesthetic. Modeled after EventCard
 * with async IPC calls on choice selection and resolving state to prevent
 * double-clicks.
 *
 * Terminal nodes (no choices) show a "Farewell" dismiss button.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { DialogueNode, DialogueChoice } from '../../shared/game-types';

interface DialogueModalProps {
  npcId: string;
  initialNode: DialogueNode;
  initialChoices: DialogueChoice[];
  portraitUrl: string | null;
  onDismiss: () => void;
}

export default function DialogueModal({
  npcId,
  initialNode,
  initialChoices,
  portraitUrl,
  onDismiss,
}: DialogueModalProps): React.ReactElement {
  const [currentNode, setCurrentNode] = useState<DialogueNode>(initialNode);
  const [availableChoices, setAvailableChoices] = useState<DialogueChoice[]>(initialChoices);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Typewriter effect state (FX-01)
  const [displayedChars, setDisplayedChars] = useState(0);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fullText = currentNode.text;

  // Reset typewriter when node changes
  useEffect(() => {
    setDisplayedChars(0);
    setTypewriterDone(false);
    if (typewriterRef.current) clearInterval(typewriterRef.current);

    typewriterRef.current = setInterval(() => {
      setDisplayedChars((prev) => {
        if (prev >= fullText.length) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          setTypewriterDone(true);
          return prev;
        }
        return prev + 1;
      });
    }, 30);

    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, [fullText]);

  const skipTypewriter = useCallback(() => {
    if (!typewriterDone) {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      setDisplayedChars(fullText.length);
      setTypewriterDone(true);
    }
  }, [typewriterDone, fullText.length]);

  const isTerminal = availableChoices.length === 0;

  const handleChoice = async (choiceIndex: number): Promise<void> => {
    if (resolving) return;
    setResolving(true);
    setError(null);

    try {
      const response = await window.api.dialogue.advanceNode(
        npcId,
        currentNode.id,
        choiceIndex,
      );

      if (response.success) {
        if (!response.data.node || response.data.availableChoices.length === 0) {
          // Terminal node — update display, show Farewell
          if (response.data.node) {
            setCurrentNode(response.data.node);
          }
          setAvailableChoices([]);
        } else {
          setCurrentNode(response.data.node);
          setAvailableChoices(response.data.availableChoices);
        }
      } else {
        setError(response.error ?? 'Something went wrong.');
        setTimeout(() => onDismiss(), 3000);
      }
    } catch (e) {
      setError(String(e));
      setTimeout(() => onDismiss(), 3000);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby="dialogue-speaker-name"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Parchment card */}
      <div
        className="animate-fade-in"
        style={{
          width: '90%',
          maxWidth: 600,
          padding: '2rem 2.25rem',
          backgroundColor: '#fdf5e6',
          border: '2px solid #c4956a',
          borderRadius: 10,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
          fontFamily: "'Lora', Georgia, serif",
        }}
      >
        {/* Speaker row with portrait */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {portraitUrl && (
            <img
              src={portraitUrl}
              alt={currentNode.speaker}
              style={{
                width: 72,
                height: 72,
                borderRadius: 6,
                border: '2px solid #c4956a',
                backgroundColor: '#f0e4cc',
                objectFit: 'cover',
                boxShadow: '0 2px 8px rgba(61, 43, 31, 0.15)',
              }}
            />
          )}
          <h2
            id="dialogue-speaker-name"
            style={{
              fontFamily: "'Cinzel', 'Times New Roman', serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#5a3e2b',
              marginTop: 0,
              marginBottom: 0,
              letterSpacing: '0.03em',
            }}
          >
            {currentNode.speaker}
          </h2>
        </div>

        {/* Dialogue text — typewriter effect (FX-01) */}
        <p
          onClick={skipTypewriter}
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 16,
            color: '#1a0f0a',
            lineHeight: 1.75,
            marginTop: 0,
            marginBottom: 28,
            cursor: typewriterDone ? 'default' : 'pointer',
            minHeight: '2.5em',
          }}
        >
          {fullText.slice(0, displayedChars)}
          {!typewriterDone && (
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: '1em',
                backgroundColor: '#5a3e2b',
                marginLeft: 1,
                verticalAlign: 'text-bottom',
                animation: 'typewriterBlink 0.6s step-end infinite',
              }}
            />
          )}
        </p>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(139, 46, 46, 0.1)',
              border: '1px solid #8b2e2e',
              borderRadius: 4,
              fontSize: '0.85rem',
              color: '#8b2e2e',
              marginBottom: 16,
              fontStyle: 'italic',
            }}
          >
            {error}
          </div>
        )}

        {/* Choice buttons */}
        {!isTerminal && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {availableChoices.map((choice, index) => (
              <button
                key={`${currentNode.id}-${index}`}
                onClick={() => void handleChoice(index)}
                disabled={resolving}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  backgroundColor: hoveredIndex === index ? 'rgba(196, 149, 106, 0.18)' : 'rgba(196, 149, 106, 0.05)',
                  border: hoveredIndex === index ? '1px solid #b8894a' : '1px solid #d4c4a8',
                  borderRadius: 6,
                  cursor: resolving ? 'not-allowed' : 'pointer',
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: 14,
                  color: '#1a0f0a',
                  textAlign: 'left',
                  lineHeight: 1.5,
                  transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
                  opacity: resolving ? 0.6 : 1,
                  transform: hoveredIndex === index ? 'translateX(4px)' : 'translateX(0)',
                }}
              >
                <span style={{ color: '#c4956a', marginRight: 8, fontWeight: 600 }}>&rsaquo;</span>
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* Farewell button for terminal nodes */}
        {isTerminal && !error && (
          <button
            onClick={onDismiss}
            onMouseEnter={() => setHoveredIndex(-1)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              width: '100%',
              padding: '14px 18px',
              backgroundColor: hoveredIndex === -1 ? 'rgba(196, 149, 106, 0.15)' : 'transparent',
              border: '1px solid #c4956a',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.06em',
              fontStyle: 'italic',
              color: '#7a5c45',
              textAlign: 'center',
              transition: 'background-color 0.2s ease',
            }}
          >
            Farewell
          </button>
        )}
      </div>
    </div>
  );
}
