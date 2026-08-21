import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Swords, 
  Bot, 
  Users, 
  Sparkles, 
  Flame, 
  Shield, 
  Zap, 
  RotateCw, 
  Crosshair, 
  Target,
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
  HelpCircle,
  Volume2,
  VolumeX,
  Shuffle,
  Trophy,
  Layers,
  Radio,
  Maximize2,
  Gamepad2
} from 'lucide-react';
import { CharacterConfig, GameMode, AIDifficulty, ArenaMapType, MapScale, SkillControlMode } from '../types';
import { CHARACTER_ROSTER } from '../characters/roster';
import { sounds } from '../audio/soundManager';

interface CharacterSelectProps {
  onStartGame: (
    p1Char: CharacterConfig,
    p2Char: CharacterConfig,
    mode: GameMode,
    aiDifficulty: AIDifficulty,
    mapType: ArenaMapType,
    swarmCount?: number,
    mapScale?: MapScale,
    p1ControlMode?: SkillControlMode,
    p2ControlMode?: SkillControlMode
  ) => void;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({ onStartGame }) => {
  const [selectedP1Index, setSelectedP1Index] = useState<number>(0);
  const [selectedP2Index, setSelectedP2Index] = useState<number>(CHARACTER_ROSTER.length > 1 ? 1 : 0);
  const [activePickingPlayer, setActivePickingPlayer] = useState<'p1' | 'p2'>('p1');
  const [gameMode, setGameMode] = useState<GameMode>('ai_vs_ai');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('normal');
  const [mapType, setMapType] = useState<ArenaMapType>('classic');
  const [mapScale, setMapScale] = useState<MapScale>(1.0);
  const [p1ControlMode, setP1ControlMode] = useState<SkillControlMode>('auto');
  const [p2ControlMode, setP2ControlMode] = useState<SkillControlMode>('auto');
  const [swarmCount, setSwarmCount] = useState<number>(5);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sounds.getMuted());

  const p1Character = CHARACTER_ROSTER[selectedP1Index] || CHARACTER_ROSTER[0];
  const p2Character = CHARACTER_ROSTER[selectedP2Index] || CHARACTER_ROSTER[0];
  const activeChar = activePickingPlayer === 'p1' ? p1Character : p2Character;

  const handleSelectCharacter = (index: number) => {
    sounds.playHit(false);
    if (activePickingPlayer === 'p1') {
      setSelectedP1Index(index);
    } else {
      setSelectedP2Index(index);
    }
  };

  const handleRandomize = () => {
    sounds.playDash();
    const r1 = Math.floor(Math.random() * CHARACTER_ROSTER.length);
    let r2 = Math.floor(Math.random() * CHARACTER_ROSTER.length);
    if (r2 === r1 && CHARACTER_ROSTER.length > 1) {
      r2 = (r1 + 1) % CHARACTER_ROSTER.length;
    }
    setSelectedP1Index(r1);
    setSelectedP2Index(r2);
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleStart = () => {
    sounds.playUltimate();
    onStartGame(p1Character, p2Character, gameMode, aiDifficulty, mapType, swarmCount, mapScale, p1ControlMode, p2ControlMode);
  };

  const renderSkillIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return <Flame className="w-3.5 h-3.5" />;
      case 'Zap': return <Zap className="w-3.5 h-3.5" />;
      case 'RotateCw': return <RotateCw className="w-3.5 h-3.5" />;
      case 'Sparkles': return <Sparkles className="w-3.5 h-3.5" />;
      case 'Crosshair': return <Crosshair className="w-3.5 h-3.5" />;
      case 'Undo2': return <Undo2 className="w-3.5 h-3.5" />;
      case 'Disc': return <Disc className="w-3.5 h-3.5" />;
      case 'Wind': return <Wind className="w-3.5 h-3.5" />;
      case 'Hammer': return <Hammer className="w-3.5 h-3.5" />;
      case 'Shield': return <Shield className="w-3.5 h-3.5" />;
      case 'Activity': return <Activity className="w-3.5 h-3.5" />;
      case 'Scissors': return <Scissors className="w-3.5 h-3.5" />;
      case 'EyeOff': return <EyeOff className="w-3.5 h-3.5" />;
      case 'FastForward': return <FastForward className="w-3.5 h-3.5" />;
      case 'Snowflake': return <Snowflake className="w-3.5 h-3.5" />;
      case 'SunMedium': return <SunMedium className="w-3.5 h-3.5" />;
      case 'CloudSnow': return <CloudSnow className="w-3.5 h-3.5" />;
      default: return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0A0A0A] text-white flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Dark Ambient Radial Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1a1a_0%,#0a0a0a_100%)] z-0 pointer-events-none" />

