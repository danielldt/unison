# Unison Legends – Game Design Document (Balanced Revision)

---

## 1. Core Features

### 1.1 Classless Character System
- **Level Cap:** 99
- **Stat Points:** 5 per level (Total: 495)
- **Starting Stats:** All stats start at 1
- **Stat Scaling Hard Cap:** Max 200 per stat
- **Customization:** Characters are built through gear loadouts, enabling hybrid or specialized roles.

### 1.1.1 Base Attributes
| Attribute | Base Value | Per Level | Cap | Formula |
|-----------|------------|-----------|-----|---------|
| HP | 100 | +20 | 2,080 | `100 + (Level * 20) + (STR * 5)` |
| MP | 50 | +10 | 1,040 | `50 + (Level * 10) + (INT * 3)` |
| Defense | 10 | +2 | 208 | `10 + (Level * 2) + ArmorDEF` |
| Attack Speed | 100% | --- | --- | Modified by AGI and Skills |


### 1.1.2 Starting Equipment
- **Weapon:** F-rank Short Sword (+3 ATK, no bonuses)
- **Armor:** 
  - F-rank Cloth Helmet (+1 DEF)
  - F-rank Cloth Tunic (+2 DEF)
  - F-rank Cloth Leggings (+1 DEF)
- **Consumables:** 3x Minor Health Potion (restores 50 HP)
- **Currency:** 100 Gold

### 1.1.3 Level Up System
- **Level Notification:** Full-screen effect with stat point allocation UI
- **Auto-Allocation Toggle:** Optional auto-distribution based on preferred build
- **Milestone Bonuses:** Every 10 levels grants +3 additional stat points
- **Level-Up Recovery:** Full HP/MP restored on level up

### 1.2 Loadout System
- **Fixed Loadout:** Cannot change weapons/skills during combat.
- **Pre-Combat Selection Only.**
- **UI Tabs:** 5 Weapons | 5 Skills | 5 Consumables

### 1.3 Combat Mechanics
- **Combat Type:** Real-time + cooldown timing
- **Action Limit:** 1 per cooldown phase
- **Cooldowns:** Weapon (2–5s), Skills (independent CD + MP cost)
- **Cast Time:** 0.5–3s (skills only)
- **Global Cooldown:** 1s to prevent spam
- **Targeting:** Tab-target selection with no positional elements
- **Wave Structure:** Sequential mob groups with no movement mechanics

### 1.4 Damage Calculations
- **Base Damage Formula:** `BaseDamage = (WeaponDMG + PrimaryStat) * (1 + EnhancementBonus)`
- **Final Damage:** `FinalDMG = BaseDamage * (1 + CritMultiplier) * (1 - TargetDefenseReduction) * (1 + FlatDMGBonus)`
- **Critical Hit:** `CriticalChance = BaseCritRate + LUK/400 + ItemCritRate`
- **Critical Multiplier:** `CritMultiplier = 1.5 + (CritDamage/100)`
- **Hit Chance:** `HitChance = 0.95 + (DEX - TargetLevel)/200`
- **Minimum Hit Chance:** 0.7 (70% chance) regardless of level difference

### 1.5 Defense & Damage Reduction
- **Defense Formula:** `DamageReduction = DEF / (DEF + 100 + 10*AttackerLevel)`
- **Maximum Reduction:** 75% at endgame levels
- **Minimum Damage:** 1% of base damage always applies regardless of defense
- **Dodge Chance:** `DodgeChance = BaseAGI/400 + ItemDodgeRate` (capped at 30%)

### 1.6 Status Effects
| Effect | Duration | Stacking | Description |
|--------|----------|----------|-------------|
| Burn | 10s | Refreshed | DoT: 2% max HP per second |
| Chill | 8s | Refreshed | Cooldowns +20% |
| Shock | 5s | Refreshed | -15% defense |
| Poison | 15s | Stacks 3x | DoT: 1% max HP per stack per second |
| Stun | 2s | Cannot stack | Cannot act |
| Weaken | 8s | Refreshed | -25% damage |
| Berserk | 10s | Refreshed | +25% damage, -10% defense |
| Haste | 6s | Refreshed | -20% cooldowns |
| Regen | 12s | Refreshed | Heal 2% max HP per second |
| Shield | Until depleted | Stacks strength | Absorbs damage up to 20% max HP |

---

## 2. Stats System

### 2.1 Primary Stats
| Stat | Effect |
|------|--------|
| STR | Sword/Shield damage, physical skills |
| INT | Orb/Staff magic damage, healing |
| AGI | Bow/Dagger damage, dodge rate |
| DEX | Hit accuracy |
| LUK | Crit rate, drop rate |

### 2.2 Secondary Stats (Gear Only)
| Stat | Range |
|------|-------|
| Crit Damage | +10 to +50 |
| Crit Rate % | +3% to +10% |
| Skill CD Reduction | +1% to +5% |
| Flat DMG Bonus % | +5% to +10% |
| HP | +50 to +250 |
| MP | +30 to +150 |

---

## 3. Equipment System

### 3.1 Weapon Types
| Weapon | Stat | Role | Cooldown |
|--------|------|------|----------|
| Sword | STR | Melee DPS | 3–5s |
| Shield | STR | Tank/Utility | 3–5s |
| Orb | INT | Magic DPS | 3–5s |
| Staff | INT | Healer/Support | 4–5s |
| Bow | AGI | Ranged DPS | 2–4s |
| Dagger | AGI | Burst DPS | 2–3s |

### 3.2 Weapon Skills
- 1 skill per weapon (auto-generated via seed)
- Skill Types: ATTACK, BUFF, DEBUFF, HEAL
- Targets: SELF, SINGLE_ENEMY, ALL_ENEMIES
- **Weapon-Specific Skill Roles:**
  - **Sword:** High single-target damage skills
  - **Shield:** Defensive buffs and taunts
  - **Orb:** AOE damage and debuffs
  - **Staff:** Healing and ally buffs
  - **Bow:** DOT (damage over time) and slowing effects
  - **Dagger:** Crit-enhancing and armor-piercing attacks

### 3.3 Rarity Tiers
| Tier | Bonus |
|------|-------|
| F–E | 2 random stats |
| D–C | 3 random stats |
| B–A | 4 random stats |
| S–SSS | 5 stats + unique buff (SSS only) |

