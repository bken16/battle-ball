import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Pause, 
  Play, 
  RotateCcw, 
  Home, 
  Volume2, 
  VolumeX, 
  Zap, 
  Flame, 
  Shield, 
  Crosshair, 
  Sparkles,
  RotateCw,
  Undo2,
  Disc,
  Wind,
  Hammer,
  Activity,
  Scissors,
  EyeOff,
  FastForward,
  Snowflake,
  SunMedium,
  CloudSnow,
  Radio,
  Swords,
  Timer,
  Gauge,
  Target,
  Anchor,
  Layers,
  Award,
  Gamepad2
} from 'lucide-react';
import { 
  CharacterConfig, 
  GameMode, 
  AIDifficulty, 
  ArenaMapType, 
  MapScale,
  SkillControlMode,
  FighterEntity, 
  Projectile, 
  Particle, 
  DamageNumber, 
  ArenaItem,
  ArenaObstacle,
  BattleStats,
  GroundZone
} from '../types';
import { sounds } from '../audio/soundManager';

interface CombatLogEvent {
  id: number;
  timestamp: string;
  fighterName: string;
  themeColor: string;
  actionName: string;
  actionType: 'primary' | 'skill1' | 'skill2' | 'ultimate' | 'wall_bounce' | 'crit';
  message: string;
}

