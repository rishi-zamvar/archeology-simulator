/**
 * Database query functions — atomic save/load plus ports, goods, market, and player inventory.
 *
 * saveGameStateAtomic() writes to game_state (upsert) and saves_history
 * in a single better-sqlite3 transaction. If either statement fails,
 * both roll back — guaranteeing ACID consistency.
 *
 * loadGameState() returns the parsed GameState from the single game_state
 * row, or null if no save exists yet.
 *
 * Seed functions use INSERT OR IGNORE so re-runs (on every app launch) are safe.
 */

import type Database from 'better-sqlite3';
import type { GameState } from '../../game/types';
import type { Port, Good, MarketGood, PlayerInventory, CargoItem } from '../../shared/game-types';

// ─── Game State ──────────────────────────────────────────────────────────────

/**
 * Persist game state atomically.
 * Writes to both game_state (single-row upsert) and saves_history (append).
 * Throws if state cannot be serialized or DB write fails.
 */
export function saveGameStateAtomic(db: Database.Database, state: GameState): void {
  const stateJson = JSON.stringify(state);

  const atomicSave = db.transaction(() => {
    // Upsert into game_state — always id=1, so only one row ever exists.
    db.prepare(`
      INSERT INTO game_state (id, state_json, saved_at)
      VALUES (1, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        state_json = excluded.state_json,
        saved_at   = excluded.saved_at
    `).run(stateJson);

    // Append to saves_history for audit trail.
    db.prepare(`
      INSERT INTO saves_history (state_json, saved_at)
      VALUES (?, datetime('now'))
    `).run(stateJson);
  });

  atomicSave();
}

/**
 * Load the most recent saved game state.
 * Returns null if no save exists yet (first launch).
 */
export function loadGameState(db: Database.Database): GameState | null {
  const row = db.prepare('SELECT state_json FROM game_state WHERE id = 1').get() as
    | { state_json: string }
    | undefined;

  if (!row) {
    return null;
  }

  return JSON.parse(row.state_json) as GameState;
}

// ─── Ports ────────────────────────────────────────────────────────────────────

/**
 * Seed 25 historically accurate Mediterranean ports.
 * INSERT OR IGNORE — safe to call on every app launch.
 */