### 3.4 Armor
- **Slots:** Head, Body, Legs
- **Stat:** DEF (affects all incoming damage)
- Follows same rarity structure as weapons

### 3.5 Item Level Scaling
- **Base Stats:** All items have level requirements
- **Weapon Base Damage:** `BaseDMG = 5 + (2 * ItemLevel) * RarityMultiplier`
- **Armor Base Defense:** `BaseDEF = 2 + (1 * ItemLevel) * RarityMultiplier`

| Rarity | Multiplier | Level Range |
|--------|------------|-------------|
| F | 0.8 | 1-20 |
| E | 0.9 | 1-30 |
| D | 1.0 | 10-40 |
| C | 1.1 | 20-60 |
| B | 1.2 | 30-70 |
| A | 1.3 | 40-80 |
| S | 1.4 | 50-90 |
| SS | 1.5 | 60-99 |
| SSS | 1.6 | 70-99 |

### 3.6 Secondary Stat Ranges
| Stat | Formula | Cap |
|------|---------|-----|
| Crit Damage | `10 + (Rarity * 5) + Random(0-5)` | +50 |
| Crit Rate % | `2 + (Rarity * 1) + Random(0-1)` | +10% |
| Skill CD Reduction | `1 + (Rarity * 0.5) + Random(0-0.5)` | +5% |
| Flat DMG Bonus % | `2 + (Rarity * 1) + Random(0-2)` | +10% |
| HP | `30 + (Rarity * 20) + (Level * 0.5) + Random(0-20)` | +250 |
| MP | `20 + (Rarity * 10) + (Level * 0.3) + Random(0-10)` | +150 |

**Note:** Rarity values in formulas: F=1, E=2, D=3, C=4, B=5, A=6, S=7, SS=8, SSS=9

### 3.7 Weapon Base Values
| Weapon | Base DMG | DMG/Level | ATK Speed |
|--------|----------|-----------|-----------|
| Sword | 10 | 2.2 | 100% |
| Shield | 5 | 1.5 | 80% |
| Orb | 8 | 2.0 | 90% |
| Staff | 6 | 1.8 | 90% |
| Bow | 9 | 2.0 | 120% |
| Dagger | 7 | 1.7 | 150% |

### 3.8 Item Durability and Repair
- **No durability system** - Items never break or degrade through normal use
- **Death Penalty:** None on equipment, only XP and gold loss

---

## 4. Dungeons

### 4.1 Types
| Type | Level Range | Waves |
|------|-------------|-------|
| Normal | 1–50 | 4–5 |
| Elite | 50–99 | 5–6 |
| Raid | Weekly | 6 |
| Event | Special | Varies |
| Co-op | Multiplayer | Varies |

### 4.2 Seed-Based Generation
- Format: `[Object] [Place] [Adjective]`
- Seed affects: wave count, mob type, rarity, and loot
- ~27,000 permutations

### 4.3 Loot System
- Gold (guaranteed)
- Materials (80%)
- Enhancement Gems (50%)
- Protection Scrolls (10%)
- Potions & Stat Potions (10%)

---

## 5. PvP
- 1v1 and 3v3 Modes
- MMR-based matchmaking
- Seasonal rewards
- Cooldown syncing ensures fairness

---

## 6. Crafting
- **3x3 Grid Recipes**, inspired by Minecraft
- Output rarity based on material average
- +5% rarity bonus for full B+ materials

### 6.1 Crafting Interface
- **Grid System:** 3x3 placement grid
- **Recipe Book:** Unlocked recipes visible in compendium
- **Material Storage:** Direct access to inventory materials
- **Preview:** Shows potential outcome before crafting
- **Bulk Crafting:** Option to craft multiple items at once

### 6.2 Material Tiers
| Tier | Color | Source | Used For |
|------|-------|--------|----------|
| Common | White | All dungeons | Basic equipment, consumables |
| Uncommon | Green | Tier 2+ | Enhanced consumables, D-C gear |
| Rare | Blue | Tier 3+ | B-A weapons, skill modifiers |
| Epic | Purple | Elite/Raid | S-SS gear, special effects |
| Legendary | Orange | Raid only | SSS gear, unique abilities |

### 6.3 Basic Recipes
| Recipe Pattern | Output | Materials |
|----------------|--------|-----------|
| C C C<br>C - C<br>C C C | Basic Weapon | 8 Common metal (C) |
| C C C<br>C L C<br>C C C | Sword | 8 Common metal (C), 1 Leather (L) |
| M M M<br>M L M<br>M - M | Shield | 7 Metal (M), 1 Leather (L) |
| G G G<br>G C G<br>G G G | Orb | 8 Gems (G), 1 Crystal (C) |
| W - W<br>W S W<br>W - W | Staff | 5 Wood (W), 1 Stone (S) |
| W S W<br>L S L<br>W S W | Bow | 3 Wood (W), 3 String (S), 2 Leather (L) |
| M - -<br>M M -<br>- M M | Dagger | 4 Metal (M) |

### 6.4 Advanced Recipes
| Recipe Pattern | Output | Materials |
|----------------|--------|-----------|
| P P P<br>P R P<br>P P P | Health Potion | 8 Plant (P), 1 Rare essence (R) |
| P E P<br>E R E<br>P E P | Mana Potion | 4 Plant (P), 4 Ether (E), 1 Rare essence (R) |
| R R R<br>R E R<br>R R R | Stat Potion | 8 Rare essence (R), 1 Epic core (E) |
| L L L<br>L E L<br>L L L | Legendary Infusion | 8 Legendary (L), 1 Epic core (E) |

### 6.5 Special Crafting Mechanics
- **Random Stat Variation:** Each craft has ±10% random variation
- **Critical Crafting:** 5% chance to create item one rarity higher
- **Expertise System:** Crafting same item type increases quality over time
- **Discovery:** Some recipes only found through experimentation
- **Blueprint System:** Raid bosses drop special blueprints for unique items

---

## 7. Enhancement
- Max +99
- Costs gold based on enhancement level
- Fail chance from +10, resets to +9 unless protected
- Scaling:
  - Weapon: +1.5% DMG/level
  - Armor: +1.5% DEF/level

