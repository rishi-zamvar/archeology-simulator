/**
 * Voyage event system — 24 hand-written historically grounded events,
 * a weighted roll function, and deterministic/probabilistic resolution logic.
 *
 * Events are the "Oregon Trail moment" of Archeology Simulator:
 * they make each voyage unpredictable and consequential.
 *
 * Distribution: 8 storm, 8 pirate, 8 calm events.
 * Roll probability: 70% chance of any event per voyage.
 * Weights: storm 25%, pirate 20%, calm 55%.
 */

import type { VoyageEvent } from '../shared/game-types';
import type { PlayerInventory } from '../shared/game-types';

// ── Event Database ────────────────────────────────────────────────────────────

export const EVENT_DATABASE: VoyageEvent[] = [
  // ── STORMS ────────────────────────────────────────────────────────────────

  {
    id: 'storm_etesian_winds',
    type: 'storm',
    title: 'The Etesian Winds Rise',
    description:
      'The etesian winds — the meltemi that blow fiercely from the north each summer — have caught you unprepared. Waves crash over the bow.',
    choices: [
      {
        id: 'seek_shelter',
        label: 'Seek shelter in a cove',
        outcome: 'You lose 2 turns sheltering but save your cargo.',
      },
      {
        id: 'push_through',
        label: 'Push through under oars',
        outcome: 'A 40% chance you make it; otherwise lose 20% of cargo.',
      },
    ],
  },
  {
    id: 'storm_autumn_squall',
    type: 'storm',
    title: 'Autumn Squall',
    description:
      'A sudden squall out of the west has darkened the sky. Your helmsman shouts warnings. The sea is no place for pride.',
    choices: [
      {
        id: 'reduce_sail',
        label: 'Reduce sail and ride it out',
        outcome: 'Delay 1 turn but arrive safely.',
      },
      {
        id: 'run_before_wind',
        label: 'Run before the wind',
        outcome: 'Faster travel — but risk losing 10% cargo.',
      },
    ],
  },
  {
    id: 'storm_bora',
    type: 'storm',
    title: 'The Bora Strikes',
    description:
      'A violent cold bora wind descends from the mountains. Ancient sailors knew to fear this wind above all others in the Adriatic.',
    choices: [
      {
        id: 'make_port',
        label: 'Make for the nearest port immediately',
        outcome: 'Lose 2 turns. No cargo lost.',
      },
      {
        id: 'heave_to',
        label: 'Heave to and wait it out',
        outcome: 'Lose 1 turn. Small chance of cargo damage (15%).',
      },
    ],
  },
  {
    id: 'storm_mediterranean_cyclone',
    type: 'storm',
    title: 'A Great Tempest',
    description:
      'The sky turns the colour of a bruise. A great storm of the kind the Phoenicians call "the wrath of Yamm, god of the sea" surrounds your ship.',
    choices: [
      {
        id: 'jettison_cargo',
        label: 'Jettison heavy cargo to stay afloat',
        outcome: 'Lose 30% of cargo but survive.',
      },
      {
        id: 'pray_and_hold',
        label: 'Pray to Poseidon and hold course',
        outcome: 'Equal chance: arrive unharmed or lose 25% cargo.',
      },
    ],
  },
  {
    id: 'storm_lee_shore',
    type: 'storm',
    title: 'A Lee Shore',
    description:
      'Wind has driven your ship toward a rocky coast. The helmsman fights for every cubit of sea room. This is how most ancient ships were lost.',
    choices: [
      {
        id: 'anchor_deep',
        label: 'Drop all anchors and hold',
        outcome: 'Delay 2 turns. Anchor stones lost (cost 50 denarii).',
      },
      {
        id: 'row_to_safety',
        label: 'Row the oarsmen to safety',
        outcome: 'Lose 1 turn. 25% chance of minor hull damage (200 denarii).',
      },
    ],
  },
  {
    id: 'storm_night_squall',
    type: 'storm',
    title: 'Storm in the Night',
    description:
      "A squall in darkness is every captain's nightmare. You cannot see the waves coming. You can only feel the ship lift and drop.",
    choices: [
      {
        id: 'reduce_speed',
        label: 'Slow to minimum speed and wait for dawn',
        outcome: 'Delay 1 turn. No cargo lost.',
      },
      {
        id: 'trust_helmsman',
        label: "Trust your helmsman's instincts",
        outcome: 'No delay. 30% chance of losing 15% cargo.',
      },
    ],
  },
  {
    id: 'storm_cape_malea',
    type: 'storm',
    title: 'Cape Malea',
    description:
      '"Round Cape Malea first, then make your will," the saying goes. The cape has ended more voyages than all the pirates in the sea combined.',
    choices: [
      {
        id: 'wait_for_weather',
        label: 'Wait in Kythera for better weather',
        outcome: 'Delay 2 turns. Safe passage.',
      },
      {
        id: 'attempt_rounding',
        label: 'Attempt the rounding now',
        outcome: '50% success. Failure costs 25% cargo and 1 extra turn.',
      },
    ],
  },
  {
    id: 'storm_waterspout',
    type: 'storm',
    title: 'A Column of Water',
    description:
      'A waterspout — what the Greeks call a "water-twister" — passes nearby. Your crew watches in awe and terror as it churns the sea.',
    choices: [
      {
        id: 'turn_away',
        label: 'Turn hard away from it',
        outcome: 'Safe. Delay 1 turn.',
      },
      {
        id: 'hold_course',
        label: 'Hold course — it may miss you',
        outcome: '70% chance it passes safely. 30% chance: lose 20% cargo.',
      },
    ],
  },

  // ── PIRATES ───────────────────────────────────────────────────────────────

  {
    id: 'pirate_cilician_corsairs',
    type: 'pirate',
    title: 'Cilician Corsairs',
    description:
      'Three lean oared galleys approach from the northeast — Cilician pirates, who operated throughout the eastern Mediterranean. Their red sails are unmistakeable.',
    choices: [
      {
        id: 'pay_passage',
        label: 'Offer passage payment',
        outcome: 'Pay 100 denarii to pass unmolested.',
      },
      {
        id: 'flee_to_port',
        label: 'Run for the nearest port',
        outcome: 'If within 1 turn of a port: escape. Otherwise lose 15% cargo.',
      },
    ],
  },
  {
    id: 'pirate_phoenician_raider',
    type: 'pirate',
    title: 'Phoenician Raiders',
    description:
      'A fast Phoenician ship cuts across your bow, flying no flag. In this era, the line between trader and raider is thin.',
    choices: [
      {
        id: 'offer_trade',
        label: 'Offer a trade as cover',
        outcome: 'Gift 1 unit of your most valuable good. They depart.',
      },
      {
        id: 'armed_resistance',
        label: 'Show weapons and hold position',
        outcome: '50% chance they back down. 50% chance: lose 200 denarii.',
      },
    ],
  },
  {
    id: 'pirate_cretan_sea_raiders',
    type: 'pirate',
    title: 'Cretans on the Water',
    description:
      'Crete was infamous in the ancient world as a base for sea raiders. These ones have cut your course and signal demands.',
    choices: [
      {
        id: 'pay_ransom',
        label: 'Pay the demanded ransom',
        outcome: 'Pay 150 denarii. Sail on unmolested.',
      },
      {
        id: 'dump_cargo',
        label: 'Offer one type of cargo as tribute',
        outcome: 'Lose the lowest-value cargo type you are carrying.',
      },
    ],
  },
  {
    id: 'pirate_illyrian_ship',
    type: 'pirate',
    title: 'Illyrian Sea Wolves',
    description:
      'Illyrian pirates were the terror of the Adriatic. This one has rowed up alongside you, its crew armed with long spears.',
    choices: [
      {
        id: 'pay_gold',
        label: 'Pay 200 denarii',
        outcome: 'They depart. You continue your voyage.',
      },
      {
        id: 'parley',
        label: 'Parley — offer information about richer ships',
        outcome: 'They let you go. No cost. Reputation slightly damaged.',
      },
    ],
  },
  {
    id: 'pirate_greek_opportunist',
    type: 'pirate',
    title: 'An Opportunistic Greek',
    description:
      'In the ancient world, piracy and trade were not always distinguished. This Greek captain offers you a choice: trade or tribute.',
    choices: [
      {
        id: 'trade_fairly',
        label: 'Trade a unit of goods at below-market price',
        outcome: 'Sell 2 units of your best good at 60% of current price.',
      },
      {
        id: 'refuse_and_speed',
        label: 'Refuse and make all speed',
        outcome: '60% chance you outrun them. 40% chance: lose 100 denarii.',
      },
    ],
  },
  {
    id: 'pirate_egyptian_patrol',
    type: 'pirate',
    title: 'Egyptian Harbour Guard',
    description:
      'A vessel flying Egyptian colours has stopped you. They demand proof of legitimacy — and a "harbour fee" not found in any official tariff.',
    choices: [
      {
        id: 'pay_bribe',
        label: 'Pay the unofficial fee',
        outcome: 'Pay 80 denarii. No further trouble.',
      },
      {
        id: 'invoke_pharaoh',
        label: "Invoke the pharaoh's treaty with your people",
        outcome: '50% chance they back down. 50% chance: pay 160 denarii.',
      },
    ],
  },
  {
    id: 'pirate_sea_peoples_descendants',
    type: 'pirate',
    title: 'Raiders from the Western Islands',
    description:
      'A battered but fast ship emerges from behind a rocky headland. They speak a dialect you cannot place. Their intent is clear.',
    choices: [
      {
        id: 'heavy_payment',
        label: 'Pay 250 denarii and they leave',
        outcome: 'You pay. They depart. No cargo lost.',
      },
      {
        id: 'partial_cargo',
        label: 'Offer your grain as tribute',
        outcome: 'Lose all wheat you carry. Everything else is safe.',
      },
    ],
  },
  {
    id: 'pirate_ambush_strait',
    type: 'pirate',
    title: 'Ambush in the Strait',
    description:
      'Two ships have positioned themselves at either end of a narrow strait. This is a coordinated trap — a technique favoured by experienced sea raiders.',
    choices: [
      {
        id: 'pay_both',
        label: 'Pay both ships to pass',
        outcome: 'Pay 200 denarii total. Passage guaranteed.',
      },
      {
        id: 'ram_and_run',
        label: 'Attempt to ram through the nearer ship',
        outcome: '30% success with no loss. 70%: lose 300 denarii and 1 turn.',
      },
    ],
  },

  // ── CALM / FAVORABLE ─────────────────────────────────────────────────────

  {
    id: 'calm_fair_winds',
    type: 'calm',
    title: 'Fair Winds and Following Seas',
    description:
      "The helmsman smiles. The sail fills. A favorable wind has cut your voyage time — the gods seem pleased with your offering at the last port.",
    choices: [
      {
        id: 'accept_blessing',
        label: 'Accept the gift of the wind',
        outcome: 'Voyage takes 1 fewer turn than expected.',
      },
    ],
  },
  {
    id: 'calm_dolphins',
    type: 'calm',
    title: 'Dolphins Play at the Bow',
    description:
      'A school of dolphins races alongside your ship. In ancient belief, dolphins were sacred to Apollo and Poseidon — an omen of safe passage.',
    choices: [
      {
        id: 'take_omen',
        label: 'Take it as a blessing and press on',
        outcome: "Your crew's morale is high. No penalty this voyage.",
      },
    ],
  },
  {
    id: 'calm_merchant_encounter',
    type: 'calm',
    title: 'Another Merchant at Sea',
    description:
      'A fellow merchant vessel hails you. The captain shouts news from a port ahead — word of a festival, a shortage, or an opportunity.',
    choices: [
      {
        id: 'share_news',
        label: 'Exchange news and sail on',
        outcome: 'You learn which good is in high demand at your destination (market tip).',
      },
    ],
  },
  {
    id: 'calm_abandoned_cargo',
    type: 'calm',
    title: 'Floating Cargo',
    description:
      "Your lookout spots amphorae floating on the calm sea — cargo from a ship that didn't make it. This happens more than merchants like to admit.",
    choices: [
      {
        id: 'salvage',
        label: 'Salvage what you can',
        outcome: 'Gain 3 units of wine or olive oil (random). Slight delay.',
      },
      {
        id: 'leave_it',
        label: "Leave it — another's loss is not your gain",
        outcome: 'No gain, no delay. Crew respects your character.',
      },
    ],
  },
  {
    id: 'calm_island_shelter',
    type: 'calm',
    title: 'A Hidden Cove',
    description:
      "Your scout has found a beautiful sheltered cove on an unnamed island. Fresh water, fish, and a night's rest. The ancient world was full of such places.",
    choices: [
      {
        id: 'rest_here',
        label: 'Rest here for a day',
        outcome: 'Delay 1 turn but crew is rested. No negative events for next voyage.',
      },
      {
        id: 'press_on',
        label: 'Press on toward your destination',
        outcome: 'Arrive on schedule. No bonus.',
      },
    ],
  },
  {
    id: 'calm_star_navigation',
    type: 'calm',
    title: 'Clear Skies and Stars',
    description:
      'The night is extraordinarily clear. Your navigator, trained in Phoenician star-reckoning, points to the Bear and the Wandering Stars. Tonight you sail true.',
    choices: [
      {
        id: 'sail_by_night',
        label: 'Sail through the night by the stars',
        outcome: 'Arrive 1 turn early. Ancient night sailing was a skill, not a risk here.',
      },
    ],
  },
  {
    id: 'calm_trade_wind',
    type: 'calm',
    title: 'The Trade Wind',
    description:
      'The Etesian winds that blow south across the Aegean in summer were how the Egyptians and Phoenicians built their maritime empires. Today they are with you.',
    choices: [
      {
        id: 'set_full_sail',
        label: 'Set full sail and run with the wind',
        outcome: 'Arrive 2 turns early. The sea is your ally today.',
      },
    ],
  },
  {
    id: 'calm_floating_news',
    type: 'calm',
    title: 'News from a Passing Fisher',
    description:
      'A small fishing vessel comes alongside. The old fisherman speaks of unrest at a Phoenician port — a trade embargo between Tyre and its eastern overland partners.',
    choices: [
      {
        id: 'ask_more',
        label: 'Ask for more details',
        outcome: 'You learn textiles are scarce at Tyre. Prices may be high.',
      },
      {
        id: 'nod_and_sail',
        label: 'Thank him and sail on',
        outcome: 'No bonus. No penalty.',
      },
    ],
  },
];