export function seedPorts(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO ports (id, ancient_name, modern_name, lat, lng, region, description, pleiades_id, cultural_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Backfill cultural_description on rows already inserted (INSERT OR IGNORE won't update them)
  const upsertCultural = db.prepare(`
    UPDATE ports SET cultural_description = ? WHERE id = ? AND (cultural_description IS NULL OR cultural_description = '')
  `);

  // [id, ancient_name, modern_name, lat, lng, region, description, pleiades_id, cultural_description]
  const ports: Array<[string, string, string, number, number, string, string, string, string]> = [
    ['athens',     'Athenai',     'Athens',     37.97, 23.73, 'greece',
      'The intellectual heart of the ancient world. Athens exported olive oil, pottery, and silver while importing grain from the Black Sea region.',
      '579885',
      "Piraeus was Athens' busy seaport, three miles from the city itself. Silver mined from the Laurion hills nearby paid for Athens' famous trireme warships and filled its treasury. Olive oil, fine pottery, and Athenian silver coins bearing the owl of Athena traveled the Mediterranean from this harbor."],
    ['corinth',    'Korinthos',   'Corinth',    37.94, 22.93, 'greece',
      'A wealthy commercial city controlling two seas via its famous portage road (diolkos). Renowned for bronze works and fine pottery.',
      '570182',
      "Corinth sat astride the narrow isthmus connecting mainland Greece to the Peloponnese, controlling overland trade between the Aegean and Adriatic seas. Ships were hauled across the diolkos, a stone-paved portage road, to avoid the dangerous voyage around Cape Malea. The city grew fabulously rich on these tolls and on its famous Corinthian bronze and painted pottery."],
    ['sparta',     'Sparte',      'Sparta',     37.08, 22.43, 'greece',
      'The dominant land power of Greece, Sparta was less commercially active than Athens but traded iron tools and slaves through Lakonian ports.',
      '570685',
      "Unlike commercial Athens, Sparta was an agrarian military state that discouraged its citizens from engaging in trade. Yet Spartan iron — fashioned into the distinctive iron spits used as primitive currency — circulated widely. Sparta's control of the fertile Eurotas valley and its helot slave-farmers made it a formidable power that Athens could never ignore."],
    ['miletos',    'Miletos',     'Miletus',    37.53, 27.28, 'greece',
      'Once the greatest Greek city in Asia Minor, Miletos controlled trade routes to the Black Sea and Persia. Famous for wool textiles and philosophy.',
      '599799',
      "Miletos founded over 90 colonies along the Black Sea coast, making it the most prolific colonizing city in the Greek world. Its harbor gave access to grain from the Pontic steppes, timber from Thrace, and luxury goods from Persia and Lydia. The city also produced some of antiquity's greatest thinkers, including Thales, Anaximander, and Anaximenes — the first philosophers to seek natural explanations for the world."],
    ['ephesos',    'Ephesos',     'Ephesus',    37.94, 27.34, 'greece',
      'Home to the Temple of Artemis, one of the Seven Wonders of the ancient world. A major Aegean port trading in grain, wine, and luxury goods.',
      '599612',
      "The Temple of Artemis at Ephesos was four times larger than the Parthenon, attracting pilgrims and merchants from across the ancient world. The city grew wealthy as a commercial hub where Greek, Persian, and Lydian cultures intersected. Merchants trading in grain, wine, textiles, and spices from the East passed through its famous harbor, and the city became one of the largest in the Roman Empire."],
    ['byzantion',  'Byzantion',   'Istanbul',   41.02, 28.97, 'greece',
      'Guardian of the Bosphorus strait, Byzantion collected tolls on all Black Sea trade including grain shipments vital to Athens and Rome.',
      '520985',
      "Byzantion occupied a peninsula of extraordinary strategic value — the only passage between the Black Sea and the Aegean. Every ship carrying Black Sea grain to feed the cities of Greece and later Rome had to pass its walls. The city grew rich on tolls and on control of the abundant fish (tuna in particular) that ran through the Bosphorus straits each season."],
    ['rhodes',     'Rhodos',      'Rhodes',     36.44, 28.22, 'greece',
      'A maritime powerhouse whose Rhodian Sea Law influenced Roman and later European maritime codes. Famous for the Colossus and fine wines.',
      '590031',
      "Rhodes was the great neutral trading state of the Hellenistic Mediterranean, keeping its harbors open to merchants of every faction. Rhodian sailors were renowned navigators and their sea law — which provided for shipwreck salvage, maritime loans, and cargo insurance — was adopted by Roman courts and later formed the foundation of European maritime law. The Colossus, a giant bronze statue of Helios, once stood beside the harbor entrance."],
    ['knossos',    'Knossos',     'Heraklion',  35.30, 25.16, 'greece',
      'The ancient center of Minoan civilization, Crete was a crucial waypoint for trade between Greece, Egypt, and the Levant.',
      '589872',
      "Knossos was the palace-city at the heart of the Minoan civilization, which flourished from around 2000 to 1450 BCE. The Minoans were the Mediterranean's first great seafaring traders, exchanging Cretan wine, olive oil, and fine pottery for Egyptian gold and Levantine tin. Though the Minoan palace was long in ruins by classical times, Crete remained a rich island strategically placed on routes between Greece, Egypt, and the Levant."],
    ['syracuse',   'Syrakousai',  'Syracuse',   37.07, 15.29, 'italy',
      'The largest Greek city in the western Mediterranean. Syracuse controlled grain trade in Sicily and rivaled even Athens in wealth and power.',
      '462503',
      "Syracuse was founded by Corinthian settlers around 734 BCE and grew to become the most powerful Greek city in the west. Its great double harbor could shelter hundreds of warships, and Sicilian grain — grown on the island's fertile volcanic soil — made it one of the wealthiest cities in the ancient world. When Athens sent a massive fleet to conquer Syracuse in 415 BCE, the Syracusans destroyed it utterly, turning the tide of the Peloponnesian War."],
    ['massalia',   'Massalia',    'Marseille',  43.30,  5.37, 'italy',
      'A Greek colony that became the gateway to Celtic Gaul and Iberia. Massalia traded Mediterranean wine and olive oil for Gallic tin and amber.',
      '148107',
      "Massalia was founded by Greek settlers from Phocaea around 600 BCE at the mouth of the Rhone River, giving Mediterranean traders direct access to the Celtic heartland of Gaul. The Greeks exchanged wine, olive oil, and fine pottery for Gallic tin, amber from the Baltic, and slaves. Celtic aristocrats adopted the Greek custom of wine-drinking and became devoted customers, driving a trade network that reached as far as Cornwall and Denmark."],
    ['taras',      'Taras',       'Taranto',    40.47, 17.24, 'italy',
      'The only Spartan colony, Taras was a major producer of purple dye and fine wool. Its excellent harbor made it a hub for Adriatic trade.',
      '442782',
      "Taras was the sole colony founded by Sparta, established around 706 BCE by a group of Spartans born outside of wedlock who were denied citizen rights. The city grew rich on purple dye extracted from murex sea-snails found abundantly in the bay, and on the fine wool of sheep raised in the surrounding countryside. Its magnificent harbor made it the leading port of the heel of Italy, controlling trade routes through the Adriatic."],
    ['ostia',      'Ostia',       'Ostia',      41.75, 12.29, 'italy',
      'The port city of Rome itself. As Rome grew, Ostia became the vital throat through which grain from Egypt and Africa fed the capital.',
      '422995',
      "Ostia, at the mouth of the Tiber River, served as the harbor of Rome. As the capital's population grew to over a million people, Ostia became the critical logistics hub through which Egyptian grain flowed to feed the city. Warehouses, merchants' guilds, baths, and temples lined its streets, making Ostia a cosmopolitan city of merchants from every corner of the empire."],
    ['carthage',   'Karchedon',   'Carthage',   36.86, 10.32, 'north_africa',
      'The great Phoenician trading empire that dominated the western Mediterranean until its destruction by Rome in 146 BCE. Traded in grain, purple dye, and metals.',
      '314921',
      "Carthage was founded by Phoenician settlers from Tyre around 814 BCE and grew to control trade throughout the western Mediterranean — Spain, Sardinia, Sicily, and the North African coast. Carthaginian sailors reached the Atlantic coast of Africa and possibly Britain. The city's destruction by Rome in 146 BCE at the end of the Third Punic War was one of antiquity's most deliberate acts of erasure."],
    ['utica',      'Utika',       'Utique',     37.06,  9.86, 'north_africa',
      'The oldest Phoenician settlement in North Africa, predating Carthage. Utica remained an important agricultural and trading port throughout the ancient period.',
      '315247',
      "Utica claimed to have been founded by Phoenicians from Tyre around 1100 BCE, making it older than Carthage itself. Though overshadowed by its more powerful neighbor, Utica remained an important port and agricultural center throughout the ancient period. When Carthage fell to Rome in 146 BCE, Utica cooperated with the Romans and was rewarded with control of the surrounding territory, becoming the capital of the new Roman province of Africa."],
    ['leptis',     'Lepcis Magna','Khoms',      32.64, 14.29, 'north_africa',
      'A major Phoenician and later Roman port on the Libyan coast. Leptis exported grain, olive oil, and wild animals captured for Roman arena games.',
      '344448',
      "Lepcis Magna was founded by Phoenician traders from Tyre on the fertile coastal plain of what is now Libya. The city exported North African grain, olive oil from the local groves, and exotic animals — lions, leopards, and elephants — captured in the interior for Roman arena spectacles. The city reached its greatest glory under the emperor Septimius Severus, himself a native son, who lavished it with magnificent marble monuments."],
    ['alexandria', 'Alexandreia', 'Alexandria', 31.20, 29.91, 'egypt',
      "Founded by Alexander the Great, Alexandria became the greatest trading city of the Hellenistic world. Its famous lighthouse guided ships to Egypt's grain wealth.",
      '727070',
      "Alexandria was founded by Alexander the Great in 331 BCE and swiftly grew to become the greatest city of the Hellenistic world. Its famous Pharos Lighthouse — one of the Seven Wonders — stood over 100 meters tall and guided sailors to Egypt's grain-rich harbors. The Library of Alexandria held scrolls from every corner of the known world. Egyptian grain, papyrus, linen, and luxury goods flowed outward while the city absorbed merchants and scholars from Greece, Persia, and beyond."],
    ['naukratis',  'Naukratis',   'Kom Geif',   30.89, 30.60, 'egypt',
      'The only Greek trading post permitted in Egypt during the Archaic period. Greek merchants exchanged silver and wine for Egyptian grain, papyrus, and linen.',
      '727199',
      "Naukratis was the only Greek emporion officially permitted in Egypt during the Archaic period, established by the pharaoh Amasis around 570 BCE. Greek merchants — primarily from Miletos, Aegina, and the islands — were required to conduct all their Egyptian trade through this single port. They exchanged Aegean silver, wine, and olive oil for Egyptian grain, papyrus, fine linen, and luxury goods that came up the Nile from sub-Saharan Africa and Arabia."],
    ['memphis',    'Memphis',     'Mit Rahina', 29.84, 31.25, 'egypt',
      'Ancient capital of Egypt and center of the Nile trade network. Memphis was where Nile grain was gathered before shipment north to the Mediterranean.',
      '786022',
      "Memphis was the ancient capital of Egypt for much of the Pharaonic period, situated at the apex of the Nile delta where river traffic from Upper Egypt met the branching channels leading north to the Mediterranean. The city was sacred to Ptah, craftsman of the gods, and housed vast grain warehouses where the produce of the Nile valley was collected, taxed, and redistributed. In classical times Memphis remained an important commercial and religious center, home to a large community of Greek and Phoenician merchants."],
    ['tyre',       'Tyros',       'Tyre',       33.27, 35.20, 'levant',
      "The master city of Phoenician trade and navigation. Tyre's merchant sailors founded colonies from Carthage to Cadiz and monopolized the trade in purple dye.",
      '678437',
      "Tyre was built on an island just off the Levantine coast, making it nearly impregnable — it withstood a 13-year siege by Nebuchadnezzar and later required Alexander the Great to build a causeway to finally capture it. Tyrian merchants dominated Mediterranean trade for centuries, founding colonies as far west as Cadiz. Above all, Tyre controlled the production of Tyrian purple — the most prestigious dye in the ancient world, extracted from murex sea-snails and worth more than its weight in gold."],
    ['sidon',      'Sidon',       'Sidon',      33.56, 35.37, 'levant',
      'Sidon rivaled Tyre as a Phoenician trading center. Its craftsmen were famous for fine glassware and purple-dyed textiles exported across the Mediterranean.',
      '678405',
      "Sidon was one of the oldest and most important Phoenician cities, perhaps the original home of the purple-dyeing industry. Its craftsmen were renowned throughout the ancient world for extraordinary blown glass — the technique of glassblowing was likely invented in the Sidon-Tyre region. Homer's heroes prized Sidonian silver bowls as the greatest of prizes, and the city's purple-dyed textiles were worn by kings and priests from Egypt to Persia."],
    ['byblos',     'Byblos',      'Jbeil',      34.12, 35.64, 'levant',
      "One of the world's oldest continuously inhabited cities. Byblos was the primary exporter of Lebanese cedar timber, crucial for shipbuilding in Egypt and Greece.",
      '678063',
      "Byblos is one of the world's oldest continuously inhabited cities, with settlement stretching back before 5000 BCE. Its greatest export was Lebanese cedar — tall, straight, fragrant timber from the mountain forests — essential for shipbuilding in the treeless lands of Egypt and later Greece. The Egyptians depicted the timber trade with Byblos in royal inscriptions as a matter of state necessity. The Greek word for papyrus scroll, byblos, came from this city's name, as Egypt's papyrus reached Greece through this port."],
    ['kition',     'Kition',      'Larnaca',    34.91, 33.64, 'levant',
      "A Phoenician city on Cyprus that controlled the island's rich copper mines. Kition was the meeting point of Greek and Near Eastern trade in the eastern Mediterranean.",
      '707498',
      "Cyprus sat at the crossroads of the eastern Mediterranean, within reach of Egypt, the Levant, Anatolia, and Greece. Kition, the major Phoenician city on the island, controlled access to Cyprus's extraordinary copper deposits — so abundant that the very name of the metal in European languages derives from the island's name. The philosopher Zeno of Citium, founder of the Stoic school of philosophy, was born here around 334 BCE."],
    ['salamis_cy', 'Salamis',     'Famagusta',  35.18, 33.90, 'levant',
      "The most important Greek city on Cyprus, Salamis exported the island's famous copper (the word 'copper' derives from Cyprus). A key waypoint for ships to Egypt and the Levant.",
      '707611',
      "Salamis on Cyprus was the island's principal Greek city, founded according to legend by the hero Teucer after the Trojan War. The city's harbor made it the natural stopping point for ships traveling between the Aegean and Egypt or the Levant. Cypriot copper — smelted from ores mined in the island's hills — was a crucial commodity in the ancient world's bronze-working industries, and the island's name became the word for copper throughout the Roman world."],
    ['emporion',   'Emporion',    'Empuries',   42.13,  3.12, 'iberia',
      'A Greek colonial trading post on the Iberian coast. Emporion traded Mediterranean goods with Celtic Iberian tribes, gaining access to Spanish silver, tin, and iron.',
      '246347',
      "Emporion, whose name simply means 'trading post' in Greek, was founded by settlers from Massalia around 575 BCE as the most distant Greek outpost on the Iberian coast. The city was physically divided in two — a Greek quarter and an adjacent native Iberian town — reflecting the cultural exchange at its heart. Greek merchants exchanged wine, olive oil, and fine pottery for the extraordinary mineral wealth of the Iberian Peninsula: silver from the mountains, tin from Galicia, and iron ore that would eventually supply Roman legions."],
    ['gadir',      'Gadir',       'Cadiz',      36.53, -6.30, 'iberia',
      'A Phoenician colony at the edge of the known world, guarding the straits of Gibraltar. Gadir traded in Atlantic tin, silver, and the famous Spanish fish sauce (garum).',
      '256177',
      "Gadir was founded by Phoenicians from Tyre around 1100 BCE, making it one of the oldest continuously inhabited cities in western Europe. It stood at the very edge of the known world, just beyond the Pillars of Hercules (Gibraltar) — the boundary the ancients believed marked the end of the civilized Mediterranean. From here, Phoenician and later Carthaginian sailors ventured into the Atlantic to trade for Cornish tin and West African gold. Gadir also produced garum, the pungent fermented fish sauce that Romans used as a condiment on virtually everything."],
  ];

  const seedAll = db.transaction(() => {
    for (const port of ports) {
      insert.run(...port);
      // Backfill cultural_description for rows already in DB from prior launches
      upsertCultural.run(port[8], port[0]);
    }
  });

  seedAll();
}

/**
 * Get all ports from the database.
 */
export function getAllPorts(db: Database.Database): Port[] {
  const rows = db.prepare('SELECT * FROM ports').all() as Array<{
    id: string;
    ancient_name: string;
    modern_name: string;
    lat: number;
    lng: number;
    region: string;
    description: string;
    pleiades_id: string | null;
    cultural_description: string | null;
  }>;

  return rows.map(r => ({
    id: r.id,
    ancientName: r.ancient_name,
    modernName: r.modern_name,
    lat: r.lat,
    lng: r.lng,
    region: r.region as Port['region'],
    description: r.description,
    pleiadesId: r.pleiades_id ?? undefined,
    culturalDescription: r.cultural_description ?? undefined,
  }));
}

/**
 * Get a single port by ID. Returns null if not found.
 */
export function getPortById(db: Database.Database, id: string): Port | null {
  const row = db.prepare('SELECT * FROM ports WHERE id = ?').get(id) as {
    id: string;
    ancient_name: string;
    modern_name: string;
    lat: number;
    lng: number;
    region: string;
    description: string;
    pleiades_id: string | null;
    cultural_description: string | null;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    ancientName: row.ancient_name,
    modernName: row.modern_name,
    lat: row.lat,
    lng: row.lng,
    region: row.region as Port['region'],
    description: row.description,
    pleiadesId: row.pleiades_id ?? undefined,
    culturalDescription: row.cultural_description ?? undefined,
  };
}

// ─── Goods ────────────────────────────────────────────────────────────────────

/**
 * Seed 8 tradeable goods.
 * INSERT OR IGNORE — safe to call on every app launch.
 */
export function seedGoods(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO goods (id, name, base_price, description)
    VALUES (?, ?, ?, ?)
  `);

  const goods: Array<[string, string, number, string]> = [
    ['wheat',     'Wheat',     80,  'The staple grain of the ancient world. Egypt and Sicily were the great breadbaskets that fed Mediterranean cities.'],
    ['olive_oil', 'Olive Oil', 120, 'Essential for cooking, lighting, and hygiene. Greece and Italy produced the finest grades, traded across the entire Mediterranean.'],
    ['wine',      'Wine',      100, 'The universal drink of the ancient world, mixed with water. Greek and Italian wines commanded premium prices in barbarian markets.'],
    ['textiles',  'Textiles',  150, 'Fine woven cloth was a luxury good. Levantine purple-dyed textiles and Egyptian linen fetched the highest prices.'],
    ['spices',    'Spices',    200, 'Aromatic spices from Arabia and India, traded through Levantine ports. Pepper, cinnamon, and frankincense were worth their weight in silver.'],
    ['bronze',    'Bronze',    180, 'The primary metal for tools, weapons, and decorative arts. Cyprus (meaning copper) was the ancient world\'s leading source.'],
    ['timber',    'Timber',    90,  'Quality shipbuilding timber was scarce in the Mediterranean. Lebanese cedar and Macedonian pine were prized by Egypt, Greece, and Phoenicia alike.'],
    ['pottery',   'Pottery',   60,  'Fine painted pottery from Athens and Corinth served as both luxury goods and practical containers for transporting wine and oil.'],
  ];

  const seedAll = db.transaction(() => {
    for (const good of goods) {
      insert.run(...good);
    }
  });

  seedAll();
}

// ─── Port Inventory ──────────────────────────────────────────────────────────

/**
 * Seed port inventory defaults (supply and demand per region).
 * INSERT OR IGNORE — safe to call on every app launch.
 */
export function seedPortInventory(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO port_inventory (port_id, good_id, supply, demand)
    VALUES (?, ?, ?, ?)
  `);

  // Regional supply/demand patterns based on historical trade specialization.
  // supply = units produced per turn; demand = units consumed per turn
  // High supply relative to demand → low price; high demand relative to supply → high price
  const inventoryByPort: Record<string, Array<[string, number, number]>> = {
    // Greece region — wine, olive oil, pottery surplus; grain deficit
    'athens':    [['wheat', 3, 8], ['olive_oil', 10, 4], ['wine', 10, 5], ['textiles', 3, 6], ['spices', 2, 5], ['bronze', 4, 6], ['timber', 3, 7], ['pottery', 8, 4]],
    'corinth':   [['wheat', 3, 7], ['olive_oil', 8, 4], ['wine', 8, 5], ['textiles', 4, 6], ['spices', 2, 4], ['bronze', 5, 5], ['timber', 3, 6], ['pottery', 9, 4]],
    'sparta':    [['wheat', 4, 6], ['olive_oil', 6, 4], ['wine', 5, 5], ['textiles', 4, 5], ['spices', 1, 4], ['bronze', 3, 6], ['timber', 5, 5], ['pottery', 4, 5]],
    'miletos':   [['wheat', 4, 7], ['olive_oil', 7, 4], ['wine', 6, 5], ['textiles', 8, 4], ['spices', 3, 5], ['bronze', 4, 5], ['timber', 3, 6], ['pottery', 7, 4]],
    'ephesos':   [['wheat', 3, 7], ['olive_oil', 8, 4], ['wine', 7, 5], ['textiles', 7, 4], ['spices', 4, 5], ['bronze', 4, 5], ['timber', 3, 6], ['pottery', 6, 4]],
    'byzantion': [['wheat', 5, 8], ['olive_oil', 6, 5], ['wine', 8, 5], ['textiles', 5, 5], ['spices', 3, 5], ['bronze', 5, 5], ['timber', 4, 6], ['pottery', 5, 4]],
    'rhodes':    [['wheat', 3, 7], ['olive_oil', 9, 4], ['wine', 10, 4], ['textiles', 4, 6], ['spices', 4, 5], ['bronze', 4, 5], ['timber', 3, 6], ['pottery', 7, 4]],
    'knossos':   [['wheat', 5, 6], ['olive_oil', 9, 4], ['wine', 9, 4], ['textiles', 4, 6], ['spices', 3, 5], ['bronze', 4, 5], ['timber', 4, 6], ['pottery', 7, 4]],

    // Italy/Sicily region — wine, pottery, timber surplus
    'syracuse':  [['wheat', 10, 5], ['olive_oil', 7, 5], ['wine', 12, 4], ['textiles', 4, 6], ['spices', 2, 5], ['bronze', 4, 5], ['timber', 8, 4], ['pottery', 9, 4]],
    'massalia':  [['wheat', 6, 6], ['olive_oil', 6, 5], ['wine', 10, 4], ['textiles', 5, 6], ['spices', 3, 5], ['bronze', 5, 5], ['timber', 7, 5], ['pottery', 7, 5]],
    'taras':     [['wheat', 7, 6], ['olive_oil', 8, 4], ['wine', 9, 4], ['textiles', 6, 5], ['spices', 2, 5], ['bronze', 5, 5], ['timber', 7, 4], ['pottery', 8, 4]],
    'ostia':     [['wheat', 4, 12], ['olive_oil', 5, 8], ['wine', 6, 9], ['textiles', 4, 8], ['spices', 3, 8], ['bronze', 5, 7], ['timber', 6, 8], ['pottery', 6, 6]],

    // North Africa — grain and textiles surplus
    'carthage':  [['wheat', 8, 5], ['olive_oil', 5, 6], ['wine', 2, 7], ['textiles', 6, 5], ['spices', 3, 6], ['bronze', 4, 6], ['timber', 3, 7], ['pottery', 4, 5]],
    'utica':     [['wheat', 7, 5], ['olive_oil', 5, 5], ['wine', 2, 6], ['textiles', 5, 5], ['spices', 2, 5], ['bronze', 3, 5], ['timber', 3, 6], ['pottery', 4, 5]],
    'leptis':    [['wheat', 8, 4], ['olive_oil', 6, 5], ['wine', 2, 6], ['textiles', 5, 5], ['spices', 3, 6], ['bronze', 3, 5], ['timber', 2, 7], ['pottery', 4, 5]],

    // Egypt — grain and textiles heavy surplus; wine/olive oil deficit
    'alexandria':[['wheat', 15, 4], ['olive_oil', 3, 8], ['wine', 2, 9], ['textiles', 8, 5], ['spices', 5, 6], ['bronze', 4, 6], ['timber', 2, 9], ['pottery', 5, 5]],
    'naukratis': [['wheat', 12, 4], ['olive_oil', 3, 7], ['wine', 3, 8], ['textiles', 7, 5], ['spices', 4, 5], ['bronze', 3, 5], ['timber', 2, 8], ['pottery', 5, 5]],
    'memphis':   [['wheat', 14, 4], ['olive_oil', 3, 7], ['wine', 2, 8], ['textiles', 9, 5], ['spices', 4, 5], ['bronze', 3, 5], ['timber', 2, 8], ['pottery', 4, 5]],

    // Levant — textiles, spices, timber surplus; grain moderate
    'tyre':      [['wheat', 3, 7], ['olive_oil', 4, 6], ['wine', 3, 7], ['textiles', 10, 4], ['spices', 8, 4], ['bronze', 5, 5], ['timber', 7, 5], ['pottery', 5, 5]],
    'sidon':     [['wheat', 3, 7], ['olive_oil', 4, 6], ['wine', 3, 7], ['textiles', 9, 4], ['spices', 7, 4], ['bronze', 5, 5], ['timber', 6, 5], ['pottery', 5, 5]],
    'byblos':    [['wheat', 3, 6], ['olive_oil', 4, 6], ['wine', 3, 7], ['textiles', 7, 5], ['spices', 6, 5], ['bronze', 4, 5], ['timber', 10, 4], ['pottery', 4, 5]],
    'kition':    [['wheat', 3, 6], ['olive_oil', 5, 5], ['wine', 4, 6], ['textiles', 7, 4], ['spices', 6, 4], ['bronze', 8, 4], ['timber', 5, 5], ['pottery', 5, 5]],
    'salamis_cy':[['wheat', 4, 6], ['olive_oil', 5, 5], ['wine', 5, 6], ['textiles', 7, 4], ['spices', 5, 5], ['bronze', 8, 4], ['timber', 4, 5], ['pottery', 5, 5]],

    // Iberia — bronze and timber surplus; wine moderate
    'emporion':  [['wheat', 5, 6], ['olive_oil', 5, 6], ['wine', 5, 5], ['textiles', 4, 7], ['spices', 2, 6], ['bronze', 8, 4], ['timber', 10, 4], ['pottery', 4, 5]],
    'gadir':     [['wheat', 5, 6], ['olive_oil', 5, 6], ['wine', 5, 5], ['textiles', 4, 7], ['spices', 2, 6], ['bronze', 8, 4], ['timber', 10, 4], ['pottery', 4, 5]],
  };

  const seedAll = db.transaction(() => {
    for (const [portId, goods] of Object.entries(inventoryByPort)) {
      for (const [goodId, supply, demand] of goods) {
        insert.run(portId, goodId, supply, demand);
      }
    }
  });

  seedAll();
}

/**
 * Get market prices for a port — joins port_inventory with goods and calculates price.
 */
export function getMarketPrices(db: Database.Database, portId: string): MarketGood[] {
  const rows = db.prepare(`
    SELECT
      g.id, g.name, g.base_price, g.description,
      pi.port_id, pi.supply, pi.demand
    FROM port_inventory pi
    JOIN goods g ON g.id = pi.good_id
    WHERE pi.port_id = ?
    ORDER BY g.name
  `).all(portId) as Array<{
    id: string;
    name: string;
    base_price: number;
    description: string;
    port_id: string;
    supply: number;
    demand: number;
  }>;

  return rows.map(r => {
    // Price formula: base × (1 + (demand - supply) × 0.02), capped ±50%
    const delta = r.demand - r.supply;
    const multiplier = 1 + delta * 0.02;
    const currentPrice = Math.round(
      Math.max(r.base_price * 0.5, Math.min(r.base_price * 1.5, r.base_price * multiplier))
    );
    return {
      id: r.id,
      name: r.name,
      basePrice: r.base_price,
      description: r.description,
      portId: r.port_id,
      supply: r.supply,
      demand: r.demand,
      currentPrice,
    };
  });
}

// ─── Player Inventory ────────────────────────────────────────────────────────

/**
 * Get the player's current inventory.
 * Returns defaults (gold=500, empty cargo) if no row exists yet.
 */
export function getPlayerInventory(db: Database.Database): PlayerInventory {
  const row = db.prepare('SELECT * FROM player_inventory WHERE id = 1').get() as {
    id: number;
    gold: number;
    cargo_capacity: number;
    cargo_json: string;
  } | undefined;

  if (!row) {
    return { gold: 500, cargoItems: [], cargoCapacity: 50, currentCargo: 0 };
  }

  const cargoItems = JSON.parse(row.cargo_json) as CargoItem[];
  const currentCargo = cargoItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    gold: row.gold,
    cargoItems,
    cargoCapacity: row.cargo_capacity,
    currentCargo,
  };
}