### 7.1 Enhancement Success Rates
| Level Range | Success Rate | Gold Cost |
|-------------|--------------|-----------|
| +0 to +9 | 100% | 500 |
| +10 to +20 | 80% | 1,000 |
| +21 to +30 | 70% | 2,000 |
| +31 to +40 | 60% | 5,000 |
| +41 to +50 | 50% | 10,000 |
| +51 to +60 | 40% | 20,000 |
| +61 to +70 | 30% | 50,000 |
| +71 to +80 | 20% | 100,000 |
| +81 to +90 | 10% | 250,000 |
| +91 to +99 | 5% | 500,000 |

### 7.2 Protection System
- **Protection Scrolls:** Prevents item level loss on enhancement failure
- **Scroll Acquisition:**
  - Dungeon drops (1% base chance, affected by LUK)
  - Purchasable from blacksmith for 10,000 gold each
  - Weekly raid reward (guaranteed 1-3 scrolls)
- **Scroll Types:**
  - **Minor Scroll:** Works up to +30, consumed on use
  - **Standard Scroll:** Works up to +50, consumed on use
  - **Superior Scroll:** Works up to +70, consumed on use
  - **Ultimate Scroll:** Works up to +99, consumed on use
- **Scroll Quality Distribution:**
  - Normal dungeons: 80% Minor, 20% Standard
  - Elite dungeons: 50% Minor, 40% Standard, 10% Superior
  - Raid dungeons: 30% Standard, 50% Superior, 20% Ultimate
- **Auto-Protection:** Option to automatically use scrolls when enhancing
- **Guaranteed Enhancement:** At +30/50/70/90, success is guaranteed (milestone bonuses)

### 7.3 Enhancement Bonuses
| Level | Weapon DMG | Armor DEF | Secondary Stat Bonus |
|-------|------------|-----------|----------------------|
| +10 | +15% | +15% | None |
| +20 | +30% | +30% | +1 Random Stat |
| +30 | +45% | +45% | +2 Random Stats |
| +50 | +75% | +75% | +3 Random Stats |
| +70 | +105% | +105% | +4 Random Stats |
| +90 | +135% | +135% | +5 Random Stats |
| +99 | +148.5% | +148.5% | +6 Random Stats + Special Effect |

---

## 8. Fusion
- Combine 5 of same rarity → rerolled result
- 10% bonus success if using full +10 gear
- **Reroll Mechanics:**
  - All item stats are regenerated
  - Weapon skills are rerolled with new seed
  - Weapon/armor type remains unchanged
  - Enhancement level resets to +0
  - For SSS items, unique buffs are also rerolled

---

## 9. SSS Unique Buffs (Examples)
- Lifesteal 5%
- +30 DMG if using same weapon type
- +10% Drop Rate
- +50 Crit DMG, +20% Crit Rate
- +10% Flat DMG Bonus

---

## 10. UI & Visual Design

### 10.1 Style
- Inspired by Minimal Dungeon RPG
- Pixel-style icons
- Static backgrounds (dungeon-themed)
- Tabs: Weapon | Skill | Consumable

### 10.2 Combat UI
- Circular cooldown timers
- Minimal HP/MP bars
- Action buttons optimized for mobile

### 10.3 Wave System
- No map exploration
- Clear wave indicator
- Summary screen at end

### 10.4 Targeting
- Auto target selection at wave start
- Manual target selection via tapping UI
- Target types: Self, Ally, Enemy, All Enemies
- No positional requirements for targeting
- Tab-target system with no spatial combat mechanics

---

## 11. Progression

### 11.1 Leveling
- Max Level: 99
- 5 stat points/level
- 30-day XP curve (see full XP table in doc)

### 11.1.1 XP Table (Key Levels)
| Level | XP Required | Cumulative XP | Days to Reach |
|-------|-------------|---------------|---------------|
| 1-10 | 100-1,000 | 5,500 | 1 |
| 20 | 3,000 | 25,500 | 3 |
| 30 | 6,000 | 73,500 | 6 |
| 40 | 10,000 | 158,500 | 10 |
| 50 | 15,000 | 290,000 | 14 |
| 60 | 22,000 | 481,000 | 18 |
| 70 | 30,000 | 745,000 | 21 |
| 80 | 40,000 | 1,100,000 | 25 |
| 90 | 55,000 | 1,580,000 | 28 |
| 99 | 75,000 | 2,230,000 | 30 |

**Note:** XP gain rates adjusted based on player level and activity type

### 11.1.2 XP Gain Rates
| Activity | Base XP Formula | Level Penalty Formula |
|----------|--------------|---------------|
| Normal Dungeon | `25 * (1 + WaveCount/10) * DungeonLevel` | `PenaltyMult = max(0.2, 1 - 0.2 * floor((PlayerLvl - DungeonLvl) / 10))` |
| Elite Dungeon | `Normal * 1.5` | `PenaltyMult = max(0.5, 1 - 0.1 * floor((PlayerLvl - DungeonLvl) / 10))` |
| Raid Dungeon | `Normal * 3` | No penalty |
| PvP Victory | `50 * OpponentLevel/PlayerLevel` | No penalty |
| Crafting | `5 * ItemRarity * ItemLevel/10` | No penalty |

**Final XP Calculation:**
```
FinalXP = BaseXP * PenaltyMultiplier * EventMultiplier * PremiumMultiplier
where:
- PenaltyMultiplier: Calculated from table above (1.0 if no penalty)
- EventMultiplier: Special event bonus (typically 1.0-2.0)
- PremiumMultiplier: Always 1.0 (no premium bonuses in this game)
```

**Mob XP Distribution:**
- Normal mob: `10 * MobLevel`
- Elite mob: `25 * MobLevel`
- Boss mob: `100 * MobLevel`
- XP awarded on kill, divided equally among party members

**XP Curve Formula:**
For level N, XP required = `100 * (N^1.8)`
This produces a curve that:
- Starts easy (100 XP for level 1)
- Scales to challenging (75,000 XP for level 99)
- Total XP to max level: ~2,230,000

### 11.2 Dungeon XP
- Depends on:
  - Base XP
  - Dungeon type
  - Wave count
  - Seed rarity

