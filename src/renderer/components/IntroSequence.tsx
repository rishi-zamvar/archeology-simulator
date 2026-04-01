/**
 * IntroSequence -- Multi-slide narrative intro at Piraeus, 540 BCE.
 *
 * Shown after the player clicks "New Game" on the title screen,
 * before gameplay begins. 4 slides with CSS opacity transitions.
 */

import React, { useState, useEffect } from 'react';

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
  const [mounted, setMounted] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  const slide = SLIDES[currentSlide];
  const isLastSlide = currentSlide === SLIDES.length - 1;

  // Fade in on initial mount
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(id);
  }, []);

  function handleAdvance() {
    if (isLastSlide) {
      setFading(true);
      setTimeout(() => onComplete(), 500);
      return;
    }
    setFading(true);
    setTimeout(() => {
      setCurrentSlide(prev => prev + 1);
      setFading(false);
    }, 500);
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(ellipse at center, #fdf8f0 0%, #f0e0c4 70%, #e4cfa8 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '8px solid #e8d5b8',
        boxSizing: 'border-box',
        padding: '2rem',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.6s ease-out',
      }}
    >
      <div
        style={{
          maxWidth: 620,
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(-8px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        {/* Slide counter — dot indicators */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentSlide ? 20 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === currentSlide ? '#c4956a' : '#ddd0bc',
                transition: 'width 0.3s ease, background-color 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Heading */}
        <h2
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '1.6rem',
            fontWeight: 700,
            color: '#5a3e2b',
            textAlign: 'center',
            margin: 0,
            letterSpacing: '0.05em',
            lineHeight: 1.3,
            textShadow: '0 1px 3px rgba(61, 43, 31, 0.08)',
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
              fontSize: '0.95rem',
              color: '#5a3e2b',
              lineHeight: 1.85,
              textAlign: 'center',
              margin: 0,
            }}
          >
            {para}
          </p>
        ))}

        {/* Historical footnote */}
        <div
          style={{
            borderTop: '1px solid #ddd0bc',
            paddingTop: '1rem',
            marginTop: '0.25rem',
            width: '100%',
          }}
        >
          <p
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.78rem',
              fontStyle: 'italic',
              color: '#9a8570',
              lineHeight: 1.7,
              textAlign: 'center',
              margin: 0,
            }}
          >
            {slide.footnote}
          </p>
        </div>

        {/* Continue / Begin button */}
        <button
          type="button"
          onClick={handleAdvance}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
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
            padding: '0.75rem 2.5rem',
            cursor: 'pointer',
            boxShadow: btnHovered
              ? '0 6px 16px rgba(61, 43, 31, 0.35)'
              : '0 2px 8px rgba(61, 43, 31, 0.2)',
            transform: btnHovered ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
            marginTop: '0.75rem',
          }}
        >
          {isLastSlide ? 'Begin Voyage' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