/**
 * Upsert the player's inventory (always uses id=1 row).
 */
export function updatePlayerInventory(db: Database.Database, inventory: PlayerInventory): void {
  const cargoJson = JSON.stringify(inventory.cargoItems);
  db.prepare(`
    INSERT INTO player_inventory (id, gold, cargo_capacity, cargo_json)
    VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      gold           = excluded.gold,
      cargo_capacity = excluded.cargo_capacity,
      cargo_json     = excluded.cargo_json
  `).run(inventory.gold, inventory.cargoCapacity, cargoJson);
}

// ─── Trade Transactions ───────────────────────────────────────────────────────

/**
 * Calculate current price at a port for a given good using supply/demand formula.
 * delta = demand - supply; multiplier = 1 + delta * 0.02, capped ±50% of basePrice.
 */
function calcCurrentPrice(basePrice: number, supply: number, demand: number): number {
  const delta = demand - supply;
  const multiplier = 1 + delta * 0.02;
  return Math.round(
    Math.max(basePrice * 0.5, Math.min(basePrice * 1.5, basePrice * multiplier))
  );
}

/**
 * Buy a good at a port.
 * Atomic transaction: validates gold and cargo space, deducts gold, adds to cargo_json,
 * records in transaction_history. Throws with a user-readable message on validation failure.
 */