### 11.3 Content Unlocking
| Level | Content Unlocked |
|-------|------------------|
| 1 | Normal Dungeons (Tier 1, Levels 1-10) |
| 10 | Crafting System |
| 15 | Enhancement System |
| 20 | Normal Dungeons (Tier 2, Levels 11-20) |
| 25 | Fusion System |
| 30 | PvP Basic Arena (1v1) |
| 40 | Elite Dungeons (Tier 1, Levels 40-60) |
| 50 | Team Arena (3v3) |
| 60 | Elite Dungeons (Tier 2, Levels 61-80) |
| 70 | Weekly Raid (Entry Level) |
| 80 | Elite Dungeons (Tier 3, Levels 81-99) |
| 90 | Weekly Raid (Advanced) |

### 11.4 New Player Progression
- **Tutorial Dungeon:** Forced completion before main menu access
- **New Player Rewards:** Daily login bonuses for first 7 days
- **Catch-Up Mechanics:** +50% XP for characters 20+ levels below server average
- **Mentor System:** High-level players can mentor new players for mutual rewards

---

## 12. Technical Architecture

### 12.1 Frontend
- React + Vite (PWA)
- Tab UI for combat
- Always-online architecture requiring internet connection

### 12.2 Backend
- Node.js
- Colyseus for multiplayer
- SQLite for DB (can upgrade to PostgreSQL)
- JWT + bcrypt for auth

### 12.3 Syncing
- Real-time sync for all game activities
- Auto-save on all significant actions
- No offline progression or gameplay

### 12.4 Data Persistence
- **Server-Side Storage:**
  - Character stats and progression
  - Inventory and equipment data
  - Dungeon seeds and completion records
  - Achievement tracking
  - Social data (friends, guilds)
- **Client-Side Storage:**
  - UI preferences (via localStorage)
  - Graphics settings
  - Control configurations
  - Sound settings
  - Recently visited menus (for navigation history)
- **Hybrid Storage:**
  - Chat logs (recent history client-side, full history server-side)
  - Dungeon maps (cached client-side, generated server-side)
- **Account Recovery:**
  - Email verification required
  - Account recovery via email link
  - 30-day data retention for inactive accounts
- **Device Migration:**
  - Cross-device login with same account
  - Client preferences not synchronized between devices
  - Option to export/import client settings manually

### 12.5 Security Measures
- **Anti-Cheat:**
  - Server-side validation of all transactions
  - Client-side prediction for responsiveness
  - Hash verification of client files
- **Rate Limiting:**
  - 60 API calls per minute per user
  - IP-based throttling for login attempts
- **Data Privacy:**
  - Encrypted passwords (bcrypt)
  - No storing of payment information
  - GDPR-compliant data handling

---

## 13. Mob AI System

### 13.1 Behavior Types
- **Aggressive:** Prioritizes attacking player characters immediately
- **Defensive:** Only uses attacks after being targeted by players
- **Support:** Prioritizes healing and buffing other mobs
- **Ranged:** Favors AOE attacks that hit multiple targets
- **Boss:** Uses special attack patterns and phase-based mechanics

### 13.2 Decision Making
- Priority-based targeting (tanks > healers > DPS)
- Cooldown management similar to players
- Skill selection based on mob type and situation
- Threat level tracking for aggro management

### 13.3 Difficulty Scaling
- **Normal:** Basic attack patterns, predictable
- **Elite:** Uses skills more strategically, focuses vulnerable targets
- **Boss:** Complex patterns, phase changes at health thresholds
- **Raid:** Coordinated attack selection between multiple mob types

### 13.4 Seed Influence
- Seed determines mob type distribution
- Affects AI aggression level and skill usage
- Generates unique boss mechanics for raid encounters
- Creates synergies between different mob types in the same wave

---

**Note:** Combat is purely tab-target based with no positional elements. All references to mobs "staying back" or "maintaining distance" are conceptual for AI targeting priority rather than actual spatial positioning. The system focuses on target selection and cooldown management rather than movement.

**Note:** All data (dungeons, mobs, items, gear) is seed-generated. No static item database is required. The entire system should be scalable with minimal admin input.

## 14. Game Economy

### 14.1 Free-to-Play Model
- **Core Model:** Completely free, no microtransactions
- **Ad-Free:** No advertisements or monetization
- **Equal Access:** All players have identical access to all content

### 14.2 Resources
- **Gold:** Earned through dungeons and activities
  - Primary currency for enhancements, crafting, and item purchases
  - Can be farmed through normal gameplay
- **Gems:** Earned through achievements and milestones
  - Premium currency convertible to gold (1 gem = 1,000 gold)
  - Obtained from:
    - Achievement completion (1-50 gems)
    - Daily login rewards (5 gems daily)
    - Weekly raids (10-30 gems)
    - Special events (25-100 gems)
  - Used for special time-limited cosmetic items
- **Materials:** Obtained from dungeons for crafting
  - Divided into tiers (Common, Uncommon, Rare, Epic, Legendary)
  - Higher tier materials drop from higher-level dungeons

### 14.3 Inventory System
- **Unlimited Storage:** No inventory restrictions
- **Auto-Sorting:** Items automatically categorized by type
- **Search & Filter:** Comprehensive search and filter options
- **Loadout Storage:** Unlimited saved loadout configurations

### 14.4 Resource Balance
- **Currency Generation:**
  - Basic dungeon (Tier 1): 100-500 gold
  - Elite dungeon (Tier 1): 500-2,000 gold
  - Raid dungeon: 5,000-10,000 gold
  - Daily gold cap: 50,000 gold
- **Material Drop Rates:**
  - Common: 50% chance per mob
  - Uncommon: 20% chance per mob
  - Rare: 5% chance per mob
  - Epic: 1% chance per mob
  - Legendary: 0.1% chance per mob
- **Resource Sinks:**
  - Enhancement costs scale exponentially to balance gold surplus
  - High-level crafting requires significant material investment
  - Weekly gold sink events (special merchants, limited-time items)
- **Anti-Hoarding Mechanics:**
  - Material trading system for converting excess low-tier materials
  - Material fusion (combine 10 of one tier to create 1 of next tier)
  - Special crafting recipes that use large quantities of common materials

## 15. Seed Generation System

### 15.1 Seed Architecture
- **Base Seed Format:** 64-bit integer hash derived from string input
- **Sub-Seed Generation:** Main seed spawns deterministic sub-seeds for different systems
- **Seeding Algorithm:** 
  ```
  function generateSeed(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    // Combine with timestamp for uniqueness if needed
    return Math.abs(hash);
  }
  ```

