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
import type { Port, Good, MarketGood, PlayerInventory, CargoItem, JournalEntry, JournalEntryType, PortLore } from '../../shared/game-types';
import { getReputationTier, getReputationPriceModifier, getTradeReputationGain, applyReputationToPrice } from '../../game/reputation';

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
    INSERT OR IGNORE INTO ports (id, ancient_name, modern_name, lat, lng, region, description, pleiades_id, cultural_description, ambient_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Backfill cultural_description on rows already inserted (INSERT OR IGNORE won't update them)
  const upsertCultural = db.prepare(`
    UPDATE ports SET cultural_description = ? WHERE id = ? AND (cultural_description IS NULL OR cultural_description = '')
  `);

  // Backfill ambient_description on rows already inserted
  const upsertAmbient = db.prepare(`
    UPDATE ports SET ambient_description = ? WHERE id = ? AND (ambient_description IS NULL OR ambient_description = '')
  `);

  // [id, ancient_name, modern_name, lat, lng, region, description, pleiades_id, cultural_description, ambient_description]
  const ports: Array<[string, string, string, number, number, string, string, string, string, string]> = [
    ['athens',     'Athenai',     'Athens',     37.97, 23.73, 'greece',
      'The intellectual heart of the ancient world. Athens exported olive oil, pottery, and silver while importing grain from the Black Sea region.',
      '579885',
      "Piraeus was Athens' busy seaport, three miles from the city itself. Silver mined from the Laurion hills nearby paid for Athens' famous trireme warships and filled its treasury. Olive oil, fine pottery, and Athenian silver coins bearing the owl of Athena traveled the Mediterranean from this harbor.",
      "The three harbors of Piraeus bustle with longshoremen hauling amphorae of olive oil, the tang of pitch from caulked trireme hulls mingling with roasting barley from dockside cook-stalls."],
    ['corinth',    'Korinthos',   'Corinth',    37.94, 22.93, 'greece',
      'A wealthy commercial city controlling two seas via its famous portage road (diolkos). Renowned for bronze works and fine pottery.',
      '570182',
      "Corinth sat astride the narrow isthmus connecting mainland Greece to the Peloponnese, controlling overland trade between the Aegean and Adriatic seas. Ships were hauled across the diolkos, a stone-paved portage road, to avoid the dangerous voyage around Cape Malea. The city grew fabulously rich on these tolls and on its famous Corinthian bronze and painted pottery.",
      "Ox-teams strain at ropes dragging merchant vessels across the limestone diolkos while bronze-smiths hammer in the agora, the clang of metal ringing over the shouts of toll-collectors."],
    ['sparta',     'Sparte',      'Sparta',     37.08, 22.43, 'greece',
      'The dominant land power of Greece, Sparta was less commercially active than Athens but traded iron tools and slaves through Lakonian ports.',
      '570685',
      "Unlike commercial Athens, Sparta was an agrarian military state that discouraged its citizens from engaging in trade. Yet Spartan iron — fashioned into the distinctive iron spits used as primitive currency — circulated widely. Sparta's control of the fertile Eurotas valley and its helot slave-farmers made it a formidable power that Athens could never ignore.",
      "The small river port of Gytheion smells of iron slag and olive wood smoke. Perioikoi merchants handle the trade that Spartan citizens disdain, loading iron spits onto coastal boats."],
    ['miletos',    'Miletos',     'Miletus',    37.53, 27.28, 'greece',
      'Once the greatest Greek city in Asia Minor, Miletos controlled trade routes to the Black Sea and Persia. Famous for wool textiles and philosophy.',
      '599799',
      "Miletos founded over 90 colonies along the Black Sea coast, making it the most prolific colonizing city in the Greek world. Its harbor gave access to grain from the Pontic steppes, timber from Thrace, and luxury goods from Persia and Lydia. The city also produced some of antiquity's greatest thinkers, including Thales, Anaximander, and Anaximenes — the first philosophers to seek natural explanations for the world.",
      "The Lion Harbor is crowded with broad-beamed grain ships from the Pontic colonies. Bales of Milesian wool, dyed saffron and violet, are stacked along the quays beside amphorae of Lydian perfume."],
    ['ephesos',    'Ephesos',     'Ephesus',    37.94, 27.34, 'greece',
      'Home to the Temple of Artemis, one of the Seven Wonders of the ancient world. A major Aegean port trading in grain, wine, and luxury goods.',
      '599612',
      "The Temple of Artemis at Ephesos was rebuilt in the mid-sixth century BCE into one of the largest Greek sanctuaries. The city grew wealthy as a commercial hub where Greek, Persian, and Lydian cultures intersected. Merchants trading in grain, wine, textiles, and spices from the East passed through its famous harbor.",
      "Incense drifts from the great sanctuary of Artemis as pilgrims jostle merchants on the Sacred Way. The harbor reeks of fish and tar, with Lydian caravans unloading sacks of saffron and electrum ingots."],
    ['byzantion',  'Byzantion',   'Istanbul',   41.02, 28.97, 'greece',
      'Guardian of the Bosphorus strait, Byzantion collected tolls on all Black Sea trade including grain shipments vital to Athens and Rome.',
      '520985',
      "Byzantion occupied a peninsula of extraordinary strategic value — the only passage between the Black Sea and the Aegean. Every ship carrying Black Sea grain to feed the cities of Greece had to pass its walls. The city grew rich on tolls and on control of the abundant fish (tuna in particular) that ran through the Bosphorus straits each season.",
      "Currents churn where two seas meet, and the shouts of toll-collectors echo across the strait. Fishermen haul nets heavy with migrating tuna while grain freighters queue to pass the narrows."],
    ['rhodes',     'Rhodos',      'Rhodes',     36.44, 28.22, 'greece',
      'A maritime powerhouse whose Rhodian Sea Law influenced Roman and later European maritime codes. Famous for the Colossus and fine wines.',
      '590031',
      "Rhodes was the great neutral trading state of the Hellenistic Mediterranean, keeping its harbors open to merchants of every faction. Rhodian sailors were renowned navigators and their sea law — which provided for shipwreck salvage, maritime loans, and cargo insurance — was adopted by Roman courts and later formed the foundation of European maritime law. The Colossus, a giant bronze statue of Helios, once stood beside the harbor entrance.",
      "Sun-bleached quays line the triple harbors of Rhodes, fragrant with Rhodian wine spilling from cracked amphorae. Navigators from a dozen cities haggle over sea-charts while the smell of fresh pitch drifts from the shipyard."],
    ['knossos',    'Knossos',     'Heraklion',  35.30, 25.16, 'greece',
      'The ancient center of Minoan civilization, Crete was a crucial waypoint for trade between Greece, Egypt, and the Levant.',
      '589872',
      "Knossos was the palace-city at the heart of the Minoan civilization, which flourished from around 2000 to 1450 BCE. The Minoans were the Mediterranean's first great seafaring traders, exchanging Cretan wine, olive oil, and fine pottery for Egyptian gold and Levantine tin. Though the Minoan palace was long in ruins by classical times, Crete remained a rich island strategically placed on routes between Greece, Egypt, and the Levant.",
      "Cretan wine and olive oil fill the harbor warehouses of Herakleion, while goat bells echo from the hills above. The ruins of the ancient palace loom inland, half-buried under wild herbs whose scent carries on the sea breeze."],
    ['syracuse',   'Syrakousai',  'Syracuse',   37.07, 15.29, 'italy',
      'The largest Greek city in the western Mediterranean. Syracuse controlled grain trade in Sicily and rivaled even Athens in wealth and power.',
      '462503',
      "Syracuse was founded by Corinthian settlers around 734 BCE and grew to become the most powerful Greek city in the west. Its great double harbor could shelter hundreds of warships, and Sicilian grain — grown on the island's fertile volcanic soil — made it one of the wealthiest cities in the ancient world. When Athens sent a massive fleet to conquer Syracuse in 415 BCE, the Syracusans destroyed it utterly, turning the tide of the Peloponnesian War.",
      "The great harbor is thick with Sicilian grain barges, their crews shouting in Doric Greek. Volcanic soil from Etna darkens the docks, and the sweet smell of figs and fresh-baked bread drifts from the agora."],
    ['massalia',   'Massalia',    'Marseille',  43.30,  5.37, 'italy',
      'A Greek colony that became the gateway to Celtic Gaul and Iberia. Massalia traded Mediterranean wine and olive oil for Gallic tin and amber.',
      '148107',
      "Massalia was founded by Greek settlers from Phocaea around 600 BCE at the mouth of the Rhone River, giving Mediterranean traders direct access to the Celtic heartland of Gaul. The Greeks exchanged wine, olive oil, and fine pottery for Gallic tin, amber from the Baltic, and slaves. Celtic aristocrats adopted the Greek custom of wine-drinking and became devoted customers, driving a trade network that reached as far as Cornwall and Denmark.",
      "Celtic traders in woolen cloaks barter tin ingots and amber beads on the Phocaean quays. The mistral wind carries the scent of wild thyme from the limestone hills, mixing with wine fumes from the warehouse district."],
    ['taras',      'Taras',       'Taranto',    40.47, 17.24, 'italy',
      'The only Spartan colony, Taras was a major producer of purple dye and fine wool. Its excellent harbor made it a hub for Adriatic trade.',
      '442782',
      "Taras was the sole colony founded by Sparta, established around 706 BCE by a group of Spartans born outside of wedlock who were denied citizen rights. The city grew rich on purple dye extracted from murex sea-snails found abundantly in the bay, and on the fine wool of sheep raised in the surrounding countryside. Its magnificent harbor made it the leading port of the heel of Italy, controlling trade routes through the Adriatic.",
      "The acrid stench of murex shells rotting in stone vats mingles with lanolin from wool-packing sheds. Tarentine shepherds drive their flocks past the harbor as purple-stained workers hang dyed cloth to dry in the salt wind."],
    ['ostia',      'Ostia',       'Ostia',      41.75, 12.29, 'italy',
      'The port city of Rome itself. As Rome grew, Ostia became the vital throat through which grain from Egypt and Africa fed the capital.',
      '422995',
      "Ostia, at the mouth of the Tiber River, served as the harbor of Rome. As the capital's population grew to over a million people, Ostia became the critical logistics hub through which Egyptian grain flowed to feed the city. Warehouses, merchants' guilds, baths, and temples lined its streets, making Ostia a cosmopolitan city of merchants from every corner of the empire.",
      "The muddy Tiber mouth is thick with river barges and seagoing freighters jostling for berth. Salt marshes and the cries of wading birds frame the modest Latin settlement that will one day feed an empire."],
    ['carthage',   'Karchedon',   'Carthage',   36.86, 10.32, 'north_africa',
      'The great Phoenician trading empire that dominated the western Mediterranean until its destruction by Rome in 146 BCE. Traded in grain, purple dye, and metals.',
      '314921',
      "Carthage was founded by Phoenician settlers from Tyre around 814 BCE and grew to control trade throughout the western Mediterranean — Spain, Sardinia, Sicily, and the North African coast. Carthaginian sailors reached the Atlantic coast of Africa and possibly Britain. The city's destruction by Rome in 146 BCE at the end of the Third Punic War was one of antiquity's most deliberate acts of erasure.",
      "The cothon -- Carthage's circular military harbor -- gleams beside the rectangular merchant basin where Punic sailors unload Iberian silver and Sardinian grain. Incense from the tophet sanctuary drifts across the waterfront."],
    ['utica',      'Utika',       'Utique',     37.06,  9.86, 'north_africa',
      'The oldest Phoenician settlement in North Africa, predating Carthage. Utica remained an important agricultural and trading port throughout the ancient period.',
      '315247',
      "Utica claimed to have been founded by Phoenicians from Tyre around 1100 BCE, making it older than Carthage itself. Though overshadowed by its more powerful neighbor, Utica remained an important port and agricultural center throughout the ancient period. When Carthage fell to Rome in 146 BCE, Utica cooperated with the Romans and was rewarded with control of the surrounding territory, becoming the capital of the new Roman province of Africa.",
      "Dusty grain wagons rumble down from the fertile Bagradas valley to Utica's ancient wharves. The air is dry and hot, tinged with esparto grass and the brine of salted fish drying on racks along the shore."],
    ['leptis',     'Lepcis Magna','Khoms',      32.64, 14.29, 'north_africa',
      'A major Phoenician and later Roman port on the Libyan coast. Leptis exported grain, olive oil, and wild animals captured for Roman arena games.',
      '344448',
      "Lepcis Magna was founded by Phoenician traders from Tyre on the fertile coastal plain of what is now Libya. The city exported North African grain, olive oil from the local groves, and exotic animals — lions, leopards, and elephants — captured in the interior for Roman arena spectacles. The city reached its greatest glory under the emperor Septimius Severus, himself a native son, who lavished it with magnificent marble monuments.",
      "Olive presses clatter in the warehouses behind the quay, filling the air with the rich green scent of fresh oil. Numidian traders lead pack-camels loaded with ivory and ostrich plumes past Phoenician counting-houses."],
    ['alexandria', 'Alexandreia', 'Alexandria', 31.20, 29.91, 'egypt',
      "Founded by Alexander the Great, Alexandria became the greatest trading city of the Hellenistic world. Its famous lighthouse guided ships to Egypt's grain wealth.",
      '727070',
      "Alexandria was founded by Alexander the Great in 331 BCE and swiftly grew to become the greatest city of the Hellenistic world. Its famous Pharos Lighthouse — one of the Seven Wonders — stood over 100 meters tall and guided sailors to Egypt's grain-rich harbors. The Library of Alexandria held scrolls from every corner of the known world. Egyptian grain, papyrus, linen, and luxury goods flowed outward while the city absorbed merchants and scholars from Greece, Persia, and beyond.",
      "The low delta coastline smells of silt and papyrus as your vessel passes the fishing village of Rhakotis. Egyptian feluccas ferry linen bales to waiting Greek merchantmen anchored in the shallow bay."],
    ['naukratis',  'Naukratis',   'Kom Geif',   30.89, 30.60, 'egypt',
      'The only Greek trading post permitted in Egypt during the Archaic period. Greek merchants exchanged silver and wine for Egyptian grain, papyrus, and linen.',
      '727199',
      "Naukratis was the only Greek emporion officially permitted in Egypt during the Archaic period, established by the pharaoh Amasis around 570 BCE. Greek merchants — primarily from Miletos, Aegina, and the islands — were required to conduct all their Egyptian trade through this single port. They exchanged Aegean silver, wine, and olive oil for Egyptian grain, papyrus, fine linen, and luxury goods that came up the Nile from sub-Saharan Africa and Arabia.",
      "Greek is spoken alongside Egyptian on the muddy Nile wharves of Naukratis. Bundles of papyrus and bolts of linen sit stacked beside Milesian wine jars, watched by pharaonic customs officials."],
    ['memphis',    'Memphis',     'Mit Rahina', 29.84, 31.25, 'egypt',
      'Ancient capital of Egypt and center of the Nile trade network. Memphis was where Nile grain was gathered before shipment north to the Mediterranean.',
      '786022',
      "Memphis was the ancient capital of Egypt for much of the Pharaonic period, situated at the apex of the Nile delta where river traffic from Upper Egypt met the branching channels leading north to the Mediterranean. The city was sacred to Ptah, craftsman of the gods, and housed vast grain warehouses where the produce of the Nile valley was collected, taxed, and redistributed. In classical times Memphis remained an important commercial and religious center, home to a large community of Greek and Phoenician merchants.",
      "The colossal temple of Ptah rises above palm groves as Nile barges heavy with Upper Egyptian grain crowd the canal docks. Incense and natron dust hang in the warm air of the craftsmen's quarter."],
    ['tyre',       'Tyros',       'Tyre',       33.27, 35.20, 'levant',
      "The master city of Phoenician trade and navigation. Tyre's merchant sailors founded colonies from Carthage to Cadiz and monopolized the trade in purple dye.",
      '678437',
      "Tyre was built on an island just off the Levantine coast, making it nearly impregnable — it withstood a 13-year siege by Nebuchadnezzar and later required Alexander the Great to build a causeway to finally capture it. Tyrian merchants dominated Mediterranean trade for centuries, founding colonies as far west as Cadiz. Above all, Tyre controlled the production of Tyrian purple — the most prestigious dye in the ancient world, extracted from murex sea-snails and worth more than its weight in gold.",
      "The island fortress of Tyre reeks of crushed murex shells fermenting in stone vats along the southern shore. Phoenician longships crowd the twin harbors while temple smoke from the sanctuary of Melqart spirals skyward."],
    ['sidon',      'Sidon',       'Sidon',      33.56, 35.37, 'levant',
      'Sidon rivaled Tyre as a Phoenician trading center. Its craftsmen were famous for fine glassware and purple-dyed textiles exported across the Mediterranean.',
      '678405',
      "Sidon was one of the oldest and most important Phoenician cities, perhaps the original home of the purple-dyeing industry. Its craftsmen were renowned throughout the ancient world for extraordinary blown glass — the technique of glassblowing was likely invented in the Sidon-Tyre region. Homer's heroes prized Sidonian silver bowls as the greatest of prizes, and the city's purple-dyed textiles were worn by kings and priests from Egypt to Persia.",
      "Glass-blowers' furnaces glow orange in the workshops behind the harbor, filling the air with heat and the smell of molten sand. Sidonian artisans display translucent vessels and silver bowls to arriving merchants."],
    ['byblos',     'Byblos',      'Jbeil',      34.12, 35.64, 'levant',
      "One of the world's oldest continuously inhabited cities. Byblos was the primary exporter of Lebanese cedar timber, crucial for shipbuilding in Egypt and Greece.",
      '678063',
      "Byblos is one of the world's oldest continuously inhabited cities, with settlement stretching back before 5000 BCE. Its greatest export was Lebanese cedar — tall, straight, fragrant timber from the mountain forests — essential for shipbuilding in the treeless lands of Egypt and later Greece. The Egyptians depicted the timber trade with Byblos in royal inscriptions as a matter of state necessity. The Greek word for papyrus scroll, byblos, came from this city's name, as Egypt's papyrus reached Greece through this port.",
      "The intoxicating fragrance of fresh-cut cedar logs fills the harbor as ox-teams drag timber down from the mountain forests. Egyptian barges wait to load the precious wood that pharaohs have sought for millennia."],
    ['kition',     'Kition',      'Larnaca',    34.91, 33.64, 'levant',
      "A Phoenician city on Cyprus that controlled the island's rich copper mines. Kition was the meeting point of Greek and Near Eastern trade in the eastern Mediterranean.",
      '707498',
      "Cyprus sat at the crossroads of the eastern Mediterranean, within reach of Egypt, the Levant, Anatolia, and Greece. Kition, the major Phoenician city on the island, controlled access to Cyprus's extraordinary copper deposits — so abundant that the very name of the metal in European languages derives from the island's name. The philosopher Zeno of Citium, founder of the Stoic school of philosophy, was born here around 334 BCE.",
      "Copper slag crunches underfoot on the black-sand beach near the smelting quarter. The Phoenician temple of Astarte overlooks the harbor, where ingots shaped like ox-hides are stacked for export."],
    ['salamis_cy', 'Salamis',     'Famagusta',  35.18, 33.90, 'levant',
      "The most important Greek city on Cyprus, Salamis exported the island's famous copper (the word 'copper' derives from Cyprus). A key waypoint for ships to Egypt and the Levant.",
      '707611',
      "Salamis on Cyprus was the island's principal Greek city, founded according to legend by the hero Teucer after the Trojan War. The city's harbor made it the natural stopping point for ships traveling between the Aegean and Egypt or the Levant. Cypriot copper — smelted from ores mined in the island's hills — was a crucial commodity in the ancient world's bronze-working industries, and the island's name became the word for copper throughout the Roman world.",
      "Greek voices mingle with Phoenician on the broad sandy beach where ships are hauled ashore for careening. Copper ingots gleam in the sun, and the gymnasium echoes with the shouts of young athletes."],
    ['emporion',   'Emporion',    'Empuries',   42.13,  3.12, 'iberia',
      'A Greek colonial trading post on the Iberian coast. Emporion traded Mediterranean goods with Celtic Iberian tribes, gaining access to Spanish silver, tin, and iron.',
      '246347',
      "Emporion, whose name simply means 'trading post' in Greek, was founded by settlers from Massalia around 575 BCE as the most distant Greek outpost on the Iberian coast. The city was physically divided in two — a Greek quarter and an adjacent native Iberian town — reflecting the cultural exchange at its heart. Greek merchants exchanged wine, olive oil, and fine pottery for the extraordinary mineral wealth of the Iberian Peninsula: silver from the mountains, tin from Galicia, and iron ore that would eventually supply Roman legions.",
      "Iberian tribesmen in leather tunics trade silver nuggets and iron blooms with Greek merchants across a stone boundary wall. The smell of grilled sardines drifts from both quarters of this divided frontier town."],
    ['gadir',      'Gadir',       'Cadiz',      36.53, -6.30, 'iberia',
      'A Phoenician colony at the edge of the known world, guarding the straits of Gibraltar. Gadir traded in Atlantic tin, silver, and the famous Spanish fish sauce (garum).',
      '256177',
      "Gadir was founded by Phoenicians from Tyre around 1100 BCE, making it one of the oldest continuously inhabited cities in western Europe. It stood at the very edge of the known world, just beyond the Pillars of Hercules (Gibraltar) — the boundary the ancients believed marked the end of the civilized Mediterranean. From here, Phoenician and later Carthaginian sailors ventured into the Atlantic to trade for Cornish tin and West African gold. Gadir also produced garum, the pungent fermented fish sauce that Romans used as a condiment on virtually everything.",
      "Atlantic swells rock the Phoenician harbor at the edge of the known world. The overpowering stench of garum vats rivals the salt wind, and tin ingots from beyond the Pillars of Herakles are piled on the quay."],
  ];

  const seedAll = db.transaction(() => {
    for (const port of ports) {
      insert.run(...port);
      // Backfill cultural_description for rows already in DB from prior launches
      upsertCultural.run(port[8], port[0]);
      // Backfill ambient_description for rows already in DB from prior launches
      upsertAmbient.run(port[9], port[0]);
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
    ambient_description: string | null;
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
    ambientDescription: r.ambient_description ?? undefined,
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
    ambient_description: string | null;
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
    ambientDescription: row.ambient_description ?? undefined,
  };
}

// ─── Goods ────────────────────────────────────────────────────────────────────

/**
 * Seed 15 tradeable goods.
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
    ['attic_pottery', 'Attic Pottery', 25, 'Fine Athenian pottery decorated with red-figure scenes of mythology and daily life. Prized across the Mediterranean as both art and trade goods.'],
    ['purple_dye', 'Tyrian Purple', 80, 'Rare dye extracted from murex sea snails by Phoenician artisans. Worth more than gold by weight, it took 10,000 snails to produce 1 gram.'],
    ['papyrus', 'Papyrus', 160, 'Writing material made from the papyrus reed of the Nile delta. Egypt held a near-monopoly on production, making papyrus scrolls a valuable export throughout the Mediterranean.'],
    ['silver', 'Silver', 220, 'The primary precious metal for coinage and trade. Iberian silver from mines near Gades and Emporion drove Phoenician and Greek colonization of the western Mediterranean.'],
    ['glass', 'Glassware', 190, 'Fine glass vessels and beads crafted by Phoenician artisans. Sidon and Tyre were renowned centers of glassmaking, producing translucent vessels prized from Egypt to Greece.'],
    ['garum', 'Garum', 140, 'Pungent fermented fish sauce produced in coastal vats. Gadir (Cadiz) and other Iberian ports exported garum throughout the Mediterranean, where it was used as a universal condiment.'],
    ['silphium', 'Silphium', 300, 'A now-extinct plant from Cyrenaica (modern Libya) used as medicine, seasoning, and contraceptive. So valuable that Cyrene stamped it on their coins. No substitute has ever been found.'],
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
    'athens':    [['wheat', 3, 8], ['olive_oil', 10, 4], ['wine', 10, 5], ['textiles', 3, 6], ['spices', 2, 5], ['bronze', 4, 6], ['timber', 3, 7], ['pottery', 8, 4], ['attic_pottery', 10, 3], ['purple_dye', 1, 8], ['papyrus', 2, 7], ['silver', 7, 4], ['glass', 2, 6], ['garum', 1, 5], ['silphium', 1, 5]],
    'corinth':   [['wheat', 3, 7], ['olive_oil', 8, 4], ['wine', 8, 5], ['textiles', 4, 6], ['spices', 2, 4], ['bronze', 5, 5], ['timber', 3, 6], ['pottery', 9, 4], ['attic_pottery', 6, 4], ['purple_dye', 2, 5], ['papyrus', 1, 6], ['silver', 2, 6], ['glass', 2, 6], ['garum', 1, 5], ['silphium', 1, 5]],
    'sparta':    [['wheat', 4, 6], ['olive_oil', 6, 4], ['wine', 5, 5], ['textiles', 4, 5], ['spices', 1, 4], ['bronze', 3, 6], ['timber', 5, 5], ['pottery', 4, 5], ['papyrus', 1, 5], ['silver', 2, 5], ['glass', 1, 5], ['garum', 1, 5], ['silphium', 0, 4]],
    'miletos':   [['wheat', 4, 7], ['olive_oil', 7, 4], ['wine', 6, 5], ['textiles', 8, 4], ['spices', 3, 5], ['bronze', 4, 5], ['timber', 3, 6], ['pottery', 7, 4], ['papyrus', 2, 6], ['silver', 2, 6], ['glass', 3, 5], ['garum', 1, 5], ['silphium', 1, 5]],
    'ephesos':   [['wheat', 3, 7], ['olive_oil', 8, 4], ['wine', 7, 5], ['textiles', 7, 4], ['spices', 4, 5], ['bronze', 4, 5], ['timber', 3, 6], ['pottery', 6, 4], ['papyrus', 2, 6], ['silver', 2, 6], ['glass', 3, 5], ['garum', 1, 6], ['silphium', 1, 5]],
    'byzantion': [['wheat', 5, 8], ['olive_oil', 6, 5], ['wine', 8, 5], ['textiles', 5, 5], ['spices', 3, 5], ['bronze', 5, 5], ['timber', 4, 6], ['pottery', 5, 4], ['papyrus', 1, 6], ['silver', 2, 6], ['glass', 2, 6], ['garum', 1, 6], ['silphium', 0, 5]],
    'rhodes':    [['wheat', 3, 7], ['olive_oil', 9, 4], ['wine', 10, 4], ['textiles', 4, 6], ['spices', 4, 5], ['bronze', 4, 5], ['timber', 3, 6], ['pottery', 7, 4], ['attic_pottery', 4, 5], ['purple_dye', 3, 5], ['papyrus', 2, 6], ['silver', 2, 6], ['glass', 3, 5], ['garum', 2, 5], ['silphium', 1, 5]],
    'knossos':   [['wheat', 5, 6], ['olive_oil', 9, 4], ['wine', 9, 4], ['textiles', 4, 6], ['spices', 3, 5], ['bronze', 4, 5], ['timber', 4, 6], ['pottery', 7, 4], ['papyrus', 1, 6], ['silver', 1, 6], ['glass', 2, 6], ['garum', 2, 5], ['silphium', 1, 5]],

    // Italy/Sicily region — wine, pottery, timber surplus
    'syracuse':  [['wheat', 10, 5], ['olive_oil', 7, 5], ['wine', 12, 4], ['textiles', 4, 6], ['spices', 2, 5], ['bronze', 4, 5], ['timber', 8, 4], ['pottery', 9, 4], ['papyrus', 1, 6], ['silver', 2, 6], ['glass', 2, 6], ['garum', 3, 5], ['silphium', 1, 5]],
    'massalia':  [['wheat', 6, 6], ['olive_oil', 6, 5], ['wine', 10, 4], ['textiles', 5, 6], ['spices', 3, 5], ['bronze', 5, 5], ['timber', 7, 5], ['pottery', 7, 5], ['papyrus', 1, 6], ['silver', 3, 5], ['glass', 1, 6], ['garum', 2, 5], ['silphium', 0, 5]],
    'taras':     [['wheat', 7, 6], ['olive_oil', 8, 4], ['wine', 9, 4], ['textiles', 6, 5], ['spices', 2, 5], ['bronze', 5, 5], ['timber', 7, 4], ['pottery', 8, 4], ['papyrus', 1, 6], ['silver', 1, 6], ['glass', 2, 6], ['garum', 3, 5], ['silphium', 1, 5]],
    'ostia':     [['wheat', 4, 12], ['olive_oil', 5, 8], ['wine', 6, 9], ['textiles', 4, 8], ['spices', 3, 8], ['bronze', 5, 7], ['timber', 6, 8], ['pottery', 6, 6], ['papyrus', 2, 7], ['silver', 2, 7], ['glass', 2, 7], ['garum', 3, 6], ['silphium', 1, 6]],

    // North Africa — grain and textiles surplus
    'carthage':  [['wheat', 8, 5], ['olive_oil', 5, 6], ['wine', 2, 7], ['textiles', 6, 5], ['spices', 3, 6], ['bronze', 4, 6], ['timber', 3, 7], ['pottery', 4, 5], ['attic_pottery', 3, 5], ['purple_dye', 4, 5], ['papyrus', 2, 6], ['silver', 2, 6], ['glass', 2, 6], ['garum', 7, 4], ['silphium', 3, 5]],
    'utica':     [['wheat', 7, 5], ['olive_oil', 5, 5], ['wine', 2, 6], ['textiles', 5, 5], ['spices', 2, 5], ['bronze', 3, 5], ['timber', 3, 6], ['pottery', 4, 5], ['papyrus', 1, 6], ['silver', 1, 6], ['glass', 1, 6], ['garum', 6, 4], ['silphium', 1, 5]],
    'leptis':    [['wheat', 8, 4], ['olive_oil', 6, 5], ['wine', 2, 6], ['textiles', 5, 5], ['spices', 3, 6], ['bronze', 3, 5], ['timber', 2, 7], ['pottery', 4, 5], ['papyrus', 1, 6], ['silver', 1, 6], ['glass', 1, 6], ['garum', 6, 4], ['silphium', 8, 2]],

    // Egypt — grain and textiles heavy surplus; wine/olive oil deficit; papyrus production hub
    'alexandria':[['wheat', 15, 4], ['olive_oil', 3, 8], ['wine', 2, 9], ['textiles', 8, 5], ['spices', 5, 6], ['bronze', 4, 6], ['timber', 2, 9], ['pottery', 5, 5], ['attic_pottery', 3, 5], ['purple_dye', 2, 6], ['papyrus', 12, 3], ['silver', 1, 7], ['glass', 3, 5], ['garum', 1, 6], ['silphium', 1, 5]],
    'naukratis': [['wheat', 12, 4], ['olive_oil', 3, 7], ['wine', 3, 8], ['textiles', 7, 5], ['spices', 4, 5], ['bronze', 3, 5], ['timber', 2, 8], ['pottery', 5, 5], ['papyrus', 10, 3], ['silver', 1, 6], ['glass', 2, 6], ['garum', 1, 6], ['silphium', 1, 5]],
    'memphis':   [['wheat', 14, 4], ['olive_oil', 3, 7], ['wine', 2, 8], ['textiles', 9, 5], ['spices', 4, 5], ['bronze', 3, 5], ['timber', 2, 8], ['pottery', 4, 5], ['papyrus', 11, 3], ['silver', 1, 6], ['glass', 2, 6], ['garum', 1, 6], ['silphium', 0, 5]],

    // Levant — textiles, spices, timber surplus; grain moderate; glass production hub
    'tyre':      [['wheat', 3, 7], ['olive_oil', 4, 6], ['wine', 3, 7], ['textiles', 10, 4], ['spices', 8, 4], ['bronze', 5, 5], ['timber', 7, 5], ['pottery', 5, 5], ['attic_pottery', 2, 6], ['purple_dye', 10, 3], ['papyrus', 2, 6], ['silver', 2, 5], ['glass', 10, 3], ['garum', 1, 6], ['silphium', 1, 5]],
    'sidon':     [['wheat', 3, 7], ['olive_oil', 4, 6], ['wine', 3, 7], ['textiles', 9, 4], ['spices', 7, 4], ['bronze', 5, 5], ['timber', 6, 5], ['pottery', 5, 5], ['attic_pottery', 2, 5], ['purple_dye', 8, 3], ['papyrus', 2, 6], ['silver', 2, 5], ['glass', 9, 3], ['garum', 1, 6], ['silphium', 1, 5]],
    'byblos':    [['wheat', 3, 6], ['olive_oil', 4, 6], ['wine', 3, 7], ['textiles', 7, 5], ['spices', 6, 5], ['bronze', 4, 5], ['timber', 10, 4], ['pottery', 4, 5], ['papyrus', 2, 5], ['silver', 1, 6], ['glass', 8, 3], ['garum', 1, 6], ['silphium', 1, 5]],
    'kition':    [['wheat', 3, 6], ['olive_oil', 5, 5], ['wine', 4, 6], ['textiles', 7, 4], ['spices', 6, 4], ['bronze', 8, 4], ['timber', 5, 5], ['pottery', 5, 5], ['papyrus', 1, 6], ['silver', 2, 5], ['glass', 3, 5], ['garum', 1, 6], ['silphium', 1, 5]],
    'salamis_cy':[['wheat', 4, 6], ['olive_oil', 5, 5], ['wine', 5, 6], ['textiles', 7, 4], ['spices', 5, 5], ['bronze', 8, 4], ['timber', 4, 5], ['pottery', 5, 5], ['papyrus', 1, 6], ['silver', 3, 5], ['glass', 3, 5], ['garum', 1, 6], ['silphium', 1, 5]],

    // Iberia — bronze, timber, silver, garum surplus
    'emporion':  [['wheat', 5, 6], ['olive_oil', 5, 6], ['wine', 5, 5], ['textiles', 4, 7], ['spices', 2, 6], ['bronze', 8, 4], ['timber', 10, 4], ['pottery', 4, 5], ['papyrus', 1, 7], ['silver', 10, 3], ['glass', 1, 6], ['garum', 10, 3], ['silphium', 0, 5]],
    'gadir':     [['wheat', 5, 6], ['olive_oil', 5, 6], ['wine', 5, 5], ['textiles', 4, 7], ['spices', 2, 6], ['bronze', 8, 4], ['timber', 10, 4], ['pottery', 4, 5], ['papyrus', 1, 7], ['silver', 10, 3], ['glass', 1, 6], ['garum', 10, 3], ['silphium', 0, 6]],
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

// ─── Reputation Queries ─────────────────────────────────────────────────────

/**
 * Get the player's reputation at a port (looked up by the port's region).
 * Returns tier info for UI display and price modifier calculation.
 */
export function getPortReputation(db: Database.Database, portId: string): { region: string; score: number; tierName: string; tierLevel: number } {
  const portRow = db.prepare('SELECT region FROM ports WHERE id = ?').get(portId) as { region: string } | undefined;
  if (!portRow) return { region: 'unknown', score: 0, tierName: 'Stranger', tierLevel: 0 };
  const repRow = db.prepare('SELECT score FROM reputation WHERE region = ?').get(portRow.region) as { score: number } | undefined;
  const score = repRow?.score ?? 0;
  const tier = getReputationTier(score);
  return { region: portRow.region, score, tierName: tier.name, tierLevel: tier.level };
}

/**
 * Get market prices for a port — joins port_inventory with goods and calculates price.
 * Applies reputation-based price modifier for the port's region.
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

  // Look up reputation modifier for this port's region
  const rep = getPortReputation(db, portId);
  const repMod = getReputationPriceModifier(rep.tierLevel);

  return rows.map(r => {
    // Price formula: base * (1 + (demand - supply) * 0.02), capped +/-50%
    const delta = r.demand - r.supply;
    const multiplier = 1 + delta * 0.02;
    let currentPrice = Math.round(
      Math.max(r.base_price * 0.5, Math.min(r.base_price * 1.5, r.base_price * multiplier))
    );
    // Apply reputation discount for buy prices shown in market
    if (repMod > 0) {
      currentPrice = applyReputationToPrice(currentPrice, repMod, 'buy');
    }
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
function calcCurrentPrice(basePrice: number, supply: number, demand: number, reputationModifier?: number, action?: 'buy' | 'sell'): number {
  const delta = demand - supply;
  const multiplier = 1 + delta * 0.02;
  let price = Math.round(
    Math.max(basePrice * 0.5, Math.min(basePrice * 1.5, basePrice * multiplier))
  );
  if (reputationModifier) {
    price = applyReputationToPrice(price, reputationModifier, action);
  }
  return price;
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

    // Look up reputation for price modifier
    const portRegionRow = db.prepare('SELECT region FROM ports WHERE id = ?').get(portId) as { region: string } | undefined;
    const repRow = db.prepare('SELECT score FROM reputation WHERE region = ?').get(portRegionRow?.region ?? '') as { score: number } | undefined;
    const tier = getReputationTier(repRow?.score ?? 0);
    const repMod = getReputationPriceModifier(tier.level);

    const pricePerUnit = calcCurrentPrice(goodRow.base_price, piRow.supply, piRow.demand, repMod, 'buy');
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
      cargoItems.push({ goodId, quantity: qty, boughtAtPrice: pricePerUnit, boughtAtPort: portId, boughtAtTurn: turn });
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

    // Auto-log to captain's journal (Phase 10 — JRN-02)
    const goodInfo = db.prepare('SELECT name FROM goods WHERE id = ?').get(goodId) as { name: string } | undefined;
    const portInfo = db.prepare('SELECT ancient_name FROM ports WHERE id = ?').get(portId) as { ancient_name: string } | undefined;
    const goodName = goodInfo?.name ?? goodId;
    const portName = portInfo?.ancient_name ?? portId;
    insertJournalEntry(db, turn, 'trade',
      `Bought ${qty} ${goodName} at ${portName}`,
      { goodId, goodName, qty, pricePerUnit, totalValue: totalCost, portId, portName, action: 'buy' as const }
    );

    // Update supply/demand: buying increases demand pressure (decrement supply)
    db.prepare(`
      UPDATE port_inventory
      SET supply = MAX(1, supply - 1)
      WHERE port_id = ? AND good_id = ?
    `).run(portId, goodId);

    // Award reputation for trade (REP-01: reputation from trades)
    const repGain = getTradeReputationGain(totalCost);
    db.prepare('INSERT INTO reputation (region, score) VALUES (?, ?) ON CONFLICT(region) DO UPDATE SET score = score + excluded.score').run(portRegionRow?.region ?? '', repGain);

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

    // Look up reputation for price modifier
    const portRegionRow = db.prepare('SELECT region FROM ports WHERE id = ?').get(portId) as { region: string } | undefined;
    const repRow = db.prepare('SELECT score FROM reputation WHERE region = ?').get(portRegionRow?.region ?? '') as { score: number } | undefined;
    const tier = getReputationTier(repRow?.score ?? 0);
    const repMod = getReputationPriceModifier(tier.level);

    const pricePerUnit = calcCurrentPrice(goodRow.base_price, piRow.supply, piRow.demand, repMod, 'sell');
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

    // Remove from cargo -- FIFO across stacks
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

    // Auto-log to captain's journal (Phase 10 — JRN-02)
    const goodInfo = db.prepare('SELECT name FROM goods WHERE id = ?').get(goodId) as { name: string } | undefined;
    const portInfo = db.prepare('SELECT ancient_name FROM ports WHERE id = ?').get(portId) as { ancient_name: string } | undefined;
    const goodName = goodInfo?.name ?? goodId;
    const portName = portInfo?.ancient_name ?? portId;
    insertJournalEntry(db, turn, 'trade',
      `Sold ${qty} ${goodName} at ${portName}`,
      { goodId, goodName, qty, pricePerUnit, totalValue: totalRevenue, portId, portName, action: 'sell' as const }
    );

    // Update supply/demand: selling here increases supply
    db.prepare(`
      UPDATE port_inventory
      SET demand = MAX(1, demand - 1)
      WHERE port_id = ? AND good_id = ?
    `).run(portId, goodId);

    // Award reputation for trade (REP-01: reputation from trades)
    const repGain = getTradeReputationGain(totalRevenue);
    db.prepare('INSERT INTO reputation (region, score) VALUES (?, ?) ON CONFLICT(region) DO UPDATE SET score = score + excluded.score').run(portRegionRow?.region ?? '', repGain);

    const newCurrentCargo = newCargoItems.reduce((s, i) => s + i.quantity, 0);
    result = { gold: newGold, cargoItems: newCargoItems, cargoCapacity, currentCargo: newCurrentCargo };
  });

  tx();
  return result;
}

// ─── Curated Images ───────────────────────────────────────────────────────────

/**
 * An offline-curated image record linking to a good or port.
 * Exactly one of goodId or portId will be non-null (enforced by DB CHECK constraint).
 */
export interface CuratedImage {
  id: string;
  goodId: string | null;
  portId: string | null;
  filePath: string;
  attribution: string;
  sourceUrl: string | null;
  createdAt: string;
}

/**
 * Seed curated images from resources/data/curated-images.json.
 * INSERT OR IGNORE — safe to call on every app launch. Empty manifest = no-op.
 */
export function seedCuratedImages(db: Database.Database): void {
  // Justification: require() needed for synchronous JSON import; ES import would require top-level await which is not supported in this CJS context
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const manifest = require('../../../resources/data/curated-images.json') as Array<{
    id: string;
    goodId?: string;
    portId?: string;
    filePath: string;
    attribution: string;
    sourceUrl?: string;
    createdAt?: string;
  }>;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO curated_images
      (id, good_id, port_id, file_path, attribution, source_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const image of manifest) {
    insert.run(
      image.id,
      image.goodId ?? null,
      image.portId ?? null,
      image.filePath,
      image.attribution,
      image.sourceUrl ?? null,
      image.createdAt ?? new Date().toISOString()
    );
  }
}

/**
 * Get curated images for a trade good. Returns up to 5 results.
 */
export function getCuratedImagesForGood(db: Database.Database, goodId: string): CuratedImage[] {
  return db.prepare(`
    SELECT id,
           good_id    AS goodId,
           port_id    AS portId,
           file_path  AS filePath,
           attribution,
           source_url AS sourceUrl,
           created_at AS createdAt
    FROM curated_images
    WHERE good_id = ?
    LIMIT 5
  `).all(goodId) as CuratedImage[];
}

/**
 * Get curated images for a port. Returns up to 3 results.
 */
export function getCuratedImagesForPort(db: Database.Database, portId: string): CuratedImage[] {
  return db.prepare(`
    SELECT id,
           good_id    AS goodId,
           port_id    AS portId,
           file_path  AS filePath,
           attribution,
           source_url AS sourceUrl,
           created_at AS createdAt
    FROM curated_images
    WHERE port_id = ?
    LIMIT 3
  `).all(portId) as CuratedImage[];
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

// ─── Journal ─────────────────────────────────────────────────────────────────

/**
 * Insert a journal entry. Call INSIDE an existing transaction for atomicity
 * with the action that triggered the entry (buy, sell, event resolve, state transition).
 * Can also be called standalone for player notes.
 */
export function insertJournalEntry(
  db: Database.Database,
  turn: number,
  entryType: JournalEntryType,
  title: string,
  bodyJson: Record<string, unknown>
): void {
  db.prepare(`
    INSERT INTO journal_entries (turn, entry_type, title, body_json, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(turn, entryType, title, JSON.stringify(bodyJson));
}

/**
 * Retrieve journal entries, newest first.
 * Optional limit parameter (default: all entries).
 */
export function getJournalEntries(db: Database.Database, limit?: number): JournalEntry[] {
  const sql = limit
    ? 'SELECT * FROM journal_entries ORDER BY turn DESC, id DESC LIMIT ?'
    : 'SELECT * FROM journal_entries ORDER BY turn DESC, id DESC';
  const rows = limit
    ? db.prepare(sql).all(limit) as Array<{ id: number; turn: number; entry_type: string; title: string; body_json: string; created_at: string }>
    : db.prepare(sql).all() as Array<{ id: number; turn: number; entry_type: string; title: string; body_json: string; created_at: string }>;
  return rows.map(r => ({
    id: r.id,
    turn: r.turn,
    entryType: r.entry_type as JournalEntryType,
    title: r.title,
    body: JSON.parse(r.body_json),
    createdAt: r.created_at,
  }));
}

/**
 * Delete all journal entries — called on New Game reset.
 */
export function clearJournalEntries(db: Database.Database): void {
  db.prepare('DELETE FROM journal_entries').run();
}

// ─── Port Lore ──────────────────────────────────────────────────────────────

/**
 * Seed historically researched lore for all 25 ports.
 * INSERT OR IGNORE — safe to call on every app launch.
 *
 * All content is temporally accurate for circa 540-530 BCE.
 * Every port includes at least one real scholarly citation.
 */
export function seedPortLore(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO port_lore
      (port_id, history, culture, trade_specialization, notable_facts_json, historical_period, primary_sources_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // [portId, history, culture, tradeSpecialization, notableFactsJson, historicalPeriod, primarySourcesJson]
  const lore: Array<[string, string, string, string, string, string, string]> = [
    // ── Greece ──────────────────────────────────────────────────
    ['athens',
      "In the mid-sixth century BCE, Athens was ruled by the tyrant Peisistratos, who promoted the Panathenaic festival and expanded Athenian trade across the Aegean. The silver mines at Laurion funded public works and a growing fleet. Athenian black-figure pottery was prized throughout the Mediterranean, and the city's olive oil was exported in distinctive stamped amphorae. Though not yet the democratic power it would become under Cleisthenes, Athens was already a major cultural and commercial center.",
      "Athenians worshipped Athena Polias as patron goddess, celebrating her with the annual Panathenaia — a grand procession, athletic contests, and animal sacrifices on the Acropolis. Daily life centered on the agora, where citizens debated politics, bought fish and pottery, and gathered at wine shops. Aristocratic families competed for prestige through chariot racing and lavish dedications at temples.",
      "Olive oil, fine painted pottery (especially black-figure ware), silver from Laurion mines, and honey from Mount Hymettus.",
      JSON.stringify(["Athens' owl-stamped silver tetradrachm became one of the most trusted currencies in the ancient Mediterranean.", "The Panathenaic Games awarded winners with amphorae filled with sacred olive oil — some of these prize vessels survive today.", "Peisistratos reportedly established the first public library in Athens."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 1", "Boardman, J. The Greeks Overseas (Thames & Hudson, 1999)", "Pleiades: https://pleiades.stoa.org/places/579885"])],

    ['corinth',
      "Under the tyrant Periander (died c. 585 BCE) and his successors, Corinth was one of the wealthiest cities in Greece. Its unique position on the isthmus — with harbors on both the Saronic and Corinthian gulfs — gave it control over east-west trade without ships risking the dangerous voyage around Cape Malea. The diolkos, a stone-paved trackway, allowed small vessels to be hauled overland between the two seas. Corinthian bronze and pottery were exported across the entire Mediterranean.",
      "Corinthians worshipped Aphrodite at her hilltop temple on Acrocorinth, where sacred prostitution was practiced according to later Greek sources. The biennial Isthmian Games, second only to Olympia in prestige, drew athletes from across Greece. The city was famous for its luxury — the phrase 'Corinthian girl' became a byword for courtesans throughout the Greek world.",
      "Fine bronze work, painted pottery (Corinthian ware predated Athenian in popularity), perfume in distinctive aryballoi (small round bottles), and transit tolls from the diolkos portage.",
      JSON.stringify(["The diolkos portage road across the isthmus remained in use for over 600 years.", "Corinthian aryballoi (tiny perfume bottles) have been found as far away as Egypt and southern France.", "Periander of Corinth was counted among the Seven Sages of Greece."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Books 1, 3, 5", "Salmon, J.B. Wealthy Corinth (Oxford University Press, 1984)", "Pleiades: https://pleiades.stoa.org/places/570182"])],

    ['sparta',
      "By the 540s BCE, Sparta had conquered Messenia and reduced its population to helot serfdom, creating the agricultural base that freed Spartan citizens for full-time military training. The Spartan system — agoge education, communal meals (syssitia), and iron currency designed to discourage commerce — was already well established. Sparta led the Peloponnesian League, a network of allied city-states, and was recognized as the foremost military power in Greece.",
      "Spartan life was organized entirely around military readiness. Boys entered the agoge at age seven, learning discipline, endurance, and combat. Women had more freedom than elsewhere in Greece — they exercised publicly and managed household estates while men lived in barracks. The dual kingship and council of elders (gerousia) governed the state. Religious festivals honoring Artemis Orthia involved ritual flogging contests for youths.",
      "Iron tools and weapons, agricultural produce from helot-farmed Messenia, and Lakonian bronze vessels and pottery (though trade was discouraged for citizens).",
      JSON.stringify(["Sparta deliberately used iron bars as currency to discourage trade and luxury.", "Spartan women could own property and were famous for their physical fitness and sharp wit.", "The perioikoi — free non-citizens living around Sparta — handled most of the trade Spartan citizens disdained."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 1", "Plutarch, Life of Lycurgus", "Cartledge, P. Sparta and Lakonia (Routledge, 2002)"])],

    ['miletos',
      "Miletos was the leading Greek city of Ionia in the sixth century BCE, having founded over 90 colonies around the Black Sea coast — more than any other Greek polis. The city's harbor gave access to grain from the Pontic steppes, timber, and metals from Anatolia, and luxury goods from Lydia and Persia. Under the rule of the Lydian kings and then the Persian Empire (from 546 BCE), Miletos maintained significant commercial autonomy. The city was also the birthplace of Greek philosophy — Thales, Anaximander, and Anaximenes all came from Miletos.",
      "Milesian culture blended Greek and Near Eastern influences. The city's famous wool textiles were dyed in vibrant colors using techniques learned from Lydian craftsmen. Ionian Greeks worshipped Apollo at the great oracle of Didyma, south of Miletos, which rivaled Delphi in prestige. Daily life in the harbor district bustled with merchants speaking Greek, Lydian, Carian, and Persian.",
      "Fine dyed wool textiles, grain re-exported from Black Sea colonies, timber, philosophical and scientific knowledge (Milesian thinkers pioneered natural philosophy).",
      JSON.stringify(["Thales of Miletos (c. 624-546 BCE) is traditionally considered the first Western philosopher — he predicted a solar eclipse in 585 BCE.", "Miletos founded more colonies than any other Greek city, establishing over 90 settlements around the Black Sea.", "The city's wool was so prized that 'Milesian wool' became a generic term for fine textiles."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Books 1, 5", "Boardman, J. The Greeks Overseas (Thames & Hudson, 1999)", "Pleiades: https://pleiades.stoa.org/places/599799"])],

    ['ephesos',
      "The Temple of Artemis at Ephesos was rebuilt in the mid-sixth century BCE under the patronage of King Croesus of Lydia into one of the largest Greek sanctuaries, attracting pilgrims and merchants from across the Mediterranean. After Lydia fell to Persia in 546 BCE, Ephesos came under Persian rule but retained its commercial prosperity. The city sat at the terminus of the Royal Road from Sardis and Susa, making it a gateway between Greek maritime trade and the Persian overland network.",
      "Ephesian culture was deeply shaped by the worship of Artemis, a mother-goddess figure blending Greek and Anatolian traditions. The temple served as both religious sanctuary and financial institution — it functioned as a bank where merchants deposited wealth for safekeeping. The city's festival of Artemis drew enormous crowds, and the temple precinct offered asylum to fugitives.",
      "Grain, wine, luxury goods from the Persian interior (spices, textiles, perfumes), temple dedications, and financial services through the Artemision.",
      JSON.stringify(["King Croesus of Lydia personally funded columns for the Temple of Artemis — his name was inscribed on their bases.", "The Temple of Artemis functioned as one of the ancient world's first banks, accepting deposits and making loans.", "Ephesos minted some of the earliest known coins, made of electrum (a natural gold-silver alloy)."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 1", "Boardman, J. The Greeks Overseas (Thames & Hudson, 1999)", "Pleiades: https://pleiades.stoa.org/places/599612"])],

    ['byzantion',
      "Byzantion was founded by Megarian colonists around 657 BCE on a peninsula of extraordinary strategic value at the entrance to the Bosphorus strait. Every ship carrying Black Sea grain, timber, or slaves to the Aegean had to pass its walls. The city collected tolls on this traffic and grew wealthy. After the Persian conquest of Ionia in 546 BCE, Byzantion came under loose Persian suzerainty, though its remoteness gave it considerable independence.",
      "Life in Byzantion revolved around the strait and the sea. The city was famous for its abundant tuna fisheries — schools of fish migrated through the Bosphorus each autumn and spring, providing both food and export income. Religious life centered on temples to Poseidon and Apollo, reflecting the city's maritime dependence. The population was a mix of Megarian Greeks and Thracian locals.",
      "Toll revenues from Bosphorus shipping, tuna and other fish (salted and exported), grain transshipment from the Black Sea, and Thracian gold and timber.",
      JSON.stringify(["Byzantion's fisheries were so rich that the historian Polybius called the city 'the most favorably situated for trade of any city in the known world.'", "Every ship passing through the Bosphorus had to pay tolls to Byzantion — the city literally taxed the grain supply of Athens.", "The name 'Byzantion' may derive from 'Byzas,' the legendary Megarian founder."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 4", "Polybius, Histories, Book 4.38-44", "Pleiades: https://pleiades.stoa.org/places/520985"])],

    ['rhodes',
      "In the sixth century BCE, Rhodes was divided among three independent city-states — Lindos, Ialysos, and Kamiros — each controlling a portion of the island. Lindos was the most prominent, with its acropolis sanctuary of Athena Lindia attracting dedications from pharaohs and Near Eastern kings. The island's location at the crossroads of the Aegean, Egypt, and the Levant made it a natural entrepot. Rhodian sailors were renowned navigators, and the island's wine was widely exported.",
      "Each of the three Rhodian cities had its own government, festivals, and religious traditions. The worship of Helios (the sun god) was important across the island. Rhodian potters and metalworkers produced fine wares, and the island's mild climate supported excellent vineyards. Daily life mixed Greek, Phoenician, and Egyptian cultural influences due to the island's central trading position.",
      "Wine (Rhodian wine amphorae are found throughout the ancient Mediterranean), olive oil, fine pottery, and re-export of goods transshipped between Egypt, the Levant, and Greece.",
      JSON.stringify(["The three cities of Rhodes would not unite into a single state until 408 BCE — in the 530s they were still independent.", "The sanctuary of Athena Lindia at Lindos received dedications from the Egyptian pharaoh Amasis II.", "Rhodian wine amphorae, stamped with distinctive handles, have been found from Spain to the Black Sea."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 2", "Boardman, J. The Greeks Overseas (Thames & Hudson, 1999)", "Pleiades: https://pleiades.stoa.org/places/590031"])],

    ['knossos',
      "By the sixth century BCE, Knossos was an important Cretan city-state, though the great Minoan palace had been in ruins for nearly a millennium. Crete's strategic position between Greece, Egypt, and the Levant made it a vital waypoint for Mediterranean shipping. The island produced excellent wine, olive oil, and honey for export, and Cretan archers were already famous as mercenaries serving Greek and Near Eastern armies. Knossos maintained ties with both Greek and Phoenician trading networks.",
      "Cretan religion preserved ancient traditions — worship at cave sanctuaries dedicated to Zeus, whose mythical birthplace was Mount Ida on Crete, remained important. The island's numerous cities were fiercely independent and frequently at war with each other. Cretan laws, particularly those of the city of Gortyn, were among the earliest written legal codes in the Greek world.",
      "Wine, olive oil, honey, herbs (especially dittany of Crete, prized as medicine), mercenary archers, and re-export of goods between the eastern and western Mediterranean.",
      JSON.stringify(["Crete claimed to be the birthplace of Zeus — pilgrims visited the Idaean Cave to honor the king of the gods.", "Cretan archers were so renowned that they served as mercenaries in armies from Persia to Syracuse.", "The Laws of Gortyn, inscribed on a wall in southern Crete, are the oldest and most complete Greek legal code."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 4", "Horden, P. & Purcell, N. The Corrupting Sea (Blackwell, 2000)", "Pleiades: https://pleiades.stoa.org/places/589872"])],

    // ── Italy ───────────────────────────────────────────────────
    ['syracuse',
      "Founded by Corinthian settlers around 734 BCE, Syracuse had grown by the 530s BCE into the most powerful Greek city in Sicily. The tyrant Gelon (who ruled slightly later, from 491 BCE) would make it even greater, but already in this period Syracuse controlled a double harbor capable of sheltering large fleets and exported vast quantities of Sicilian grain grown on the island's fertile volcanic soils. The city's wealth attracted settlers from across the Greek world.",
      "Syracusan culture was strongly Corinthian — the city worshipped the same gods, spoke the Doric dialect, and maintained close ties with its mother city. The great spring of Arethusa on the island of Ortygia was sacred to Artemis. Syracusans enjoyed horse racing, athletic competitions, and the elaborate banquets that Sicilian Greeks became famous for — Sicilian cuisine was considered the finest in the Greek world.",
      "Grain (Sicily was called 'the breadbasket of the Mediterranean'), wine, cheese, honey, and horses. Syracuse also re-exported goods arriving from Carthaginian and Etruscan trade networks.",
      JSON.stringify(["Sicilian grain was so abundant that Syracuse and other Greek cities on the island could export surpluses that fed mainland Greece.", "The fountain of Arethusa, a freshwater spring on the island of Ortygia, was one of the most sacred sites in the Greek west.", "Syracusan banquets were so lavish that 'Syracusan table' became a Greek proverb for extravagance."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 7", "Boardman, J. The Greeks Overseas (Thames & Hudson, 1999)", "Pleiades: https://pleiades.stoa.org/places/462503"])],

    ['massalia',
      "Massalia was founded by Phocaean Greeks around 600 BCE at the mouth of the Rhone River, establishing Greek access to the Celtic interior of Gaul. By the 530s BCE, the city had grown into the most important Greek colony in the western Mediterranean. When Phocaea itself fell to the Persians in 546 BCE, many refugees fled to Massalia, strengthening the colony. Massaliot merchants traded Mediterranean wine, olive oil, and fine pottery to Celtic chieftains in exchange for tin, amber, furs, and slaves.",
      "Massaliot culture preserved Phocaean Greek traditions far from the Aegean. The city was governed by an oligarchy of 600 citizens and was known for its stable, well-ordered government — Aristotle praised its constitution. The Massaliots worshipped Artemis of Ephesos, brought from their original homeland. The interaction between Greeks and Celtic peoples created a unique frontier culture with elements of both traditions.",
      "Wine (Massalia became the conduit through which wine-drinking spread to Celtic Europe), olive oil, Greek pottery, and re-export of Celtic goods: tin from Cornwall and Brittany, amber from the Baltic, and slaves.",
      JSON.stringify(["Massalia was the channel through which the Celtic world first encountered wine — Celtic chiefs became enthusiastic customers.", "After Phocaea fell to Persia in 546 BCE, refugees swelled Massalia's population and strengthened its Ionian Greek character.", "The Massaliots explored the Atlantic coast — the navigator Pytheas later sailed to Britain and possibly Iceland."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 1.163-167", "Boardman, J. The Greeks Overseas (Thames & Hudson, 1999)", "Pleiades: https://pleiades.stoa.org/places/148107"])],

    ['taras',
      "Taras (Tarentum) was the only colony founded directly by Sparta, established around 706 BCE by a group known as the Partheniai — sons of unmarried Spartan mothers denied citizen rights. Despite its Spartan origins, Taras became one of the wealthiest and most cultured cities in Magna Graecia. By the 530s BCE, the city controlled a magnificent natural harbor and had grown rich on purple dye, fine wool, and agricultural produce from the surrounding fertile plains.",
      "Though founded by Spartans, Tarentine culture diverged sharply from austere Sparta — the colonists embraced luxury, commerce, and the arts. The city was famous for its fine wool from sheep raised in the surrounding countryside and for murex purple dye harvested from the bay. Religious life centered on the worship of Poseidon and the celebration of the Dionysia with elaborate theatrical performances.",
      "Purple dye (from murex sea-snails abundant in the bay), fine wool and woolen textiles, agricultural produce (grain, wine, olive oil), and Adriatic fish.",
      JSON.stringify(["Taras was the only colony Sparta ever founded — the founders were sons of unmarried mothers denied citizenship.", "Tarentine purple dye rivaled that of Tyre in quality, thanks to the abundant murex snails in the Gulf of Taranto.", "Tarentine cavalry was famous throughout the Greek world — the city's wealth supported a large force of mounted warriors."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 3", "Boardman, J. The Greeks Overseas (Thames & Hudson, 1999)", "Pleiades: https://pleiades.stoa.org/places/442782"])],

    ['ostia',
      "In the 530s BCE, Ostia was a modest Latin settlement at the mouth of the Tiber River, serving as Rome's outlet to the sea. Rome itself was still ruled by the Etruscan Tarquin dynasty and was a regional power in central Italy, not yet the Mediterranean empire it would become. The earliest structures at Ostia were likely a small fortified castrum and salt pans — the salt trade from the marshes at the Tiber mouth was one of Rome's earliest sources of revenue.",
      "Life at proto-Ostia was shaped by the salt trade and fishing. The settlement served the Latin and Etruscan communities of the Tiber valley. Religious practices blended Latin and Etruscan traditions — the worship of Vulcan (Volcanus) was particularly important at Ostia. The settlement was small and unremarkable compared to the great Greek and Phoenician ports, but its position at Rome's river mouth gave it future strategic importance.",
      "Salt from coastal evaporation pans, fish, and timber floated down the Tiber from the Apennine forests. Trade was modest, focused on supplying the growing town of Rome upstream.",
      JSON.stringify(["The Via Salaria ('Salt Road') from Rome to the Adriatic coast was named for the salt trade that passed through the Tiber mouth region.", "Rome was still ruled by Etruscan kings in the 530s BCE — the Republic would not be established until around 509 BCE.", "Ostia's name derives from 'ostium' (mouth) — referring to the Tiber river mouth."]),
      "circa 540-530 BCE",
      JSON.stringify(["Braudel, F. The Mediterranean and the Mediterranean World (University of California Press, 1995)", "Meiggs, R. Roman Ostia (Oxford University Press, 1973)", "Pleiades: https://pleiades.stoa.org/places/422995"])],

    // ── North Africa ────────────────────────────────────────────
    ['carthage',
      "By the 530s BCE, Carthage had grown from a Tyrian colony founded around 814 BCE into the dominant power of the western Mediterranean. The city controlled trade routes stretching from the Levant to the Atlantic, with subject territories in North Africa, Sardinia, western Sicily, and the Balearic Islands. Carthaginian merchants traded Iberian silver, African grain, and Tyrian purple across the sea. The city's twin harbors — a rectangular commercial port and a circular military cothon — were engineering marvels.",
      "Carthaginian culture was Phoenician at its core — the people spoke Punic (a Phoenician dialect), worshipped Ba'al Hammon and Tanit, and maintained close ties with Tyre. The tophet sanctuary, where votive offerings (and controversially, child sacrifices according to classical sources) were made, was central to religious life. Carthaginian society was mercantile and cosmopolitan, with Libyan, Numidian, Greek, and Iberian residents alongside Punic citizens.",
      "Iberian silver and tin, North African grain and olive oil, Tyrian purple dye, Sardinian metals, salted fish, and luxury goods re-exported from the eastern Mediterranean.",
      JSON.stringify(["Carthaginian explorers may have circumnavigated Africa — Hanno's voyage down the West African coast reached at least modern Cameroon.", "The Carthaginian constitution was admired by Aristotle, who compared it favorably to those of Sparta and Crete.", "Carthage's famous twin harbors could reportedly shelter 220 warships in the circular military cothon."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 4", "Aubet, M.E. The Phoenicians and the West (Cambridge University Press, 2001)", "Pleiades: https://pleiades.stoa.org/places/314921"])],

    ['utica',
      "Utica was traditionally considered the oldest Phoenician settlement in North Africa, with legendary foundation dates as early as 1100 BCE — making it centuries older than Carthage. By the 530s BCE, however, Utica was firmly in Carthage's shadow, serving as a loyal allied city rather than a rival. The city sat on the Bagradas River plain, one of North Africa's most fertile agricultural regions, and exported grain, olive oil, and livestock to the broader Phoenician trade network.",
      "Utican culture was similar to Carthage's — Punic language, worship of Ba'al and Tanit, and Phoenician commercial practices. As an older settlement, Utica had its own proud traditions and claimed seniority over Carthage. The city's agricultural hinterland made it a prosperous if unspectacular trading partner, supplying food to Carthage's growing population and exporting surpluses across the Mediterranean.",
      "Grain, olive oil, livestock, esparto grass (used for rope-making), and salted fish. Utica also served as a secondary port for Carthaginian trade networks.",
      JSON.stringify(["Utica claimed to be older than Carthage itself, with legendary founding dates around 1100 BCE.", "The Bagradas River valley where Utica sat was one of the most productive agricultural regions in the ancient Mediterranean.", "Utica would later side with Rome against Carthage in the Third Punic War, earning it control of the destroyed city's territory."]),
      "circa 540-530 BCE",
      JSON.stringify(["Aubet, M.E. The Phoenicians and the West (Cambridge University Press, 2001)", "Horden, P. & Purcell, N. The Corrupting Sea (Blackwell, 2000)", "Pleiades: https://pleiades.stoa.org/places/315247"])],

    ['leptis',
      "Lepcis (later Lepcis Magna) was a Phoenician trading post on the fertile coastal plain of what is now Libya, founded by settlers from Tyre. In the 530s BCE, the settlement was a modest Punic trading station under Carthaginian influence, exporting the agricultural produce of its hinterland — grain, olive oil, and livestock. The trans-Saharan trade routes that would later bring gold, ivory, and exotic animals to the city were already beginning to develop through contact with Garamantian traders from the interior.",
      "Lepcis shared the Punic culture of Carthage and other Phoenician settlements — temples to Ba'al and Tanit, Phoenician commercial practices, and the Punic language. The local Libyan population intermarried with Phoenician settlers, creating a mixed Libyo-Phoenician culture. The city's coastal location and fertile hinterland supported a comfortable if modest life oriented around farming and maritime trade.",
      "Grain, olive oil, livestock, trans-Saharan goods (ivory, ostrich feathers, semi-precious stones from Garamantian traders), and salted fish.",
      JSON.stringify(["Lepcis was founded by Phoenicians from Tyre, not Carthage — it maintained direct ties with the Levantine homeland.", "The Garamantes, a Saharan people with sophisticated irrigation systems, were Lepcis's link to trans-Saharan trade.", "Lepcis would not reach its greatest glory for another 700 years, under the Roman emperor Septimius Severus."]),
      "circa 540-530 BCE",
      JSON.stringify(["Aubet, M.E. The Phoenicians and the West (Cambridge University Press, 2001)", "Mattingly, D. Tripolitania (University of Michigan Press, 1995)", "Pleiades: https://pleiades.stoa.org/places/344448"])],

    // ── Egypt ───────────────────────────────────────────────────
    ['alexandria',
      "In the 530s BCE, the site that would become Alexandria was a small Egyptian fishing village called Rhakotis on the western edge of the Nile delta. The pharaoh Amasis II (570-526 BCE) ruled Egypt, maintaining good relations with Greek merchants and encouraging trade through the emporion of Naukratis. The coast near Rhakotis had a natural harbor sheltered by the island of Pharos, used by local fishermen and occasional Greek traders. Alexandria would not be founded until Alexander's conquest nearly two centuries later.",
      "The coastal village of Rhakotis was a typical Egyptian fishing settlement, with mud-brick houses, small boats, and shrines to local deities. The nearby Lake Mareotis provided freshwater fish and waterfowl. Egyptian religious practices — offerings to Osiris, Isis, and local gods — dominated daily life. Greek merchants occasionally stopped to trade, but the main Greek emporion was at Naukratis further up the delta.",
      "Fish (both Mediterranean and Lake Mareotis), natron (used in mummification, gathered from nearby desert deposits), salt, and papyrus from the delta marshes.",
      JSON.stringify(["The fishing village of Rhakotis occupied the site where Alexander the Great would found Alexandria in 331 BCE.", "Pharaoh Amasis II actively encouraged Greek trade with Egypt, concentrating it at the emporion of Naukratis.", "The island of Pharos, which sheltered the future harbor of Alexandria, was mentioned by Homer in the Odyssey."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 2", "Horden, P. & Purcell, N. The Corrupting Sea (Blackwell, 2000)", "Pleiades: https://pleiades.stoa.org/places/727070"])],

    ['naukratis',
      "Naukratis was the only Greek trading post (emporion) officially sanctioned in Egypt, established by Pharaoh Amasis around 570 BCE. Greek merchants from Miletos, Aegina, Samos, and other cities were required to conduct all their Egyptian trade through this single port on the Canopic branch of the Nile. By the 530s BCE, the settlement was a thriving multicultural trading post with separate Greek sanctuaries (a Hellenion shared by multiple cities) and a bustling waterfront where Greek wine, silver, and olive oil were exchanged for Egyptian grain, papyrus, and linen.",
      "Naukratis was uniquely cosmopolitan — Greeks from a dozen different city-states lived alongside Egyptian merchants, craftsmen, and officials. Each major Greek trading city maintained its own temple within the emporion: Miletos worshipped Apollo, Aegina honored Zeus, and a shared Hellenion served the remaining communities. Egyptian customs officials regulated trade, and pharaonic law governed disputes between Greek and Egyptian merchants.",
      "Egyptian grain (the Nile delta was the Mediterranean's greatest breadbasket), papyrus, fine linen, ivory and gold from upper Nile trade routes, natron, and alabaster vessels.",
      JSON.stringify(["Pharaoh Amasis required ALL Greek trade with Egypt to pass through Naukratis — no other port was permitted.", "The Hellenion at Naukratis was a shared sanctuary funded by nine Greek city-states that could not afford individual temples.", "Greek potters at Naukratis developed a distinctive style blending Greek forms with Egyptian decorative motifs."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 2.178-179", "Boardman, J. The Greeks Overseas (Thames & Hudson, 1999)", "Pleiades: https://pleiades.stoa.org/places/727199"])],

    ['memphis',
      "Memphis was the ancient administrative capital of Egypt, located at the apex of the Nile delta where the river splits into its distributary channels flowing north to the Mediterranean. In the 530s BCE, under Pharaoh Amasis II, Memphis remained a massive city — one of the largest in the world — housing the great temple of Ptah, enormous grain warehouses, and communities of Greek, Phoenician, and Carian merchants. The city controlled the collection and distribution of Nile grain, Egypt's most valuable resource.",
      "Memphis was sacred to Ptah, the craftsman god, and his temple complex rivaled Karnak in scale. The Apis bull — a living bull believed to be the incarnation of Ptah — was housed in lavish quarters and its death triggered national mourning and elaborate mummification. Greek and Phoenician merchants had their own quarter in the city, maintaining temples to their own gods while participating in Egyptian commercial life.",
      "Grain (Memphis was the central collection and distribution point for Upper Egyptian produce), papyrus, fine linen, gold and ivory from Nubian trade, and natron from the western desert.",
      JSON.stringify(["The Apis bull of Memphis was so sacred that Persian king Cambyses' alleged killing of the bull was considered one of history's greatest acts of sacrilege.", "Memphis's grain warehouses were among the largest structures in the ancient world — Egypt's agricultural surplus was collected and taxed here.", "Greek mercenary soldiers stationed at Memphis formed one of the earliest Greek communities in Egypt."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Books 2-3", "Braudel, F. The Mediterranean and the Mediterranean World (University of California Press, 1995)", "Pleiades: https://pleiades.stoa.org/places/786022"])],

    // ── Levant ──────────────────────────────────────────────────
    ['tyre',
      "Tyre was the greatest of the Phoenician city-states, built on an island fortress just off the Levantine coast. In the 530s BCE, Tyre was under Persian rule following Cyrus's conquest of the region, but maintained significant autonomy as the Persians valued Tyrian naval expertise and commercial networks. The city's merchants had established colonies from Carthage to Cadiz. Tyre controlled production of Tyrian purple dye — extracted from murex sea-snails — the most valuable commodity in the ancient Mediterranean.",
      "Tyrian culture was quintessentially Phoenician — the city worshipped Melqart (equivalent to Heracles), Ba'al, and Astarte. The temple of Melqart, with its twin pillars described by Herodotus, was one of the most famous sanctuaries in the ancient world. Tyrian sailors were legendary navigators who had reputedly circumnavigated Africa on behalf of the Egyptian pharaoh Necho. Society was dominated by merchant families whose commercial networks spanned the Mediterranean.",
      "Tyrian purple dye (worth more than its weight in gold), glass, fine textiles, cedar timber from Mount Lebanon, metalwork, and colonies throughout the western Mediterranean.",
      JSON.stringify(["Tyrian purple dye required approximately 10,000 murex sea-snails to produce just 1.4 grams of dye.", "Herodotus visited the Temple of Melqart at Tyre and described its twin pillars — one of gold and one of emerald that glowed at night.", "Phoenician sailors from Tyre reportedly circumnavigated Africa around 600 BCE on orders from Pharaoh Necho II."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Books 1-2", "Aubet, M.E. The Phoenicians and the West (Cambridge University Press, 2001)", "Pleiades: https://pleiades.stoa.org/places/678437"])],

    ['sidon',
      "Sidon was one of the oldest and most important Phoenician city-states, rivaling Tyre in commercial importance. In the 530s BCE, Sidon was under Persian rule but prospered as a key naval base for the Persian fleet. The city's craftsmen were renowned for extraordinary glasswork and fine metalwork — Homer's heroes prized Sidonian silver bowls as the greatest of prizes. Sidon may have been the original home of the purple-dyeing industry before Tyre eclipsed it in fame.",
      "Sidonian culture shared the Phoenician religious traditions of Tyre — worship of Astarte (Aphrodite), Eshmun (a healing god whose temple complex was magnificent), and Ba'al. The city was renowned for artistic craftsmanship — Sidonian metalworkers, weavers, and glass-artisans were considered the finest in the ancient world. Under Persian rule, Sidonian kings maintained considerable autonomy in exchange for providing warships to the Great King's navy.",
      "Fine glassware (Sidon was likely where core-formed glass vessels were perfected), silver and bronze bowls and vessels, purple-dyed textiles, and cedar timber.",
      JSON.stringify(["Homer praised Sidonian craftsmen as the finest artisans in the world — 'a mixing bowl of silver, the loveliest in all the world, a masterpiece of Sidonian workmanship.'", "The technique of core-formed glass vessel production was likely perfected in the Sidon-Tyre region.", "Sidonian ships formed a crucial component of the Persian imperial navy under Darius and Xerxes."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 7", "Aubet, M.E. The Phoenicians and the West (Cambridge University Press, 2001)", "Pleiades: https://pleiades.stoa.org/places/678405"])],

    ['byblos',
      "Byblos was one of the world's oldest continuously inhabited cities, with settlement stretching back before 5000 BCE. By the 530s BCE, the city's greatest days as Egypt's primary timber supplier were in the past, but Byblos remained an important port on the Levantine coast under Persian rule. Lebanese cedar — the tall, straight, fragrant timber from the mountain forests above the city — was still in demand for shipbuilding and construction throughout the Mediterranean. Egypt's papyrus had traditionally reached Greece through Byblos, giving the city its enduring association with books.",
      "Byblos had ancient ties to Egypt stretching back millennia — the city's patron deity, the Lady of Byblos, was identified with Isis/Hathor by Egyptians. The myth of Osiris was connected to Byblos, where Isis supposedly recovered Osiris's body from a cedar pillar. Religious life blended Phoenician and Egyptian elements. The city's long history gave it a prestige among Phoenician cities that newer, more powerful Tyre and Sidon could not match.",
      "Lebanese cedar timber (still the city's most famous export), papyrus transshipped from Egypt to Greece, wine, olive oil, and religious objects associated with the ancient Isis-Osiris cult.",
      JSON.stringify(["The Greek word for book (biblos/byblos) and ultimately 'Bible' derives from this city's name, because Egyptian papyrus reached Greece through Byblos.", "Byblos' trade with Egypt was so ancient that Egyptian royal inscriptions from 2500 BCE record timber shipments from the city.", "The myth of Isis and Osiris connects to Byblos — Isis supposedly found Osiris's body encased in a cedar tree there."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 2", "Aubet, M.E. The Phoenicians and the West (Cambridge University Press, 2001)", "Pleiades: https://pleiades.stoa.org/places/678063"])],

    ['kition',
      "Kition was the principal Phoenician city on Cyprus, controlling access to the island's rich copper deposits. In the 530s BCE, Cyprus was under the loose suzerainty of Egypt (until the Persian conquest around 525 BCE), and Kition was one of several independent kingdoms on the island. The city's Phoenician rulers maintained close ties with Tyre and the Levantine homeland. Copper mining and smelting were the foundation of Kition's wealth — Cyprus's copper deposits were so abundant that the very name of the metal derives from the island.",
      "Kition's culture blended Phoenician and Cypriot elements. The great temple of Astarte dominated the city, built on the ruins of a much older Bronze Age sanctuary. Copper smelting workshops were located near the temple precinct — metallurgy and religion were closely linked. The population included Phoenician settlers, indigenous Cypriots (Eteocypriots), and Greek merchants. The city was a meeting point of Greek and Near Eastern civilizations.",
      "Copper and bronze (both raw ingots and finished metalwork), timber from Cypriot forests, agricultural produce, and re-export of goods between the Aegean and the Levant.",
      JSON.stringify(["The word 'copper' in European languages ultimately derives from the Latin 'cyprium' (Cypriot metal), reflecting Cyprus's dominance in copper production.", "Kition's temple of Astarte was built directly over an earlier Bronze Age sanctuary, preserving sacred space across more than a thousand years.", "Ox-hide shaped copper ingots from Cyprus have been found in shipwrecks and archaeological sites across the entire Mediterranean."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 5", "Aubet, M.E. The Phoenicians and the West (Cambridge University Press, 2001)", "Pleiades: https://pleiades.stoa.org/places/707498"])],

    ['salamis_cy',
      "Salamis was the principal Greek city on Cyprus, located on the eastern coast facing the Levant. In the 530s BCE, it was one of the island's most prosperous kingdoms, ruled by a succession of local kings. The city's harbor was a natural stopping point for ships traveling between the Aegean and Egypt or the Levant. Cypriot copper, smelted from ores mined in the island's hills, was Salamis's primary export — the Bronze Age may have ended elsewhere, but demand for copper in alloying remained strong.",
      "Salamis blended Greek and Near Eastern cultural traditions. The city claimed Trojan War-era Greek origins through the hero Teucer, son of Telamon. Greek-style temples and gymnasia coexisted with Phoenician-influenced art and religious practices. The royal tombs of Salamis, with their horse sacrifices and rich grave goods, show both Homeric Greek and Near Eastern influences — a uniquely Cypriot fusion culture.",
      "Copper (both raw and worked), timber from Cypriot forests, agricultural products, and transshipment services for Aegean-Levantine trade.",
      JSON.stringify(["The royal tombs of Salamis contained horse sacrifices and rich grave goods echoing Homer's description of Patroclus's funeral.", "Salamis claimed to have been founded by Teucer, half-brother of Ajax, who was exiled after the Trojan War.", "Cyprus sat at the intersection of Greek, Phoenician, Egyptian, and Anatolian trade routes — ships could reach any of these regions in days."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 5", "Boardman, J. The Greeks Overseas (Thames & Hudson, 1999)", "Pleiades: https://pleiades.stoa.org/places/707611"])],

    // ── Iberia ──────────────────────────────────────────────────
    ['emporion',
      "Emporion ('trading post' in Greek) was founded by settlers from Massalia around 575 BCE on the northeastern coast of the Iberian Peninsula. By the 530s BCE, it was the most distant Greek outpost in the west, serving as a vital link between Mediterranean trade networks and the mineral wealth of Iberia. The settlement was physically divided between a Greek quarter (Neapolis) and an adjacent native Iberian town (Indika), reflecting the cultural exchange at the heart of the colony's existence.",
      "Life at Emporion was defined by the frontier — Greek merchants lived in their walled Neapolis, maintaining familiar institutions (agora, temples to Artemis and Asklepios, wine shops) while negotiating daily with Iberian traders across the town boundary. The Iberians were skilled metalworkers who controlled access to the peninsula's extraordinary mineral resources. Greek wine, olive oil, and painted pottery flowed in one direction; silver, tin, iron, and esparto grass flowed in the other.",
      "Silver from Iberian mines, tin from Galicia and the Atlantic, iron ore, esparto grass (for rope), and transshipment of Greek goods (wine, olive oil, pottery) to the Iberian interior.",
      JSON.stringify(["Emporion was literally divided in two — a Greek Neapolis and an Iberian Indika — separated by a wall but connected by trade.", "The name 'Emporion' simply means 'trading post' — the city's very identity was commercial exchange.", "Greek wine amphorae from Emporion have been found deep in the Iberian interior, showing how far Greek trade networks penetrated."]),
      "circa 540-530 BCE",
      JSON.stringify(["Boardman, J. The Greeks Overseas (Thames & Hudson, 1999)", "Horden, P. & Purcell, N. The Corrupting Sea (Blackwell, 2000)", "Pleiades: https://pleiades.stoa.org/places/246347"])],

    ['gadir',
      "Gadir was one of the oldest Phoenician colonies in the western Mediterranean, traditionally founded around 1100 BCE by settlers from Tyre at the very edge of the known world, just beyond the Pillars of Herakles (Gibraltar). By the 530s BCE, Gadir was a thriving Phoenician city with strong ties to Carthage, controlling access to Atlantic trade routes — particularly the tin trade from Cornwall and Brittany, which was essential for bronze-making across the Mediterranean. The city's famous garum fish sauce was already becoming a major export.",
      "Gadir's culture was Phoenician — the city maintained a great temple of Melqart (Herakles) that attracted pilgrims from across the Phoenician world. Its location at the edge of the known world gave it a mystical reputation — the Greeks associated the Pillars of Herakles with the boundary between civilization and the unknown. Daily life centered on fishing, salt production, and the garum industry — enormous stone vats lined the shore where fish entrails were fermented into the pungent sauce.",
      "Tin (from Atlantic trade routes to Cornwall and Brittany), silver from Iberian mines, garum (fermented fish sauce), salted tuna, and salt.",
      JSON.stringify(["Gadir sat just beyond the Pillars of Herakles (Gibraltar) — the boundary the ancients believed marked the end of the known world.", "The tin trade from Cornwall to the Mediterranean may have passed through Gadir for centuries before Greek merchants discovered the route.", "Gadir's temple of Melqart was one of the most famous sanctuaries in the Phoenician world, rivaling the original temple at Tyre."]),
      "circa 540-530 BCE",
      JSON.stringify(["Herodotus, Histories, Book 4", "Aubet, M.E. The Phoenicians and the West (Cambridge University Press, 2001)", "Pleiades: https://pleiades.stoa.org/places/256177"])],
  ];

  const seedAll = db.transaction(() => {
    for (const entry of lore) {
      insert.run(...entry);
    }
  });

  seedAll();
}

/**
 * Get lore for a specific port. Returns null if not found.
 * Parses notable_facts_json and primary_sources_json from strings to arrays.
 */
export function getPortLore(db: Database.Database, portId: string): PortLore | null {
  const row = db.prepare('SELECT * FROM port_lore WHERE port_id = ?').get(portId) as {
    port_id: string;
    history: string;
    culture: string;
    trade_specialization: string;
    notable_facts_json: string;
    historical_period: string;
    primary_sources_json: string;
  } | undefined;

  if (!row) return null;

  return {
    portId: row.port_id,
    history: row.history,
    culture: row.culture,
    tradeSpecialization: row.trade_specialization,
    notableFacts: JSON.parse(row.notable_facts_json) as string[],
    historicalPeriod: row.historical_period,
    primarySources: JSON.parse(row.primary_sources_json) as string[],
  };
}