      {/* Dynamic Combat Color Ambience */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15 transition-all duration-700 blur-[100px] z-0"
        style={{
          background: `radial-gradient(circle at 20% 40%, ${p1Character.themeColor} 0%, transparent 60%), radial-gradient(circle at 80% 40%, ${p2Character.themeColor} 0%, transparent 60%)`
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 px-6 sm:px-10 py-6 border-b border-white/10 bg-black/60 backdrop-blur-md flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">TACTICAL COMBAT INTERFACE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter leading-none">
            STRIKE <span className="text-red-600 underline decoration-2 underline-offset-8">PROTOCOL</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-3 font-mono">
            SELECT YOUR COMBATANTS TO ENTER THE ARENA // 雙角色格鬥擂台
          </p>
        </div>

        <div className="flex items-center gap-6 sm:gap-8">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5 font-mono">Arena Status</div>
            <div className="text-xs font-mono text-green-500 flex items-center justify-end space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping inline-block mr-1"></span>
              ONLINE // STABLE
            </div>
          </div>

          <div className="text-right hidden md:block">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5 font-mono">Protocol Ver</div>
            <div className="text-xs font-mono text-white/80">#v2.40_REL</div>
          </div>

          {/* Action Tool Buttons */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-random-pick"
              onClick={handleRandomize}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/90 text-xs font-mono tracking-wider uppercase border border-white/10 hover:border-white/30 rounded-sm transition flex items-center space-x-1.5"
              title="隨機為雙方挑選角色"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-400" />
              <span>隨機選角</span>
            </button>

            <button
              id="btn-controls-help"
              onClick={() => setShowHelpModal(true)}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/90 text-xs font-mono tracking-wider uppercase border border-white/10 hover:border-white/30 rounded-sm transition flex items-center space-x-1.5"
              title="查看按鍵操作與擂台規則"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>操作指南</span>
            </button>

            <button
              id="btn-sound-toggle"
              onClick={handleToggleMute}
              className="p-2 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 hover:border-white/30 rounded-sm transition"
              title={isMuted ? '開啟音效' : '靜音'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Duel Section */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 flex flex-col justify-center space-y-6">
        
        {/* TOP VERSUS FIGHTERS ROW */}
        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
          
          {/* PLAYER 01 SECTION */}
          <section 
            onClick={() => setActivePickingPlayer('p1')}
            className={`w-full lg:w-5/12 flex flex-col items-start cursor-pointer p-4 rounded-sm transition-all duration-200 ${
              activePickingPlayer === 'p1' ? 'bg-blue-950/20 ring-1 ring-blue-500/50' : 'bg-transparent hover:bg-white/[0.02]'
            }`}
          >
            <div className="w-full flex items-center justify-between mb-2.5">
              <div className="text-[10px] bg-blue-600 text-white px-2.5 py-0.5 tracking-tighter font-bold uppercase rounded-sm">
                {gameMode === 'ai_vs_ai' ? 'COMBATANT 01 // AI' : 'PLAYER 01 // MANUAL'}
              </div>
              {activePickingPlayer === 'p1' && (
                <span className="text-[10px] font-mono text-blue-400 tracking-widest uppercase flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mr-1"></span>
                  CONFIGURING P1
                </span>
              )}
            </div>

            {/* Fighter Visual Showcase Card */}
            <div className="w-full aspect-[16/10] sm:aspect-[16/9] bg-gradient-to-t from-blue-950/60 via-blue-900/10 to-transparent border border-blue-500/30 rounded-sm relative group overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center opacity-25">
                <div 
                  className="w-44 h-44 rounded-full border-2 border-blue-500/60 flex items-center justify-center animate-[spin_20s_linear_infinite]"
                  style={{ borderStyle: 'dashed' }}
                />
              </div>

              {/* Centered Avatar Display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-5xl sm:text-6xl shadow-2xl relative transition-transform group-hover:scale-105 duration-300"
                  style={{ 
                    backgroundColor: p1Character.visual.bodyColor,
                    boxShadow: `0 0 40px ${p1Character.themeColor}aa`,
                    border: `2px solid ${p1Character.themeColor}`
                  }}
                >
                  <span>{p1Character.visual.avatarEmoji}</span>
                </div>
              </div>

              {/* Bottom Card Identity Typography */}
              <div className="absolute bottom-0 left-0 p-4 sm:p-5 w-full bg-gradient-to-t from-black via-black/80 to-transparent">
                <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white uppercase truncate">
                  {p1Character.name}
                </h2>
                <p className="text-[11px] text-blue-400 font-mono tracking-widest mt-0.5 uppercase">
                  {p1Character.baseRole.toUpperCase()} TYPE // {p1Character.title}
                </p>
              </div>
            </div>

            {/* Linear Sleek Stat Bars */}
            <div className="w-full mt-4 space-y-2.5">
              <div className="flex justify-between items-center text-[10px] tracking-widest text-white/50 font-mono">
                <span>HEALTH POINTS</span>
                <span className="text-white font-bold">{p1Character.stats.maxHp} HP</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-none overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (p1Character.stats.maxHp / 1800) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] tracking-widest text-white/50 font-mono">
                <span>ATTACK POWER</span>
                <span className="text-blue-400 font-bold">{p1Character.stats.attackPower} ATK</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-none overflow-hidden">
                <div 
                  className="h-full bg-blue-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (p1Character.stats.attackPower / 130) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] tracking-widest text-white/50 font-mono">
                <span>AUTO-ATTACK CADENCE</span>
                <span className="text-amber-400 font-bold">每 {p1Character.stats.attackInterval || 1.6} 秒/次</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-none overflow-hidden">
                <div 
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (1 / (p1Character.stats.attackInterval || 1.6)) * 100 * 1.5)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] tracking-widest text-white/50 font-mono">
                <span>FRAME BOUNCE SPEED</span>
                <span className="text-cyan-400 font-bold">{p1Character.stats.bounceSpeed || 300} px/s</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-none overflow-hidden">
                <div 
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, ((p1Character.stats.bounceSpeed || 300) / 400) * 100)}%` }}
                />
              </div>
            </div>

            {/* Compact Controls Cue */}
            <div className="w-full mt-3 px-2.5 py-1.5 bg-white/5 border border-white/10 text-[10px] font-mono text-white/60 flex justify-between">
              <span>戰鬥方式: 方形框架持續反彈</span>
              <span className="text-blue-400">自主釋放專屬攻擊與大招</span>
            </div>
          </section>

          {/* CENTER VS WATERMARK DIVIDER */}
          <div className="flex flex-row lg:flex-col items-center justify-center gap-3 lg:gap-4 my-2 lg:my-0 select-none">
            <div className="w-16 lg:w-px h-px lg:h-20 bg-gradient-to-r lg:bg-gradient-to-b from-transparent via-white/20 to-white/20"></div>
            <div className="text-4xl sm:text-6xl font-black italic text-white/15 tracking-tighter">VS</div>
            <div className="w-16 lg:w-px h-px lg:h-20 bg-gradient-to-l lg:bg-gradient-to-t from-transparent via-white/20 to-white/20"></div>
          </div>

          {/* PLAYER 02 SECTION */}
          <section 
            onClick={() => setActivePickingPlayer('p2')}
            className={`w-full lg:w-5/12 flex flex-col items-end cursor-pointer p-4 rounded-sm transition-all duration-200 ${
              activePickingPlayer === 'p2' ? 'bg-red-950/20 ring-1 ring-red-500/50' : 'bg-transparent hover:bg-white/[0.02]'
            }`}
          >
            <div className="w-full flex items-center justify-between mb-2.5 flex-row-reverse">
              <div className="text-[10px] bg-red-600 text-white px-2.5 py-0.5 tracking-tighter font-bold uppercase rounded-sm">
                {gameMode === 'pvp' ? 'PLAYER 02 // MANUAL' : 'CHALLENGER // AI OPPONENT'}
              </div>
              {activePickingPlayer === 'p2' && (
                <span className="text-[10px] font-mono text-red-400 tracking-widest uppercase flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1"></span>
                  CONFIGURING P2
                </span>
              )}
            </div>

            {/* Fighter Visual Showcase Card */}
            <div className="w-full aspect-[16/10] sm:aspect-[16/9] bg-gradient-to-t from-red-950/60 via-red-900/10 to-transparent border border-red-500/30 rounded-sm relative group overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center opacity-25">
                <div 
                  className="w-44 h-44 border-2 border-red-500/60 rotate-45 flex items-center justify-center animate-[spin_25s_linear_infinite_reverse]"
                  style={{ borderStyle: 'dashed' }}
                />
              </div>

              {/* Centered Avatar Display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-5xl sm:text-6xl shadow-2xl relative transition-transform group-hover:scale-105 duration-300"
                  style={{ 
                    backgroundColor: p2Character.visual.bodyColor,
                    boxShadow: `0 0 40px ${p2Character.themeColor}aa`,
                    border: `2px solid ${p2Character.themeColor}`
                  }}
                >
                  <span>{p2Character.visual.avatarEmoji}</span>
                </div>
              </div>

              {/* Bottom Card Identity Typography */}
              <div className="absolute bottom-0 right-0 p-4 sm:p-5 w-full bg-gradient-to-t from-black via-black/80 to-transparent text-right">
                <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white uppercase truncate">
                  {p2Character.name}
                </h2>
                <p className="text-[11px] text-red-400 font-mono tracking-widest mt-0.5 uppercase">
                  {p2Character.baseRole.toUpperCase()} TYPE // {p2Character.title}
                </p>
              </div>
            </div>

            {/* Linear Sleek Stat Bars */}
            <div className="w-full mt-4 space-y-2.5">
              <div className="flex justify-between items-center text-[10px] tracking-widest text-white/50 font-mono">
                <span className="text-white font-bold">{p2Character.stats.maxHp} HP</span>
                <span>HEALTH POINTS</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-none overflow-hidden flex justify-end">
                <div 
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (p2Character.stats.maxHp / 1800) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] tracking-widest text-white/50 font-mono">
                <span className="text-red-400 font-bold">{p2Character.stats.attackPower} ATK</span>
                <span>ATTACK POWER</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-none overflow-hidden flex justify-end">
                <div 
                  className="h-full bg-red-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (p2Character.stats.attackPower / 130) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] tracking-widest text-white/50 font-mono">
                <span className="text-amber-400 font-bold">每 {p2Character.stats.attackInterval || 2.0} 秒/次</span>
                <span>AUTO-ATTACK CADENCE</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-none overflow-hidden flex justify-end">
                <div 
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (1 / (p2Character.stats.attackInterval || 2.0)) * 100 * 1.5)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] tracking-widest text-white/50 font-mono">
                <span className="text-cyan-400 font-bold">{p2Character.stats.bounceSpeed || 300} px/s</span>
                <span>FRAME BOUNCE SPEED</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-none overflow-hidden flex justify-end">
                <div 
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, ((p2Character.stats.bounceSpeed || 300) / 400) * 100)}%` }}
                />
              </div>
            </div>

            {/* Compact Controls Cue */}
            <div className="w-full mt-3 px-2.5 py-1.5 bg-white/5 border border-white/10 text-[10px] font-mono text-white/60 flex justify-between">
              <span className="text-red-400">自主釋放專屬攻擊與大招</span>
              <span>戰鬥方式: 方形框架持續反彈</span>
            </div>
          </section>
        </div>

        {/* COMBAT MODE & MAP CONTROL STRIP */}
        <div className="w-full bg-[#0E0E0E] border border-white/10 rounded-sm p-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Mode Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => { sounds.playDash(); setGameMode('ai_vs_ai'); }}
              className={`px-3 py-1.5 rounded-sm text-xs font-mono font-bold transition flex items-center space-x-1.5 border ${
                gameMode !== 'swarm'
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30' 
                  : 'bg-white/5 text-white/60 border-white/5 hover:border-white/20 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>雙角色方框反彈決鬥 (1v1 Bounce Duel)</span>
            </button>

            <button
              onClick={() => { sounds.playDash(); setGameMode('swarm'); }}
              className={`px-3 py-1.5 rounded-sm text-xs font-mono font-bold transition flex items-center space-x-1.5 border ${
                gameMode === 'swarm' 
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30' 
                  : 'bg-white/5 text-white/60 border-white/5 hover:border-white/20 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>多角色方框大亂鬥 (Swarm Rumble)</span>
            </button>
          </div>

          {/* Conditional Options: AI Difficulty or Swarm Scale */}
          <div className="flex items-center gap-4 text-xs font-mono">
            {gameMode === 'pve' && (
              <div className="flex items-center space-x-2">
                <span className="text-white/40 uppercase tracking-wider">AI DIFFICULTY:</span>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as AIDifficulty)}
                  className="bg-black text-white border border-white/20 rounded-sm px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="easy">新手 (EASY)</option>
                  <option value="normal">熟練 (NORMAL)</option>
                  <option value="hard">宗師 (HARD)</option>
                  <option value="boss">狂暴首領 (BOSS)</option>
                </select>
              </div>
            )}

            {gameMode === 'swarm' && (
              <div className="flex items-center space-x-2">
                <span className="text-white/40 uppercase tracking-wider">TEAM SIZE:</span>
                <div className="flex space-x-1">
                  {[3, 5, 8, 12].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setSwarmCount(cnt)}
                      className={`px-2 py-0.5 rounded-sm text-xs font-mono font-bold border ${
                        swarmCount === cnt 
                          ? 'bg-red-600 border-red-500 text-white' 
                          : 'bg-black border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {cnt}v{cnt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Map Selection */}
            <div className="flex items-center space-x-2">
              <span className="text-white/40 uppercase tracking-wider">ARENA MAP:</span>
              <select
                value={mapType}
                onChange={(e) => setMapType(e.target.value as ArenaMapType)}
                className="bg-black text-white border border-white/20 rounded-sm px-2.5 py-1 text-xs focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="classic">經典八角角鬥場 (OCTAGON)</option>
                <option value="lava">熔岩熾熱神殿 (LAVA TEMPLE)</option>
                <option value="ruins">古老石陣遺蹟 (RUINS)</option>
                <option value="cyber">賽博霓虹矩陣 (CYBER MATRIX)</option>
              </select>
            </div>

            {/* Map Scale Multiplier Selection */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-white/40 uppercase tracking-wider">
                <Maximize2 className="w-3 h-3 text-cyan-400" />
                <span>MAP SCALE (地圖倍數):</span>
              </div>
              <div className="flex space-x-1">
                {([0.8, 1.0, 1.5, 2.0, 3.0] as MapScale[]).map((scale) => (
                  <button
                    key={scale}
                    onClick={() => { sounds.playDash(); setMapScale(scale); }}
                    className={`px-2 py-0.5 rounded-sm text-xs font-mono font-bold border transition ${
                      mapScale === scale 
                        ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm shadow-cyan-500/30' 
                        : 'bg-black border-white/10 text-white/60 hover:text-white hover:border-white/30'
                    }`}
                    title={
                      scale === 0.8 ? '0.8x 緊湊迷你戰場 (480px)' :
                      scale === 1.0 ? '1.0x 標準方框戰場 (600px)' :
                      scale === 1.5 ? '1.5x 寬闊延伸戰場 (900px)' :
                      scale === 2.0 ? '2.0x 巨型宏大戰場 (1200px)' :
                      '3.0x 史詩狂暴巨擂 (1800px)'
                    }
                  >
                    {scale}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SKILL CONTROL MODE SELECTION (玩家自由決定技能手動操作或自動) */}
        <div className="w-full bg-[#0E0E0E] border border-white/10 rounded-sm p-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sm bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-white flex items-center space-x-2">
                <span>技能操作方式 (SKILL CONTROL MODE)</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-none">
                  戰鬥中可隨時按 [T] 切換
                </span>
              </div>
              <p className="text-[11px] text-white/50 font-sans mt-0.5">
                決定技能由系統自動依攻擊週期觸發，或完全由玩家手動操作釋放（亦支援自動普攻＋手動技能的半自動模式）
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* P1 Skill Mode Selector */}
            <div className="flex items-center space-x-1.5 bg-black/70 border border-white/15 p-1 rounded-sm">
              <span className="text-[10px] font-mono font-bold text-blue-400 px-1.5">P1 技能模式:</span>
              <button
                type="button"
                onClick={() => { sounds.playDash(); setP1ControlMode('auto'); }}
                className={`px-2.5 py-1 rounded-sm text-xs font-mono font-bold transition flex items-center space-x-1 border ${
                  p1ControlMode === 'auto'
                    ? 'bg-blue-600 border-blue-400 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-transparent border-transparent text-white/60 hover:text-white'
                }`}
                title="自動普攻與全技能釋放"
              >
                <Zap className="w-3 h-3" />
                <span>⚡ 全自動 (Auto)</span>
              </button>

              <button
                type="button"
                onClick={() => { sounds.playDash(); setP1ControlMode('manual'); }}
                className={`px-2.5 py-1 rounded-sm text-xs font-mono font-bold transition flex items-center space-x-1 border ${
                  p1ControlMode === 'manual'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-sm shadow-emerald-500/30'
                    : 'bg-transparent border-transparent text-white/60 hover:text-white'
                }`}
                title="普攻與技能完全由玩家按鍵 [1][2][3][4/Space] 手動釋放"
              >
                <Gamepad2 className="w-3 h-3" />
                <span>🎮 純手動 (Manual)</span>
              </button>

              <button
                type="button"
                onClick={() => { sounds.playDash(); setP1ControlMode('semi_auto'); }}
                className={`px-2.5 py-1 rounded-sm text-xs font-mono font-bold transition flex items-center space-x-1 border ${
                  p1ControlMode === 'semi_auto'
                    ? 'bg-amber-600 border-amber-400 text-white shadow-sm shadow-amber-500/30'
                    : 'bg-transparent border-transparent text-white/60 hover:text-white'
                }`}
                title="自動普攻，專屬技與大招由玩家手動按鍵掌控"
              >
                <Swords className="w-3 h-3" />
                <span>⚔️ 半自動 (Semi-Auto)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ACTIVE COMBATANT SKILL BREAKDOWN MATRIX */}
        <div className="w-full bg-[#0E0E0E] border border-white/10 rounded-sm p-4">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{activeChar.visual.avatarEmoji}</span>
              <div>
                <span className="text-xs font-mono text-white/50 uppercase tracking-widest">ACTIVE PROFILE:</span>
                <h4 className="text-sm font-black italic tracking-tight text-white uppercase inline ml-2">
                  {activeChar.name} — SKILL SET
                </h4>
              </div>
            </div>
            <span className="text-xs text-white/40 font-mono italic hidden sm:inline">
              "{activeChar.quote}"
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Primary */}
            <div className="p-3 bg-black/60 border border-white/10 rounded-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded-sm flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: activeChar.themeColor }}
                  >
                    {renderSkillIcon(activeChar.skills.primary.iconName)}
                  </div>
                  <span className="text-xs font-bold text-white">{activeChar.skills.primary.name}</span>
                </div>
                <span className="text-[9px] font-mono px-1 py-0.5 bg-white/10 text-white/70 rounded-none">普攻 [J / 1]</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed font-sans">{activeChar.skills.primary.description}</p>
            </div>

            {/* Skill 1 */}
            <div className="p-3 bg-black/60 border border-white/10 rounded-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded-sm flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: activeChar.themeColor }}
                  >
                    {renderSkillIcon(activeChar.skills.skill1.iconName)}
                  </div>
                  <span className="text-xs font-bold text-white">{activeChar.skills.skill1.name}</span>
                </div>
                <span className="text-[9px] font-mono px-1 py-0.5 bg-white/10 text-white/70 rounded-none">CD: {activeChar.skills.skill1.cooldown}s</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed font-sans">{activeChar.skills.skill1.description}</p>
            </div>

            {/* Skill 2 */}
            <div className="p-3 bg-black/60 border border-white/10 rounded-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded-sm flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: activeChar.themeColor }}
                  >
                    {renderSkillIcon(activeChar.skills.skill2.iconName)}
                  </div>
                  <span className="text-xs font-bold text-white">{activeChar.skills.skill2.name}</span>
                </div>
                <span className="text-[9px] font-mono px-1 py-0.5 bg-white/10 text-white/70 rounded-none">CD: 9~11s (隨機)</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed font-sans">{activeChar.skills.skill2.description}</p>
            </div>

            {/* Ultimate */}
            <div className="p-3 bg-gradient-to-br from-red-950/40 to-black border border-red-500/40 rounded-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-sm bg-red-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-red-500">
                    {renderSkillIcon(activeChar.skills.ultimate.iconName)}
                  </div>
                  <span className="text-xs font-black text-red-300">{activeChar.skills.ultimate.name}</span>
                </div>
                <span className="text-[9px] font-mono px-1 py-0.5 bg-red-600/30 text-red-300 border border-red-500/30">100% RAGE</span>
              </div>
              <p className="text-[11px] text-red-200/70 leading-relaxed font-sans">{activeChar.skills.ultimate.description}</p>
            </div>
          </div>
        </div>
      </main>

      {/* BOTTOM ROSTER DOCK & FIGHT EXECUTION BAR */}
      <footer className="relative z-10 bg-black/90 border-t border-white/10 p-4 sm:p-6 flex flex-col md:flex-row items-center gap-6 overflow-hidden">
        
        {/* Roster Label Tag */}
        <div className="text-[10px] text-white/30 uppercase tracking-[0.5em] pr-4 md:border-r border-white/10 font-mono hidden md:block select-none">
          ROSTER
        </div>

        {/* Character Roster Strip */}
        <div className="flex items-center gap-3 overflow-x-auto w-full md:flex-1 py-1">
          {CHARACTER_ROSTER.map((char, index) => {
            const isP1 = selectedP1Index === index;
            const isP2 = selectedP2Index === index;

            return (
              <div
                key={char.id}
                id={`char-roster-${char.id}`}
                onClick={() => handleSelectCharacter(index)}
                className={`w-18 h-18 sm:w-20 sm:h-20 shrink-0 border cursor-pointer flex flex-col items-center justify-center relative transition-all duration-200 rounded-sm group ${
                  isP1 && isP2
                    ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-500/20'
                    : isP1
                    ? 'bg-blue-950/40 border-2 border-blue-500 shadow-lg shadow-blue-500/20'
                    : isP2
                    ? 'bg-red-950/40 border-2 border-red-500 shadow-lg shadow-red-500/20'
                    : char.id === 'target_dummy'
                    ? 'bg-cyan-950/30 border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-900/30'
                    : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                }`}
                title={`選擇 ${char.name} ${char.id === 'target_dummy' ? '(測試專用假人)' : ''}`}
              >
                {/* Active Player Badges */}
                {isP1 && (
                  <span className="absolute -top-2 -left-1 text-[9px] font-black font-mono px-1 py-0.2 bg-blue-600 text-white rounded-none shadow">
                    P1
                  </span>
                )}
                {isP2 && (
                  <span className="absolute -top-2 -right-1 text-[9px] font-black font-mono px-1 py-0.2 bg-red-600 text-white rounded-none shadow">
                    P2
                  </span>
                )}
                {char.id === 'target_dummy' && !isP1 && !isP2 && (
                  <span className="absolute -top-2 text-[8px] font-black font-mono px-1 bg-cyan-600 text-black uppercase rounded-none">
                    DUMMY
                  </span>
                )}

                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg mb-1 transition-transform group-hover:scale-110"
                  style={{ 
                    backgroundColor: char.visual.bodyColor,
                    border: `1.5px solid ${char.themeColor}`
                  }}
                >
                  {char.visual.avatarEmoji}
                </div>
                <span className="text-[10px] font-bold tracking-tight text-white/90 truncate w-full text-center px-1">
                  {char.name.split('．')[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Training Sandbox Quick CTA */}
        <button
          id="btn-training-sandbox"
          onClick={() => {
            sounds.playUltimate();
            const dummyIdx = CHARACTER_ROSTER.findIndex(c => c.id === 'target_dummy');
            const dummyChar = CHARACTER_ROSTER[dummyIdx >= 0 ? dummyIdx : 0];
            onStartGame(p1Character, dummyChar, 'ai_vs_ai', 'normal', mapType, 5, mapScale);
          }}
          className="w-full md:w-auto bg-cyan-950/80 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/50 font-mono font-bold text-xs sm:text-sm px-5 py-4 sm:py-5 transition-all uppercase tracking-wider rounded-sm shadow-lg flex items-center justify-center gap-2 shrink-0 active:scale-98"
          title="以 P1 角色對戰測試假人，進入即時傷害 DPS 測量沙盒"
        >
          <Target className="w-4 h-4 text-cyan-400" />
          <span>🎯 技能測試沙盒</span>
        </button>

        {/* Primary Action Button (STRIKE PROTOCOL Fight CTA) */}
        <button
          id="btn-start-battle"
          onClick={handleStart}
          className="w-full md:w-auto bg-white text-black font-black italic text-lg sm:text-xl px-10 sm:px-14 py-4 sm:py-5 hover:bg-red-600 hover:text-white transition-colors uppercase tracking-tight rounded-sm shadow-2xl flex items-center justify-center gap-3 shrink-0 active:scale-98"
        >
          <Swords className="w-5 h-5" />
          <span>FIGHT NOW // 開戰</span>
        </button>
      </footer>

      {/* Operation / Help Guide Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0D0D0D] border border-white/20 rounded-sm max-w-xl w-full p-6 text-white shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                  <h3 className="text-base font-black italic tracking-tight text-white uppercase">
                    ARENA PROTOCOL // 操作與戰鬥手冊
                  </h3>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-white/40 hover:text-white text-xl font-mono p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div>
                  <h4 className="font-bold text-red-400 mb-1.5 font-mono uppercase text-[11px]">⬛ 方形框架物理反彈戰鬥 (無需手動操控)</h4>
                  <p className="text-white/80 leading-relaxed mb-2">
                    按開始後，雙方角色將進入 600x600 的方形物理框架中以高速持續反彈遊走，撞擊四面牆壁或敵方角色時皆會產生彈性動量反彈。
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-amber-400 mb-1.5 font-mono uppercase text-[11px]">⚔️ 裂殖異魔．米托 特殊細胞裂變機制</h4>
                  <ul className="space-y-1.5 text-white/80 font-mono text-[11px]">
                    <li className="bg-white/5 p-2 rounded-sm border border-white/5"><strong className="text-lime-400">酸性細胞射擊 (普攻):</strong> 每 1.4 秒 / 噴吐腐蝕粘液細胞核，命中引發酸液濺射</li>
                    <li className="bg-white/5 p-2 rounded-sm border border-white/5"><strong className="text-lime-400">有絲分裂裂殖 (被動):</strong> 每 5 秒分裂複製出一個活性分身（全場上限 10 隻）</li>
                    <li className="bg-white/5 p-2 rounded-sm border border-white/5"><strong className="text-lime-400">細胞雙合翻倍 (被動):</strong> 兩隻分身相遇 5 秒後兩兩聚合，生命值相加翻倍且體型擴張</li>
                    <li className="bg-white/5 p-2 rounded-sm border border-white/5"><strong className="text-lime-400">原初泰坦．終極大聚合 (大招):</strong> 怒氣 100% 召喚全場同伴瞬間融合成超巨型原初泰坦！</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-green-400 mb-1.5 font-mono uppercase text-[11px]">🕶️ MLG guy 360度狙神與激浪狂飆機制</h4>
                  <ul className="space-y-1.5 text-white/80 font-mono text-[11px]">
                    <li className="bg-white/5 p-2 rounded-sm border border-white/5"><strong className="text-green-400">360重型狙擊 (普攻):</strong> 發射高速狙擊子彈，命中觸發 Hitmarker 與爆發傷害</li>
                    <li className="bg-white/5 p-2 rounded-sm border border-white/5"><strong className="text-orange-400">吃多力多滋 (技能1):</strong> 立即大口吃多力多滋，瞬間回復 200 點血量</li>
                    <li className="bg-white/5 p-2 rounded-sm border border-white/5"><strong className="text-green-400">喝激浪汽水 (技能2):</strong> 速度狂暴飆升 20 倍持續 5 秒，撞到人扣除 50 點生命值！</li>
                    <li className="bg-white/5 p-2 rounded-sm border border-white/5"><strong className="text-yellow-400">五重分身．10秒衝撞 (大招):</strong> 瞬間召喚 5 個全武裝分身，本體與分身全體獲得 20 倍極速衝撞 10 秒！</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-green-400 mb-1 font-mono uppercase text-[11px]">⚡ 戰鬥觀測與倍速控制</h4>
                  <ul className="space-y-1 text-white/70 list-disc list-inside">
                    <li><strong className="text-white">技能與大招：</strong>角色達到冷卻時間或怒氣滿 100% 時會自動瞄準敵方釋放專屬秘技與全屏大招。</li>
                    <li><strong className="text-white">模擬倍速：</strong>在對戰頂部隨時可切換 1.0x、1.5x、2.0x 倍速觀測，或隨時暫停與重啟對決。</li>
                    <li><strong className="text-white">隨機物資：</strong>方框內隨機生成綠色生命符文、金色充能水晶與紅色攻擊狂暴符文。</li>
                  </ul>
                </div>
              </div>

              <div className="mt-5 text-right">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-6 py-2.5 bg-white text-black hover:bg-red-600 hover:text-white font-black italic text-xs uppercase tracking-tight rounded-sm transition"
                >
                  CONFIRM & ENTER
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