### 15.2 Dungeon Seed Components
- **Name Generation:**
  - Object list (100 entries): Tools, monsters, elements, materials
  - Place list (100 entries): Locations, environments, structures
  - Adjective list (100 entries): Qualities, states, descriptors
  - Total permutations: 1,000,000 unique dungeon names
- **Layout Generation:**
  - Wave count determined by `(seed % 3) + baseDungeonWaves`
  - Room layout based on `(seed >> 8) % totalLayoutTemplates`
  - Background selection from `(seed >> 16) % availableBackgrounds`

### 15.3 Item Seed Mechanics
- **Rarity Determination:**
  ```
  function determineRarity(itemSeed, playerLevel) {
    const baseRoll = (itemSeed % 100) / 100; // 0.0-0.99
    const levelBonus = playerLevel / 200; // 0.0-0.495 at level 99
    const finalRoll = baseRoll + levelBonus;
    
    // Rarity thresholds
    if (finalRoll > 0.99) return 'SSS';
    if (finalRoll > 0.97) return 'SS';
    // ... other thresholds
    return 'F';
  }
  ```
- **Stat Generation:**
  - Each stat derived from specific bit ranges of the seed
  - Example: `critDamage = 10 + (rarity * 5) + ((itemSeed >> 4) % 6)`
  - Ensures same seed always produces identical item stats

### 15.4 Skill Generation
- **Skill Type Selection:**
  ```
  function selectSkillType(seed, weaponType) {
    const typeWeights = getWeightsForWeaponType(weaponType);
    const roll = (seed % 100) / 100;
    
    let accumulatedWeight = 0;
    for (const [type, weight] of Object.entries(typeWeights)) {
      accumulatedWeight += weight;
      if (roll < accumulatedWeight) return type;
    }
    return 'ATTACK'; // Default fallback
  }
  ```
- **Skill Value Determination:**
  - Damage: `(weaponDmg * (0.8 + ((seed >> 16) % 41) / 100))`
  - Duration: `baseDuration + ((seed >> 8) % varianceRange)`
  - Cooldown: `baseCooldown - ((seed % 21) / 10)`

### 15.5 Reproducibility Guarantees
- **Validation System:** Checksum verification ensures seed integrity
- **Version Control:** Seed interpretation varies by game version to allow updates
- **Fallback System:** Invalid seeds replaced with stable defaults to prevent crashes
- **Test Suite:** Comprehensive seed testing for boundary conditions

## 16. Network Architecture & Implementation

### 16.1 Network Handling
- **Disconnect Recovery:**
  - Client reconnect attempts for 5 minutes with exponential backoff
  - Session state preserved for 10 minutes on server
  - Auto-resume from last saved checkpoint upon reconnection
  - Reward preservation guaranteed for completed activities
- **Retry Logic:**
  - Automatic retries for all server requests (up to 3 attempts)
  - Jitter-based timing (300ms base + random 0-200ms)
  - Transactional operations use idempotency keys
  - Local queue for pending operations when offline
- **Latency Compensation:**
  - Client-side prediction for combat actions (fire-and-forget)
  - Server reconciliation for damage calculations
  - Adaptive timing based on connection quality (50-200ms grace)
  - Timeout handling for extended network issues (auto-pause after 5s)

### 16.2 Technical Specifications
- **Database Schema:**
  ```
  User {
    id: UUID primary key
    username: string unique
    email: string unique
    passwordHash: string
    created: timestamp
    lastLogin: timestamp
    status: enum [ACTIVE, BANNED, INACTIVE]
    
    Indexes:
    - PRIMARY KEY (id)
    - UNIQUE INDEX idx_user_username (username)
    - UNIQUE INDEX idx_user_email (email)
    - INDEX idx_user_status (status)
  }
  
  Character {
    id: UUID primary key
    userId: UUID foreign key
    level: integer
    experience: integer
    gold: integer
    gems: integer
    stats: jsonb {str, int, agi, dex, luk}
    created: timestamp
    lastPlayed: timestamp
    
    Indexes:
    - PRIMARY KEY (id)
    - FOREIGN KEY (userId) REFERENCES User(id)
    - INDEX idx_character_level (level)
    - INDEX idx_character_lastPlayed (lastPlayed)
  }
  
  Inventory {
    id: UUID primary key
    characterId: UUID foreign key
    items: jsonb[]
    lastUpdated: timestamp
    
    Indexes:
    - PRIMARY KEY (id)
    - FOREIGN KEY (characterId) REFERENCES Character(id)
    - INDEX idx_inventory_lastUpdated (lastUpdated)
  }
  
  DungeonProgress {
    id: UUID primary key
    characterId: UUID foreign key
    seed: string
    completedWaves: integer
    status: enum [IN_PROGRESS, COMPLETED, ABANDONED]
    started: timestamp
    lastUpdated: timestamp
    
    Indexes:
    - PRIMARY KEY (id)
    - FOREIGN KEY (characterId) REFERENCES Character(id)
    - INDEX idx_dungeonProgress_status (status)
    - INDEX idx_dungeonProgress_lastUpdated (lastUpdated)
  }
  
  Event {
    id: UUID primary key
    eventType: string
    name: string
    description: string
    startTime: timestamp
    endTime: timestamp
    status: enum [SCHEDULED, ACTIVE, COMPLETED, CANCELLED]
    parameters: jsonb
    rewards: jsonb[]
    
    Indexes:
    - PRIMARY KEY (id)
    - INDEX idx_event_type (eventType)
    - INDEX idx_event_status (status)
    - INDEX idx_event_timeRange (startTime, endTime)
  }
  
  EventParticipation {
    id: UUID primary key
    eventId: UUID foreign key
    characterId: UUID foreign key
    joinTime: timestamp
    score: integer
    rewardsClaimed: boolean
    lastActivity: timestamp
    
    Indexes:
    - PRIMARY KEY (id)
    - FOREIGN KEY (eventId) REFERENCES Event(id)
    - FOREIGN KEY (characterId) REFERENCES Character(id)
    - INDEX idx_eventParticipation_composite (eventId, characterId)
    - INDEX idx_eventParticipation_score (score) /* For leaderboards */
  }
  
  BalanceParameters {
    id: UUID primary key
    parameterKey: string unique
    value: double
    minValue: double
    maxValue: double
    defaultValue: double
    lastUpdated: timestamp
    description: string
    category: string
    
    Indexes:
    - PRIMARY KEY (id)
    - UNIQUE INDEX idx_balanceParameter_key (parameterKey)
    - INDEX idx_balanceParameter_category (category)
    - INDEX idx_balanceParameter_lastUpdated (lastUpdated)
  }
  
  MetricsTimeSeries {
    id: UUID primary key
    metricKey: string
    timestamp: timestamp
    value: double
    sampleSize: integer
    
    Indexes:
    - PRIMARY KEY (id)
    - INDEX idx_metrics_key (metricKey)
    - INDEX idx_metrics_time (timestamp)
    - INDEX idx_metrics_composite (metricKey, timestamp)
  }
  
  AnomalyDetection {
    id: UUID primary key
    characterId: UUID foreign key
    timestamp: timestamp
    metricKey: string
    expectedValue: double
    actualValue: double
    zScore: double
    status: enum [FLAGGED, RESTRICTED, SUSPENDED, REVIEWED, CLEARED]
    
    Indexes:
    - PRIMARY KEY (id)
    - FOREIGN KEY (characterId) REFERENCES Character(id)
    - INDEX idx_anomaly_status (status)
    - INDEX idx_anomaly_time (timestamp)
    - INDEX idx_anomaly_severity (zScore)
  }
  ```
