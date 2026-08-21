export type GameMode = 'pve' | 'pvp' | 'ai_vs_ai' | 'swarm';
export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'boss';
export type ArenaMapType = 'classic' | 'lava' | 'ruins' | 'cyber';
export type MapScale = 0.8 | 1.0 | 1.5 | 2.0 | 3.0;
export type SkillControlMode = 'auto' | 'manual' | 'semi_auto';

export interface SkillDefinition {
  id: string;
  name: string;
  keyNameP1: string;
  keyNameP2: string;
  cooldown: number; // in seconds
  energyCost: number;
  description: string;
  iconName: string;
  type: 'attack' | 'dash' | 'defense' | 'ultimate' | 'buff' | 'aoe';
}

export interface CharacterStats {
  hp: number;
  maxHp: number;
  speed: number;
  attackPower: number;
  defense: number;
  attackRange: number; // melee ~50, ranged ~280
  attackSpeed: number; // attacks per sec
  critRate: number; // 0 - 1
  difficulty: number; // 1 - 5
  attackInterval: number; // seconds between autonomous attacks (e.g. 1.2s, 1.8s, 2.4s)
  bounceSpeed: number; // kinetic bounce speed inside the square frame
}

export interface CharacterConfig {
  id: string;
  name: string;
  title: string;
  quote: string;
  themeColor: string;
  glowColor: string;
  accentColor: string;
  stats: CharacterStats;
  baseRole: 'melee' | 'ranged' | 'mage' | 'tank' | 'assassin' | 'controller';
  skills: {
    primary: SkillDefinition;
    skill1: SkillDefinition;
    skill2: SkillDefinition;
    ultimate: SkillDefinition;
  };
  visual: {
    bodyColor: string;
    trimColor: string;
    weaponColor: string;
    auraColor: string;
    avatarEmoji: string;
    shape: 'circle' | 'spikes' | 'hooded' | 'armored' | 'mystic' | 'demon';
  };
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'spark' | 'ring' | 'star' | 'smoke';
}

export interface DamageNumber {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
  life: number;
  maxLife: number;
  isCrit?: boolean;
}

export interface Projectile {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  glowColor: string;
  piercing: boolean;
  piercedCount: number;
  life: number;
  maxLife: number;
  bounces?: number;
  maxBounces?: number;
  speedMultiplierOnBounce?: number;
  trailColor?: string;
  onHitEffect?: 'burn' | 'freeze' | 'stun' | 'explode' | 'lightning';
  aoeRadius?: number;
  rotation?: number;
  type: 'bullet' | 'arrow' | 'slash_wave' | 'lightning_orb' | 'fire_wave' | 'frost_shard' | 'meteor' | 'sniper_bullet' | 'raw_meat' | 'flame_slash';
}

export interface GroundZone {
  id: number;
  ownerId: string;
  team: 1 | 2;
  x: number;
  y: number;
  radius: number;
  duration: number;
  type: 'hellfire';
  damagePerSec: number;
  tickTimer: number;
}

export interface ArenaObstacle {
  x: number;
  y: number;
  radius: number;
  type: 'pillar' | 'crystal' | 'hazard_lava' | 'speed_vent';
  health?: number;
}

export interface ArenaItem {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: 'heal' | 'energy' | 'damage_buff' | 'speed_buff';
  spawnTime: number;
  duration: number;
  active: boolean;
}

export interface FighterStatusEffect {
  type: 'burn' | 'freeze' | 'stun' | 'shield' | 'stealth' | 'speed_boost' | 'attack_boost' | 'invincible' | 'bleed' | 'shocked' | 'taunted';
  duration: number; // remaining seconds
  value?: number; // magnitude
}

export interface FighterEntity {
  id: string;
  name: string;
  team: 1 | 2;
  isPlayerControlled: boolean;
  controlScheme: 'p1' | 'p2' | 'ai';
  skillControlMode?: SkillControlMode;
  character: CharacterConfig;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  targetAngle: number;
  
  // Attributes
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  
  // Combat State
  state: 'idle' | 'moving' | 'attacking' | 'casting' | 'dashing' | 'stunned' | 'dead';
  stateTimer: number;
  isInvincible: boolean;
  isShielded: boolean;
  isStealthed: boolean;
  
  // Cooldowns & Auto Attack Timers (in seconds remaining)
  cooldownPrimary: number;
  cooldownSkill1: number;
  cooldownSkill2: number;
  cooldownUltimate: number;
  autoAttackTimer: number;
  bounceSpeed: number;
  wallBounceCount: number;
  
  // Status effects
  statusEffects: FighterStatusEffect[];
  
  // Animations / Visuals
  attackAnimProgress: number; // 0 to 1
  currentAttackType?: 'primary' | 'skill1' | 'skill2' | 'ultimate';
  comboCount: number;
  comboTimer: number;
  damageFlash: number;
  trailPoints: { x: number; y: number; alpha: number }[];
  
  // Mitosis Replicator Mechanics (每2秒複製, 5秒融合血量x2)
  cloneTimer?: number;
  fuseTimer?: number;
  isClone?: boolean;
  fusionCount?: number;

  // MLG Guy Mechanics (喝激浪汽水 20x 衝撞 50 傷害)
  dewBoostTimer?: number;
  lastRamHitMap?: Record<string, number>;

  // Gordon Ramsay Mechanics (米其林評級、主廚三連刀、地獄火海狀態、火焰軌跡)
  topChefTimer?: number;
  knifeComboStep?: number;
  hellfireBuffTimer?: number;
  flameTrailTimer?: number;
  flameTrailDropTimer?: number;

  // Metrics & Stats
  totalDamageDealt: number;
  totalHitsLanded: number;
  totalHitsTaken: number;
  totalDodges: number;
  totalSkillsUsed: number;
  kills: number;

  // Target Dummy Testing Parameters
  isStationary?: boolean;
  dummyArmor?: number;
}

export interface BattleStats {
  winnerTeam: 1 | 2;
  winnerName: string;
  winnerChar: CharacterConfig;
  duration: number;
  fighters: {
    id: string;
    name: string;
    team: 1 | 2;
    character: CharacterConfig;
    damageDealt: number;
    hitsLanded: number;
    hitsTaken: number;
    skillsUsed: number;
    maxCombo: number;
    remainingHp: number;
    maxHp: number;
  }[];
}
