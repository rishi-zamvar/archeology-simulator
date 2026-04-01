# Phase 24: Animation & Effects - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Every interaction has satisfying visual feedback. Typewriter dialogue, wax seal quest completion, parchment unfurl on panels, gold coin trade animation, smooth screen transitions.

Requirements: FX-01, FX-02, FX-03, FX-04, FX-05

</domain>

<decisions>
## Implementation Decisions

### All at Claude's discretion
- Typewriter speed and easing for NPC dialogue
- Wax seal SVG design and animation timing
- Parchment unfurl approach (CSS transform vs clip-path)
- Gold coin animation style (counter vs falling coins)
- Screen transition implementation (CSS classes vs React state)

</decisions>

<code_context>
## Existing Code Insights

### Key files to modify
- src/renderer/components/DialogueModal.tsx — typewriter effect
- src/renderer/components/Shell.tsx — screen transitions, quest completion animation
- src/renderer/index.css — animation keyframes
- Trade panel components — gold coin effect

### Established Patterns
- CSS keyframe animations (fadeSlideIn, ship-bob, water-wave)
- Inline React styles with transitions
- animate-fade-in class for mount animations

</code_context>

<specifics>
No specific requirements — autonomous mode.
</specifics>

<deferred>
None.
</deferred>