- **API Endpoints:**
  - `/api/auth` - Authentication and session management
  - `/api/character` - Character creation and management
  - `/api/inventory` - Inventory operations
  - `/api/dungeon` - Dungeon generation and progression
  - `/api/combat` - Combat actions and calculations
  - `/api/social` - Friends and social features
  - `/api/market` - Trading system (future feature)
- **Request/Response Format:**
  ```
  // Standard request format
  {
    "requestId": "uuid-v4",
    "timestamp": 1625097600000,
    "action": "string",
    "data": {}, // payload
    "version": "1.0.0"
  }
  
  // Standard response format
  {
    "requestId": "uuid-v4", // echo
    "timestamp": 1625097600050,
    "status": "SUCCESS|ERROR|PENDING",
    "data": {}, // response payload
    "error": null, // or error details
    "version": "1.0.0"
  }
  ```
- **Server Architecture:**
  - Dedicated server model (not P2P)
  - Game logic server: Node.js + Express
  - Real-time server: Colyseus framework
  - Stateless design with load balancing
  - Redis for session state and caching
  - Database: PostgreSQL for persistence

### 16.3 Content Flow Specification
- **Dungeon Wave Transition:**
  - Automatic transition between waves (3-second delay)
  - Optional "ready" button to skip delay
  - No energy system or entry limitations
  - Wave status displayed on UI with countdown timer
  - Client pre-loads next wave assets during countdown
  - Combat automatically engages on wave start
- **Reset Mechanisms:**
  - No daily/weekly reset mechanics
  - Server maintenance window: Sunday 2-4 AM UTC
  - Event scheduling handled through database flags
  - Seasonal content activated via server configuration
  - Unlimited dungeons per day (no stamina/energy system)

## 17. Content Management Systems

### 17.1 Algorithmic Balance Systems
- **Dynamic Drop Rate Adjustment:**
  - Server monitors item distribution across player base
  - Algorithm adjusts drop rates based on economy metrics:
    ```
    newDropRate = baseDropRate * (targetDistribution / currentDistribution)
    ```
  - Upper/lower bounds ensure rates remain within 50-200% of base values
  - 7-day rolling window for statistical analysis
  - Automatic reports for items with consistent outlier status
- **Resource Flow Monitoring:**
  - Tracks gold sinks vs. gold generation across entire economy
  - Automatic adjustment of gold drops if inflation exceeds 5% monthly
  - Material drop rate balancing based on usage statistics
  - Special event rewards calibrated based on current economy state

### 17.2 Automatic Event Scheduling
- **Event Calendar System:**
  - Pre-programmed annual events (holidays, anniversaries)
  - Dynamic event triggering based on player population metrics
  - Automatic rotation of 12 event types on 2-week cycles
  - Dead period detection (triggers bonus events during low activity)
- **Event Type Generator:**
  ```
  function selectNextEvent() {
    // Weight recent events lower to ensure variety
    const weightedEvents = EVENT_TYPES.map(e => ({
      ...e,
      weight: e.baseWeight * (1 - (RECENCY[e.id] || 0))
    }));
    
    // Select based on weighted random + seasonal factors
    return weightedRandomSelection(weightedEvents);
  }
  
  // Weighted random selection utility function
  function weightedRandomSelection(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item;
    }
    
    return items[0]; // Fallback
  }
  ```
- **Reward Scaling:**
  - Event rewards automatically scale based on player level distribution
  - Participation-based difficulty scaling ensures appropriate challenge
  - Multiple participation tiers with increasing rewards

### 17.3 Dynamic Difficulty Adjustment
- **Player Performance Analysis:**
  - Combat success/failure rate tracked per player
  - Time-to-clear metrics determine skill level
  - Player categorization into performance percentiles
- **Adaptive Difficulty:**
  ```
  function calculateDifficulty(playerData, dungeonSeed) {
    const baseChallenge = getDungeonBaseChallenge(dungeonSeed);
    const playerSkill = getPlayerPerformanceScore(playerData);
    const playerSuccessRate = playerData.recentSuccessRate || 0.75; // Default if no data
    
    // Target 75% success rate
    const adjustmentFactor = 1 + ((0.75 - playerSuccessRate) * 0.5);
    
    // Cap adjustment factor between 0.5 and 1.5
    const cappedAdjustment = Math.max(0.5, Math.min(1.5, adjustmentFactor));
    
    return {
      mobHealth: baseChallenge.mobHealth * cappedAdjustment,
      mobDamage: baseChallenge.mobDamage * cappedAdjustment,
      specialAbilityFrequency: baseChallenge.specialAbilityFrequency * cappedAdjustment
    };
  }
  ```
- **Challenge Banding:**
  - Players segmented into challenge bands based on performance
  - Gradual difficulty increases prevent sudden difficulty spikes
  - Optional "challenge mode" with fixed (non-adjusted) difficulty

### 17.4 Anti-Exploitation Detection
- **Seed Manipulation Protection:**
  - Server-side seed generation with tamper-evident encoding
  - Client seed requests logged and analyzed for patterns
  - Rate limiting on dungeon seed generation (max 50/hour)
  - Hash verification for all client-reported seed-based results