export function buyGood(
  db: Database.Database,
  portId: string,
  goodId: string,
  qty: number
): PlayerInventory {
  let result!: PlayerInventory;

  const tx = db.transaction(() => {
    // Validate quantity
    if (qty <= 0) throw new Error('Quantity must be at least 1');

    // Get current game state for turn number
    const stateRow = db.prepare('SELECT state_json FROM game_state WHERE id = 1').get() as
      | { state_json: string }
      | undefined;
    const turn: number = stateRow ? (JSON.parse(stateRow.state_json) as { currentTurn?: number }).currentTurn ?? 0 : 0;

    // Get port inventory for this good
    const piRow = db.prepare(
      'SELECT supply, demand FROM port_inventory WHERE port_id = ? AND good_id = ?'
    ).get(portId, goodId) as { supply: number; demand: number } | undefined;
    if (!piRow) throw new Error(`Good "${goodId}" not available at port "${portId}"`);

    // Get base price
    const goodRow = db.prepare('SELECT base_price FROM goods WHERE id = ?').get(goodId) as
      | { base_price: number }
      | undefined;
    if (!goodRow) throw new Error(`Unknown good: ${goodId}`);

    const pricePerUnit = calcCurrentPrice(goodRow.base_price, piRow.supply, piRow.demand);
    const totalCost = pricePerUnit * qty;

    // Load player inventory
    const invRow = db.prepare('SELECT * FROM player_inventory WHERE id = 1').get() as {
      id: number;
      gold: number;
      cargo_capacity: number;
      cargo_json: string;
    } | undefined;

    const gold = invRow?.gold ?? 500;
    const cargoCapacity = invRow?.cargo_capacity ?? 50;
    const cargoItems = invRow ? (JSON.parse(invRow.cargo_json) as CargoItem[]) : [];
    const currentCargo = cargoItems.reduce((s, i) => s + i.quantity, 0);

    // Validate funds
    if (gold < totalCost) {
      throw new Error(`Insufficient gold. Need ${totalCost}, have ${gold}.`);
    }

    // Validate cargo space
    if (currentCargo + qty > cargoCapacity) {
      const available = cargoCapacity - currentCargo;
      throw new Error(`Insufficient cargo space. Can carry ${available} more unit(s).`);
    }

    // Merge into cargo (add to existing stack or create new)
    const existingIdx = cargoItems.findIndex(
      (c) => c.goodId === goodId && c.boughtAtPort === portId && c.boughtAtPrice === pricePerUnit
    );
    if (existingIdx >= 0) {
      cargoItems[existingIdx] = {
        ...cargoItems[existingIdx],
        quantity: cargoItems[existingIdx].quantity + qty,
      };
    } else {
      cargoItems.push({ goodId, quantity: qty, boughtAtPrice: pricePerUnit, boughtAtPort: portId });
    }

    const newGold = gold - totalCost;
    const newCargoJson = JSON.stringify(cargoItems);

    // Update player inventory
    db.prepare(`
      INSERT INTO player_inventory (id, gold, cargo_capacity, cargo_json)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        gold       = excluded.gold,
        cargo_json = excluded.cargo_json
    `).run(newGold, cargoCapacity, newCargoJson);

    // Record transaction
    db.prepare(`
      INSERT INTO transaction_history (turn, port_id, good_id, action, quantity, price_per_unit, total_value)
      VALUES (?, ?, ?, 'buy', ?, ?, ?)
    `).run(turn, portId, goodId, qty, pricePerUnit, totalCost);

    // Update supply/demand: buying increases demand pressure (decrement supply)
    db.prepare(`
      UPDATE port_inventory
      SET supply = MAX(1, supply - 1)
      WHERE port_id = ? AND good_id = ?
    `).run(portId, goodId);

    const newCurrentCargo = cargoItems.reduce((s, i) => s + i.quantity, 0);
    result = { gold: newGold, cargoItems, cargoCapacity, currentCargo: newCurrentCargo };
  });

  tx();
  return result;
}

