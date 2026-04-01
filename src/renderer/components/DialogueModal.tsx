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

import React, { useState } from 'react';
import type { DialogueNode, DialogueChoice } from '../../shared/game-types';

interface DialogueModalProps {
  npcId: string;
  initialNode: DialogueNode;
  initialChoices: DialogueChoice[];
  onDismiss: () => void;
}

export default function DialogueModal({
  npcId,
  initialNode,
  initialChoices,
  onDismiss,
}: DialogueModalProps): React.ReactElement {
  const [currentNode, setCurrentNode] = useState<DialogueNode>(initialNode);
  const [availableChoices, setAvailableChoices] = useState<DialogueChoice[]>(initialChoices);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
        style={{
          width: '90%',
          maxWidth: 600,
          padding: 32,
          backgroundColor: '#fdf5e6',
          border: '2px solid #c4956a',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          fontFamily: "'Lora', Georgia, serif",
        }}
      >
        {/* Speaker name */}
        <h2
          id="dialogue-speaker-name"
          style={{
            fontFamily: "'Cinzel', 'Times New Roman', serif",
            fontSize: 18,
            fontWeight: 700,
            color: '#7a5c45',
            marginTop: 0,
            marginBottom: 8,
          }}
        >
          {currentNode.speaker}
        </h2>

        {/* Dialogue text */}
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 16,
            color: '#1a0f0a',
            lineHeight: 1.6,
            marginTop: 0,
            marginBottom: 24,
          }}
        >
          {currentNode.text}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {availableChoices.map((choice, index) => (
              <button
                key={`${currentNode.id}-${index}`}
                onClick={() => void handleChoice(index)}
                disabled={resolving}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  marginBottom: 8,
                  backgroundColor: hoveredIndex === index ? 'rgba(196, 149, 106, 0.15)' : 'transparent',
                  border: '1px solid #c4956a',
                  borderRadius: 4,
                  cursor: resolving ? 'not-allowed' : 'pointer',
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: 14,
                  color: '#1a0f0a',
                  textAlign: 'left',
                  transition: 'background-color 0.15s',
                  opacity: resolving ? 0.6 : 1,
                }}
              >
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* Farewell button for terminal nodes */}
        {isTerminal && !error && (
          <button
            onClick={onDismiss}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: '1px solid #c4956a',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: "'Lora', Georgia, serif",
              fontSize: 14,
              fontStyle: 'italic',
              color: '#7a5c45',
              textAlign: 'center',
              transition: 'background-color 0.15s',
            }}
          >
            Farewell
          </button>
        )}
      </div>
    </div>
  );
}