// ── Event Roll ────────────────────────────────────────────────────────────────

// Weighted probabilities: storm 25%, pirate 20%, calm 55%
const EVENT_WEIGHTS: Record<string, number> = {
  storm: 25,
  pirate: 20,
  calm: 55,
};

/**
 * Roll for a voyage event.
 * Returns null (no event) 30% of the time; otherwise returns a random
 * VoyageEvent weighted by type.
 */
export function rollVoyageEvent(
  _turn: number,
  _fromPortId?: string,
  _toPortId?: string,
  seasonalWeights?: { storm: number; pirate: number; calm: number }
): VoyageEvent | null {
  // 70% chance of an event occurring this voyage
  if (Math.random() > 0.7) return null;

  // Use seasonal weights if provided, otherwise fall back to hardcoded defaults
  const weights = seasonalWeights ?? EVENT_WEIGHTS;

  // Weighted type selection
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  let selectedType = 'calm';

  for (const [type, weight] of Object.entries(weights)) {
    rand -= weight;
    if (rand <= 0) {
      selectedType = type;
      break;
    }
  }

  // Pick a random event of the selected type
  const pool = EVENT_DATABASE.filter((e) => e.type === selectedType);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Event Resolution ──────────────────────────────────────────────────────────

export interface EventOutcome {
  goldDelta: number;
  cargoDelta: Partial<Record<string, number>>; // goodId -> delta (negative = lost)
  turnDelta: number;                            // extra turns (negative = early arrival)
  message: string;
}

/**
 * Resolve a player's choice for a given event.
 * Returns an EventOutcome describing all inventory changes.
 */
export function resolveEventChoice(
  event: VoyageEvent,
  choiceId: string,
  inventory: PlayerInventory
): EventOutcome {
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) {
    throw new Error(`Unknown choice "${choiceId}" for event "${event.id}"`);
  }
  return resolveByEventAndChoice(event, choiceId, inventory);
}

