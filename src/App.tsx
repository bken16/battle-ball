/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CharacterConfig, GameMode, AIDifficulty, ArenaMapType, MapScale, SkillControlMode, BattleStats } from './types';
import { CHARACTER_ROSTER } from './characters/roster';
import { CharacterSelect } from './components/CharacterSelect';
import { ArenaGame } from './components/ArenaGame';
import { BattleResult } from './components/BattleResult';

export default function App() {
  const [viewState, setViewState] = useState<'select' | 'battle' | 'result'>('select');
  
  // Game Setup parameters
  const [p1Char, setP1Char] = useState<CharacterConfig>(CHARACTER_ROSTER[0]);
  const [p2Char, setP2Char] = useState<CharacterConfig>(CHARACTER_ROSTER[1] || CHARACTER_ROSTER[0]);
  const [gameMode, setGameMode] = useState<GameMode>('pve');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('normal');
  const [mapType, setMapType] = useState<ArenaMapType>('classic');
  const [mapScale, setMapScale] = useState<MapScale>(1.0);
  const [p1ControlMode, setP1ControlMode] = useState<SkillControlMode>('auto');
  const [p2ControlMode, setP2ControlMode] = useState<SkillControlMode>('auto');
  const [swarmCount, setSwarmCount] = useState<number>(5);

  // Match statistics for victory screen
  const [battleStats, setBattleStats] = useState<BattleStats | null>(null);

  const handleStartGame = (
    p1: CharacterConfig,
    p2: CharacterConfig,
    mode: GameMode,
    difficulty: AIDifficulty,
    map: ArenaMapType,
    swarm = 5,
    scale: MapScale = 1.0,
    controlP1: SkillControlMode = 'auto',
    controlP2: SkillControlMode = 'auto'
  ) => {
    setP1Char(p1);
    setP2Char(p2);
    setGameMode(mode);
    setAiDifficulty(difficulty);
    setMapType(map);
    setSwarmCount(swarm);
    setMapScale(scale);
    setP1ControlMode(controlP1);
    setP2ControlMode(controlP2);
    setViewState('battle');
  };

  const handleGameOver = (stats: BattleStats) => {
    setBattleStats(stats);
    setViewState('result');
  };

  const handleRematch = () => {
    setViewState('battle');
  };

  const handleBackToMenu = () => {
    setViewState('select');
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
      {viewState === 'select' && (
        <CharacterSelect onStartGame={handleStartGame} />
      )}

      {viewState === 'battle' && (
        <ArenaGame
          p1Char={p1Char}
          p2Char={p2Char}
          mode={gameMode}
          aiDifficulty={aiDifficulty}
          mapType={mapType}
          mapScale={mapScale}
          swarmCount={swarmCount}
          p1ControlMode={p1ControlMode}
          p2ControlMode={p2ControlMode}
          onGameOver={handleGameOver}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {viewState === 'result' && battleStats && (
        <BattleResult
          stats={battleStats}
          onRematch={handleRematch}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}