/**
 * Sell a good at a port.
 * Atomic transaction: validates cargo quantity, adds gold, removes from cargo_json,
 * records in transaction_history. Throws with a user-readable message on validation failure.
 */
export function sellGood(
  db: Database.Database,
  portId: string,
  goodId: string,
  qty: number
): PlayerInventory {
  let result!: PlayerInventory;

  const tx = db.transaction(() => {
    // Validate quantity
    if (qty <= 0) throw new Error('Quantity must be at least 1');

    // Get current game state for turn number
    const stateRow = db.prepare('SELECT state_json FROM game_state WHERE id = 1').get() as
      | { state_json: string }
      | undefined;
    const turn: number = stateRow ? (JSON.parse(stateRow.state_json) as { currentTurn?: number }).currentTurn ?? 0 : 0;

    // Get port inventory for this good
    const piRow = db.prepare(
      'SELECT supply, demand FROM port_inventory WHERE port_id = ? AND good_id = ?'
    ).get(portId, goodId) as { supply: number; demand: number } | undefined;
    if (!piRow) throw new Error(`Good "${goodId}" not available at port "${portId}"`);

    // Get base price
    const goodRow = db.prepare('SELECT base_price FROM goods WHERE id = ?').get(goodId) as
      | { base_price: number }
      | undefined;
    if (!goodRow) throw new Error(`Unknown good: ${goodId}`);

    const pricePerUnit = calcCurrentPrice(goodRow.base_price, piRow.supply, piRow.demand);
    const totalRevenue = pricePerUnit * qty;

    // Load player inventory
    const invRow = db.prepare('SELECT * FROM player_inventory WHERE id = 1').get() as {
      id: number;
      gold: number;
      cargo_capacity: number;
      cargo_json: string;
    } | undefined;

    const gold = invRow?.gold ?? 500;
    const cargoCapacity = invRow?.cargo_capacity ?? 50;
    const cargoItems = invRow ? (JSON.parse(invRow.cargo_json) as CargoItem[]) : [];

    // Validate cargo has enough of this good
    const totalOwned = cargoItems
      .filter((c) => c.goodId === goodId)
      .reduce((s, c) => s + c.quantity, 0);

    if (totalOwned < qty) {
      throw new Error(`Not enough ${goodId} to sell. Have ${totalOwned}, trying to sell ${qty}.`);
    }

    // Remove from cargo — FIFO across stacks
    let remaining = qty;
    const newCargoItems: CargoItem[] = [];
    for (const item of cargoItems) {
      if (item.goodId === goodId && remaining > 0) {
        if (item.quantity <= remaining) {
          remaining -= item.quantity;
          // Drop entire stack
        } else {
          newCargoItems.push({ ...item, quantity: item.quantity - remaining });
          remaining = 0;
        }
      } else {
        newCargoItems.push(item);
      }
    }

    const newGold = gold + totalRevenue;
    const newCargoJson = JSON.stringify(newCargoItems);

    // Update player inventory
    db.prepare(`
      INSERT INTO player_inventory (id, gold, cargo_capacity, cargo_json)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        gold       = excluded.gold,
        cargo_json = excluded.cargo_json
    `).run(newGold, cargoCapacity, newCargoJson);

    // Record transaction
    db.prepare(`
      INSERT INTO transaction_history (turn, port_id, good_id, action, quantity, price_per_unit, total_value)
      VALUES (?, ?, ?, 'sell', ?, ?, ?)
    `).run(turn, portId, goodId, qty, pricePerUnit, totalRevenue);

    // Update supply/demand: selling here increases supply
    db.prepare(`
      UPDATE port_inventory
      SET demand = MAX(1, demand - 1)
      WHERE port_id = ? AND good_id = ?
    `).run(portId, goodId);

    const newCurrentCargo = newCargoItems.reduce((s, i) => s + i.quantity, 0);
    result = { gold: newGold, cargoItems: newCargoItems, cargoCapacity, currentCargo: newCurrentCargo };
  });

  tx();
  return result;
}