- **Statistical Anomaly Detection:**
  ```
  function detectAnomalies(playerResults, globalStats) {
    const zScores = {};
    for (const [stat, value] of Object.entries(playerResults)) {
      const mean = globalStats[stat].mean;
      const stdDev = globalStats[stat].stdDev;
      zScores[stat] = (value - mean) / stdDev;
    }
    
    // Define thresholds for anomaly detection
    const MILD_ANOMALY_THRESHOLD = 3.0;    // 99.7% of normal distribution
    const SEVERE_ANOMALY_THRESHOLD = 4.0;  // 99.99% of normal distribution
    const CRITICAL_ANOMALY_THRESHOLD = 5.0; // ~1 in 1.7 million chance
    
    return {
      mildAnomalies: Object.entries(zScores)
        .filter(([_, score]) => Math.abs(score) > MILD_ANOMALY_THRESHOLD && Math.abs(score) <= SEVERE_ANOMALY_THRESHOLD)
        .map(([stat, _]) => stat),
      severeAnomalies: Object.entries(zScores)
        .filter(([_, score]) => Math.abs(score) > SEVERE_ANOMALY_THRESHOLD && Math.abs(score) <= CRITICAL_ANOMALY_THRESHOLD)
        .map(([stat, _]) => stat),
      criticalAnomalies: Object.entries(zScores)
        .filter(([_, score]) => Math.abs(score) > CRITICAL_ANOMALY_THRESHOLD)
        .map(([stat, _]) => stat)
    };
  }
  ```
- **Progression Velocity Checks:**
  - Server tracks progression speed metrics
  - Flags accounts with statistical outliers in advancement rate
  - Automatic temporary restrictions for extreme outliers
  - Manual review triggered for consistent anomalies
  - Thresholds: 
    - Flag: 3x average progression rate
    - Auto-restrict: 5x average progression rate
    - Immediate suspend: 10x average progression rate

## 18. System Integration & Cross-Module Communication

### 18.1 Seed Generation & Algorithmic Balance Integration
- **Integration Flow:**
  ```
  ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
  │  Seed Request  │────▶│ Balance Module │────▶│ Seed Generator │
  └────────────────┘     └────────────────┘     └────────────────┘
           │                                             │
           │                     ┌──────────────────────┘
           ▼                     ▼
  ┌────────────────┐     ┌────────────────┐
  │  Client Game   │◀────│ Modified Seed  │
  └────────────────┘     └────────────────┘
  ```

- **Process Flow:**
  1. Client requests dungeon/item generation
  2. Server Balance Module checks current game metrics
  3. Balance Module applies modifiers to seed generation parameters
  4. Seed Generator creates seed with applied modifiers
  5. Modified seed returned to client for deterministic generation
  6. Server stores seed+modifiers pair for validation

- **Balance-to-Seed Modifiers:**
  ```
  function applySeedModifiers(baseSeed, balanceParameters) {
    // Primary seed remains unchanged to preserve reproducibility
    const modifiers = {
      dropRateMultiplier: balanceParameters.currentDropRateModifier,
      rarityThresholdAdjustment: balanceParameters.rarityAdjustment,
      difficultyModifier: balanceParameters.globalDifficultyModifier
    };
    
    // Encode modifiers into an auxiliary seed component
    const modifierSeed = encodeSeedModifiers(modifiers);
    
    return {
      primarySeed: baseSeed,
      modifierSeed: modifierSeed,
      appliedModifiers: modifiers
    };
  }
  ```

- **Modifier Application Points:**
  - Item drop rates: Adjusted before drop roll calculation
  - Rarity thresholds: Modified during item generation
  - Mob difficulty: Applied during mob stat generation
  - Skill parameters: Adjusted during skill selection/generation

### 18.2 Client Prediction & Server Reconciliation
- **Combat Action Flow:**
  ```
  ┌─────────┐   Predict   ┌─────────┐   Commit   ┌─────────┐
  │ Player  │────────────▶│ Client  │───────────▶│ Server  │
  │ Action  │             │ Predict │            │ Validate│
  └─────────┘             └─────────┘            └─────────┘
                               │                      │
                               │                      │
                               ▼                      ▼
                          ┌─────────┐   Match?   ┌─────────┐
                          │ Client  │◀───────────│ Server  │
                          │ State   │   Yes/No   │ State   │
                          └─────────┘            └─────────┘
                               │                      │
                               │                      │
                               │       No Match       │
                               ▼                      ▼
                          ┌─────────────────────────────┐
                          │      State Reconciliation   │
                          └─────────────────────────────┘
  ```

- **Prediction Mechanics:**
  - Client predicts damage based on local state
  - Applied immediately for responsive UI
  - Each action assigned unique ID for reconciliation
  - Server processes action with authoritative calculations
  - Result sent back with same action ID

- **Reconciliation Process:**
  ```
  function reconcileState(clientState, serverState, actionId) {
    if (Math.abs(clientState.damage - serverState.damage) <= ACCEPTABLE_DEVIATION) {
      // Minor deviations acceptable, no correction needed
      return clientState;
    }
    
    // Major deviation requires correction
    logDeviation(clientState, serverState, actionId);
    
    return {
      // Apply server state with smooth visual transition
      health: serverState.health,
      effects: serverState.effects,
      cooldowns: serverState.cooldowns,
      // Client retains positioning control to avoid "snapping"
      position: clientState.position
    };
  }
  ```

- **Latency Compensation:**
  - Server maintains action queue with timestamps
  - Retroactive application of actions based on original timestamp
  - Grace period of 200ms for high-latency connections
  - Automatic adjustment of prediction parameters based on connection quality

### 18.3 Error Handling & Fallbacks
- **Dynamic Difficulty Errors:**
  - If player data unavailable: Use default 0.75 success rate
  - If calculation fails: Fallback to static difficulty for dungeon level
  - Logging of all fallback events for monitoring
  - Circuit breaker pattern: If >5% of requests fail, disable dynamic difficulty for 5 minutes

- **Seed Generation Failures:**
  - Maintain library of 1000 pre-generated seeds as emergency fallback
  - Load balancing across multiple seed generation services
  - Cache frequently used seeds for common game elements
  - Automatic retry with exponential backoff (max 3 attempts)