// ── Resolution Helpers ────────────────────────────────────────────────────────

function loseCargoPercent(
  inventory: PlayerInventory,
  pct: number
): Partial<Record<string, number>> {
  const result: Partial<Record<string, number>> = {};
  for (const item of inventory.cargoItems) {
    const loss = Math.floor(item.quantity * pct);
    if (loss > 0) result[item.goodId] = -loss;
  }
  return result;
}

function loseAllOfGood(
  inventory: PlayerInventory,
  goodId: string
): Partial<Record<string, number>> {
  const item = inventory.cargoItems.find((c) => c.goodId === goodId);
  return item && item.quantity > 0 ? { [goodId]: -item.quantity } : {};
}

function loseLowestCargo(
  inventory: PlayerInventory
): Partial<Record<string, number>> {
  if (inventory.cargoItems.length === 0) return {};
  const lowest = [...inventory.cargoItems].sort(
    (a, b) => a.boughtAtPrice - b.boughtAtPrice
  )[0];
  return { [lowest.goodId]: -lowest.quantity };
}

function bestCargoItem(inventory: PlayerInventory) {
  if (inventory.cargoItems.length === 0) return null;
  return [...inventory.cargoItems].sort(
    (a, b) => b.boughtAtPrice - a.boughtAtPrice
  )[0];
}

