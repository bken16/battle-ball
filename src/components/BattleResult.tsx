import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Swords, Award, ShieldAlert, Zap, Flame } from 'lucide-react';
import { BattleStats } from '../types';
import { sounds } from '../audio/soundManager';

interface BattleResultProps {
  stats: BattleStats;
  onRematch: () => void;
  onBackToMenu: () => void;
}

export const BattleResult: React.FC<BattleResultProps> = ({ stats, onRematch, onBackToMenu }) => {
  useEffect(() => {
    sounds.playVictory();
    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      const timeout = setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);
      return () => clearTimeout(timeout);
    } catch {
      // ignore
    }
  }, []);

  const winner = stats.fighters.find(f => f.team === stats.winnerTeam) || stats.fighters[0];
  const loser = stats.fighters.find(f => f.team !== stats.winnerTeam) || stats.fighters[1];

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m > 0 ? `${m}分` : ''}${s}秒`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none font-sans overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
        className="bg-[#0D0D0D] border border-white/20 rounded-sm max-w-2xl w-full p-6 md:p-8 text-white shadow-2xl relative overflow-hidden"
      >
        {/* Ambient Glow */}
        <div 
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: winner.character.themeColor }}
        />

        {/* Victory Header */}
        <div className="relative text-center mb-6">
          <div className="inline-flex items-center justify-center space-x-2 px-3 py-1 bg-red-600 text-white font-black font-mono text-[10px] uppercase tracking-widest mb-3 rounded-none">
            <Trophy className="w-3.5 h-3.5" />
            <span>VICTORY // K.O. 決鬥終局</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">
            {winner.character.name} <span className="text-red-600">TRIUMPHS</span>
          </h2>
          <p className="text-xs font-mono text-white/50 mt-1 uppercase tracking-wider">
            COMBAT DURATION: <span className="text-white font-bold">{formatDuration(stats.duration)}</span>
          </p>
        </div>

        {/* Winner Hero Display */}
        <div 
          className="relative rounded-sm p-5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-gradient-to-r from-white/[0.04] to-transparent"
        >
          <div className="flex items-center space-x-4">
            <div 
              className="w-20 h-20 rounded-sm flex items-center justify-center text-4xl shadow-2xl shrink-0"
              style={{
                backgroundColor: winner.character.visual.bodyColor,
                border: `2px solid ${winner.character.themeColor}`,
                boxShadow: `0 0 30px ${winner.character.themeColor}66`
              }}
            >
              <span>{winner.character.visual.avatarEmoji}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-white text-black uppercase">
                  MATCH MVP
                </span>
                <span className="text-xs text-white/50 font-mono uppercase">{winner.character.title}</span>
              </div>
              <h3 className="text-2xl font-black italic tracking-tight text-white mt-1 uppercase">{winner.character.name}</h3>
              <p className="text-xs text-white/70 italic mt-0.5 font-mono">"{winner.character.quote}"</p>
            </div>
          </div>

          <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0 border-white/10 font-mono">
            <span className="text-[10px] text-white/40 uppercase tracking-widest">SURVIVING HP</span>
            <span className="text-xl font-black text-green-400">
              {Math.max(0, Math.round(winner.remainingHp))} / {winner.maxHp} HP
            </span>
          </div>
        </div>

        {/* Detailed Stats Comparison */}
        <div className="bg-black/60 rounded-sm p-4 border border-white/10 mb-6">
          <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center space-x-2 font-mono">
            <Award className="w-3.5 h-3.5 text-red-500" />
            <span>COMBAT TELEMETRY & ENGAGEMENT METRICS</span>
          </h4>

          <div className="grid grid-cols-2 gap-4">
            {/* Winner Column */}
            <div className="bg-[#111111] rounded-sm p-3.5 border border-blue-500/30">
              <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-white/10">
                <span className="text-base">{winner.character.visual.avatarEmoji}</span>
                <span className="text-xs font-bold text-white truncate font-mono uppercase">{winner.name}</span>
                <span className="text-[9px] ml-auto px-1.5 py-0.5 bg-blue-600 text-white font-mono font-bold">WINNER</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-white/60">
                  <span>DAMAGE OUTPUT:</span>
                  <span className="font-bold text-white">{Math.round(winner.damageDealt)}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>HITS LANDED:</span>
                  <span className="font-bold text-white">{winner.hitsLanded}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>MAX COMBO:</span>
                  <span className="font-bold text-blue-400">{winner.maxCombo} HITS</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>SKILLS CAST:</span>
                  <span className="font-bold text-white">{winner.skillsUsed}</span>
                </div>
              </div>
            </div>

            {/* Loser Column */}
            {loser && (
              <div className="bg-[#111111] rounded-sm p-3.5 border border-white/10 opacity-70">
                <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-white/10">
                  <span className="text-base">{loser.character.visual.avatarEmoji}</span>
                  <span className="text-xs font-bold text-white/80 truncate font-mono uppercase">{loser.name}</span>
                  <span className="text-[9px] ml-auto px-1.5 py-0.5 bg-white/10 text-white/50 font-mono font-bold">DEFEATED</span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-white/50">
                    <span>DAMAGE OUTPUT:</span>
                    <span className="font-bold text-white/80">{Math.round(loser.damageDealt)}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>HITS LANDED:</span>
                    <span className="font-bold text-white/80">{loser.hitsLanded}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>MAX COMBO:</span>
                    <span className="font-bold text-white/80">{loser.maxCombo} HITS</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>SKILLS CAST:</span>
                    <span className="font-bold text-white/80">{loser.skillsUsed}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="btn-battle-rematch"
            onClick={onRematch}
            className="w-full sm:w-1/2 py-3.5 px-6 rounded-sm bg-white hover:bg-red-600 hover:text-white text-black font-black italic text-sm uppercase tracking-tight shadow-xl flex items-center justify-center space-x-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REMATCH // 再戰一局</span>
          </button>

          <button
            id="btn-back-to-select"
            onClick={onBackToMenu}
            className="w-full sm:w-1/2 py-3.5 px-6 rounded-sm bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs uppercase tracking-wider border border-white/15 flex items-center justify-center space-x-2 transition"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO ROSTER // 返回選角</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