- **Recovery Mechanisms:**
  - Transaction logging for all game-state-changing operations
  - Ability to replay transaction log from any point
  - Snapshot system creates restore points every 30 minutes
  - Multi-region data replication for disaster recovery

## 19. Technical Implementation Details

### 19.1 Seeding Collision Handling
- **Collision Detection:**
  - Each generated seed includes namespace prefix to segment different generation purposes
  - Hash verification before seed storage in database
  - Unique constraint on seed + namespace combination
- **Collision Resolution:**
  ```
  function generateUniqueSeed(input, namespace) {
    let seed = generateSeed(input);
    let counter = 0;
    
    // Check if seed exists in database
    while (seedExists(seed, namespace) && counter < 10) {
      // Add counter to generate alternative seed
      seed = generateSeed(input + "_" + counter);
      counter++;
    }
    
    // If still colliding after 10 attempts, use timestamp
    if (counter >= 10) {
      seed = generateSeed(input + "_" + Date.now());
    }
    
    return {
      seed: seed,
      namespace: namespace,
      originalInput: input,
      modified: counter > 0
    };
  }
  ```
- **Identifier Structure:**
  - Format: `{namespace}:{seedHash}:{version}`
  - Versioning allows seed interpretation changes while maintaining backward compatibility
  - Hash verification prevents client manipulation

### 19.2 Metric Collection & Aggregation
- **Collection Frequency:**
  | Metric Type | Raw Collection | Aggregation | Retention |
  |------------|----------------|-------------|-----------|
  | Combat performance | Per combat | 1-hour windows | 90 days |
  | Economy metrics | Per transaction | 6-hour windows | 1 year |
  | Player progression | Per level-up | 24-hour windows | Forever |
  | System performance | 1-minute intervals | 1-hour windows | 30 days |
  | Balance parameters | On change | Daily snapshots | Forever |
- **Aggregation Process:**
  - Raw metrics stored in time-series database (InfluxDB)
  - Scheduled aggregation jobs run at specified intervals
  - Summarized data moves to analytical database
  - Anomaly detection runs on both raw and aggregated data
- **Scale Considerations:**
  - Sampling used for high-frequency metrics during peak load
  - Throttling of non-critical metrics if system under stress
  - Separate database servers for metrics to avoid impacting gameplay

### 19.3 Database Transaction Management
- **Isolation Levels:**
  | Operation Type | Isolation Level | Reason |
  |----------------|----------------|--------|
  | Read-only queries | READ COMMITTED | Performance with acceptable staleness |
  | Combat actions | REPEATABLE READ | Consistent state during multi-step combat |
  | Inventory changes | SERIALIZABLE | Prevent lost updates/duplication |
  | Currency transactions | SERIALIZABLE | Financial consistency critical |
  | Metrics collection | READ UNCOMMITTED | Performance over consistency |
- **Transaction Boundaries:**
  - Single-entity changes: Contained in single transaction
  - Multi-entity operations: Two-phase commit pattern
  - Combat resolution: Transaction starts at action, commits at resolution
  - Cross-shard operations: Saga pattern with compensation actions
- **Deadlock Prevention:**
  - Consistent entity locking order enforced
  - Timeout-based deadlock detection (2-second threshold)
  - Low-isolation reads where possible
  - Exponential backoff on transaction retry

### 19.4 API Rate Limiting Implementation
- **Limit Specifications:**
  | Endpoint Type | General Limit | Authenticated Limit | Burst Allowance |
  |---------------|--------------|---------------------|-----------------|
  | Authentication | 10/min | N/A | None |
  | Player actions | 60/min | 120/min | 20 |
  | Read operations | 120/min | 300/min | 50 |
  | Social functions | 30/min | 60/min | 10 |
  | Admin operations | 10/min | 30/min | 5 |
- **Implementation Strategy:**
  - Token bucket algorithm with Redis backend
  - Rate limits stored in user's session
  - Hard and soft limits (warnings at 80% usage)
  - Degraded service rather than complete blocking when possible
- **Response Headers:**
  ```
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 42
  X-RateLimit-Reset: 1623456789
  ```
- **Bypass Mechanisms:**
  - Critical gameplay functions never rate-limited (combat resolution)
  - Emergency system bypass for support operations
  - Rate limit adjustments based on server load

### 19.5 Rollback Procedures
- **Balance Parameter Rollbacks:**
  - All balance changes tracked with version history
  - One-click rollback to previous state
  - Automatic rollback if player engagement metrics drop by >5% after change
  - Shadow period for major changes (dual parameters, measure difference)
- **Emergency Procedures:**
  - Balance parameter changes can be applied server-side without deployment
  - Critical issues trigger automatic incident response:
    1. Alert sent to on-call engineers
    2. Affected systems moved to safe mode
    3. Auto-rollback to last known good configuration
    4. Incident report generated with impact analysis
- **Data Preservation:**
  - Balance state snapshots taken before each adjustment
  - Player-impacting changes logged with before/after state
  - Compensation system for incorrectly affected players
  - Recovery scripts maintained for common rollback scenarios

### 19.6 Cache Management Strategy
- **Cache Layers:**
  | Layer | Purpose | TTL | Invalidation Strategy |
  |-------|---------|-----|----------------------|
  | L1 - Memory | Highest performance | 60s | Time-based expiry |
  | L2 - Redis | Shared across services | 5min | Event-based invalidation |
  | L3 - CDN | Static resources | 1day | Version-based purge |
- **Invalidation Mechanisms:**
  ```
  function invalidateCache(entityType, entityId) {
    // Direct key invalidation
    cacheClient.delete(`${entityType}:${entityId}`);
    
    // Pattern-based invalidation for related entities
    cacheClient.deletePattern(`${entityType}:${entityId}:*`);
    
    // Publish invalidation event for other services
    eventBus.publish('cache.invalidated', {
      entityType,
      entityId,
      timestamp: Date.now()
    });
  }
  ```
- **Write-Through Strategy:**
  - Critical data written to database and cache simultaneously
  - Less critical data uses cache-aside pattern
  - Background refresh for predictable high-demand data
- **Consistency Management:**
  - Cache entries include version identifiers
  - Distributed locks prevent thundering herd on expiry
  - Stale-while-revalidate pattern for seamless updates
  - Circuit breaker detects cache failure and falls back to direct database