// ── Per-Event Resolution Switch ────────────────────────────────────────────────

function resolveByEventAndChoice(
  event: VoyageEvent,
  choiceId: string,
  inventory: PlayerInventory
): EventOutcome {
  switch (event.id) {

    // ── STORMS ──────────────────────────────────────────────────────────────

    case 'storm_etesian_winds':
      if (choiceId === 'seek_shelter')
        return { goldDelta: 0, cargoDelta: {}, turnDelta: 2, message: 'You sheltered safely. Lost 2 turns.' };
      return Math.random() < 0.4
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'You pushed through! No loss.' }
        : { goldDelta: 0, cargoDelta: loseCargoPercent(inventory, 0.2), turnDelta: 0, message: 'The storm took 20% of your cargo.' };

    case 'storm_autumn_squall':
      if (choiceId === 'reduce_sail')
        return { goldDelta: 0, cargoDelta: {}, turnDelta: 1, message: 'Safe but slow. 1 turn lost.' };
      return Math.random() < 0.6
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: -1, message: 'You rode the wind! Arrived 1 turn early.' }
        : { goldDelta: 0, cargoDelta: loseCargoPercent(inventory, 0.1), turnDelta: 0, message: 'Lost 10% cargo in the squall.' };

    case 'storm_bora':
      if (choiceId === 'make_port')
        return { goldDelta: 0, cargoDelta: {}, turnDelta: 2, message: 'Safe harbour. Lost 2 turns.' };
      return Math.random() < 0.85
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 1, message: 'Waited it out. Lost 1 turn.' }
        : { goldDelta: 0, cargoDelta: loseCargoPercent(inventory, 0.1), turnDelta: 1, message: 'Some cargo damaged. Lost 1 turn.' };

    case 'storm_mediterranean_cyclone':
      if (choiceId === 'jettison_cargo')
        return { goldDelta: 0, cargoDelta: loseCargoPercent(inventory, 0.3), turnDelta: 0, message: 'You survived. 30% cargo jettisoned.' };
      return Math.random() < 0.5
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Poseidon was merciful. You arrived safely.' }
        : { goldDelta: 0, cargoDelta: loseCargoPercent(inventory, 0.25), turnDelta: 0, message: 'Lost 25% of cargo to the great storm.' };

    case 'storm_lee_shore':
      if (choiceId === 'anchor_deep')
        return { goldDelta: -50, cargoDelta: {}, turnDelta: 2, message: 'Anchors held. Lost anchor stones (50 denarii) and 2 turns.' };
      return Math.random() < 0.75
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 1, message: 'Oarsmen pulled you clear. Lost 1 turn.' }
        : { goldDelta: -200, cargoDelta: {}, turnDelta: 1, message: 'Minor hull damage. Repairs cost 200 denarii.' };

    case 'storm_night_squall':
      if (choiceId === 'reduce_speed')
        return { goldDelta: 0, cargoDelta: {}, turnDelta: 1, message: 'Waited for dawn. Lost 1 turn.' };
      return Math.random() < 0.7
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Your helmsman guided you through.' }
        : { goldDelta: 0, cargoDelta: loseCargoPercent(inventory, 0.15), turnDelta: 0, message: 'Lost 15% cargo in the night squall.' };

    case 'storm_cape_malea':
      if (choiceId === 'wait_for_weather')
        return { goldDelta: 0, cargoDelta: {}, turnDelta: 2, message: 'Waited in Kythera. Safe rounding. 2 turns lost.' };
      return Math.random() < 0.5
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Rounded the cape successfully!' }
        : { goldDelta: 0, cargoDelta: loseCargoPercent(inventory, 0.25), turnDelta: 1, message: 'Bad rounding. Lost 25% cargo and 1 turn.' };

    case 'storm_waterspout':
      if (choiceId === 'turn_away')
        return { goldDelta: 0, cargoDelta: {}, turnDelta: 1, message: 'Turned away safely. Lost 1 turn.' };
      return Math.random() < 0.7
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Waterspout passed by harmlessly.' }
        : { goldDelta: 0, cargoDelta: loseCargoPercent(inventory, 0.2), turnDelta: 0, message: 'Waterspout clipped the ship. Lost 20% cargo.' };

    // ── PIRATES ──────────────────────────────────────────────────────────────

    case 'pirate_cilician_corsairs':
      if (choiceId === 'pay_passage')
        return { goldDelta: -100, cargoDelta: {}, turnDelta: 0, message: 'Paid 100 denarii. Sailed on.' };
      return inventory.currentCargo === 0
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Made it to port — you had nothing to take!' }
        : { goldDelta: 0, cargoDelta: loseCargoPercent(inventory, 0.15), turnDelta: 0, message: 'Lost 15% cargo fleeing the corsairs.' };

    case 'pirate_phoenician_raider': {
      if (choiceId === 'offer_trade') {
        const best = bestCargoItem(inventory);
        return {
          goldDelta: 0,
          cargoDelta: best ? { [best.goodId]: -1 } : {},
          turnDelta: 0,
          message: `Gifted 1 ${best?.goodId ?? 'unit of cargo'}. They departed.`,
        };
      }
      return Math.random() < 0.5
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Your weapons impressed them. They backed off.' }
        : { goldDelta: -200, cargoDelta: {}, turnDelta: 0, message: 'You paid 200 denarii after losing the standoff.' };
    }

    case 'pirate_cretan_sea_raiders':
      if (choiceId === 'pay_ransom')
        return { goldDelta: -150, cargoDelta: {}, turnDelta: 0, message: 'Paid 150 denarii ransom.' };
      return { goldDelta: 0, cargoDelta: loseLowestCargo(inventory), turnDelta: 0, message: 'Gave up your lowest-value cargo as tribute.' };

    case 'pirate_illyrian_ship':
      if (choiceId === 'pay_gold')
        return { goldDelta: -200, cargoDelta: {}, turnDelta: 0, message: 'Paid 200 denarii. Continued voyage.' };
      return { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'You gave them information. They let you go.' };

    case 'pirate_greek_opportunist': {
      if (choiceId === 'trade_fairly') {
        const best = bestCargoItem(inventory);
        const loss = best ? Math.floor(best.boughtAtPrice * 2 * 0.4) : 0;
        return {
          goldDelta: -loss,
          cargoDelta: best ? { [best.goodId]: -2 } : {},
          turnDelta: 0,
          message: `Sold 2 ${best?.goodId ?? 'units'} at below-market price.`,
        };
      }
      return Math.random() < 0.6
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Outran them! No loss.' }
        : { goldDelta: -100, cargoDelta: {}, turnDelta: 0, message: 'Caught. Paid 100 denarii.' };
    }

    case 'pirate_egyptian_patrol':
      if (choiceId === 'pay_bribe')
        return { goldDelta: -80, cargoDelta: {}, turnDelta: 0, message: 'Paid the unofficial fee (80 denarii).' };
      return Math.random() < 0.5
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'They accepted your argument. No charge.' }
        : { goldDelta: -160, cargoDelta: {}, turnDelta: 0, message: 'Your bluff failed. Paid double (160 denarii).' };

    case 'pirate_sea_peoples_descendants':
      if (choiceId === 'heavy_payment')
        return { goldDelta: -250, cargoDelta: {}, turnDelta: 0, message: 'Paid 250 denarii. They departed.' };
      return { goldDelta: 0, cargoDelta: loseAllOfGood(inventory, 'wheat'), turnDelta: 0, message: 'Gave up all wheat. Other cargo safe.' };

    case 'pirate_ambush_strait':
      if (choiceId === 'pay_both')
        return { goldDelta: -200, cargoDelta: {}, turnDelta: 0, message: 'Paid 200 denarii total. Passed through.' };
      return Math.random() < 0.3
        ? { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Rammed through! Escaped unharmed.' }
        : { goldDelta: -300, cargoDelta: {}, turnDelta: 1, message: 'The ram failed. Paid 300 denarii and lost 1 turn.' };

    // ── CALM ─────────────────────────────────────────────────────────────────

    case 'calm_fair_winds':
      return { goldDelta: 0, cargoDelta: {}, turnDelta: -1, message: 'Fair winds! Arrived 1 turn early.' };

    case 'calm_dolphins':
      return { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Dolphins played at the bow. Good omen for this voyage.' };

    case 'calm_merchant_encounter':
      return { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Learned news of market prices ahead.' };

    case 'calm_abandoned_cargo': {
      if (choiceId === 'salvage') {
        const good = Math.random() < 0.5 ? 'wine' : 'olive_oil';
        return { goldDelta: 0, cargoDelta: { [good]: 3 }, turnDelta: 1, message: `Salvaged 3 units of ${good}.` };
      }
      return { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: "Left the cargo. Your crew respects your character." };
    }

    case 'calm_island_shelter':
      if (choiceId === 'rest_here')
        return { goldDelta: 0, cargoDelta: {}, turnDelta: 1, message: 'Rested 1 turn. Crew fully rested.' };
      return { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Pressed on. Arrived on schedule.' };

    case 'calm_star_navigation':
      return { goldDelta: 0, cargoDelta: {}, turnDelta: -1, message: 'Sailed by the stars all night. Arrived 1 turn early.' };

    case 'calm_trade_wind':
      return { goldDelta: 0, cargoDelta: {}, turnDelta: -2, message: 'Trade winds carried you swiftly. Arrived 2 turns early!' };

    case 'calm_floating_news':
      if (choiceId === 'ask_more')
        return { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Learned textiles are scarce at Tyre. High prices await.' };
      return { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'Sailed on. No bonus.' };

    default:
      return { goldDelta: 0, cargoDelta: {}, turnDelta: 0, message: 'The voyage continued without incident.' };
  }
}
