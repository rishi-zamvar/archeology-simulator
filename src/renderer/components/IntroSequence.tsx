/**
 * IntroSequence -- Multi-slide narrative intro at Piraeus, 540 BCE.
 *
 * Shown after the player clicks "New Game" on the title screen,
 * before gameplay begins. 4 slides with CSS opacity transitions.
 */

import React, { useState } from 'react';

interface IntroSequenceProps {
  onComplete: () => void;
}

interface Slide {
  heading: string;
  paragraphs: string[];
  footnote: string;
}

const SLIDES: Slide[] = [
  {
    heading: 'Piraeus, Port of Athens, 540 BCE',
    paragraphs: [
      'The morning sun breaks over the harbor of Piraeus. Penteconters and broad-bellied merchant galleys jostle for berth along the stone quays, their masts a forest against the pale Attic sky. The air is thick with the scent of olive oil, cedar planks, and salt spray.',
      'Stevedores shout in Attic Greek as they roll amphorae of wine down gangplanks. Phoenician traders in dyed robes haggle with Athenian potters. A trireme of the new Athenian fleet slides past, her bronze ram catching the light.',
    ],
    footnote: 'Athens in the 6th century BCE was the cultural heart of the Greek world. Under the reforms of Solon, the city was transforming from an aristocratic stronghold into the birthplace of democracy.',
  },
  {
    heading: 'You are a merchant captain...',
    paragraphs: [
      'You stand on the deck of your merchant galley, a sturdy round-hulled vessel built for cargo, not war. This is your first major voyage beyond the familiar waters of the Saronic Gulf.',
      'The hold below is empty, waiting to be filled with trade goods that will make your fortune -- or leave you stranded in a foreign port. Every captain starts somewhere, and yours begins here, at the crossroads of the ancient world.',
    ],
    footnote: 'Merchant captains (emporoi) were among the most mobile people in the ancient Mediterranean. Through trade, they connected civilizations that might otherwise never have exchanged ideas, technologies, or customs.',
  },
  {
    heading: 'A commission from Nikias...',
    paragraphs: [
      'A wealthy merchant named Nikias approaches you at the dockside tavern. His robes are fine Milesian wool, his fingers heavy with Egyptian rings. He speaks quickly, as men of commerce do.',
      '"I need Attic pottery delivered to Tyre -- the Phoenicians pay handsomely for our red-figure ware. Bring back Tyrian purple dye, and I will make it worth your while. This is the Tyrian Commission."',
    ],
    footnote: 'Tyrian purple (porphyra) was the most prized dye in the ancient world, worth more than gold by weight. It was extracted from murex sea snails by Phoenician artisans in the coastal workshops of Tyre.',
  },
  {
    heading: 'The Mediterranean awaits...',
    paragraphs: [
      'Beyond the harbor mouth, the wine-dark sea stretches to every horizon. Carthage, Memphis, Gadir, Byblos, Ostia -- each port holds its own riches, its own dangers, its own stories.',
      'Your reputation will be built one voyage at a time. Trade wisely, learn from the people you meet, and the ancient world will reveal its secrets. The Merchant\'s Odyssey begins.',
    ],
    footnote: 'The Mediterranean of 540 BCE was a world connected by water. Phoenician, Greek, Egyptian, and Etruscan merchants sailed routes that had been traveled for millennia, carrying not just goods but the knowledge that built Western civilization.',
  },
];

export default function IntroSequence({ onComplete }: IntroSequenceProps): React.ReactElement {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fading, setFading] = useState(false);

  const slide = SLIDES[currentSlide];
  const isLastSlide = currentSlide === SLIDES.length - 1;

  function handleAdvance() {
    if (isLastSlide) {
      onComplete();
      return;
    }
    setFading(true);
    setTimeout(() => {
      setCurrentSlide(prev => prev + 1);
      setFading(false);
    }, 400);
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#fdf8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '8px solid #e8d5b8',
        boxSizing: 'border-box',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: 600,
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.4s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        {/* Slide counter */}
        <p
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '0.6rem',
            color: '#9a8570',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {currentSlide + 1} / {SLIDES.length}
        </p>

        {/* Heading */}
        <h2
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#5a3e2b',
            textAlign: 'center',
            margin: 0,
            letterSpacing: '0.04em',
          }}
        >
          {slide.heading}
        </h2>

        {/* Body paragraphs */}
        {slide.paragraphs.map((para, i) => (
          <p
            key={i}
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.9rem',
              color: '#5a3e2b',
              lineHeight: 1.8,
              textAlign: 'center',
              margin: 0,
            }}
          >
            {para}
          </p>
        ))}

        {/* Historical footnote */}
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.72rem',
            fontStyle: 'italic',
            color: '#9a8570',
            lineHeight: 1.6,
            textAlign: 'center',
            margin: '0.5rem 0 0',
            borderTop: '1px solid #e8d5b8',
            paddingTop: '0.75rem',
          }}
        >
          {slide.footnote}
        </p>

        {/* Continue / Begin button */}
        <button
          type="button"
          onClick={handleAdvance}
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#fdf8f0',
            backgroundColor: isLastSlide ? '#2b5c4a' : '#7a5c2b',
            border: '2px solid rgba(0, 0, 0, 0.15)',
            borderRadius: 6,
            padding: '0.7rem 2.5rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(61, 43, 31, 0.2)',
            transition: 'opacity 0.15s',
            marginTop: '0.5rem',
          }}
        >
          {isLastSlide ? 'Begin Voyage' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