interface WallFlash {
  id: number;
  wall: 'left' | 'right' | 'top' | 'bottom';
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

interface ArenaGameProps {
  p1Char: CharacterConfig;
  p2Char: CharacterConfig;
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  mapType: ArenaMapType;
  mapScale?: MapScale;
  swarmCount?: number;
  p1ControlMode?: SkillControlMode;
  p2ControlMode?: SkillControlMode;
  onGameOver: (stats: BattleStats) => void;
  onBackToMenu: () => void;
}

export const ArenaGame: React.FC<ArenaGameProps> = ({
  p1Char,
  p2Char,
  mode,
  aiDifficulty,
  mapType,
  mapScale = 1.0,
  swarmCount = 5,
  p1ControlMode: initialP1ControlMode = 'auto',
  p2ControlMode: initialP2ControlMode = 'auto',
  onGameOver,
  onBackToMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Skill Control Mode State & Refs (可於戰鬥中隨時切換 手動/自動/半自動)
  const [p1ControlMode, setP1ControlMode] = useState<SkillControlMode>(initialP1ControlMode);
  const [p2ControlMode, setP2ControlMode] = useState<SkillControlMode>(initialP2ControlMode);
  const p1ControlModeRef = useRef<SkillControlMode>(initialP1ControlMode);
  const p2ControlModeRef = useRef<SkillControlMode>(initialP2ControlMode);

  useEffect(() => {
    p1ControlModeRef.current = p1ControlMode;
  }, [p1ControlMode]);

  useEffect(() => {
    p2ControlModeRef.current = p2ControlMode;
  }, [p2ControlMode]);

  // Game UI State
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [matchTime, setMatchTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(sounds.getMuted());
  const [combatLogs, setCombatLogs] = useState<CombatLogEvent[]>([]);

  // Screen shake and pause refs to avoid restarting the game loop on state changes
  const screenShakeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const triggerScreenShake = useCallback((amount: number) => {
    screenShakeRef.current = Math.max(screenShakeRef.current, amount);
  }, []);

  // HUD Mirror State for React UI
  const [hudState, setHudState] = useState<{
    p1: { 
      hp: number; 
      maxHp: number; 
      energy: number; 
      maxEnergy: number; 
      cd1: number; 
      cd2: number; 
      cdUlt: number; 
      combo: number;
      attackTimer: number;
      attackInterval: number;
      bounces: number;
    };
    p2: { 
      hp: number; 
      maxHp: number; 
      energy: number; 
      maxEnergy: number; 
      cd1: number; 
      cd2: number; 
      cdUlt: number; 
      combo: number;
      attackTimer: number;
      attackInterval: number;
      bounces: number;
    };
  }>({
    p1: { 
      hp: p1Char.stats.hp, 
      maxHp: p1Char.stats.hp, 
      energy: 0, 
      maxEnergy: 100, 
      cd1: 0, 
      cd2: 0, 
      cdUlt: 0, 
      combo: 0, 
      attackTimer: p1Char.stats.attackInterval || 1.6,
      attackInterval: p1Char.stats.attackInterval || 1.6,
      bounces: 0
    },
    p2: { 
      hp: p2Char.stats.hp, 
      maxHp: p2Char.stats.hp, 
      energy: 0, 
      maxEnergy: 100, 
      cd1: 0, 
      cd2: 0, 
      cdUlt: 0, 
      combo: 0,
      attackTimer: p2Char.stats.attackInterval || 2.0,
      attackInterval: p2Char.stats.attackInterval || 2.0,
      bounces: 0
    },
  });

  // Refs for Game Loop State
  const fightersRef = useRef<FighterEntity[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const wallFlashesRef = useRef<WallFlash[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const itemsRef = useRef<ArenaItem[]>([]);
  const obstaclesRef = useRef<ArenaObstacle[]>([]);
  const groundZonesRef = useRef<GroundZone[]>([]);
  const nextIdRef = useRef<number>(1);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const matchStartTimeRef = useRef<number>(Date.now());
  const isMatchOverRef = useRef<boolean>(false);
  const simSpeedRef = useRef<number>(1.0);

  // Victory Focus Camera & Slow-Motion State (鏡頭放大聚焦獲勝者 + 0.5x 慢動作播放 3 秒)
  const victoryFocusRef = useRef<{
    active: boolean;
    winner: FighterEntity | null;
    winnerTeam: number;
    winnerName: string;
    winnerChar: CharacterConfig;
    startTime: number;
    duration: number; // 3.0 seconds
    cameraX: number;
    cameraY: number;
    cameraZoom: number;
    targetZoom: number;
    stats: BattleStats | null;
  }>({
    active: false,
    winner: null,
    winnerTeam: 1,
    winnerName: '',
    winnerChar: p1Char,
    startTime: 0,
    duration: 3.0,
    cameraX: 370,
    cameraY: 370,
    cameraZoom: 1.0,
    targetZoom: 2.2,
    stats: null,
  });

  const [victoryBannerInfo, setVictoryBannerInfo] = useState<{
    winnerName: string;
    winnerChar: CharacterConfig;
    countdown: number;
  } | null>(null);

  // Target Dummy Skill Testing & DPS Telemetry Refs
  const isTestingMode = p1Char.id === 'target_dummy' || p2Char.id === 'target_dummy';
  const trainingDamageLogRef = useRef<{ time: number; damage: number; isCrit: boolean }[]>([]);
  const maxHitRef = useRef<number>(0);
  const dummyStationaryRef = useRef<boolean>(true);
  const dummyArmorRef = useRef<number>(0);

  const [trainingStats, setTrainingStats] = useState<{
    dps: number;
    totalDamage: number;
    maxHit: number;
    maxCombo: number;
    armor: number;
    isStationary: boolean;
    debuffs: { type: string; duration: number }[];
  }>({
    dps: 0,
    totalDamage: 0,
    maxHit: 0,
    maxCombo: 0,
    armor: 0,
    isStationary: true,
    debuffs: [],
  });

  // Square Arena Box Boundary (600x600 * mapScale in 740x740 canvas space)
  const initialScale = mapScale || 1.0;
  const initialBoxSize = 600 * initialScale;
  const squareBoundsRef = useRef<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  }>({
    minX: 370 - initialBoxSize / 2,
    maxX: 370 + initialBoxSize / 2,
    minY: 370 - initialBoxSize / 2,
    maxY: 370 + initialBoxSize / 2,
    width: initialBoxSize,
    height: initialBoxSize,
    centerX: 370,
    centerY: 370,
  });

  // Synchronize squareBoundsRef when mapScale changes
  useEffect(() => {
    const scale = mapScale || 1.0;
    const boxSize = 600 * scale;
    const centerX = 370;
    const centerY = 370;
    const half = boxSize / 2;
    squareBoundsRef.current = {
      minX: centerX - half,
      maxX: centerX + half,
      minY: centerY - half,
      maxY: centerY + half,
      width: boxSize,
      height: boxSize,
      centerX,
      centerY,
    };
  }, [mapScale]);

  // Keep simSpeed ref synchronized
  useEffect(() => {
    simSpeedRef.current = simSpeed;
  }, [simSpeed]);

  // Log combat action
  const addCombatLog = useCallback((fighter: FighterEntity, actionType: 'primary' | 'skill1' | 'skill2' | 'ultimate' | 'wall_bounce' | 'crit', customMsg?: string) => {
    const elapsed = ((Date.now() - matchStartTimeRef.current) / 1000).toFixed(1);
    let actionName = '普攻';
    let msg = customMsg || '';

    if (actionType === 'primary') {
      actionName = fighter.character.skills.primary.name;
      msg = msg || `發動【${actionName}】！`;
    } else if (actionType === 'skill1') {
      actionName = fighter.character.skills.skill1.name;
      msg = msg || `釋放專屬技【${actionName}】！`;
    } else if (actionType === 'skill2') {
      actionName = fighter.character.skills.skill2.name;
      msg = msg || `釋放秘術技【${actionName}】！`;
    } else if (actionType === 'ultimate') {
      actionName = fighter.character.skills.ultimate.name;
      msg = msg || `🔥 狂暴解放【${actionName}】！`;
    }

    const newLog: CombatLogEvent = {
      id: nextIdRef.current++,
      timestamp: `${elapsed}s`,
      fighterName: fighter.name,
      themeColor: fighter.character.themeColor,
      actionName,
      actionType,
      message: msg,
    };

    setCombatLogs(prev => [newLog, ...prev.slice(0, 7)]);
  }, []);

  // Helper to create a fighter entity with square box kinetic bounce physics
  const createFighter = useCallback((
    id: string,
    name: string,
    team: 1 | 2,
    charConfig: CharacterConfig,
    x: number,
    y: number,
    initialAngle: number
  ): FighterEntity => {
    const isDummy = charConfig.id === 'target_dummy';
    const bounceSpd = isDummy ? (dummyStationaryRef.current ? 0 : 260) : (charConfig.stats.bounceSpeed || 300);
    return {
      id,
      name,
      team,
      isPlayerControlled: false, // Pure autonomous simulation as requested
      controlScheme: 'ai',
      skillControlMode: team === 1 ? p1ControlModeRef.current : p2ControlModeRef.current,
      character: charConfig,
      x,
      y,
      vx: isDummy && dummyStationaryRef.current ? 0 : Math.cos(initialAngle) * bounceSpd,
      vy: isDummy && dummyStationaryRef.current ? 0 : Math.sin(initialAngle) * bounceSpd,
      radius: isDummy ? 28 : 24,
      angle: initialAngle,
      targetAngle: initialAngle,
      hp: charConfig.stats.hp,
      maxHp: charConfig.stats.hp,
      energy: isDummy ? 0 : 15,
      maxEnergy: 100,
      state: 'moving',
      stateTimer: 0,
      isInvincible: false,
      isShielded: false,
      isStealthed: false,
      cooldownPrimary: 0,
      cooldownSkill1: isDummy ? 999999 : 10.0 * 0.4, // slight offset for early action (10s CD)
      cooldownSkill2: isDummy ? 999999 : (9 + Math.random() * 2) * 0.7, // randomized between 9s and 11s
      cooldownUltimate: isDummy ? 999999 : charConfig.skills.ultimate.cooldown * 0.8,
      autoAttackTimer: isDummy ? 999999 : (charConfig.stats.attackInterval || 1.6) * (team === 1 ? 0.6 : 0.9), // staggered start
      bounceSpeed: bounceSpd,
      wallBounceCount: 0,
      statusEffects: [],
      attackAnimProgress: 0,
      comboCount: 0,
      comboTimer: 0,
      damageFlash: 0,
      trailPoints: [],
      cloneTimer: 5.0,
      fuseTimer: 5.0,
      isClone: false,
      fusionCount: 0,
      topChefTimer: 0,
      knifeComboStep: 0,
      hellfireBuffTimer: 0,
      totalDamageDealt: 0,
      totalHitsLanded: 0,
      totalHitsTaken: 0,
      totalDodges: 0,
      totalSkillsUsed: 0,
      kills: 0,
      isStationary: isDummy ? dummyStationaryRef.current : false,
      dummyArmor: isDummy ? dummyArmorRef.current : 0,
    };
  }, []);

  // Setup square arena obstacles based on map & scale
  const initMapObstacles = useCallback((map: ArenaMapType, cx: number, cy: number) => {
    const obs: ArenaObstacle[] = [];
    const scale = mapScale || 1.0;
    const offset = 140 * scale;
    const pillarR = Math.round(22 * Math.min(1.6, Math.sqrt(scale)));
    if (map === 'ruins') {
      obs.push({ x: cx - offset, y: cy - offset, radius: pillarR, type: 'pillar' });
      obs.push({ x: cx + offset, y: cy - offset, radius: pillarR, type: 'pillar' });
      obs.push({ x: cx - offset, y: cy + offset, radius: pillarR, type: 'pillar' });
      obs.push({ x: cx + offset, y: cy + offset, radius: pillarR, type: 'pillar' });
    } else if (map === 'lava') {
      obs.push({ x: cx, y: cy, radius: Math.round(36 * Math.min(1.6, Math.sqrt(scale))), type: 'hazard_lava' });
    } else if (map === 'cyber') {
      obs.push({ x: cx - 160 * scale, y: cy, radius: Math.round(18 * Math.min(1.6, Math.sqrt(scale))), type: 'crystal' });
      obs.push({ x: cx + 160 * scale, y: cy, radius: Math.round(18 * Math.min(1.6, Math.sqrt(scale))), type: 'crystal' });
    }
    obstaclesRef.current = obs;
  }, [mapScale]);

  // Initialize Fighters and Items inside the Square Frame
  const initGame = useCallback(() => {
    isMatchOverRef.current = false;
    matchStartTimeRef.current = Date.now();
    projectilesRef.current = [];
    particlesRef.current = [];
    wallFlashesRef.current = [];
    damageNumbersRef.current = [];
    itemsRef.current = [];
    groundZonesRef.current = [];
    setCombatLogs([]);

    const scale = mapScale || 1.0;
    const boxSize = 600 * scale;
    const centerX = 370;
    const centerY = 370;
    const half = boxSize / 2;
    const minX = centerX - half;
    const maxX = centerX + half;
    const minY = centerY - half;
    const maxY = centerY + half;

    squareBoundsRef.current = {
      minX,
      maxX,
      minY,
      maxY,
      width: boxSize,
      height: boxSize,
      centerX,
      centerY,
    };

    initMapObstacles(mapType, centerX, centerY);

    // Reset Victory Focus
    victoryFocusRef.current = {
      active: false,
      winner: null,
      winnerTeam: 1,
      winnerName: '',
      winnerChar: p1Char,
      startTime: 0,
      duration: 3.0,
      cameraX: centerX,
      cameraY: centerY,
      cameraZoom: 1.0,
      targetZoom: 2.2,
      stats: null,
    };
    setVictoryBannerInfo(null);

    if (mode === 'swarm') {
      // Swarm mode: multiple fighters bouncing inside square box
      const swarmFighters: FighterEntity[] = [];
      for (let i = 0; i < swarmCount; i++) {
        const angleP1 = (Math.PI / 4) + (i * 0.3);
        const spawnX1 = minX + (60 + (i * 25)) * Math.min(1.4, scale);
        const spawnY1 = minY + (80 + (i * 50)) * Math.min(1.4, scale);
        swarmFighters.push(
          createFighter(
            `p1_${i}`,
            `${p1Char.name} #${i + 1}`,
            1,
            p1Char,
            spawnX1,
            spawnY1,
            angleP1
          )
        );
      }
      for (let i = 0; i < swarmCount; i++) {
        const angleP2 = (3 * Math.PI / 4) + (i * 0.3);
        const spawnX2 = maxX - (60 + (i * 25)) * Math.min(1.4, scale);
        const spawnY2 = minY + (80 + (i * 50)) * Math.min(1.4, scale);
        swarmFighters.push(
          createFighter(
            `p2_${i}`,
            `${p2Char.name} #${i + 1}`,
            2,
            p2Char,
            spawnX2,
            spawnY2,
            angleP2
          )
        );
      }
      fightersRef.current = swarmFighters;
    } else {
      // 1v1 Square Bouncing Duel
      const isP2Dummy = p2Char.id === 'target_dummy';
      const p1 = createFighter(
        'p1',
        p1Char.name,
        1,
        p1Char,
        minX + 110 * scale,
        centerY - 50 * scale,
        Math.PI / 4 // 45 degree initial bounce
      );
      const p2 = createFighter(
        'p2',
        p2Char.name,
        2,
        p2Char,
        isP2Dummy ? centerX : maxX - 110 * scale,
        isP2Dummy ? centerY : centerY + 50 * scale,
        -3 * Math.PI / 4 // diagonal opposite bounce
      );

      if (isP2Dummy || p1Char.id === 'target_dummy') {
        trainingDamageLogRef.current = [];
        maxHitRef.current = 0;
      }

      fightersRef.current = [p1, p2];
    }
  }, [createFighter, initMapObstacles, mapScale, mapType, mode, p1Char, p2Char, swarmCount]);

  // Spawn visual particle
  const spawnParticle = (
    x: number,
    y: number,
    color: string,
    count = 1,
    speed = 120,
    size = 4,
    shape: 'circle' | 'spark' | 'ring' | 'star' | 'smoke' = 'circle'
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      particlesRef.current.push({
        id: nextIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * size + size * 0.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 0.35 + 0.25,
        shape,
      });
    }
  };

  // Trigger wall bounce impact flash
  const triggerWallFlash = (x: number, y: number, wall: 'left' | 'right' | 'top' | 'bottom', color: string) => {
    wallFlashesRef.current.push({
      id: nextIdRef.current++,
      wall,
      x,
      y,
      color,
      life: 0,
      maxLife: 0.3,
    });
    spawnParticle(x, y, color, 6, 130, 4, 'spark');
  };

  // Spawn Floating Damage Text
  const spawnDamageText = (x: number, y: number, text: string, color: string, isCrit = false) => {
    damageNumbersRef.current.push({
      id: nextIdRef.current++,
      x: x + (Math.random() - 0.5) * 20,
      y: y - 15,
      text,
      color,
      alpha: 1,
      scale: isCrit ? 1.5 : 1.0,
      life: 0,
      maxLife: 0.8,
      isCrit,
    });
  };

  // Trigger Action for a Fighter (Autonomous execution)
  const triggerFighterAction = useCallback((fighter: FighterEntity, actionType: 'primary' | 'skill1' | 'skill2' | 'ultimate') => {
    if (fighter.state === 'dead' || fighter.state === 'stunned') return;

    const char = fighter.character;
    const target = fightersRef.current.find(f => f.team !== fighter.team && f.state !== 'dead');

    if (target) {
      // Auto aim towards opponent before firing
      fighter.angle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
    }

    if (actionType === 'primary') {
      const isMelee = char.baseRole === 'melee' || char.baseRole === 'tank' || char.baseRole === 'assassin' || (char.stats.attackRange != null && char.stats.attackRange < 160);
      if (isMelee) {
        let minDist = Infinity;
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead' && other.hp > 0) {
            const d = Math.hypot(other.x - fighter.x, other.y - fighter.y);
            if (d < minDist) minDist = d;
          }
        });
        const meleeMaxReach = (char.stats.attackRange || 80) + fighter.radius + 40;
        if (minDist > meleeMaxReach) {
          // Melee fighter is not close enough to enemy
          return;
        }
      }

      fighter.attackAnimProgress = 1;
      fighter.currentAttackType = 'primary';
      fighter.totalSkillsUsed++;

      // Execute character attack
      if (char.id === 'target_dummy') {
        sounds.playShield();
        spawnParticle(fighter.x, fighter.y, '#38bdf8', 12, 140, 5, 'ring');
        spawnDamageText(fighter.x, fighter.y, '🎯 標靶抗性吸收', '#38bdf8');
        return;
      } else if (char.id === 'gordon_ramsay') {
        // Gordon Ramsay: 主廚刀法 (Chef Knife Combo: 3-hit combo, 3rd hit fan-shaped cleave + bleed)
        const step = fighter.knifeComboStep ?? 0;
        fighter.knifeComboStep = (step + 1) % 3;
        sounds.playChefKnife(step);
        const forwardAngle = fighter.angle;

        if (step === 2) {
          // 3rd Hit: Fan-shaped wide cleave (扇形劈砍)
          triggerScreenShake(4);
          spawnParticle(fighter.x + Math.cos(forwardAngle) * 35, fighter.y + Math.sin(forwardAngle) * 35, '#fbbf24', 16, 200, 6, 'spark');
          spawnParticle(fighter.x + Math.cos(forwardAngle) * 35, fighter.y + Math.sin(forwardAngle) * 35, '#ef4444', 12, 160, 5, 'ring');

          fightersRef.current.forEach(other => {
            if (other.team !== fighter.team && other.state !== 'dead') {
              const dist = Math.hypot(other.x - fighter.x, other.y - fighter.y);
              if (dist < 130) {
                const angleToEnemy = Math.atan2(other.y - fighter.y, other.x - fighter.x);
                let angleDiff = Math.abs(angleToEnemy - forwardAngle);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                if (angleDiff < Math.PI * 0.6) {
                  other.statusEffects.push({ type: 'bleed', duration: 3.0, value: 20 });
                  spawnDamageText(other.x, other.y, '🩸 割裂流血! (3s)', '#ef4444');
                  applyDamage(fighter, other, char.stats.attackPower * 1.5, 'slash', true);
                }
              }
            }
          });

          // If in Hellfire state, also fire blazing slash wave
          if (fighter.hellfireBuffTimer && fighter.hellfireBuffTimer > 0) {
            projectilesRef.current.push({
              id: nextIdRef.current++,
              ownerId: fighter.id,
              x: fighter.x + Math.cos(forwardAngle) * (fighter.radius + 8),
              y: fighter.y + Math.sin(forwardAngle) * (fighter.radius + 8),
              vx: Math.cos(forwardAngle) * 640,
              vy: Math.sin(forwardAngle) * 640,
              radius: 12,
              damage: 65,
              color: '#ea580c',
              glowColor: '#fbbf24',
              piercing: true,
              piercedCount: 0,
              life: 0,
              maxLife: 0.9,
              type: 'flame_slash',
              onHitEffect: 'burn',
            });
          }
        } else {
          // 1st or 2nd Hit: Fast precision slash
          spawnParticle(fighter.x + Math.cos(forwardAngle) * 25, fighter.y + Math.sin(forwardAngle) * 25, '#e2e8f0', 8, 140, 4, 'spark');
          fightersRef.current.forEach(other => {
            if (other.team !== fighter.team && other.state !== 'dead') {
              const dist = Math.hypot(other.x - fighter.x, other.y - fighter.y);
              if (dist < 85) {
                applyDamage(fighter, other, char.stats.attackPower * (step === 0 ? 0.95 : 1.1), 'slash');
              }
            }
          });

          // If in Hellfire state, fire flame wave
          if (fighter.hellfireBuffTimer && fighter.hellfireBuffTimer > 0) {
            projectilesRef.current.push({
              id: nextIdRef.current++,
              ownerId: fighter.id,
              x: fighter.x + Math.cos(forwardAngle) * (fighter.radius + 8),
              y: fighter.y + Math.sin(forwardAngle) * (fighter.radius + 8),
              vx: Math.cos(forwardAngle) * 580,
              vy: Math.sin(forwardAngle) * 580,
              radius: 9,
              damage: 40,
              color: '#f97316',
              glowColor: '#ef4444',
              piercing: false,
              piercedCount: 0,
              life: 0,
              maxLife: 0.8,
              type: 'fire_wave',
              onHitEffect: 'burn',
            });
          }
        }
      } else if (char.id === 'mlg_guy') {
        // MLG Heavy Sniper Rifle shot (AWP 360 NO SCOPE)
        sounds.playSniperShot();
        triggerScreenShake(4);
        projectilesRef.current.push({
          id: nextIdRef.current++,
          ownerId: fighter.id,
          x: fighter.x + Math.cos(fighter.angle) * (fighter.radius + 10),
          y: fighter.y + Math.sin(fighter.angle) * (fighter.radius + 10),
          vx: Math.cos(fighter.angle) * 1250,
          vy: Math.sin(fighter.angle) * 1250,
          radius: 8,
          damage: char.stats.attackPower,
          color: '#22c55e',
          glowColor: '#f97316',
          piercing: false,
          piercedCount: 0,
          life: 0,
          maxLife: 0.9,
          type: 'sniper_bullet',
        });
        spawnParticle(
          fighter.x + Math.cos(fighter.angle) * (fighter.radius + 10),
          fighter.y + Math.sin(fighter.angle) * (fighter.radius + 10),
          '#f97316',
          12,
          160,
          5,
          'spark'
        );
      } else if (char.baseRole === 'melee' || char.baseRole === 'tank' || char.baseRole === 'assassin') {
        sounds.playSlash();
        spawnParticle(fighter.x + Math.cos(fighter.angle) * 30, fighter.y + Math.sin(fighter.angle) * 30, char.themeColor, 8, 140, 5, 'spark');

        // Melee slash wave projectile + melee hitbox
        projectilesRef.current.push({
          id: nextIdRef.current++,
          ownerId: fighter.id,
          x: fighter.x + Math.cos(fighter.angle) * (fighter.radius + 5),
          y: fighter.y + Math.sin(fighter.angle) * (fighter.radius + 5),
          vx: Math.cos(fighter.angle) * 520,
          vy: Math.sin(fighter.angle) * 520,
          radius: char.baseRole === 'tank' ? 14 : 9,
          damage: char.stats.attackPower,
          color: char.themeColor,
          glowColor: char.glowColor,
          piercing: char.baseRole === 'tank',
          piercedCount: 0,
          life: 0,
          maxLife: 0.9,
          type: char.id === 'flame_swordsman' ? 'fire_wave' : char.id === 'iron_colossus' ? 'slash_wave' : 'bullet',
        });
      } else {
        // Ranged projectile (Magic, Archer, Frost, Slime)
        sounds.playShoot();
        const pType = char.id === 'storm_mage' ? 'lightning_orb' : char.id === 'frost_weaver' ? 'frost_shard' : 'arrow';
        projectilesRef.current.push({
          id: nextIdRef.current++,
          ownerId: fighter.id,
          x: fighter.x + Math.cos(fighter.angle) * (fighter.radius + 5),
          y: fighter.y + Math.sin(fighter.angle) * (fighter.radius + 5),
          vx: Math.cos(fighter.angle) * (char.id === 'slime_replicator' ? 580 : 620),
          vy: Math.sin(fighter.angle) * (char.id === 'slime_replicator' ? 580 : 620),
          radius: pType === 'lightning_orb' ? 11 : char.id === 'slime_replicator' ? 9 : 7,
          damage: char.stats.attackPower + (fighter.fusionCount || 0) * 8,
          color: char.themeColor,
          glowColor: char.glowColor,
          piercing: false,
          piercedCount: 0,
          life: 0,
          maxLife: 1.2,
          type: char.id === 'slime_replicator' ? 'bullet' : pType,
          onHitEffect: char.id === 'storm_mage' ? 'lightning' : char.id === 'frost_weaver' ? 'freeze' : undefined,
        });
      }
    } else if (actionType === 'skill1') {
      fighter.cooldownSkill1 = 10.0; // Ability 1 cooldown is 10 seconds
      fighter.totalSkillsUsed++;

      if (char.id === 'flame_swordsman') {
        // Flame Dash: rapid kinetic dash towards enemy
        sounds.playDash();
        fighter.isInvincible = true;
        if (target) {
          const dashAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
          fighter.vx = Math.cos(dashAngle) * 800;
          fighter.vy = Math.sin(dashAngle) * 800;
        }
        spawnParticle(fighter.x, fighter.y, '#f97316', 15, 180, 6, 'ring');
        setTimeout(() => { fighter.isInvincible = false; }, 300);
      } else if (char.id === 'storm_mage') {
        // Thunder Blink
        sounds.playLightning();
        spawnParticle(fighter.x, fighter.y, '#38bdf8', 20, 200, 5, 'ring');
        fighter.x += Math.cos(fighter.angle) * 160;
        fighter.y += Math.sin(fighter.angle) * 160;
        spawnParticle(fighter.x, fighter.y, '#c084fc', 20, 200, 5, 'spark');
        // AoE discharge at arrival
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            if (Math.hypot(other.x - fighter.x, other.y - fighter.y) < 100) {
              applyDamage(fighter, other, char.stats.attackPower * 0.9, 'magic');
            }
          }
        });
      } else if (char.id === 'wind_ranger') {
        // Backflip & Spread 5 Gale Arrows
        sounds.playShoot();
        fighter.vx = -Math.cos(fighter.angle) * 480;
        fighter.vy = -Math.sin(fighter.angle) * 480;
        for (let a = -0.35; a <= 0.35; a += 0.175) {
          const finalAngle = fighter.angle + a;
          projectilesRef.current.push({
            id: nextIdRef.current++,
            ownerId: fighter.id,
            x: fighter.x,
            y: fighter.y,
            vx: Math.cos(finalAngle) * 650,
            vy: Math.sin(finalAngle) * 650,
            radius: 5,
            damage: char.stats.attackPower * 0.65,
            color: '#34d399',
            glowColor: '#10b981',
            piercing: false,
            piercedCount: 0,
            life: 0,
            maxLife: 1.0,
            type: 'arrow',
          });
        }
      } else if (char.id === 'iron_colossus') {
        // Iron Fortress Shield
        sounds.playShield();
        fighter.isShielded = true;
        fighter.statusEffects.push({ type: 'shield', duration: 4.0, value: 400 });
        spawnParticle(fighter.x, fighter.y, '#38bdf8', 25, 120, 7, 'ring');
      } else if (char.id === 'shadow_assassin') {
        // Shadow Veil Stealth & Speed Surge
        sounds.playDash();
        fighter.isStealthed = true;
        fighter.statusEffects.push({ type: 'stealth', duration: 2.5, value: 1.5 });
        fighter.vx *= 1.4;
        fighter.vy *= 1.4;
        spawnParticle(fighter.x, fighter.y, '#ec4899', 18, 140, 6, 'smoke');
      } else if (char.id === 'frost_weaver') {
        // Frost Barrier
        sounds.playShield();
        fighter.isShielded = true;
        fighter.statusEffects.push({ type: 'shield', duration: 3.5, value: 300 });
        spawnParticle(fighter.x, fighter.y, '#22d3ee', 20, 160, 6, 'ring');
        // Push enemies away
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            const d = Math.hypot(other.x - fighter.x, other.y - fighter.y);
            if (d < 120) {
              const pushAngle = Math.atan2(other.y - fighter.y, other.x - fighter.x);
              other.vx = Math.cos(pushAngle) * 350;
              other.vy = Math.sin(pushAngle) * 350;
              applyDamage(fighter, other, 60, 'magic');
            }
          }
        });
      } else if (char.id === 'slime_replicator') {
        // Forced Mitosis: Instant extra clone spawn (Max 10 slimes on field)
        sounds.playDash();
        fighter.isInvincible = true;
        
        const totalAliveSlimes = fightersRef.current.filter(f => f.character.id === 'slime_replicator' && f.state !== 'dead').length;
        if (totalAliveSlimes < 10) {
          const spawnAngle = Math.random() * Math.PI * 2;
          const cx = fighter.x + Math.cos(spawnAngle) * 45;
          const cy = fighter.y + Math.sin(spawnAngle) * 45;
          const clone = createFighter(
            `slime_${fighter.team}_${nextIdRef.current++}`,
            `${fighter.name.split(' (分身')[0]} (分身)`,
            fighter.team,
            fighter.character,
            cx,
            cy,
            spawnAngle
          );
          clone.hp = Math.max(1, fighter.hp);
          clone.maxHp = fighter.maxHp;
          clone.isClone = true;
          clone.cloneTimer = 5.0;
          clone.fuseTimer = 5.0;
          clone.fusionCount = fighter.fusionCount || 0;
          clone.radius = fighter.radius;
          fightersRef.current.push(clone);

          spawnParticle(fighter.x, fighter.y, '#84cc16', 20, 180, 6, 'ring');
          spawnParticle(cx, cy, '#bef264', 15, 140, 5, 'spark');
          spawnDamageText(cx, cy, `🧬 應激裂殖! (${totalAliveSlimes + 1}/10)`, '#84cc16');
        } else {
          fighter.vx *= 1.35;
          fighter.vy *= 1.35;
          spawnDamageText(fighter.x, fighter.y, '🧬 裂殖已達上限(10隻)!', '#bef264');
          spawnParticle(fighter.x, fighter.y, '#bef264', 15, 130, 4, 'spark');
        }
        setTimeout(() => { fighter.isInvincible = false; }, 250);
      } else if (char.id === 'mlg_guy') {
        // Skill 1: 吃多力多滋 (Doritos) 回復 200 滴血量
        sounds.playDoritosCrunch();
        const healAmt = 200;
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmt);
        spawnParticle(fighter.x, fighter.y, '#f97316', 25, 180, 6, 'spark');
        spawnParticle(fighter.x, fighter.y, '#fbbf24', 16, 140, 5, 'ring');
        spawnDamageText(fighter.x, fighter.y, '🧀 +200 HP (吃多力多滋!)', '#f97316', true);
      } else if (char.id === 'gordon_ramsay') {
        // Skill 1: 這根本是生的！（IT'S RAW!）抓起未熟透的冰凍生肉砸向指定方向
        sounds.playRawMeatSplat();
        const meatAngle = target ? Math.atan2(target.y - fighter.y, target.x - fighter.x) : fighter.angle;
        projectilesRef.current.push({
          id: nextIdRef.current++,
          ownerId: fighter.id,
          x: fighter.x + Math.cos(meatAngle) * (fighter.radius + 10),
          y: fighter.y + Math.sin(meatAngle) * (fighter.radius + 10),
          vx: Math.cos(meatAngle) * 720,
          vy: Math.sin(meatAngle) * 720,
          radius: 12,
          damage: 110,
          color: '#dc2626',
          glowColor: '#38bdf8',
          piercing: false,
          piercedCount: 0,
          life: 0,
          maxLife: 1.1,
          type: 'raw_meat',
        });
        spawnParticle(fighter.x, fighter.y, '#dc2626', 15, 140, 5, 'spark');
        spawnDamageText(fighter.x, fighter.y, "🥩 IT'S RAW! 砸出生肉!", '#ef4444', true);
      } else if (char.id === 'target_dummy') {
        sounds.playVictory();
        fighter.hp = fighter.maxHp;
        fighter.damageFlash = 0.3;
        spawnParticle(fighter.x, fighter.y, '#10b981', 30, 200, 8, 'ring');
        spawnParticle(fighter.x, fighter.y, '#fbbf24', 20, 180, 6, 'spark');
        spawnDamageText(fighter.x, fighter.y, '💖 假人滿血重置 (999,999 HP)!', '#10b981', true);
      }
    } else if (actionType === 'skill2') {
      fighter.cooldownSkill2 = 9 + Math.random() * 2; // Ability 2 cooldown randomized between 9s and 11s
      fighter.totalSkillsUsed++;

      if (char.id === 'gordon_ramsay') {
        // Skill 2: 地獄廚房：清場！（Shut It Down!） - 燃氣大爆炸 + 擊退 + 4秒地獄火海 + 火刃附魔
        sounds.playHellKitchenExplode();
        triggerScreenShake(12);
        fighter.hellfireBuffTimer = 4.0;

        spawnParticle(fighter.x, fighter.y, '#ef4444', 45, 280, 10, 'ring');
        spawnParticle(fighter.x, fighter.y, '#f97316', 35, 220, 7, 'spark');
        spawnDamageText(fighter.x, fighter.y, '🔥 SHUT IT DOWN! 地獄廚房：清場!', '#ef4444', true);

        // Explosion dealing area damage & knockback
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            const dist = Math.hypot(other.x - fighter.x, other.y - fighter.y);
            if (dist < 155) {
              const knockAngle = Math.atan2(other.y - fighter.y, other.x - fighter.x);
              other.vx = Math.cos(knockAngle) * 520;
              other.vy = Math.sin(knockAngle) * 520;
              applyDamage(fighter, other, 180, 'slash', true);
            }
          }
        });

        // 4-second Hellfire Zone on ground
        groundZonesRef.current.push({
          id: nextIdRef.current++,
          ownerId: fighter.id,
          team: fighter.team,
          x: fighter.x,
          y: fighter.y,
          radius: 145,
          duration: 4.0,
          type: 'hellfire',
          damagePerSec: 35,
          tickTimer: 0,
        });
      } else if (char.id === 'mlg_guy') {
        // Skill 2: 喝激浪汽水 (Mountain Dew) 移動速度變快20倍持續5秒 衝撞扣除 50 血量
        sounds.playDewChug();
        sounds.playAirhorn();
        fighter.dewBoostTimer = 5.0;
        fighter.statusEffects.push({ type: 'speed_boost', duration: 5.0, value: 20.0 });
        spawnParticle(fighter.x, fighter.y, '#22c55e', 40, 280, 8, 'ring');
        spawnParticle(fighter.x, fighter.y, '#a3e635', 30, 220, 6, 'spark');
        spawnDamageText(fighter.x, fighter.y, '🥤 喝激浪汽水! 20倍速狂飆衝撞!', '#22c55e', true);
        triggerScreenShake(6);
      } else if (char.id === 'flame_swordsman') {
        // Inferno Spin
        sounds.playSlash();
        spawnParticle(fighter.x, fighter.y, '#ef4444', 30, 240, 8, 'ring');
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            const d = Math.hypot(other.x - fighter.x, other.y - fighter.y);
            if (d < 140) {
              const knockAngle = Math.atan2(other.y - fighter.y, other.x - fighter.x);
              other.vx = Math.cos(knockAngle) * 450;
              other.vy = Math.sin(knockAngle) * 450;
              applyDamage(fighter, other, char.stats.attackPower * 1.6, 'slash');
            }
          }
        });
      } else if (char.id === 'storm_mage') {
        // Chain Thunderstorm
        sounds.playLightning();
        const tx = target ? target.x : fighter.x + Math.cos(fighter.angle) * 150;
        const ty = target ? target.y : fighter.y + Math.sin(fighter.angle) * 150;
        spawnParticle(tx, ty, '#8b5cf6', 35, 260, 8, 'spark');
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            if (Math.hypot(other.x - tx, other.y - ty) < 120) {
              other.statusEffects.push({ type: 'stun', duration: 1.0 });
              applyDamage(fighter, other, char.stats.attackPower * 1.8, 'magic');
            }
          }
        });
      } else if (char.id === 'wind_ranger') {
        // Vortex Trap
        sounds.playDash();
        const trapX = target ? target.x : fighter.x + Math.cos(fighter.angle) * 160;
        const trapY = target ? target.y : fighter.y + Math.sin(fighter.angle) * 160;
        spawnParticle(trapX, trapY, '#10b981', 30, 180, 6, 'ring');
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            if (Math.hypot(other.x - trapX, other.y - trapY) < 140) {
              const pullAngle = Math.atan2(trapY - other.y, trapX - other.x);
              other.vx = Math.cos(pullAngle) * 400;
              other.vy = Math.sin(pullAngle) * 400;
              applyDamage(fighter, other, char.stats.attackPower * 1.3, 'magic');
            }
          }
        });
      } else if (char.id === 'iron_colossus') {
        // Ground Earth Quake
        sounds.playHammerSmash();
        triggerScreenShake(8);
        spawnParticle(fighter.x, fighter.y, '#0ea5e9', 40, 260, 9, 'ring');
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            const d = Math.hypot(other.x - fighter.x, other.y - fighter.y);
            if (d < 160) {
              other.statusEffects.push({ type: 'stun', duration: 1.2 });
              applyDamage(fighter, other, char.stats.attackPower * 1.7, 'smash');
            }
          }
        });
      } else if (char.id === 'shadow_assassin') {
        // Phantom Dash strike
        sounds.playSlash();
        if (target) {
          fighter.x = target.x - Math.cos(target.angle) * 40;
          fighter.y = target.y - Math.sin(target.angle) * 40;
          fighter.angle = target.angle;
          spawnParticle(fighter.x, fighter.y, '#ec4899', 25, 200, 6, 'spark');
          applyDamage(fighter, target, char.stats.attackPower * 2.2, 'slash', true);
        }
      } else if (char.id === 'frost_weaver') {
        // Frost Nova freeze
        sounds.playLightning();
        spawnParticle(fighter.x, fighter.y, '#06b6d4', 35, 220, 8, 'ring');
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            if (Math.hypot(other.x - fighter.x, other.y - fighter.y) < 140) {
              other.statusEffects.push({ type: 'freeze', duration: 1.5 });
              applyDamage(fighter, other, char.stats.attackPower * 1.4, 'magic');
            }
          }
        });
      } else if (char.id === 'slime_replicator') {
        // Acid Slime Burst
        sounds.playHit(false);
        spawnParticle(fighter.x, fighter.y, '#84cc16', 35, 240, 8, 'ring');
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            const d = Math.hypot(other.x - fighter.x, other.y - fighter.y);
            if (d < 150) {
              const knockAngle = Math.atan2(other.y - fighter.y, other.x - fighter.x);
              other.vx = Math.cos(knockAngle) * 440;
              other.vy = Math.sin(knockAngle) * 440;
              other.statusEffects.push({ type: 'speed_boost', duration: 2.0, value: 0.6 }); // slow
              applyDamage(fighter, other, char.stats.attackPower * 1.5, 'slash');
            }
          }
        });
      } else if (char.id === 'target_dummy') {
        sounds.playShield();
        fighter.statusEffects = [];
        spawnParticle(fighter.x, fighter.y, '#38bdf8', 25, 180, 6, 'ring');
        spawnDamageText(fighter.x, fighter.y, '✨ 淨化所有異常狀態!', '#38bdf8', true);
      }
    } else if (actionType === 'ultimate') {
      fighter.energy = 0;
      fighter.cooldownUltimate = char.skills.ultimate.cooldown;
      fighter.totalSkillsUsed++;
      sounds.playUltimate();
      triggerScreenShake(14);

      // Huge screen celebration & massive impact
      spawnParticle(fighter.x, fighter.y, '#fbbf24', 50, 320, 10, 'ring');

      if (char.id === 'flame_swordsman') {
        // Cataclysm Meteor
        setTimeout(() => {
          sounds.playHammerSmash();
          triggerScreenShake(16);
          const { centerX, centerY } = squareBoundsRef.current;
          spawnParticle(centerX, centerY, '#ef4444', 80, 400, 12, 'ring');
          fightersRef.current.forEach(other => {
            if (other.team !== fighter.team && other.state !== 'dead') {
              applyDamage(fighter, other, char.stats.attackPower * 3.5, 'slash');
            }
          });
        }, 300);
      } else if (char.id === 'storm_mage') {
        // Judgement Tempest (multi thunder strikes in square box)
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            sounds.playLightning();
            const { minX, maxX, minY, maxY } = squareBoundsRef.current;
            const rx = minX + Math.random() * (maxX - minX);
            const ry = minY + Math.random() * (maxY - minY);
            spawnParticle(rx, ry, '#8b5cf6', 30, 250, 8, 'spark');
            fightersRef.current.forEach(other => {
              if (other.team !== fighter.team && other.state !== 'dead') {
                if (Math.hypot(other.x - rx, other.y - ry) < 120) {
                  applyDamage(fighter, other, char.stats.attackPower * 0.9, 'magic');
                }
              }
            });
          }, i * 160);
        }
      } else if (char.id === 'wind_ranger') {
        // Storm Arrow Barrage
        for (let i = 0; i < 16; i++) {
          setTimeout(() => {
            sounds.playShoot();
            const angle = (i / 16) * Math.PI * 2;
            projectilesRef.current.push({
              id: nextIdRef.current++,
              ownerId: fighter.id,
              x: fighter.x,
              y: fighter.y,
              vx: Math.cos(angle) * 700,
              vy: Math.sin(angle) * 700,
              radius: 6,
              damage: char.stats.attackPower * 0.8,
              color: '#10b981',
              glowColor: '#6ee7b7',
              piercing: true,
              piercedCount: 0,
              life: 0,
              maxLife: 1.5,
              type: 'arrow',
            });
          }, i * 45);
        }
      } else if (char.id === 'iron_colossus') {
        // Colossal Earth Shatter
        sounds.playHammerSmash();
        triggerScreenShake(20);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const sx = fighter.x + Math.cos(a) * 120;
          const sy = fighter.y + Math.sin(a) * 120;
          spawnParticle(sx, sy, '#0ea5e9', 25, 200, 8, 'spark');
        }
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            other.statusEffects.push({ type: 'stun', duration: 2.0 });
            applyDamage(fighter, other, char.stats.attackPower * 3.8, 'smash');
          }
        });
      } else if (char.id === 'shadow_assassin') {
        // Thousand Shadow Execution
        fighter.isInvincible = true;
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            sounds.playSlash();
            if (target && target.state !== 'dead') {
              const a = Math.random() * Math.PI * 2;
              fighter.x = target.x + Math.cos(a) * 50;
              fighter.y = target.y + Math.sin(a) * 50;
              fighter.angle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
              spawnParticle(target.x, target.y, '#ec4899', 15, 180, 6, 'spark');
              applyDamage(fighter, target, char.stats.attackPower * 0.75, 'slash', true);
            }
          }, i * 110);
        }
        setTimeout(() => {
          fighter.isInvincible = false;
        }, 750);
      } else if (char.id === 'frost_weaver') {
        // Absolute Zero Blizzard
        sounds.playLightning();
        const { centerX, centerY } = squareBoundsRef.current;
        spawnParticle(centerX, centerY, '#06b6d4', 80, 350, 10, 'ring');
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            other.statusEffects.push({ type: 'freeze', duration: 2.5 });
            applyDamage(fighter, other, char.stats.attackPower * 3.0, 'magic');
          }
        });
      } else if (char.id === 'slime_replicator') {
        // Grand Hyper Fusion (All slimes merge into super titan + massive shockwave)
        sounds.playUltimate();
        triggerScreenShake(18);
        const slimes = fightersRef.current.filter(f => f.character.id === 'slime_replicator' && f.team === fighter.team && f.state !== 'dead' && f.id !== fighter.id);
        
        let extraHp = 0;
        let extraMaxHp = 0;
        slimes.forEach(sl => {
          sl.state = 'dead';
          sl.hp = 0;
          extraHp += sl.hp || 100;
          extraMaxHp += sl.maxHp || 100;
          spawnParticle(sl.x, sl.y, '#84cc16', 25, 180, 6, 'spark');
        });

        // 終極大融合：血量幾何倍增
        fighter.maxHp = (fighter.maxHp + extraMaxHp + 20) * 2;
        fighter.hp = fighter.maxHp;
        fighter.radius = Math.min(52, 24 + Math.log2(Math.max(1, fighter.maxHp / 100)) * 4.0);
        fighter.fusionCount = (fighter.fusionCount || 0) + 1 + slimes.length;

        spawnParticle(fighter.x, fighter.y, '#84cc16', 60, 320, 12, 'ring');
        spawnParticle(fighter.x, fighter.y, '#fbbf24', 40, 260, 8, 'spark');
        spawnDamageText(fighter.x, fighter.y, `🌟 原初泰坦! HP:${fighter.hp}`, '#fbbf24', true);

        // Acid Shockwave dealing massive damage to all enemies
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            const d = Math.hypot(other.x - fighter.x, other.y - fighter.y);
            const knockAngle = Math.atan2(other.y - fighter.y, other.x - fighter.x);
            other.vx = Math.cos(knockAngle) * 550;
            other.vy = Math.sin(knockAngle) * 550;
            applyDamage(fighter, other, char.stats.attackPower * (2.2 + slimes.length * 0.4), 'smash');
          }
        });
      } else if (char.id === 'mlg_guy') {
        // Ultimate: 360° 反彈狙擊彈 (MLG 360° Bouncing Sniper Barrage - 6發, 越反彈越快, 存活20秒, 打到人即消失)
        sounds.playAirhorn();
        sounds.playUltimate();
        sounds.playSniperShot();
        triggerScreenShake(14);

        // Visual effects for MLG 360 No-Scope
        spawnParticle(fighter.x, fighter.y, '#22c55e', 50, 320, 10, 'ring');
        spawnParticle(fighter.x, fighter.y, '#f97316', 40, 260, 8, 'spark');
        spawnParticle(fighter.x, fighter.y, '#fbbf24', 30, 200, 6, 'ring');
        spawnDamageText(fighter.x, fighter.y, '🎯 360° 6發高速反彈狙擊彈！(存活20s)', '#22c55e', true);

        // 360° 齊射 6 發高速反彈重狙子彈 (存活20秒, 越反彈越快, 打到人即消失)
        const bulletCount = 6;
        const baseAngle = fighter.angle;
        const initialSpeed = 640;
        for (let i = 0; i < bulletCount; i++) {
          const shotAngle = baseAngle + (i * 2 * Math.PI) / bulletCount;
          setTimeout(() => {
            if (fighter.state === 'dead') return;
            sounds.playSniperShot();
            projectilesRef.current.push({
              id: nextIdRef.current++,
              ownerId: fighter.id,
              x: fighter.x + Math.cos(shotAngle) * (fighter.radius + 12),
              y: fighter.y + Math.sin(shotAngle) * (fighter.radius + 12),
              vx: Math.cos(shotAngle) * initialSpeed,
              vy: Math.sin(shotAngle) * initialSpeed,
              radius: 9,
              damage: 110,
              color: '#22c55e',
              glowColor: '#f97316',
              piercing: false, // 打到人就消失
              piercedCount: 0,
              bounces: 0,
              maxBounces: 9999, // 20秒內持續反彈
              speedMultiplierOnBounce: 1.15, // 每次反彈速度 +15% 越彈越快
              life: 0,
              maxLife: 20.0, // 存在 20 秒
              type: 'sniper_bullet',
            });
            spawnParticle(
              fighter.x + Math.cos(shotAngle) * (fighter.radius + 12),
              fighter.y + Math.sin(shotAngle) * (fighter.radius + 12),
              '#f97316',
              10,
              180,
              5,
              'spark'
            );
          }, i * 35);
        }

        // Tactical agility boost
        fighter.statusEffects.push({ type: 'speed_boost', duration: 2.5, value: 1.5 });
      } else if (char.id === 'gordon_ramsay') {
        // Gordon Ramsay Ultimate: 地獄火海 (Hellfire Inferno) - 超大範圍地獄火海 + 5秒移動火焰軌跡
        sounds.playUltimate();
        sounds.playHellKitchenExplode();
        sounds.playDash();
        triggerScreenShake(25);
        fighter.isInvincible = true;
        fighter.statusEffects.push({ type: 'shield', duration: 1.0, value: 600 });
        setTimeout(() => { fighter.isInvincible = false; }, 800);

        // 啟動 5 秒火焰移動軌跡與地獄烈焰狀態 (5-second flame trail & Hellfire buff)
        fighter.flameTrailTimer = 5.0;
        fighter.flameTrailDropTimer = 0;
        fighter.hellfireBuffTimer = 5.0;

        // 1. 大招引爆超大範圍地獄火海 (Radius 270px Hellfire Zone + Massive Burst Explosion)
        spawnParticle(fighter.x, fighter.y, '#ef4444', 90, 480, 15, 'ring');
        spawnParticle(fighter.x, fighter.y, '#f59e0b', 70, 360, 12, 'spark');
        spawnParticle(fighter.x, fighter.y, '#fbbf24', 50, 280, 9, 'ring');
        spawnDamageText(fighter.x, fighter.y, '🔥 地獄火海！全場烈焰！', '#ef4444', true);

        // 原地召喚持續 5 秒的超大範圍地獄火海
        groundZonesRef.current.push({
          id: nextIdRef.current++,
          ownerId: fighter.id,
          team: fighter.team,
          x: fighter.x,
          y: fighter.y,
          radius: 270,
          duration: 5.0,
          type: 'hellfire',
          damagePerSec: 50,
          tickTimer: 0,
        });

        // 270px 超大範圍衝擊波與強烈灼燒
        fightersRef.current.forEach(other => {
          if (other.team !== fighter.team && other.state !== 'dead') {
            const dist = Math.hypot(other.x - fighter.x, other.y - fighter.y);
            if (dist < 270) {
              const knockAngle = Math.atan2(other.y - fighter.y, other.x - fighter.x);
              other.vx = Math.cos(knockAngle) * 650;
              other.vy = Math.sin(knockAngle) * 650;
              other.statusEffects.push({ type: 'burn', duration: 5.0 });
              applyDamage(fighter, other, 260, 'slash', true);
            }
          }
        });

        // Find primary enemy target if not provided
        let enemyTarget = target;
        if (!enemyTarget || enemyTarget.team === fighter.team || enemyTarget.state === 'dead') {
          let closestD = Infinity;
          fightersRef.current.forEach(other => {
            if (other.team !== fighter.team && other.state !== 'dead' && other.hp > 0) {
              const d = Math.hypot(other.x - fighter.x, other.y - fighter.y);
              if (d < closestD) {
                closestD = d;
                enemyTarget = other;
              }
            }
          });
        }

        const dashAngle = enemyTarget ? Math.atan2(enemyTarget.y - fighter.y, enemyTarget.x - fighter.x) : fighter.angle;
        fighter.vx = Math.cos(dashAngle) * 1250;
        fighter.vy = Math.sin(dashAngle) * 1250;

        // 立即在突進軌跡上鋪設一排持續 5 秒的燃燒火海
        const startX = fighter.x;
        const startY = fighter.y;
        const targetX = enemyTarget ? enemyTarget.x : startX + Math.cos(dashAngle) * 350;
        const targetY = enemyTarget ? enemyTarget.y : startY + Math.sin(dashAngle) * 350;
        const dashDist = Math.hypot(targetX - startX, targetY - startY);
        const steps = Math.max(4, Math.min(10, Math.floor(dashDist / 40)));
        for (let s = 1; s <= steps; s++) {
          const ratio = s / steps;
          const px = startX + (targetX - startX) * ratio;
          const py = startY + (targetY - startY) * ratio;
          groundZonesRef.current.push({
            id: nextIdRef.current++,
            ownerId: fighter.id,
            team: fighter.team,
            x: px,
            y: py,
            radius: 85,
            duration: 5.0,
            type: 'hellfire',
            damagePerSec: 42,
            tickTimer: 0,
          });
        }

        if (enemyTarget && enemyTarget.state !== 'dead') {
          setTimeout(() => {
            sounds.playHellKitchenExplode();
            triggerScreenShake(20);
            enemyTarget!.statusEffects.push({ type: 'burn', duration: 5.0 });
            // Crushing flame strike
            applyDamage(fighter, enemyTarget!, 320, 'slash', true);
            spawnParticle(enemyTarget!.x, enemyTarget!.y, '#ef4444', 60, 320, 12, 'spark');
            spawnParticle(enemyTarget!.x, enemyTarget!.y, '#fbbf24', 45, 280, 9, 'ring');
            spawnDamageText(enemyTarget!.x, enemyTarget!.y, '🔥 焚身烈焰！-320', '#ef4444', true);
          }, 150);
        }
      } else if (char.id === 'target_dummy') {
        sounds.playUltimate();
        triggerScreenShake(8);
        spawnParticle(fighter.x, fighter.y, '#fbbf24', 40, 260, 8, 'ring');
        // Dummy itself does not recharge or keep 100% energy
        fighter.energy = 0;
        fighter.cooldownUltimate = 999999;
        fightersRef.current.forEach(other => {
          if (other !== fighter && other.character.id !== 'target_dummy' && other.state !== 'dead') {
            other.energy = 100;
            other.cooldownUltimate = 0;
            other.cooldownSkill1 = 0;
            other.cooldownSkill2 = 0;
            spawnParticle(other.x, other.y, '#fbbf24', 25, 200, 6, 'spark');
            spawnDamageText(other.x, other.y, '⚡ 100% 怒氣大招充盈!', '#fbbf24', true);
          }
        });
      }
    }
  }, []);

  // Toggle P1 & P2 Skill Control Mode (手動 / 自動 / 半自動)
  const toggleP1ControlMode = useCallback(() => {
    setP1ControlMode(prev => {
      const next: SkillControlMode = prev === 'auto' ? 'semi_auto' : prev === 'semi_auto' ? 'manual' : 'auto';
      p1ControlModeRef.current = next;
      const p1 = fightersRef.current.find(f => f.team === 1);
      if (p1) {
        p1.skillControlMode = next;
        const modeLabels: Record<SkillControlMode, string> = {
          auto: '⚡ 全自動戰鬥 (Auto)',
          semi_auto: '⚔️ 半自動 (普攻自動 / 技能手動)',
          manual: '🎮 純手動操作 (Manual)'
        };
        spawnDamageText(p1.x, p1.y, `P1: ${modeLabels[next]}`, '#38bdf8', true);
      }
      sounds.playDash();
      return next;
    });
  }, []);

  const toggleP2ControlMode = useCallback(() => {
    setP2ControlMode(prev => {
      const next: SkillControlMode = prev === 'auto' ? 'semi_auto' : prev === 'semi_auto' ? 'manual' : 'auto';
      p2ControlModeRef.current = next;
      const p2 = fightersRef.current.find(f => f.team === 2);
      if (p2) {
        p2.skillControlMode = next;
        const modeLabels: Record<SkillControlMode, string> = {
          auto: '⚡ 全自動戰鬥 (Auto)',
          semi_auto: '⚔️ 半自動 (普攻自動 / 技能手動)',
          manual: '🎮 純手動操作 (Manual)'
        };
        spawnDamageText(p2.x, p2.y, `P2: ${modeLabels[next]}`, '#ef4444', true);
      }
      sounds.playDash();
      return next;
    });
  }, []);

  // Manual trigger action (支援常規戰鬥手動操作 與 假人沙盒無CD測試)
  const handleManualAction = useCallback((
    actionType: 'primary' | 'skill1' | 'skill2' | 'ultimate', 
    team: 1 | 2 = 1,
    forceBypass = false
  ) => {
    const fighter = fightersRef.current.find(f => f.team === team && f.state !== 'dead');
    if (!fighter) return;

    const isSandbox = isTestingMode || forceBypass;

    if (isSandbox) {
      if (actionType === 'ultimate') {
        fighter.energy = 100;
        fighter.cooldownUltimate = 0;
      } else if (actionType === 'skill1') {
        fighter.cooldownSkill1 = 0;
      } else if (actionType === 'skill2') {
        fighter.cooldownSkill2 = 0;
      } else if (actionType === 'primary') {
        fighter.autoAttackTimer = 0;
        fighter.cooldownPrimary = 0;
      }

      triggerFighterAction(fighter, actionType);
      addCombatLog(fighter, actionType, `[手動操作] 釋放【${actionType === 'ultimate' ? fighter.character.skills.ultimate.name : actionType === 'skill1' ? fighter.character.skills.skill1.name : actionType === 'skill2' ? fighter.character.skills.skill2.name : fighter.character.skills.primary.name}】`);
      return;
    }

    // Normal Battle Rules (Strict CD & Energy Check with feedback)
    if (actionType === 'primary') {
      if (fighter.cooldownPrimary > 0 && fighter.autoAttackTimer > 0.1) {
        return;
      }
      fighter.cooldownPrimary = fighter.character.stats.attackInterval || 1.2;
      fighter.autoAttackTimer = fighter.character.stats.attackInterval || 1.2;
      triggerFighterAction(fighter, 'primary');
      addCombatLog(fighter, 'primary');
    } else if (actionType === 'skill1') {
      if (fighter.cooldownSkill1 > 0) {
        spawnDamageText(fighter.x, fighter.y, `⏳ 專屬技冷卻中 (${fighter.cooldownSkill1.toFixed(1)}s)`, '#94a3b8');
        sounds.playShield();
        return;
      }
      fighter.cooldownSkill1 = fighter.character.skills.skill1.cooldown || 10.0;
      triggerFighterAction(fighter, 'skill1');
      addCombatLog(fighter, 'skill1');
    } else if (actionType === 'skill2') {
      if (fighter.cooldownSkill2 > 0) {
        spawnDamageText(fighter.x, fighter.y, `⏳ 秘術冷卻中 (${fighter.cooldownSkill2.toFixed(1)}s)`, '#94a3b8');
        sounds.playShield();
        return;
      }
      fighter.cooldownSkill2 = 10.0;
      triggerFighterAction(fighter, 'skill2');
      addCombatLog(fighter, 'skill2');
    } else if (actionType === 'ultimate') {
      if (fighter.energy < 100) {
        spawnDamageText(fighter.x, fighter.y, `⚡ 怒氣不足 (${Math.floor(fighter.energy)}/100)`, '#fbbf24');
        sounds.playShield();
        return;
      }
      if (fighter.cooldownUltimate > 0) {
        spawnDamageText(fighter.x, fighter.y, `⏳ 大招冷卻中 (${fighter.cooldownUltimate.toFixed(1)}s)`, '#fbbf24');
        sounds.playShield();
        return;
      }
      fighter.energy = 0;
      fighter.cooldownUltimate = fighter.character.skills.ultimate.cooldown;
      triggerFighterAction(fighter, 'ultimate');
      addCombatLog(fighter, 'ultimate');
    }
  }, [addCombatLog, triggerFighterAction, isTestingMode]);

  // Skill testing cheat tools
  const handleFillEnergy = useCallback((team: 1 | 2 = 1) => {
    const fighter = fightersRef.current.find(f => f.team === team);
    if (fighter) {
      fighter.energy = 100;
      fighter.cooldownUltimate = 0;
      spawnParticle(fighter.x, fighter.y, '#fbbf24', 25, 180, 6, 'spark');
      spawnDamageText(fighter.x, fighter.y, '⚡ 能量已補滿 (100%)', '#fbbf24', true);
      sounds.playUltimate();
    }
  }, []);

  const handleResetCooldowns = useCallback((team: 1 | 2 = 1) => {
    const fighter = fightersRef.current.find(f => f.team === team);
    if (fighter) {
      fighter.cooldownSkill1 = 0;
      fighter.cooldownSkill2 = 0;
      fighter.cooldownUltimate = 0;
      fighter.autoAttackTimer = 0;
      spawnParticle(fighter.x, fighter.y, '#38bdf8', 20, 160, 5, 'ring');
      spawnDamageText(fighter.x, fighter.y, '🔄 全技能冷卻重置 (0s)', '#38bdf8', true);
      sounds.playShield();
    }
  }, []);

  const handleResetDummyHp = useCallback(() => {
    const dummy = fightersRef.current.find(f => f.character.id === 'target_dummy');
    if (dummy) {
      dummy.hp = dummy.maxHp;
      dummy.damageFlash = 0.3;
      dummy.statusEffects = [];
      spawnParticle(dummy.x, dummy.y, '#10b981', 30, 220, 8, 'ring');
      spawnDamageText(dummy.x, dummy.y, '💖 假人血量重置 (999,999 HP)', '#10b981', true);
      sounds.playVictory();
    }
  }, []);

  const handleToggleStationary = useCallback(() => {
    dummyStationaryRef.current = !dummyStationaryRef.current;
    const dummy = fightersRef.current.find(f => f.character.id === 'target_dummy');
    if (dummy) {
      dummy.isStationary = dummyStationaryRef.current;
      if (dummy.isStationary) {
        dummy.x = squareBoundsRef.current.centerX;
        dummy.y = squareBoundsRef.current.centerY;
        dummy.vx = 0;
        dummy.vy = 0;
      } else {
        dummy.vx = (Math.random() - 0.5) * 260;
        dummy.vy = (Math.random() - 0.5) * 260;
      }
    }
    setTrainingStats(prev => ({ ...prev, isStationary: dummyStationaryRef.current }));
  }, []);

  const handleCycleArmor = useCallback(() => {
    const armorSteps = [0, 50, 100, 200];
    const currentIndex = armorSteps.indexOf(dummyArmorRef.current);
    const nextArmor = armorSteps[(currentIndex + 1) % armorSteps.length];
    dummyArmorRef.current = nextArmor;
    const dummy = fightersRef.current.find(f => f.character.id === 'target_dummy');
    if (dummy) {
      dummy.dummyArmor = nextArmor;
      spawnDamageText(dummy.x, dummy.y, `🛡️ 護甲設置: ${nextArmor}`, '#38bdf8', true);
    }
    setTrainingStats(prev => ({ ...prev, armor: nextArmor }));
  }, []);

  const handleClearTrainingStats = useCallback(() => {
    trainingDamageLogRef.current = [];
    maxHitRef.current = 0;
    const p1 = fightersRef.current.find(f => f.team === 1);
    if (p1) {
      p1.totalDamageDealt = 0;
      p1.comboCount = 0;
    }
    setTrainingStats(prev => ({
      ...prev,
      dps: 0,
      totalDamage: 0,
      maxHit: 0,
      maxCombo: 0,
    }));
  }, []);

  // Keyboard hotkeys for manual skill controls, mode switching, and sandbox tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();

      // P1 Manual Skills & Hotkeys
      if (e.key === '1' || key === 'j') {
        handleManualAction('primary', 1);
      } else if (e.key === '2' || key === 'k') {
        handleManualAction('skill1', 1);
      } else if (e.key === '3' || key === 'l') {
        handleManualAction('skill2', 1);
      } else if (e.key === '4' || key === 'u' || e.code === 'Space') {
        e.preventDefault();
        handleManualAction('ultimate', 1);
      } else if (key === 't' || key === 'm') {
        toggleP1ControlMode();
      } else if (key === 'r') {
        handleResetCooldowns(1);
      } else if (key === 'e') {
        handleFillEnergy(1);
      } else if (key === 'c') {
        handleClearTrainingStats();
      }

      // P2 Manual Skills & Hotkeys (for 2P / PvP)
      else if (e.key === '7' || e.code === 'Numpad1') {
        handleManualAction('primary', 2);
      } else if (e.key === '8' || e.code === 'Numpad2') {
        handleManualAction('skill1', 2);
      } else if (e.key === '9' || e.code === 'Numpad3') {
        handleManualAction('skill2', 2);
      } else if (e.key === '0' || e.code === 'Numpad0' || e.code === 'Enter') {
        e.preventDefault();
        handleManualAction('ultimate', 2);
      } else if (key === 'y') {
        toggleP2ControlMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualAction, handleResetCooldowns, handleFillEnergy, handleClearTrainingStats, toggleP1ControlMode, toggleP2ControlMode]);

  // Apply Damage to a Target
  const applyDamage = (
    attacker: FighterEntity,
    target: FighterEntity,
    rawDamage: number,
    damageType: 'slash' | 'magic' | 'smash' | 'projectile',
    forceCrit = false
  ) => {
    if (target.isInvincible || target.state === 'dead') return;

    // Crit roll
    const isCrit = forceCrit || Math.random() < attacker.character.stats.critRate;
    const critMultiplier = isCrit ? 1.75 : 1.0;

    // Defense reduction
    let def = target.character.id === 'target_dummy' ? (target.dummyArmor ?? 0) : target.character.stats.defense;
    const shockedEffect = target.statusEffects.find(e => e.type === 'shocked');
    if (shockedEffect) {
      def = Math.max(0, def * 0.7); // 30% armor reduction
    }
    const damageReduction = def / (def + 100);
    let finalDamage = Math.max(12, rawDamage * critMultiplier * (1 - damageReduction));

    // Shield absorption
    const shieldEffect = target.statusEffects.find(e => e.type === 'shield');
    if (shieldEffect && shieldEffect.value && shieldEffect.value > 0) {
      if (shieldEffect.value >= finalDamage) {
        shieldEffect.value -= finalDamage;
        spawnDamageText(target.x, target.y, '🛡️ BLOCKED!', '#38bdf8');
        sounds.playShield();
        return;
      } else {
        finalDamage -= shieldEffect.value;
        shieldEffect.value = 0;
      }
    }

    target.hp -= finalDamage;
    target.damageFlash = 0.15;
    attacker.totalDamageDealt += finalDamage;
    attacker.totalHitsLanded++;
    target.totalHitsTaken++;

    // Target Dummy DPS & Telemetry logging
    if (target.character.id === 'target_dummy') {
      trainingDamageLogRef.current.push({ time: performance.now(), damage: finalDamage, isCrit });
      maxHitRef.current = Math.max(maxHitRef.current, finalDamage);
      
      // Auto replenish dummy HP when low
      if (target.hp <= 5000) {
        target.hp = target.maxHp;
        spawnParticle(target.x, target.y, '#10b981', 25, 200, 7, 'ring');
        spawnDamageText(target.x, target.y - 30, '🌟 標靶抗擊! 滿血續測', '#10b981', true);
      }
    }

    // Gordon Ramsay Passive: Michelin Standard (對生命值低於 40% 的敵人造成 15% 額外真實傷害)
    if (attacker.character.id === 'gordon_ramsay' && target.hp > 0) {
      if (target.hp / target.maxHp < 0.40) {
        const trueDmg = Math.max(6, Math.round(rawDamage * 0.15));
        target.hp -= trueDmg;
        attacker.totalDamageDealt += trueDmg;
        spawnDamageText(target.x, target.y - 18, `⭐ +${trueDmg} 米其林真實傷害`, '#fbbf24', true);
        spawnParticle(target.x, target.y, '#fbbf24', 6, 120, 4, 'spark');
      }
    }

    // Knockback (Skip heavy knockback on stationary dummy)
    if (!(target.character.id === 'target_dummy' && target.isStationary)) {
      const kAngle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
      const kForce = isCrit ? 180 : 100;
      target.vx += Math.cos(kAngle) * kForce;
      target.vy += Math.sin(kAngle) * kForce;
    }

    // Energy Gain (Target dummy does not gain energy from attacks or being attacked)
    if (attacker.character.id !== 'target_dummy') {
      attacker.energy = Math.min(100, attacker.energy + (isCrit ? 15 : 9));
    }
    if (target.character.id !== 'target_dummy') {
      target.energy = Math.min(100, target.energy + 5);
    } else {
      target.energy = 0;
    }

    // Combo Counter
    attacker.comboCount++;
    attacker.comboTimer = 2.5;

    // Sound and Text
    sounds.playHit(isCrit);
    spawnDamageText(
      target.x,
      target.y,
      `${Math.round(finalDamage)}${isCrit ? ' CRIT!' : ''}`,
      isCrit ? '#f59e0b' : '#ef4444',
      isCrit
    );
    spawnParticle(target.x, target.y, isCrit ? '#f59e0b' : target.character.themeColor, isCrit ? 14 : 7, 160, 5, 'spark');

    // Knockout Check (Target Dummy never gets knocked out to allow continuous testing)
    if (target.character.id !== 'target_dummy' && target.hp <= 0) {
      target.hp = 0;
      target.state = 'dead';
      attacker.kills++;
      sounds.playVictory();
      spawnParticle(target.x, target.y, '#fbbf24', 40, 260, 10, 'ring');

      // Gordon Ramsay Passive: 擊敗敵人時獲得一層「頂級主廚」效果，提升 20% 移動速度與攻擊速度，持續 4 秒
      if (attacker.character.id === 'gordon_ramsay') {
        attacker.topChefTimer = 4.0;
        attacker.statusEffects.push({ type: 'speed_boost', duration: 4.0, value: 1.2 });
        sounds.playMichelinGain();
        spawnDamageText(attacker.x, attacker.y, '⭐⭐⭐ 頂級主廚! (+20% 移速/攻速 4s)', '#fbbf24', true);
        spawnParticle(attacker.x, attacker.y, '#fbbf24', 30, 220, 8, 'star');
      }

      // Check for Match End
      checkMatchEnd();
    }
  };

  // Check if either team has been eliminated
  const checkMatchEnd = () => {
    if (isMatchOverRef.current) return;

    // Ignore match end if Target Dummy is present so testing is continuous
    if (fightersRef.current.some(f => f.character.id === 'target_dummy')) return;

    const team1Alive = fightersRef.current.some(f => f.team === 1 && f.state !== 'dead');
    const team2Alive = fightersRef.current.some(f => f.team === 2 && f.state !== 'dead');

    if (!team1Alive || !team2Alive) {
      isMatchOverRef.current = true;
      const winnerTeam = team1Alive ? 1 : 2;
      const winner = fightersRef.current.find(f => f.team === winnerTeam && f.state !== 'dead') ||
                     fightersRef.current.find(f => f.team === winnerTeam) ||
                     fightersRef.current[0];
      const winnerName = winnerTeam === 1 ? p1Char.name : p2Char.name;
      const winnerChar = winnerTeam === 1 ? p1Char : p2Char;
      const duration = Math.max(1, (Date.now() - matchStartTimeRef.current) / 1000);

      sounds.playVictory();

      const stats: BattleStats = {
        winnerTeam,
        winnerName,
        winnerChar,
        duration,
        fighters: fightersRef.current.map(f => ({
          id: f.id,
          name: f.name,
          team: f.team,
          character: f.character,
          damageDealt: f.totalDamageDealt,
          hitsLanded: f.totalHitsLanded,
          hitsTaken: f.totalHitsTaken,
          skillsUsed: f.totalSkillsUsed,
          maxCombo: f.comboCount,
          remainingHp: f.hp,
          maxHp: f.maxHp,
        })),
      };

      // 鏡頭放大聚焦獲勝者，時間放慢0.5倍，播放3秒後彈出勝利畫面
      victoryFocusRef.current = {
        active: true,
        winner,
        winnerTeam,
        winnerName,
        winnerChar,
        startTime: performance.now(),
        duration: 3.0,
        cameraX: squareBoundsRef.current.centerX,
        cameraY: squareBoundsRef.current.centerY,
        cameraZoom: 1.0,
        targetZoom: 2.2,
        stats,
      };

      setVictoryBannerInfo({
        winnerName,
        winnerChar,
        countdown: 3.0,
      });

      addCombatLog(
        winner,
        'ultimate',
        `🏆 決鬥決勝！鏡頭放大聚焦【${winnerName}】，開啟 0.5x 慢動作重播 (3秒後結算)...`
      );
    }
  };

  // Main Canvas Game Loop with Square Frame Bouncing & Timed Auto Attacks
  useEffect(() => {
    initGame();
    lastTimeRef.current = performance.now();

    const loop = (timestamp: number) => {
      const rawDt = Math.min(0.05, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      const isVictoryFocus = victoryFocusRef.current.active;
      // 時間放慢 0.5 倍
      const victoryTimeScale = isVictoryFocus ? 0.5 : 1.0;
      const dt = rawDt * simSpeedRef.current * victoryTimeScale;

      // Victory Focus Real-Time Countdown & Camera Tracking (3.0s real time duration)
      if (isVictoryFocus) {
        const realElapsed = (timestamp - victoryFocusRef.current.startTime) / 1000;
        const remaining = Math.max(0, victoryFocusRef.current.duration - realElapsed);

        setVictoryBannerInfo(prev => prev ? { ...prev, countdown: remaining } : null);

        const winner = victoryFocusRef.current.winner;
        if (winner) {
          // Camera pan & zoom lerp towards winner coordinates
          const targetX = winner.x;
          const targetY = winner.y;
          const targetZoom = victoryFocusRef.current.targetZoom;

          const camLerp = Math.min(1.0, rawDt * 4.0);
          victoryFocusRef.current.cameraX += (targetX - victoryFocusRef.current.cameraX) * camLerp;
          victoryFocusRef.current.cameraY += (targetY - victoryFocusRef.current.cameraY) * camLerp;
          victoryFocusRef.current.cameraZoom += (targetZoom - victoryFocusRef.current.cameraZoom) * camLerp;

          // Celebration particles & golden sparkles around winner
          if (Math.random() < 0.45) {
            spawnParticle(
              winner.x + (Math.random() - 0.5) * 45,
              winner.y + (Math.random() - 0.5) * 45,
              Math.random() < 0.5 ? '#fbbf24' : winner.character.themeColor,
              2,
              65,
              5,
              'spark'
            );
          }
        }

        // 播放 3 秒後彈出勝利畫面
        if (realElapsed >= victoryFocusRef.current.duration) {
          if (victoryFocusRef.current.stats) {
            const finalStats = victoryFocusRef.current.stats;
            victoryFocusRef.current.active = false;
            setVictoryBannerInfo(null);
            onGameOver(finalStats);
            return;
          }
        }
      }

      if (!isPausedRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Update Match Time
          const elapsed = (Date.now() - matchStartTimeRef.current) / 1000;
          setMatchTime(elapsed);

          const { minX, maxX, minY, maxY, centerX, centerY } = squareBoundsRef.current;

          // Spawn Periodic Arena Energy Items in square frame
          if (Math.random() < 0.003 * simSpeedRef.current && itemsRef.current.length < 2) {
            const rx = minX + 60 + Math.random() * (maxX - minX - 120);
            const ry = minY + 60 + Math.random() * (maxY - minY - 120);
            const types: ('heal' | 'energy' | 'damage_buff' | 'speed_buff')[] = ['heal', 'energy', 'damage_buff', 'speed_buff'];
            itemsRef.current.push({
              id: nextIdRef.current++,
              x: rx,
              y: ry,
              radius: 13,
              type: types[Math.floor(Math.random() * types.length)],
              spawnTime: elapsed,
              duration: 16,
              active: true,
            });
          }

          // 1. UPDATE FIGHTERS (Square Bounce + Autonomous Attack Intervals)
          fightersRef.current.forEach(fighter => {
            if (fighter.state === 'dead') return;

            // Reduce Cooldowns
            fighter.cooldownPrimary = Math.max(0, fighter.cooldownPrimary - dt);
            fighter.cooldownSkill1 = Math.max(0, fighter.cooldownSkill1 - dt);
            fighter.cooldownSkill2 = Math.max(0, fighter.cooldownSkill2 - dt);
            fighter.cooldownUltimate = Math.max(0, fighter.cooldownUltimate - dt);
            fighter.damageFlash = Math.max(0, fighter.damageFlash - dt);

            // Combo decay
            if (fighter.comboTimer > 0) {
              fighter.comboTimer -= dt;
              if (fighter.comboTimer <= 0) fighter.comboCount = 0;
            }

            // Update Status Effects
            fighter.statusEffects = fighter.statusEffects.filter(effect => {
              effect.duration -= dt;
              if (effect.type === 'burn') {
                fighter.hp -= 15 * dt;
                spawnParticle(fighter.x, fighter.y, '#f97316', 1, 60, 3);
                if (fighter.hp <= 0) {
                  fighter.hp = 0;
                  fighter.state = 'dead';
                  checkMatchEnd();
                }
              } else if (effect.type === 'bleed') {
                fighter.hp -= (effect.value || 20) * dt;
                if (Math.random() < 0.35) {
                  spawnParticle(fighter.x, fighter.y, '#ef4444', 1, 40, 3);
                }
                if (fighter.hp <= 0) {
                  fighter.hp = 0;
                  fighter.state = 'dead';
                  checkMatchEnd();
                }
              }
              return effect.duration > 0;
            });

            // Update status flags
            fighter.isShielded = fighter.statusEffects.some(e => e.type === 'shield');
            fighter.isStealthed = fighter.statusEffects.some(e => e.type === 'stealth');
            const isStunned = fighter.statusEffects.some(e => e.type === 'stun' || e.type === 'freeze');

            // Gordon Ramsay Timers & 5-Second Flame Trail on Movement
            if (fighter.topChefTimer && fighter.topChefTimer > 0) {
              fighter.topChefTimer = Math.max(0, fighter.topChefTimer - dt);
              if (Math.random() < 0.3) {
                spawnParticle(fighter.x, fighter.y, '#fbbf24', 1, 45, 4, 'star');
              }
            }
            if (fighter.hellfireBuffTimer && fighter.hellfireBuffTimer > 0) {
              fighter.hellfireBuffTimer = Math.max(0, fighter.hellfireBuffTimer - dt);
              if (Math.random() < 0.4) {
                spawnParticle(fighter.x, fighter.y, '#ea580c', 1, 55, 4, 'spark');
              }
            }
            if (fighter.flameTrailTimer && fighter.flameTrailTimer > 0) {
              fighter.flameTrailTimer = Math.max(0, fighter.flameTrailTimer - dt);
              fighter.flameTrailDropTimer = (fighter.flameTrailDropTimer || 0) - dt;
              if (fighter.flameTrailDropTimer <= 0) {
                fighter.flameTrailDropTimer = 0.12; // Drops burning flame zone along movement path every 0.12s
                groundZonesRef.current.push({
                  id: nextIdRef.current++,
                  ownerId: fighter.id,
                  team: fighter.team,
                  x: fighter.x,
                  y: fighter.y,
                  radius: 80,
                  duration: 5.0, // Lasts 5 seconds
                  type: 'hellfire',
                  damagePerSec: 38,
                  tickTimer: 0,
                });
                spawnParticle(fighter.x, fighter.y, '#ef4444', 3, 75, 5, 'spark');
                spawnParticle(fighter.x, fighter.y, '#f59e0b', 2, 50, 4, 'ring');
              }
            }

            // MLG Dew Boost Decay
            if (fighter.dewBoostTimer && fighter.dewBoostTimer > 0) {
              fighter.dewBoostTimer = Math.max(0, fighter.dewBoostTimer - dt);
              // Spawn blazing Dew neon speed particles
              if (Math.random() < 0.75) {
                spawnParticle(fighter.x, fighter.y, Math.random() < 0.5 ? '#22c55e' : '#f97316', 2, 70, 4, 'spark');
              }
            }

            // Kinetic Speed Maintenance: 20x multiplier when drinking Mountain Dew
            const isDewBoost = (fighter.dewBoostTimer && fighter.dewBoostTimer > 0);
            const speedMultiplier = isDewBoost ? 20.0 : (fighter.statusEffects.find(e => e.type === 'speed_boost')?.value || 1.0);
            const baseSpeed = (fighter.character.stats.bounceSpeed || 300) * speedMultiplier;
            const currentSpeed = Math.hypot(fighter.vx, fighter.vy);
            if (!isStunned) {
              if (currentSpeed < baseSpeed * 0.85) {
                const boost = baseSpeed / (currentSpeed || 1);
                fighter.vx *= boost;
                fighter.vy *= boost;
              } else if (currentSpeed > baseSpeed * 1.35) {
                fighter.vx *= 0.96;
                fighter.vy *= 0.96;
              }
            } else {
              fighter.vx *= 0.85;
              fighter.vy *= 0.85;
            }

            // Move Fighter
            if (fighter.character.id === 'target_dummy' && fighter.isStationary) {
              fighter.x = squareBoundsRef.current.centerX;
              fighter.y = squareBoundsRef.current.centerY;
              fighter.vx = 0;
              fighter.vy = 0;
            } else {
              fighter.x += fighter.vx * dt;
              fighter.y += fighter.vy * dt;
            }

            // SQUARE FRAME BOUNCING PHYSICS (Left, Right, Top, Bottom)
            const r = fighter.radius;
            // Left Wall
            if (fighter.x - r <= minX) {
              fighter.x = minX + r;
              fighter.vx = Math.abs(fighter.vx) + (Math.random() - 0.5) * 20;
              fighter.wallBounceCount++;
              triggerWallFlash(minX, fighter.y, 'left', fighter.character.themeColor);
            }
            // Right Wall
            if (fighter.x + r >= maxX) {
              fighter.x = maxX - r;
              fighter.vx = -Math.abs(fighter.vx) + (Math.random() - 0.5) * 20;
              fighter.wallBounceCount++;
              triggerWallFlash(maxX, fighter.y, 'right', fighter.character.themeColor);
            }
            // Top Wall
            if (fighter.y - r <= minY) {
              fighter.y = minY + r;
              fighter.vy = Math.abs(fighter.vy) + (Math.random() - 0.5) * 20;
              fighter.wallBounceCount++;
              triggerWallFlash(fighter.x, minY, 'top', fighter.character.themeColor);
            }
            // Bottom Wall
            if (fighter.y + r >= maxY) {
              fighter.y = maxY - r;
              fighter.vy = -Math.abs(fighter.vy) + (Math.random() - 0.5) * 20;
              fighter.wallBounceCount++;
              triggerWallFlash(fighter.x, maxY, 'bottom', fighter.character.themeColor);
            }

            // Obstacle collision inside box
            obstaclesRef.current.forEach(obs => {
              const od = Math.hypot(fighter.x - obs.x, fighter.y - obs.y);
              if (od < fighter.radius + obs.radius) {
                const oa = Math.atan2(fighter.y - obs.y, fighter.x - obs.x);
                fighter.x = obs.x + Math.cos(oa) * (fighter.radius + obs.radius);
                fighter.y = obs.y + Math.sin(oa) * (fighter.radius + obs.radius);
                fighter.vx = Math.cos(oa) * (fighter.character.stats.bounceSpeed || 300);
                fighter.vy = Math.sin(oa) * (fighter.character.stats.bounceSpeed || 300);

                if (obs.type === 'hazard_lava') {
                  fighter.hp -= 20 * dt;
                  spawnParticle(fighter.x, fighter.y, '#f97316', 1, 80, 4);
                  if (fighter.hp <= 0) {
                    fighter.hp = 0;
                    fighter.state = 'dead';
                    checkMatchEnd();
                  }
                }
              }
            });

            // AUTONOMOUS ATTACK TIMERS (玩家可自由設定 技能手動操作 / 全自動 / 半自動)
            // Target Dummy is purely passive/training target and does not auto-attack or auto-cast
            if (!isStunned && fighter.character.id !== 'target_dummy') {
              const currentMode = fighter.skillControlMode || (fighter.team === 1 ? p1ControlModeRef.current : p2ControlModeRef.current) || 'auto';
              const canAutoPrimary = currentMode === 'auto' || currentMode === 'semi_auto';
              const canAutoSkills = currentMode === 'auto';

              // 1. Primary Auto-Attack Timer (if in auto or semi-auto mode)
              if (canAutoPrimary) {
                const isMelee = fighter.character.baseRole === 'melee' || fighter.character.baseRole === 'tank' || fighter.character.baseRole === 'assassin' || (fighter.character.stats.attackRange != null && fighter.character.stats.attackRange < 160);
                
                let closestEnemyDist = Infinity;
                fightersRef.current.forEach(other => {
                  if (other.team !== fighter.team && other.state !== 'dead' && other.hp > 0) {
                    const d = Math.hypot(other.x - fighter.x, other.y - fighter.y);
                    if (d < closestEnemyDist) {
                      closestEnemyDist = d;
                    }
                  }
                });

                fighter.autoAttackTimer -= dt;
                if (fighter.autoAttackTimer <= 0) {
                  const meleeMaxReach = (fighter.character.stats.attackRange || 80) + fighter.radius + 40;
                  const inMeleeRange = !isMelee || closestEnemyDist <= meleeMaxReach;

                  if (inMeleeRange) {
                    const atkSpdScale = (fighter.topChefTimer && fighter.topChefTimer > 0) ? 0.8 : 1.0;
                    fighter.autoAttackTimer = (fighter.character.stats.attackInterval || 1.6) * atkSpdScale;
                    triggerFighterAction(fighter, 'primary');
                    addCombatLog(fighter, 'primary');
                  } else {
                    // Keep ready to strike immediately when enemy enters melee range
                    fighter.autoAttackTimer = 0;
                  }
                }
              }

              // Autonomous Skill 1, 2, and Ultimate Triggers (Only if in Auto mode)
              if (canAutoSkills) {
                // 2. Autonomous Skill 1 Trigger
                if (fighter.cooldownSkill1 <= 0 && Math.random() < 0.35 * dt * 3) {
                  triggerFighterAction(fighter, 'skill1');
                  addCombatLog(fighter, 'skill1');
                }

                // 3. Autonomous Skill 2 Trigger
                if (fighter.cooldownSkill2 <= 0 && Math.random() < 0.28 * dt * 3) {
                  triggerFighterAction(fighter, 'skill2');
                  addCombatLog(fighter, 'skill2');
                }

                // 4. Autonomous Ultimate Trigger (when energy reaches 100% or on cooldown)
                if (fighter.energy >= 100 && fighter.cooldownUltimate <= 0) {
                  triggerFighterAction(fighter, 'ultimate');
                  addCombatLog(fighter, 'ultimate');
                }
              }
            }

            // Pickup items check (Target dummy does not pick up items)
            if (fighter.character.id !== 'target_dummy') {
              itemsRef.current.forEach(item => {
                if (item.active && Math.hypot(fighter.x - item.x, fighter.y - item.y) < fighter.radius + item.radius) {
                  item.active = false;
                  sounds.playPickup();
                  if (item.type === 'heal') {
                    const healVal = fighter.maxHp * 0.25;
                    fighter.hp = Math.min(fighter.maxHp, fighter.hp + healVal);
                    spawnDamageText(fighter.x, fighter.y, `+${Math.round(healVal)} HP`, '#10b981');
                    spawnParticle(fighter.x, fighter.y, '#10b981', 15, 120, 5, 'ring');
                  } else if (item.type === 'energy') {
                    fighter.energy = 100;
                    spawnDamageText(fighter.x, fighter.y, `MAX RAGE!`, '#fbbf24');
                    spawnParticle(fighter.x, fighter.y, '#fbbf24', 20, 160, 6, 'ring');
                  } else if (item.type === 'damage_buff') {
                    fighter.statusEffects.push({ type: 'attack_boost', duration: 8, value: 1.5 });
                    spawnDamageText(fighter.x, fighter.y, `ATK +50%!`, '#ef4444');
                    spawnParticle(fighter.x, fighter.y, '#ef4444', 15, 140, 5, 'spark');
                  } else if (item.type === 'speed_buff') {
                    fighter.statusEffects.push({ type: 'speed_boost', duration: 8, value: 1.4 });
                    spawnDamageText(fighter.x, fighter.y, `SPD +40%!`, '#38bdf8');
                    spawnParticle(fighter.x, fighter.y, '#38bdf8', 15, 140, 5, 'spark');
                  }
                }
              });
            }

            // Trail rendering update
            fighter.trailPoints.unshift({ x: fighter.x, y: fighter.y, alpha: 0.45 });
            if (fighter.trailPoints.length > 8) fighter.trailPoints.pop();
            fighter.trailPoints.forEach(p => (p.alpha -= dt * 1.5));
          });

          // 1.5 MITOSIS REPLICATION & FUSION SYSTEM (每5秒複製一次, 上限場上10隻, 5秒後兩兩融合血條x2)
          if (!isVictoryFocus) {
            const newMitosisClones: FighterEntity[] = [];

            fightersRef.current.forEach(fighter => {
              if (fighter.state === 'dead') return;
              if (fighter.character.id !== 'slime_replicator') return;

              // 1. 每五秒複製一次 (Replication every 5s)
              fighter.cloneTimer = (fighter.cloneTimer ?? 5.0) - dt;
              if (fighter.cloneTimer <= 0) {
                fighter.cloneTimer = 5.0;

                // Limit total slimes on the entire field to <= 10
                const currentSlimesOnField = fightersRef.current.filter(f => f.character.id === 'slime_replicator' && f.state !== 'dead').length;
                if (currentSlimesOnField + newMitosisClones.length < 10) {
                  const spawnAngle = Math.random() * Math.PI * 2;
                  const spawnDist = fighter.radius * 1.6;
                  const cx = Math.max(minX + 30, Math.min(maxX - 30, fighter.x + Math.cos(spawnAngle) * spawnDist));
                  const cy = Math.max(minY + 30, Math.min(maxY - 30, fighter.y + Math.sin(spawnAngle) * spawnDist));
                  const bounceAngle = Math.random() * Math.PI * 2;

                  const clone = createFighter(
                    `slime_${fighter.team}_${nextIdRef.current++}`,
                    `${fighter.name.split(' (分身')[0]} (分身)`,
                    fighter.team,
                    fighter.character,
                    cx,
                    cy,
                    bounceAngle
                  );
                  clone.hp = Math.max(1, fighter.hp);
                  clone.maxHp = fighter.maxHp;
                  clone.isClone = true;
                  clone.cloneTimer = 5.0;
                  clone.fuseTimer = 5.0;
                  clone.fusionCount = fighter.fusionCount || 0;
                  clone.radius = fighter.radius;

                  newMitosisClones.push(clone);

                  sounds.playPickup();
                  spawnParticle(cx, cy, '#84cc16', 16, 130, 5, 'ring');
                  spawnParticle(cx, cy, '#bef264', 12, 100, 4, 'spark');
                  spawnDamageText(cx, cy, `🧬 裂殖複製! (${currentSlimesOnField + newMitosisClones.length}/10)`, '#84cc16');
                  addCombatLog(fighter, 'primary', `🧬 【${fighter.name}】完成了細胞有絲分裂！複製出一個新個體！`);
                }
              }

              // 2. 融合計時器 (Fusion countdown)
              fighter.fuseTimer = (fighter.fuseTimer ?? 5.0) - dt;
            });

            if (newMitosisClones.length > 0) {
              fightersRef.current.push(...newMitosisClones);
            }

            // 3. 隔 5 秒後兩兩融合，血條乘以 2 (Pairwise fusion after 5s, doubling HP)
            const processedSlimes = new Set<string>();
            const activeSlimes = fightersRef.current.filter(f => f.character.id === 'slime_replicator' && f.state !== 'dead');

            for (let i = 0; i < activeSlimes.length; i++) {
              const f1 = activeSlimes[i];
              if (processedSlimes.has(f1.id) || f1.state === 'dead') continue;
              if ((f1.fuseTimer ?? 5.0) > 0) continue;

              // Find another alive slime on same team
              const f2 = activeSlimes.find(other => 
                other.id !== f1.id && 
                other.team === f1.team && 
                other.state !== 'dead' && 
                !processedSlimes.has(other.id)
              );

              if (f2) {
                processedSlimes.add(f1.id);
                processedSlimes.add(f2.id);

                // f1 absorbs f2
                f2.state = 'dead';
                f2.hp = 0;

                // 融合：血條乘以 2
                const combinedMaxHp = (f1.maxHp + f2.maxHp) * 2;
                const combinedHp = (f1.hp + f2.hp) * 2;

                f1.maxHp = combinedMaxHp;
                f1.hp = combinedHp;
                f1.fusionCount = (f1.fusionCount || 0) + 1;
                f1.fuseTimer = 5.0; // Reset next fusion
                f1.cloneTimer = 5.0;

                // Dynamic size expansion
                f1.radius = Math.min(48, 22 + Math.log2(Math.max(1, f1.maxHp / 100)) * 3.6);

                sounds.playUltimate();
                triggerScreenShake(8);
                const midX = (f1.x + f2.x) / 2;
                const midY = (f1.y + f2.y) / 2;
                spawnParticle(midX, midY, '#84cc16', 35, 220, 8, 'ring');
                spawnParticle(midX, midY, '#fbbf24', 25, 200, 6, 'spark');
                spawnDamageText(f1.x, f1.y, `🌟 融合聚合! HP x2 (${f1.hp} HP)`, '#fbbf24', true);
                addCombatLog(f1, 'ultimate', `🌟 【${f1.name}】完成了細胞二合一融合！血量翻倍為【${f1.hp} / ${f1.maxHp} HP】！`);
              } else {
                // If waiting for partner
                f1.fuseTimer = 1.0;
              }
            }
          }

          // 2. FIGHTER VS FIGHTER ELASTIC BOUNCE COLLISION
          for (let i = 0; i < fightersRef.current.length; i++) {
            for (let j = i + 1; j < fightersRef.current.length; j++) {
              const f1 = fightersRef.current[i];
              const f2 = fightersRef.current[j];
              if (f1.state === 'dead' || f2.state === 'dead') continue;

              const dx = f2.x - f1.x;
              const dy = f2.y - f1.y;
              const dist = Math.hypot(dx, dy);
              const minDist = f1.radius + f2.radius;

              if (dist < minDist && dist > 0) {
                // Separate overlap
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = (minDist - dist) / 2;
                f1.x -= nx * overlap;
                f1.y -= ny * overlap;
                f2.x += nx * overlap;
                f2.y += ny * overlap;

                // Elastic momentum exchange
                const kx = f1.vx - f2.vx;
                const ky = f1.vy - f2.vy;
                const p = 2 * (nx * kx + ny * ky) / 2;
                f1.vx -= p * nx;
                f1.vy -= p * ny;
                f2.vx += p * nx;
                f2.vy += p * ny;

                // Impact sparks & sound
                spawnParticle((f1.x + f2.x) / 2, (f1.y + f2.y) / 2, '#ffffff', 8, 140, 4, 'spark');
                sounds.playHit(false);

                // MLG Guy Mountain Dew 20X Ram Damage: 撞到人會扣除 50 血量
                const nowTime = performance.now();
                if (f1.dewBoostTimer && f1.dewBoostTimer > 0 && f1.team !== f2.team && f2.state !== 'dead') {
                  f1.lastRamHitMap = f1.lastRamHitMap || {};
                  const lastHit = f1.lastRamHitMap[f2.id] || 0;
                  if (nowTime - lastHit > 220) {
                    f1.lastRamHitMap[f2.id] = nowTime;
                    f2.hp -= 50;
                    f2.damageFlash = 0.18;
                    f1.totalDamageDealt += 50;
                    f1.totalHitsLanded++;
                    f2.totalHitsTaken++;
                    sounds.playHit(true);
                    triggerScreenShake(7);
                    spawnDamageText(f2.x, f2.y, '💥 -50 激浪衝撞!', '#22c55e', true);
                    spawnParticle(f2.x, f2.y, '#22c55e', 22, 200, 7, 'spark');
                    spawnParticle(f2.x, f2.y, '#f97316', 15, 160, 5, 'ring');
                    addCombatLog(f1, 'skill2', `💥 【${f1.name}】以20倍極速猛烈衝撞【${f2.name}】，扣除 50 點生命值！`);
                    if (f2.hp <= 0) {
                      f2.hp = 0;
                      f2.state = 'dead';
                      f1.kills++;
                      sounds.playVictory();
                      spawnParticle(f2.x, f2.y, '#fbbf24', 40, 260, 10, 'ring');
                      checkMatchEnd();
                    }
                  }
                }

                if (f2.dewBoostTimer && f2.dewBoostTimer > 0 && f2.team !== f1.team && f1.state !== 'dead') {
                  f2.lastRamHitMap = f2.lastRamHitMap || {};
                  const lastHit = f2.lastRamHitMap[f1.id] || 0;
                  if (nowTime - lastHit > 220) {
                    f2.lastRamHitMap[f1.id] = nowTime;
                    f1.hp -= 50;
                    f1.damageFlash = 0.18;
                    f2.totalDamageDealt += 50;
                    f2.totalHitsLanded++;
                    f1.totalHitsTaken++;
                    sounds.playHit(true);
                    triggerScreenShake(7);
                    spawnDamageText(f1.x, f1.y, '💥 -50 激浪衝撞!', '#22c55e', true);
                    spawnParticle(f1.x, f1.y, '#22c55e', 22, 200, 7, 'spark');
                    spawnParticle(f1.x, f1.y, '#f97316', 15, 160, 5, 'ring');
                    addCombatLog(f2, 'skill2', `💥 【${f2.name}】以20倍極速猛烈衝撞【${f1.name}】，扣除 50 點生命值！`);
                    if (f1.hp <= 0) {
                      f1.hp = 0;
                      f1.state = 'dead';
                      f2.kills++;
                      sounds.playVictory();
                      spawnParticle(f1.x, f1.y, '#fbbf24', 40, 260, 10, 'ring');
                      checkMatchEnd();
                    }
                  }
                }

                // Build energy from kinetic clash
                f1.energy = Math.min(100, f1.energy + 4);
                f2.energy = Math.min(100, f2.energy + 4);
              }
            }
          }

          // 3. UPDATE PROJECTILES
          projectilesRef.current = projectilesRef.current.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life += dt;

            // Trail particle
            if (Math.random() < 0.6) {
              spawnParticle(p.x, p.y, p.color, 1, 40, p.radius * 0.7);
            }

            // Square Boundary Collision & Bouncing
            if (p.maxBounces && p.maxBounces > 0) {
              let bounced = false;
              const spdMult = p.speedMultiplierOnBounce || 1.15;

              if (p.x - p.radius <= minX && p.vx < 0) {
                p.x = minX + p.radius;
                p.vx = -p.vx * spdMult;
                p.vy = p.vy * spdMult;
                bounced = true;
                triggerWallFlash(minX, p.y, 'left', p.color);
              } else if (p.x + p.radius >= maxX && p.vx > 0) {
                p.x = maxX - p.radius;
                p.vx = -p.vx * spdMult;
                p.vy = p.vy * spdMult;
                bounced = true;
                triggerWallFlash(maxX, p.y, 'right', p.color);
              }

              if (p.y - p.radius <= minY && p.vy < 0) {
                p.y = minY + p.radius;
                p.vy = -p.vy * spdMult;
                p.vx = p.vx * spdMult;
                bounced = true;
                triggerWallFlash(p.x, minY, 'top', p.color);
              } else if (p.y + p.radius >= maxY && p.vy > 0) {
                p.y = maxY - p.radius;
                p.vy = -p.vy * spdMult;
                p.vx = p.vx * spdMult;
                bounced = true;
                triggerWallFlash(p.x, maxY, 'bottom', p.color);
              }

              if (bounced) {
                p.bounces = (p.bounces || 0) + 1;
                // Cap speed at 2600 to prevent physics tunneling
                const currentSpd = Math.hypot(p.vx, p.vy);
                if (currentSpd > 2600) {
                  const scale = 2600 / currentSpd;
                  p.vx *= scale;
                  p.vy *= scale;
                }
                sounds.playWallBounce();
                spawnParticle(p.x, p.y, p.glowColor || '#f97316', 7, 140, 4, 'spark');
              }
            } else {
              if (p.x <= minX || p.x >= maxX || p.y <= minY || p.y >= maxY) {
                spawnParticle(p.x, p.y, p.color, 5, 90, 3, 'spark');
                return false;
              }
            }

            // Obstacle collision
            for (const obs of obstaclesRef.current) {
              const d = Math.hypot(p.x - obs.x, p.y - obs.y);
              if (d < p.radius + obs.radius) {
                if (p.maxBounces && p.maxBounces > 0) {
                  const normalAngle = Math.atan2(p.y - obs.y, p.x - obs.x);
                  const curSpeed = Math.min(2600, Math.hypot(p.vx, p.vy) * (p.speedMultiplierOnBounce || 1.15));

                  // Reposition outside obstacle
                  p.x = obs.x + Math.cos(normalAngle) * (obs.radius + p.radius + 1);
                  p.y = obs.y + Math.sin(normalAngle) * (obs.radius + p.radius + 1);

                  // Velocity reflection: v' = v - 2*(v·n)*n
                  const dot = p.vx * Math.cos(normalAngle) + p.vy * Math.sin(normalAngle);
                  p.vx = p.vx - 2 * dot * Math.cos(normalAngle);
                  p.vy = p.vy - 2 * dot * Math.sin(normalAngle);
                  const newMag = Math.hypot(p.vx, p.vy);
                  if (newMag > 0) {
                    p.vx = (p.vx / newMag) * curSpeed;
                    p.vy = (p.vy / newMag) * curSpeed;
                  }
                  p.bounces = (p.bounces || 0) + 1;
                  sounds.playWallBounce();
                  spawnParticle(p.x, p.y, p.glowColor || '#f97316', 8, 150, 4, 'spark');
                } else {
                  spawnParticle(p.x, p.y, p.color, 6, 90, 4, 'spark');
                  return false;
                }
              }
            }

            // Hit Fighter
            for (const fighter of fightersRef.current) {
              if (fighter.id !== p.ownerId && fighter.state !== 'dead') {
                const owner = fightersRef.current.find(f => f.id === p.ownerId);
                if (owner && owner.team !== fighter.team) {
                  if (Math.hypot(p.x - fighter.x, p.y - fighter.y) < p.radius + fighter.radius) {
                    if (p.type === 'sniper_bullet') {
                      sounds.playHitmarker();
                      spawnParticle(fighter.x, fighter.y, '#f97316', 16, 200, 6, 'spark');
                      spawnParticle(fighter.x, fighter.y, '#22c55e', 12, 160, 5, 'ring');
                      const bounceText = p.bounces ? ` (${p.bounces}次反彈!)` : '';
                      spawnDamageText(fighter.x, fighter.y, `🎯 HITMARKER!${bounceText}`, '#f97316', true);
                    } else if (p.type === 'raw_meat') {
                      sounds.playRawMeatSplat();
                      triggerScreenShake(6);
                      spawnParticle(p.x, p.y, '#dc2626', 25, 200, 7, 'spark');
                      spawnParticle(p.x, p.y, '#38bdf8', 16, 160, 5, 'ring');

                      // AOE shatter: stun 1s + armor reduction 30% for 2.5s to all enemies within 120px
                      fightersRef.current.forEach(other => {
                        if (other.team !== owner.team && other.state !== 'dead') {
                          if (Math.hypot(other.x - p.x, other.y - p.y) < 120) {
                            other.statusEffects.push({ type: 'stun', duration: 1.0 });
                            other.statusEffects.push({ type: 'shocked', duration: 2.5, value: 0.3 });
                            applyDamage(owner, other, p.damage, 'projectile');
                            spawnDamageText(other.x, other.y, "🥩 極度震驚! (定身1s+減防30%)", '#ef4444', true);
                          }
                        }
                      });
                      return false;
                    } else if (p.type === 'flame_slash') {
                      spawnParticle(fighter.x, fighter.y, '#ea580c', 16, 180, 6, 'spark');
                      spawnParticle(fighter.x, fighter.y, '#fbbf24', 12, 140, 5, 'ring');
                      fighter.statusEffects.push({ type: 'burn', duration: 2.0 });
                    }
                    applyDamage(owner, fighter, p.damage, 'projectile');
                    if (!p.piercing) return false;
                  }
                }
              }
            }

            return p.life < p.maxLife;
          });

          // 3.5 UPDATE GROUND ZONES (Hellfire zones etc)
          groundZonesRef.current = groundZonesRef.current.filter(gz => {
            gz.duration -= dt;
            gz.tickTimer -= dt;
            if (gz.tickTimer <= 0) {
              gz.tickTimer = 0.35;
              // Spawn fiery ambient embers inside zone
              for (let i = 0; i < 2; i++) {
                const ra = Math.random() * Math.PI * 2;
                const rr = Math.random() * gz.radius * 0.85;
                spawnParticle(gz.x + Math.cos(ra) * rr, gz.y + Math.sin(ra) * rr, Math.random() < 0.5 ? '#ea580c' : '#f97316', 1, 45, 3, 'spark');
              }

              // Damage and slow enemies inside zone
              fightersRef.current.forEach(f => {
                if (f.team !== gz.team && f.state !== 'dead') {
                  if (Math.hypot(f.x - gz.x, f.y - gz.y) < gz.radius + f.radius) {
                    f.hp -= (gz.damagePerSec * 0.35);
                    f.statusEffects.push({ type: 'speed_boost', duration: 0.45, value: 0.6 }); // 40% slow
                    f.statusEffects.push({ type: 'burn', duration: 1.0 });
                    spawnDamageText(f.x, f.y, `🔥 -${Math.round(gz.damagePerSec * 0.35)}`, '#f97316');
                    if (f.hp <= 0) {
                      f.hp = 0;
                      f.state = 'dead';
                      checkMatchEnd();
                    }
                  }
                }
              });
            }
            return gz.duration > 0;
          });

          // 4. UPDATE PARTICLES, WALL FLASHES & DAMAGE NUMBERS
          particlesRef.current = particlesRef.current.filter(part => {
            part.x += part.vx * dt;
            part.y += part.vy * dt;
            part.life += dt;
            part.alpha = Math.max(0, 1 - part.life / part.maxLife);
            return part.life < part.maxLife;
          });

          wallFlashesRef.current = wallFlashesRef.current.filter(wf => {
            wf.life += dt;
            return wf.life < wf.maxLife;
          });

          damageNumbersRef.current = damageNumbersRef.current.filter(dn => {
            dn.y -= 45 * dt;
            dn.life += dt;
            dn.alpha = Math.max(0, 1 - dn.life / dn.maxLife);
            return dn.life < dn.maxLife;
          });

          // Filter out expired items
          itemsRef.current = itemsRef.current.filter(it => it.active && elapsed - it.spawnTime < it.duration);

          // 5. RENDER TO CANVAS (SQUARE FRAME BOUNCE ARENA + CAMERA ZOOM/PAN)
          const { width, height } = canvas;
          ctx.save();
          ctx.clearRect(0, 0, width, height);

          // Draw Canvas Outer Ambience
          ctx.fillStyle = '#070707';
          ctx.fillRect(0, 0, width, height);

          // Camera Transformation for Victory Zoom & Pan Focus (Scaled by Map Multiplier)
          const baseZoom = 1.0 / (mapScale || 1.0);
          const camZoom = isVictoryFocus 
            ? victoryFocusRef.current.cameraZoom * baseZoom 
            : baseZoom;
          const camX = isVictoryFocus ? victoryFocusRef.current.cameraX : squareBoundsRef.current.centerX;
          const camY = isVictoryFocus ? victoryFocusRef.current.cameraY : squareBoundsRef.current.centerY;

          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(camZoom, camZoom);
          ctx.translate(-camX, -camY);

          // Apply Screen Shake inside camera space
          if (screenShakeRef.current > 0) {
            const sx = (Math.random() - 0.5) * screenShakeRef.current * 2;
            const sy = (Math.random() - 0.5) * screenShakeRef.current * 2;
            ctx.translate(sx, sy);
            screenShakeRef.current = Math.max(0, screenShakeRef.current - dt * 25);
          }

          // Draw Square Arena Floor
          const boxW = maxX - minX;
          const boxH = maxY - minY;
          ctx.fillStyle = mapType === 'lava' ? '#1c0a0a' : mapType === 'cyber' ? '#040d1a' : mapType === 'ruins' ? '#081410' : '#0a0a0a';
          ctx.fillRect(minX, minY, boxW, boxH);

          // Subtle Grid Lines inside square box
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          const gridSize = 40;
          for (let gx = minX + gridSize; gx < maxX; gx += gridSize) {
            ctx.beginPath();
            ctx.moveTo(gx, minY);
            ctx.lineTo(gx, maxY);
            ctx.stroke();
          }
          for (let gy = minY + gridSize; gy < maxY; gy += gridSize) {
            ctx.beginPath();
            ctx.moveTo(minX, gy);
            ctx.lineTo(maxX, gy);
            ctx.stroke();
          }

          // Center Crosshair Marker
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(centerX - 25, centerY);
          ctx.lineTo(centerX + 25, centerY);
          ctx.moveTo(centerX, centerY - 25);
          ctx.lineTo(centerX, centerY + 25);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
          ctx.stroke();

          // Ground Zones (Hellfire zone, etc.)
          groundZonesRef.current.forEach(gz => {
            if (gz.type === 'hellfire') {
              ctx.save();
              const alpha = Math.min(0.65, gz.duration / 1.0);
              const grad = ctx.createRadialGradient(gz.x, gz.y, 10, gz.x, gz.y, gz.radius);
              grad.addColorStop(0, `rgba(239, 68, 68, ${alpha * 0.8})`);
              grad.addColorStop(0.6, `rgba(249, 115, 22, ${alpha * 0.5})`);
              grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(gz.x, gz.y, gz.radius, 0, Math.PI * 2);
              ctx.fill();

              // Fiery border outline
              ctx.strokeStyle = `rgba(251, 191, 36, ${alpha * 0.7})`;
              ctx.lineWidth = 2.5;
              ctx.setLineDash([8, 6]);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.restore();
            }
          });

          // Obstacles
          obstaclesRef.current.forEach(obs => {
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            if (obs.type === 'hazard_lava') {
              ctx.fillStyle = '#dc2626';
              ctx.shadowColor = '#f97316';
              ctx.shadowBlur = 15;
            } else if (obs.type === 'crystal') {
              ctx.fillStyle = '#06b6d4';
              ctx.shadowColor = '#67e8f9';
              ctx.shadowBlur = 10;
            } else {
              ctx.fillStyle = '#262626';
              ctx.shadowBlur = 0;
            }
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.stroke();
            ctx.shadowBlur = 0;
          });

          // Arena Items
          itemsRef.current.forEach(item => {
            if (!item.active) return;
            ctx.beginPath();
            ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
            ctx.fillStyle = item.type === 'heal' ? '#10b981' : item.type === 'energy' ? '#f59e0b' : item.type === 'damage_buff' ? '#ef4444' : '#06b6d4';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.type === 'heal' ? '+' : item.type === 'energy' ? '⚡' : item.type === 'damage_buff' ? '⚔' : '»', item.x, item.y);
          });

          // Draw Projectiles
          projectilesRef.current.forEach(p => {
            if (p.type === 'sniper_bullet') {
              ctx.save();
              const ang = Math.atan2(p.vy, p.vx);
              ctx.translate(p.x, p.y);
              ctx.rotate(ang);

              // High-speed tracer streak
              const tracerLen = 28;
              const grad = ctx.createLinearGradient(-tracerLen, 0, 0, 0);
              grad.addColorStop(0, 'rgba(34, 197, 94, 0)');
              grad.addColorStop(0.6, '#22c55e');
              grad.addColorStop(1, '#f97316');
              ctx.strokeStyle = grad;
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.moveTo(-tracerLen, 0);
              ctx.lineTo(0, 0);
              ctx.stroke();

              // Glowing bullet core
              ctx.beginPath();
              ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#22c55e';
              ctx.shadowBlur = 14;
              ctx.fill();
              ctx.restore();
            } else if (p.type === 'raw_meat') {
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate(p.life * 12);
              ctx.font = '18px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('🥩', 0, 0);
              ctx.restore();
            } else if (p.type === 'flame_slash') {
              ctx.save();
              const ang = Math.atan2(p.vy, p.vx);
              ctx.translate(p.x, p.y);
              ctx.rotate(ang);
              ctx.beginPath();
              ctx.arc(0, 0, p.radius + 2, -Math.PI / 3, Math.PI / 3);
              ctx.strokeStyle = '#f97316';
              ctx.lineWidth = 4;
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 14;
              ctx.stroke();
              ctx.restore();
            } else {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.shadowColor = p.glowColor;
              ctx.shadowBlur = 12;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          });

          // Draw Motion Trails & Fighters
          fightersRef.current.forEach(fighter => {
            if (fighter.state === 'dead') {
              ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
              ctx.beginPath();
              ctx.arc(fighter.x, fighter.y, fighter.radius * 0.8, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#94a3b8';
              ctx.font = '16px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('💀', fighter.x, fighter.y);
              return;
            }

            // Draw motion trail (extra thick & vibrant if Dew Boost is active)
            const isDewActive = (fighter.dewBoostTimer && fighter.dewBoostTimer > 0);
            fighter.trailPoints.forEach(pt => {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, fighter.radius * (isDewActive ? 1.0 : 0.75), 0, Math.PI * 2);
              ctx.fillStyle = isDewActive ? '#22c55e' : fighter.character.themeColor;
              ctx.globalAlpha = Math.max(0, pt.alpha * (isDewActive ? 0.6 : 0.3));
              ctx.fill();
              ctx.globalAlpha = 1.0;
            });

            // If MLG Dew Boost is active, draw pulsing neon electric ring
            if (isDewActive) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(fighter.x, fighter.y, fighter.radius + 10 + Math.sin(timestamp * 0.02) * 3, 0, Math.PI * 2);
              ctx.strokeStyle = '#22c55e';
              ctx.lineWidth = 3.5;
              ctx.shadowColor = '#f97316';
              ctx.shadowBlur = 16;
              ctx.stroke();
              ctx.restore();
            }

            ctx.save();
            ctx.translate(fighter.x, fighter.y);

            // Stealth opacity
            if (fighter.isStealthed) {
              ctx.globalAlpha = 0.35;
            }

            // Shield Bubble
            if (fighter.isShielded) {
              ctx.beginPath();
              ctx.arc(0, 0, fighter.radius + 8, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2.5;
              ctx.fill();
              ctx.stroke();
            }

            // Outer Attack Cooldown Progress Ring (Shows upcoming auto-attack timing)
            const interval = fighter.character.stats.attackInterval || 1.6;
            const progress = Math.max(0, Math.min(1, 1 - (fighter.autoAttackTimer / interval)));
            ctx.beginPath();
            ctx.arc(0, 0, fighter.radius + 4, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            ctx.strokeStyle = fighter.character.themeColor;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Fighter Body
            ctx.beginPath();
            ctx.arc(0, 0, fighter.radius, 0, Math.PI * 2);
            ctx.fillStyle = fighter.damageFlash > 0 ? '#ffffff' : fighter.character.visual.bodyColor;
            ctx.shadowColor = fighter.character.glowColor;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Target Dummy Bullseye Concentric Rings & Crosshairs
            if (fighter.character.id === 'target_dummy') {
              ctx.beginPath();
              ctx.arc(0, 0, fighter.radius * 0.72, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
              ctx.lineWidth = 2.5;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(0, 0, fighter.radius * 0.42, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.lineWidth = 2;
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(-fighter.radius * 0.85, 0);
              ctx.lineTo(fighter.radius * 0.85, 0);
              ctx.moveTo(0, -fighter.radius * 0.85);
              ctx.lineTo(0, fighter.radius * 0.85);
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }

            // Border Trim
            ctx.lineWidth = 3;
            ctx.strokeStyle = fighter.team === 1 ? '#3b82f6' : '#f43f5e';
            ctx.stroke();

            // Facing Direction Pointer
            ctx.rotate(fighter.angle);
            ctx.beginPath();
            ctx.arc(fighter.radius * 0.65, 0, 5, 0, Math.PI * 2);
            ctx.fillStyle = fighter.character.visual.weaponColor;
            ctx.fill();

            // Avatar Emoji in center
            ctx.rotate(-fighter.angle);
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(fighter.character.visual.avatarEmoji, 0, 0);

            ctx.restore();

            // Overhead Mini HP Bar (without clutter text)
            const barW = 44;
            const barH = 4;
            const barX = fighter.x - barW / 2;
            const barY = fighter.y - fighter.radius - 8;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

            const hpPercent = Math.max(0, fighter.hp / fighter.maxHp);
            ctx.fillStyle = fighter.team === 1 ? '#3b82f6' : '#f43f5e';
            ctx.fillRect(barX, barY, barW * hpPercent, barH);

            if (fighter.character.id === 'target_dummy') {
              ctx.font = 'bold 9px monospace';
              ctx.fillStyle = '#38bdf8';
              ctx.textAlign = 'center';
              ctx.fillText(`DEF: ${fighter.dummyArmor ?? 0} | ${fighter.isStationary ? '⚓' : '🏃'}`, fighter.x, barY - 3);
            }
          });

          // Highlight Winner during Victory Focus
          if (isVictoryFocus && victoryFocusRef.current.winner) {
            const winner = victoryFocusRef.current.winner;
            ctx.save();
            // Pulsing golden focus ring
            ctx.beginPath();
            ctx.arc(winner.x, winner.y, winner.radius + 16 + Math.sin(timestamp * 0.008) * 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 20;
            ctx.stroke();

            // Overhead Crown & Victorious Title
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('👑', winner.x, winner.y - winner.radius - 28);
            ctx.font = '900 italic 10px monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 5;
            ctx.fillText('VICTORIOUS', winner.x, winner.y - winner.radius - 16);
            ctx.restore();
          }

          // Draw Particles
          particlesRef.current.forEach(part => {
            ctx.beginPath();
            ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
            ctx.fillStyle = part.color;
            ctx.globalAlpha = part.alpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;
          });

          // Draw Wall Bounce Impact Flashes
          wallFlashesRef.current.forEach(wf => {
            const alpha = 1 - wf.life / wf.maxLife;
            ctx.strokeStyle = wf.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 4;
            ctx.beginPath();
            if (wf.wall === 'left' || wf.wall === 'right') {
              ctx.moveTo(wf.x, Math.max(minY, wf.y - 25));
              ctx.lineTo(wf.x, Math.min(maxY, wf.y + 25));
            } else {
              ctx.moveTo(Math.max(minX, wf.x - 25), wf.y);
              ctx.lineTo(Math.min(maxX, wf.x + 25), wf.y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          });

          // DRAW THE SQUARE ARENA FRAME BORDER (方形框架高科技邊框)
          ctx.strokeStyle = mapType === 'lava' ? '#ef4444' : mapType === 'cyber' ? '#06b6d4' : mapType === 'ruins' ? '#10b981' : '#ffffff';
          ctx.lineWidth = 3;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 8;
          ctx.strokeRect(minX, minY, boxW, boxH);
          ctx.shadowBlur = 0;

          // Corner Brackets for High-Tech Square Enclosure
          const cornerLen = 22;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;

          // Top Left
          ctx.beginPath();
          ctx.moveTo(minX, minY + cornerLen);
          ctx.lineTo(minX, minY);
          ctx.lineTo(minX + cornerLen, minY);
          ctx.stroke();

          // Top Right
          ctx.beginPath();
          ctx.moveTo(maxX - cornerLen, minY);
          ctx.lineTo(maxX, minY);
          ctx.lineTo(maxX, minY + cornerLen);
          ctx.stroke();

          // Bottom Left
          ctx.beginPath();
          ctx.moveTo(minX, maxY - cornerLen);
          ctx.lineTo(minX, maxY);
          ctx.lineTo(minX + cornerLen, maxY);
          ctx.stroke();

          // Bottom Right
          ctx.beginPath();
          ctx.moveTo(maxX - cornerLen, maxY);
          ctx.lineTo(maxX, maxY);
          ctx.lineTo(maxX, maxY - cornerLen);
          ctx.stroke();

          // Square Frame Header Label
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.textAlign = 'left';
          ctx.fillText('KINETIC BOUNCE ARENA // 方形物理邊界', minX + 8, minY - 10);
          ctx.textAlign = 'right';
          ctx.fillText(`BOUNDS: ${Math.round(boxW)}x${Math.round(boxH)} px (${mapScale || 1.0}x)`, maxX - 8, minY - 10);

          // Draw Floating Damage Numbers
          damageNumbersRef.current.forEach(dn => {
            ctx.save();
            ctx.font = `bold ${dn.isCrit ? '16px' : '13px'} sans-serif`;
            ctx.fillStyle = dn.color;
            ctx.globalAlpha = dn.alpha;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(dn.text, dn.x, dn.y);
            ctx.restore();
          });

          // Restore camera transformation
          ctx.restore();

          // SCREEN-SPACE POST-PROCESSING CINEMATICS (Cinematic Letterbox, 0.5x Slow-Motion Badge, Vignette)
          if (isVictoryFocus) {
            const realElapsed = (timestamp - victoryFocusRef.current.startTime) / 1000;
            const remaining = Math.max(0, victoryFocusRef.current.duration - realElapsed);

            // 1. Cinematic Letterbox Bars
            const barH = Math.min(48, realElapsed * 90);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
            ctx.fillRect(0, 0, width, barH);
            ctx.fillRect(0, height - barH, width, barH);

            // 2. Cinematic Vignette
            const vig = ctx.createRadialGradient(width / 2, height / 2, width * 0.22, width / 2, height / 2, width * 0.65);
            vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vig.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, width, height);

            // 3. Screen-Space REC / Slow-Mo Indicators
            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'left';
            ctx.fillText('● REC [0.5x SLOW-MOTION FOCUS]', 16, 28);

            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'right';
            ctx.fillText(`VICTORY SCREEN IN: ${remaining.toFixed(1)}s`, width - 16, 28);

            // 4. Center-Bottom Dramatic Text
            ctx.font = '900 italic 15px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 8;
            ctx.fillText(`★ K.O. // 獲勝者: ${victoryFocusRef.current.winnerName} ★`, width / 2, height - 28);
            ctx.shadowBlur = 0;
          }

          ctx.restore();

          // Mirror HUD State to React
          const p1 = fightersRef.current.find(f => f.id === 'p1') || fightersRef.current.find(f => f.team === 1);
          const p2 = fightersRef.current.find(f => f.id === 'p2') || fightersRef.current.find(f => f.team === 2);
          if (p1 && p2) {
            setHudState({
              p1: {
                hp: p1.hp,
                maxHp: p1.maxHp,
                energy: p1.energy,
                maxEnergy: p1.maxEnergy,
                cd1: p1.cooldownSkill1,
                cd2: p1.cooldownSkill2,
                cdUlt: p1.cooldownUltimate,
                combo: p1.comboCount,
                attackTimer: p1.autoAttackTimer,
                attackInterval: p1.character.stats.attackInterval || 1.6,
                bounces: p1.wallBounceCount,
              },
              p2: {
                hp: p2.hp,
                maxHp: p2.maxHp,
                energy: p2.energy,
                maxEnergy: p2.maxEnergy,
                cd1: p2.cooldownSkill1,
                cd2: p2.cooldownSkill2,
                cdUlt: p2.cooldownUltimate,
                combo: p2.comboCount,
                attackTimer: p2.autoAttackTimer,
                attackInterval: p2.character.stats.attackInterval || 2.0,
                bounces: p2.wallBounceCount,
              },
            });
          }

          // Compute rolling DPS if Target Dummy is present
          if (fightersRef.current.some(f => f.character.id === 'target_dummy')) {
            const now = performance.now();
            trainingDamageLogRef.current = trainingDamageLogRef.current.filter(entry => now - entry.time <= 3000);
            const sumDamage3s = trainingDamageLogRef.current.reduce((acc, cur) => acc + cur.damage, 0);
            const currentDPS = Math.round((sumDamage3s / 3.0) * 10) / 10;
            
            const dummyEntity = fightersRef.current.find(f => f.character.id === 'target_dummy');
            const p1Entity = fightersRef.current.find(f => f.team === 1);
            if (dummyEntity) {
              setTrainingStats({
                dps: currentDPS,
                totalDamage: Math.round(p1Entity?.totalDamageDealt || 0),
                maxHit: Math.round(maxHitRef.current),
                maxCombo: p1Entity?.comboCount || 0,
                armor: dummyEntity.dummyArmor ?? 0,
                isStationary: dummyEntity.isStationary ?? true,
                debuffs: dummyEntity.statusEffects.map(e => ({ type: e.type, duration: Math.round(e.duration * 10) / 10 })),
              });
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mode, mapType, mapScale, p1Char.id, p2Char.id, aiDifficulty, swarmCount, initGame]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full min-h-screen bg-[#0A0A0A] flex flex-col justify-between items-center overflow-x-hidden select-none font-sans text-white"
    >
      {/* TOP COMBAT HUD */}
      <header className="relative z-20 w-full max-w-6xl px-4 py-3 flex items-center justify-between gap-4 border-b border-white/10 bg-black/70 backdrop-blur-md">
        {/* P1 Health & Status Meter */}
        <div className="flex-1 flex items-center space-x-3">
          <div 
            className="w-12 h-12 rounded-sm flex items-center justify-center text-2xl border border-blue-500 shrink-0 shadow-lg"
            style={{ 
              backgroundColor: p1Char.visual.bodyColor,
              boxShadow: `0 0 15px ${p1Char.themeColor}44` 
            }}
          >
            {p1Char.visual.avatarEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-black italic uppercase text-blue-400 truncate tracking-tight flex items-center space-x-1.5">
                <span>{p1Char.name}</span>
                <span className="text-[9px] font-mono px-1 bg-blue-900/60 text-blue-300 border border-blue-600/40 rounded-none">
                  ⚔ {p1Char.stats.attackInterval || 1.6}s/次
                </span>
                <button
                  onClick={toggleP1ControlMode}
                  className={`text-[9px] font-mono px-1.5 py-0.5 border rounded-sm transition flex items-center space-x-1 ${
                    p1ControlMode === 'manual'
                      ? 'bg-amber-600/40 border-amber-400 text-amber-300'
                      : p1ControlMode === 'semi_auto'
                      ? 'bg-purple-600/40 border-purple-400 text-purple-300'
                      : 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                  }`}
                  title="點擊或按 [T] 切換 P1 技能控制模式"
                >
                  <Gamepad2 className="w-2.5 h-2.5" />
                  <span>
                    {p1ControlMode === 'manual' ? '純手動 [T]' : p1ControlMode === 'semi_auto' ? '半自動 [T]' : '全自動 [T]'}
                  </span>
                </button>
              </span>
              <span className="font-mono text-white/80 font-bold text-xs">
                {Math.round(hudState.p1.hp)} / {hudState.p1.maxHp}
              </span>
            </div>
            {/* Health Bar */}
            <div className="w-full h-3 bg-black rounded-sm overflow-hidden border border-white/20 p-0.5 mb-1">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-none transition-all duration-150"
                style={{ width: `${Math.max(0, (hudState.p1.hp / hudState.p1.maxHp) * 100)}%` }}
              />
            </div>
            {/* Auto-Attack Cadence & Energy Sub-meter */}
            <div className="flex items-center justify-between text-[10px] font-mono text-white/60">
              <div className="flex items-center space-x-1">
                <Timer className="w-3 h-3 text-cyan-400" />
                <span>次回攻擊: <strong className="text-white">{Math.max(0, hudState.p1.attackTimer).toFixed(1)}s</strong></span>
              </div>
              <div className="flex items-center space-x-1">
                <span>反彈: {hudState.p1.bounces}次</span>
                <span className="text-amber-400 font-bold">⚡ {Math.round(hudState.p1.energy)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Arena Controls & Timer */}
        <div className="flex flex-col items-center shrink-0 px-2">
          <div className="flex items-center space-x-2">
            <div className="px-3.5 py-1 rounded-sm bg-black border border-white/20 text-white font-mono text-sm font-black tracking-widest shadow-md flex items-center space-x-1.5">
              <Radio className="w-3 h-3 text-red-500 animate-pulse" />
              <span>{formatTimer(matchTime)}</span>
            </div>
            <span className="px-2 py-0.5 bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold tracking-wider">
              {mapScale || 1.0}x 地圖
            </span>
          </div>

          {/* Speed & Simulation Controls */}
          <div className="flex items-center space-x-1.5 mt-2">
            <div className="flex items-center bg-white/5 border border-white/15 rounded-sm p-0.5">
              {[1.0, 1.5, 2.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold transition ${
                    simSpeed === spd ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                  }`}
                  title={`模擬倍速 ${spd}x`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsPaused(prev => !prev)}
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/15 text-white/80 border border-white/15 text-xs transition"
              title="暫停/繼續 (P)"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-green-400" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                const muted = sounds.toggleMute();
                setIsMuted(muted);
              }}
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/15 text-white/80 border border-white/15 text-xs transition"
              title="切換音效"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
            </button>
            <button
              onClick={onBackToMenu}
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/15 text-white/80 border border-white/15 text-xs transition"
              title="返回選角"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* P2 Health & Status Meter */}
        <div className="flex-1 flex items-center space-x-3 flex-row-reverse">
          <div 
            className="w-12 h-12 rounded-sm flex items-center justify-center text-2xl border border-red-500 shrink-0 shadow-lg"
            style={{ 
              backgroundColor: p2Char.visual.bodyColor,
              boxShadow: `0 0 15px ${p2Char.themeColor}44` 
            }}
          >
            {p2Char.visual.avatarEmoji}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="flex justify-between items-center text-xs mb-1 flex-row-reverse">
              <span className="font-black italic uppercase text-red-400 truncate tracking-tight flex items-center space-x-1.5 flex-row-reverse">
                <span>{p2Char.name}</span>
                <span className="text-[9px] font-mono px-1 bg-red-900/60 text-red-300 border border-red-600/40 rounded-none ml-1.5">
                  ⚔ {p2Char.stats.attackInterval || 2.0}s/次
                </span>
                {p2Char.id !== 'target_dummy' && (
                  <button
                    onClick={toggleP2ControlMode}
                    className={`text-[9px] font-mono px-1.5 py-0.5 border rounded-sm transition flex items-center space-x-1 ${
                      p2ControlMode === 'manual'
                        ? 'bg-amber-600/40 border-amber-400 text-amber-300'
                        : p2ControlMode === 'semi_auto'
                        ? 'bg-purple-600/40 border-purple-400 text-purple-300'
                        : 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    }`}
                    title="點擊或按 [Y] 切換 P2 技能控制模式"
                  >
                    <Gamepad2 className="w-2.5 h-2.5" />
                    <span>
                      {p2ControlMode === 'manual' ? '純手動 [Y]' : p2ControlMode === 'semi_auto' ? '半自動 [Y]' : '全自動 [Y]'}
                    </span>
                  </button>
                )}
              </span>
              <span className="font-mono text-white/80 font-bold text-xs">
                {Math.round(hudState.p2.hp)} / {hudState.p2.maxHp}
              </span>
            </div>
            {/* Health Bar */}
            <div className="w-full h-3 bg-black rounded-sm overflow-hidden border border-white/20 p-0.5 mb-1 flex justify-end">
              <div 
                className="h-full bg-gradient-to-l from-red-600 to-amber-500 rounded-none transition-all duration-150"
                style={{ width: `${Math.max(0, (hudState.p2.hp / hudState.p2.maxHp) * 100)}%` }}
              />
            </div>
            {/* Auto-Attack Cadence & Energy Sub-meter */}
            <div className="flex items-center justify-between text-[10px] font-mono text-white/60 flex-row-reverse">
              <div className="flex items-center space-x-1 flex-row-reverse">
                <Timer className="w-3 h-3 text-amber-400 ml-1" />
                <span>次回攻擊: <strong className="text-white">{Math.max(0, hudState.p2.attackTimer).toFixed(1)}s</strong></span>
              </div>
              <div className="flex items-center space-x-1 flex-row-reverse">
                <span className="ml-2">反彈: {hudState.p2.bounces}次</span>
                <span className="text-amber-400 font-bold">⚡ {Math.round(hudState.p2.energy)}%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TARGET DUMMY TESTING TELEMETRY & TOOLKIT BAR */}
      {isTestingMode && (
        <div className="relative z-20 w-full max-w-6xl px-4 py-2 bg-black/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* DPS & Stats Stream */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold rounded-sm">
              <Gauge className="w-3.5 h-3.5" />
              <span>DPS (3s):</span>
              <span className="text-white text-sm font-black">{trainingStats.dps.toFixed(1)}</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold rounded-sm">
              <Award className="w-3.5 h-3.5" />
              <span>累計總傷:</span>
              <span className="text-white font-black">{trainingStats.totalDamage}</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded-sm">
              <Flame className="w-3.5 h-3.5" />
              <span>最高暴擊:</span>
              <span className="text-white font-black">{trainingStats.maxHit}</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold rounded-sm">
              <Zap className="w-3.5 h-3.5" />
              <span>連擊:</span>
              <span className="text-white font-black">{trainingStats.maxCombo} Hits</span>
            </div>
          </div>

          {/* Dummy Sandbox Settings Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCycleArmor}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold rounded-sm transition flex items-center space-x-1"
              title="切換假人護甲 (0 / 50 / 100 / 200)"
            >
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>護甲: {trainingStats.armor}</span>
            </button>

            <button
              onClick={handleToggleStationary}
              className={`px-2.5 py-1 border text-[11px] font-bold rounded-sm transition flex items-center space-x-1 ${
                trainingStats.isStationary
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-amber-600/30 border-amber-500 text-amber-300'
              }`}
              title="切換假人移動狀態"
            >
              <Anchor className="w-3 h-3" />
              <span>{trainingStats.isStationary ? '⚓ 原點錨定' : '🏃 自由反彈'}</span>
            </button>

            <button
              onClick={handleResetDummyHp}
              className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500 text-emerald-300 text-[11px] font-bold rounded-sm transition flex items-center space-x-1"
              title="假人立即滿血"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>滿血重置</span>
            </button>

            <button
              onClick={handleClearTrainingStats}
              className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white text-[11px] font-bold rounded-sm transition"
              title="清空 DPS 與傷害統計 (快捷鍵 C)"
            >
              清空統計 [C]
            </button>
          </div>
        </div>
      )}

      {/* CENTER CANVAS: SQUARE BOUNCE DUEL ARENA */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-3 w-full max-w-4xl">
        <canvas
          ref={canvasRef}
          width={740}
          height={740}
          className="max-w-full max-h-[60vh] w-auto h-auto rounded-sm shadow-2xl border border-white/15 bg-black aspect-square object-contain"
        />

        {/* Tactical Skill & Combat Control Bar */}
        <div className="mt-2.5 w-full max-w-3xl px-3.5 py-2.5 bg-black/90 border border-white/20 rounded-sm backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono shadow-2xl">
          {/* Mode Switcher Toggle Button */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={toggleP1ControlMode}
              className={`px-3 py-1.5 rounded-sm border font-bold text-xs transition active:scale-95 flex items-center space-x-1.5 shadow-md ${
                p1ControlMode === 'manual'
                  ? 'bg-amber-600/40 border-amber-400 text-amber-300 shadow-amber-900/30'
                  : p1ControlMode === 'semi_auto'
                  ? 'bg-purple-600/40 border-purple-400 text-purple-300 shadow-purple-900/30'
                  : 'bg-emerald-600/40 border-emerald-400 text-emerald-300 shadow-emerald-900/30'
              }`}
              title="按 [T] 或 [M] 隨時切換技能操作模式 (全自動 / 純手動 / 半自動)"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>
                {p1ControlMode === 'manual' ? '🎮 純手動 [T]' : p1ControlMode === 'semi_auto' ? '⚔️ 半自動 [T]' : '⚡ 全自動 [T]'}
              </span>
            </button>
          </div>

          {/* Interactive Skill Slots for P1 */}
          <div className="flex-1 flex flex-wrap items-center justify-center gap-2">
            {/* Primary Attack */}
            <button
              onClick={() => handleManualAction('primary', 1)}
              className="relative px-2.5 py-1.5 bg-white/5 hover:bg-blue-600/40 border border-blue-500/40 hover:border-blue-400 text-white text-[11px] font-bold rounded-sm transition active:scale-95 flex items-center space-x-1.5"
              title="普攻 (快捷鍵 [1] 或 [J])"
            >
              <span className="px-1 bg-black/60 rounded text-[9px] text-cyan-300 font-mono border border-cyan-500/30">1/J</span>
              <span className="truncate max-w-[90px]">{p1Char.skills.primary.name}</span>
              {hudState.p1.attackTimer > 0.2 ? (
                <span className="text-[9px] text-white/50">{hudState.p1.attackTimer.toFixed(1)}s</span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}
            </button>

            {/* Skill 1 */}
            <button
              onClick={() => handleManualAction('skill1', 1)}
              className={`relative px-2.5 py-1.5 border text-[11px] font-bold rounded-sm transition active:scale-95 flex items-center space-x-1.5 ${
                hudState.p1.cd1 <= 0
                  ? 'bg-blue-600/30 hover:bg-blue-600/60 border-blue-400 text-blue-200 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                  : 'bg-white/5 border-white/15 text-white/50 cursor-not-allowed'
              }`}
              title={`專屬技能 (快捷鍵 [2] 或 [K]) - 冷卻: ${p1Char.skills.skill1.cooldown}s`}
            >
              <span className="px-1 bg-black/60 rounded text-[9px] text-blue-300 font-mono border border-blue-500/30">2/K</span>
              <span className="truncate max-w-[90px]">{p1Char.skills.skill1.name}</span>
              {hudState.p1.cd1 > 0 ? (
                <span className="text-[9px] text-amber-400 font-mono">{hudState.p1.cd1.toFixed(1)}s</span>
              ) : (
                <span className="text-[9px] text-cyan-300 font-bold">READY</span>
              )}
            </button>

            {/* Skill 2 */}
            <button
              onClick={() => handleManualAction('skill2', 1)}
              className={`relative px-2.5 py-1.5 border text-[11px] font-bold rounded-sm transition active:scale-95 flex items-center space-x-1.5 ${
                hudState.p1.cd2 <= 0
                  ? 'bg-purple-600/30 hover:bg-purple-600/60 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'bg-white/5 border-white/15 text-white/50 cursor-not-allowed'
              }`}
              title="秘術技能 (快捷鍵 [3] 或 [L])"
            >
              <span className="px-1 bg-black/60 rounded text-[9px] text-purple-300 font-mono border border-purple-500/30">3/L</span>
              <span className="truncate max-w-[90px]">{p1Char.skills.skill2.name}</span>
              {hudState.p1.cd2 > 0 ? (
                <span className="text-[9px] text-amber-400 font-mono">{hudState.p1.cd2.toFixed(1)}s</span>
              ) : (
                <span className="text-[9px] text-purple-300 font-bold">READY</span>
              )}
            </button>

            {/* Ultimate */}
            <button
              onClick={() => handleManualAction('ultimate', 1)}
              className={`relative px-3 py-1.5 border text-[11px] font-black uppercase rounded-sm shadow transition active:scale-95 flex items-center space-x-1.5 ${
                hudState.p1.energy >= 100 && hudState.p1.cdUlt <= 0
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 border-amber-300 text-black animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.6)] cursor-pointer'
                  : 'bg-gradient-to-r from-zinc-800 to-zinc-900 border-white/20 text-white/60'
              }`}
              title="終極大招 (快捷鍵 [4] / [U] / [空格])"
            >
              <span className="px-1 bg-black/50 rounded text-[9px] text-amber-200 font-mono">4/Space</span>
              <span className="truncate max-w-[100px]">🔥 {p1Char.skills.ultimate.name}</span>
              <span className="text-[9px] font-mono">
                {hudState.p1.energy >= 100 ? (
                  <strong className="text-black">100%</strong>
                ) : (
                  <span className="text-amber-400">{Math.floor(hudState.p1.energy)}%</span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Combo Floating Badge for P1 */}
        {hudState.p1.combo > 1 && (
          <div className="absolute top-6 left-8 px-3 py-1 bg-blue-600 text-white font-mono font-black text-xs tracking-widest shadow-lg animate-bounce rounded-none">
            COMBO // {hudState.p1.combo} HITS
          </div>
        )}

        {/* Combo Floating Badge for P2 */}
        {hudState.p2.combo > 1 && (
          <div className="absolute top-6 right-8 px-3 py-1 bg-red-600 text-white font-mono font-black text-xs tracking-widest shadow-lg animate-bounce rounded-none">
            COMBO // {hudState.p2.combo} HITS
          </div>
        )}
      </div>

      {/* BOTTOM TELEMETRY & LIVE COMBAT EVENT TICKER */}
      <footer className="relative z-20 w-full max-w-6xl px-4 py-3 border-t border-white/10 bg-black/80 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
        {/* Real-time Combat Telemetry Description */}
        <div className="flex items-center space-x-4 text-white/50 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <Swords className="w-3.5 h-3.5 text-white" />
            <span className="text-white font-bold uppercase">方形物理反彈模式</span>
          </div>
          <span className="hidden sm:inline text-white/30">|</span>
          <span className="hidden sm:inline">雙方角色自主於方框中持續反彈，依各自攻擊週期自動觸發專屬技能！</span>
        </div>

        {/* Live Combat Event Stream */}
        <div className="w-full md:w-auto flex items-center justify-end overflow-x-auto space-x-2 py-0.5">
          {combatLogs.slice(0, 3).map((log) => (
            <div 
              key={log.id}
              className="shrink-0 px-2.5 py-1 bg-white/5 border border-white/10 text-[10px] text-white/80 rounded-none flex items-center space-x-1.5"
            >
              <span className="text-white/40">{log.timestamp}</span>
              <span className="font-bold" style={{ color: log.themeColor }}>{log.fighterName}</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </footer>

      {/* Pause Modal */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0D0D0D] border border-white/20 rounded-sm max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="text-[10px] font-mono font-bold tracking-widest text-red-500 uppercase mb-1">TACTICAL BREAK</div>
            <h3 className="text-2xl font-black italic tracking-tight text-white uppercase mb-5">MATCH PAUSED</h3>
            <div className="space-y-2.5">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-3 rounded-sm bg-white hover:bg-red-600 hover:text-white text-black font-black italic text-xs uppercase tracking-wider transition-colors shadow"
              >
                RESUME COMBAT // 繼續戰鬥
              </button>
              <button
                onClick={initGame}
                className="w-full py-3 rounded-sm bg-white/5 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-wider border border-white/15 transition"
              >
                RESTART ROUND // 重啟戰局
              </button>
              <button
                onClick={onBackToMenu}
                className="w-full py-3 rounded-sm bg-white/5 hover:bg-red-950/40 text-red-400 font-mono text-xs uppercase tracking-wider border border-red-500/30 transition"
              >
                EXIT TO ROSTER // 返回選角
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