// ─── Artifact Cache ───────────────────────────────────────────────────────────

/**
 * A museum artifact cached from the Met Museum API or Wikimedia Commons.
 * Rows expire after 24 hours (enforced by the TTL WHERE clause in getArtifactsForGood).
 */
export interface CachedArtifact {
  id: string;
  goodId: string;
  museumId: string;
  imageUrl: string;
  title: string;
  description: string;
  cacheTimestamp: string;
}

/**
 * Return cached artifacts for a trade good that were fetched within the last 24 hours.
 * Returns up to 3 results. Returns empty array on cache miss.
 */
export function getArtifactsForGood(db: Database.Database, goodId: string): CachedArtifact[] {
  return db.prepare(`
    SELECT id, good_id as goodId, museum_id as museumId, image_url as imageUrl,
           title, description, cache_timestamp as cacheTimestamp
    FROM artifact_cache
    WHERE good_id = ? AND datetime(cache_timestamp) > datetime('now', '-24 hours')
    LIMIT 3
  `).all(goodId) as CachedArtifact[];
}

/**
 * Insert or replace an artifact in the cache.
 * Uses INSERT OR REPLACE so re-fetching a good overwrites stale rows.
 */
export function cacheArtifact(db: Database.Database, artifact: CachedArtifact): void {
  db.prepare(`
    INSERT OR REPLACE INTO artifact_cache
      (id, good_id, museum_id, image_url, title, description, cache_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    artifact.id,
    artifact.goodId,
    artifact.museumId,
    artifact.imageUrl,
    artifact.title,
    artifact.description,
    artifact.cacheTimestamp,
  );
}

// ─── Trade Transactions — History ─────────────────────────────────────────────

/**
 * Get the last N transaction records (default 10), newest first.
 */
export function getTransactionHistory(
  db: Database.Database,
  limit = 10
): import('../../shared/game-types').TransactionRecord[] {
  const rows = db.prepare(`
    SELECT id, turn, port_id, good_id, action, quantity, price_per_unit, total_value
    FROM transaction_history
    ORDER BY id DESC
    LIMIT ?
  `).all(limit) as Array<{
    id: number;
    turn: number;
    port_id: string;
    good_id: string;
    action: 'buy' | 'sell';
    quantity: number;
    price_per_unit: number;
    total_value: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    turn: r.turn,
    portId: r.port_id,
    goodId: r.good_id,
    action: r.action,
    quantity: r.quantity,
    pricePerUnit: r.price_per_unit,
    totalValue: r.total_value,
  }));
}
