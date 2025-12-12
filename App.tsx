import React, { useState, useEffect, useCallback } from 'react';
import { Users, ClipboardList, Trophy, Settings, TrendingUp, Home, ArrowRight, PlayCircle, SkipForward } from 'lucide-react';
import { Player, Team, MatchResult, MatchEventType, Formation } from './types';
import { initializeLeague, simulateMatch, generatePlayer } from './services/engine';
import { Button, Card, Header, PlayerCard, MoneyDisplay } from './components/components';
import { FORMATIONS_CONFIG } from './constants';

enum View {
  HOME = 'HOME',
  DASHBOARD = 'DASHBOARD',
  SQUAD = 'SQUAD',
  TACTICS = 'TACTICS',
  TRANSFERS = 'TRANSFERS',
  MATCH_PREVIEW = 'MATCH_PREVIEW',
  MATCH_LIVE = 'MATCH_LIVE',
  LEAGUE = 'LEAGUE',
  FINANCES = 'FINANCES'
}

// Helper to format currency
const formatMoney = (n: number) => `$${(n / 1000000).toFixed(1)}M`;

const App: React.FC = () => {
  // --- Global State ---
  const [view, setView] = useState<View>(View.HOME);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeamId, setUserTeamId] = useState<string>('');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  
  // --- Initialization ---
  useEffect(() => {
    // Check local storage for save game
    const saved = localStorage.getItem('MFM_SAVE_V1');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setTeams(data.teams);
        setUserTeamId(data.userTeamId);
        setCurrentWeek(data.currentWeek);
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  }, []);

  const startNewCareer = () => {
    const newTeams = initializeLeague();
    setTeams(newTeams);
    // User controls the first team for simplicity in this demo
    setUserTeamId(newTeams[0].id); 
    setCurrentWeek(1);
    setView(View.DASHBOARD);
    saveGame(newTeams, newTeams[0].id, 1);
  };

  const saveGame = (currentTeams: Team[], uId: string, week: number) => {
    localStorage.setItem('MFM_SAVE_V1', JSON.stringify({
      teams: currentTeams,
      userTeamId: uId,
      currentWeek: week
    }));
  };

  // --- Derived State ---
  const userTeam = teams.find(t => t.id === userTeamId);
  const nextOpponent = teams.find(t => t.id !== userTeamId); // Simplified: Always play against 2nd team for demo

  // --- Actions ---
  const goToMatch = () => {
    setView(View.MATCH_PREVIEW);
  };

  const startMatch = () => {
    if (!userTeam || !nextOpponent) return;
    
    setView(View.MATCH_LIVE);
    setSimulationLog([]);
    
    // Simulate immediately logic-wise, but show it progressively
    const result = simulateMatch(userTeam, nextOpponent);
    setMatchResult(result);

    // Visual Simulation loop
    let eventIndex = 0;
    const interval = setInterval(() => {
      if (eventIndex >= result.events.length) {
        clearInterval(interval);
        setTimeout(() => {
           // Post-match logic: Update tables
           handleMatchEnd(result);
        }, 2000);
        return;
      }

      const event = result.events[eventIndex];
      setSimulationLog(prev => [...prev, `${event.minute}' ${event.description}`]);
      eventIndex++;
    }, 1000); // 1 second per event
  };

  const handleMatchEnd = (result: MatchResult) => {
    // Update standings
    const newTeams = [...teams];
    const home = newTeams.find(t => t.id === result.homeTeamId);
    const away = newTeams.find(t => t.id === result.awayTeamId);

    if (home && away) {
      if (result.homeScore > result.awayScore) {
        home.wins++; home.points += 3;
        away.losses++;
      } else if (result.awayScore > result.homeScore) {
        away.wins++; away.points += 3;
        home.losses++;
      } else {
        home.draws++; home.points += 1;
        away.draws++; away.points += 1;
      }
      home.goalDiff += (result.homeScore - result.awayScore);
      away.goalDiff += (result.awayScore - result.homeScore);
    }

    setTeams(newTeams);
    setCurrentWeek(w => w + 1);
    saveGame(newTeams, userTeamId, currentWeek + 1);
    setView(View.DASHBOARD);
  };

  const trainPlayer = (playerId: string) => {
    if (!userTeam) return;
    const newTeams = teams.map(t => {
      if (t.id === userTeamId) {
        return {
          ...t,
          players: t.players.map(p => {
            if (p.id === playerId && p.energy > 20) {
              return {
                ...p,
                overall: Math.min(99, p.overall + 1), // Simple training logic
                energy: p.energy - 10
              };
            }
            return p;
          })
        };
      }
      return t;
    });
    setTeams(newTeams);
  };

  // --- Render Views ---

  if (view === View.HOME) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
        <div className="relative z-10 max-w-md w-full text-center space-y-8">
          <div>
            <h1 className="text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">MFM</h1>
            <p className="text-xl text-slate-300 font-light tracking-widest mt-2">MAKE FOOTBALL MANAGER</p>
          </div>
          
          <div className="space-y-4">
            <Button onClick={startNewCareer} className="w-full py-4 text-lg bg-blue-600 hover:bg-blue-500">START CAREER</Button>
            {teams.length > 0 && (
              <Button onClick={() => setView(View.DASHBOARD)} variant="secondary" className="w-full py-4">CONTINUE CAREER</Button>
            )}
            <Button variant="outline" className="w-full py-4">SETTINGS</Button>
          </div>
          
          <p className="text-slate-500 text-xs mt-8">v1.0.0 • React Simulation Engine</p>
        </div>
      </div>
    );
  }

  // --- Layout for In-Game Views ---
  const SidebarItem: React.FC<{ icon: any, label: string, target: View }> = ({ icon: Icon, label, target }) => (
    <button 
      onClick={() => setView(target)}
      className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${view === target ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}
    >
      <Icon size={24} className="mb-1" />
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-900 pb-24 md:pb-0 md:pl-24">
      {/* Mobile/Desktop Sidebar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:right-auto md:w-24 bg-slate-900/95 backdrop-blur border-t md:border-t-0 md:border-r border-slate-800 z-50 flex md:flex-col justify-around md:justify-center gap-1 md:gap-6 p-2 md:p-6">
        <SidebarItem icon={Home} label="Home" target={View.DASHBOARD} />
        <SidebarItem icon={Users} label="Squad" target={View.SQUAD} />
        <SidebarItem icon={ClipboardList} label="Tactics" target={View.TACTICS} />
        <SidebarItem icon={TrendingUp} label="Market" target={View.TRANSFERS} />
        <SidebarItem icon={Trophy} label="League" target={View.LEAGUE} />
      </nav>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* --- DASHBOARD VIEW --- */}
        {view === View.DASHBOARD && userTeam && (
          <div className="space-y-6 animate-fadeIn">
            <Header 
              title={userTeam.name} 
              subtitle={`Season 2024 - Week ${currentWeek}`}
              rightAction={<div className="bg-slate-800 px-4 py-2 rounded-full border border-slate-700"><MoneyDisplay amount={userTeam.budget} /></div>} 
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Next Match Card */}
              <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 to-slate-900 border border-blue-800 p-6 flex flex-col justify-between h-64">
                <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                <div>
                   <h3 className="text-blue-400 font-bold tracking-widest text-sm uppercase mb-2">Next Match</h3>
                   <div className="flex items-center gap-6">
                      <div className="text-4xl font-display font-bold">{userTeam.name}</div>
                      <div className="text-2xl text-slate-500 font-display">VS</div>
                      <div className="text-4xl font-display font-bold text-slate-400">{nextOpponent?.name || 'BYE'}</div>
                   </div>
                </div>
                <div className="flex gap-3 mt-4 relative z-10">
                  <Button onClick={goToMatch} className="flex-1">PLAY MATCH</Button>
                  <Button variant="secondary" onClick={() => {}} className="flex-1">SIMULATE</Button>
                </div>
              </div>

              {/* Quick Stats */}
              <Card title="Club Status" className="h-64 flex flex-col justify-center gap-4">
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">Overall</span>
                  <span className="text-2xl font-bold text-white">84</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">Board Trust</span>
                  <span className="text-2xl font-bold text-green-400">92%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">Fans</span>
                  <span className="text-2xl font-bold text-blue-400">45.2K</span>
                </div>
              </Card>
            </div>

            {/* Top Players */}
            <div>
              <h3 className="text-xl font-display font-bold text-white mb-4">Key Players</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 {userTeam.players.slice(0, 4).map(p => <PlayerCard key={p.id} player={p} />)}
              </div>
            </div>
          </div>
        )}

        {/* --- SQUAD VIEW --- */}
        {view === View.SQUAD && userTeam && (
          <div className="space-y-6">
            <Header title="Squad Management" subtitle={`${userTeam.players.length} Players`} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {userTeam.players.sort((a,b) => b.overall - a.overall).map(p => (
                <div key={p.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700">
                  <PlayerCard player={p} compact />
                  <div className="flex gap-2">
                    <Button onClick={() => trainPlayer(p.id)} variant="secondary" className="text-xs py-2 px-3">TRAIN</Button>
                    <Button variant="outline" className="text-xs py-2 px-3">DETAILS</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- MATCH LIVE VIEW --- */}
        {view === View.MATCH_LIVE && (
          <div className="max-w-3xl mx-auto pt-10 text-center">
             <div className="mb-12">
               <h2 className="text-slate-400 font-bold text-lg mb-2">CHAMPIONS LEAGUE</h2>
               <div className="flex justify-center items-center gap-12">
                 <div className="text-center">
                    <div className="text-5xl font-display font-bold mb-2">{matchResult?.homeScore || 0}</div>
                    <div className="text-xl font-bold text-blue-400">{userTeam?.name}</div>
                 </div>
                 <div className="text-xl font-mono bg-slate-800 px-4 py-1 rounded text-slate-500">
                    {simulationLog.length > 0 ? (simulationLog.length < 90 ? `${simulationLog.length}'` : 'FT') : "0'"}
                 </div>
                 <div className="text-center">
                    <div className="text-5xl font-display font-bold mb-2 text-slate-500">{matchResult?.awayScore || 0}</div>
                    <div className="text-xl font-bold text-slate-400">{nextOpponent?.name}</div>
                 </div>
               </div>
             </div>

             <div className="bg-slate-800 rounded-2xl p-6 h-96 overflow-y-auto border border-slate-700 text-left space-y-3 shadow-inner">
                {simulationLog.length === 0 && <p className="text-center text-slate-500 animate-pulse">Kick off...</p>}
                {[...simulationLog].reverse().map((log, i) => (
                  <div key={i} className="flex gap-4 items-start border-b border-slate-700/50 pb-2 last:border-0 animate-fadeIn">
                     <span className="text-blue-500 font-bold font-mono w-8">{log.split(' ')[0]}</span>
                     <span className="text-slate-300">{log.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
             </div>
             
             {simulationLog.length >= (matchResult?.events.length || 0) && (
               <Button onClick={() => setView(View.DASHBOARD)} className="mt-8 w-full py-4 animate-bounce">CONTINUE</Button>
             )}
          </div>
        )}

        {/* --- MATCH PREVIEW VIEW --- */}
        {view === View.MATCH_PREVIEW && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
             <h1 className="text-4xl font-display font-bold">MATCH DAY</h1>
             <div className="flex gap-8 items-center">
               <div className="bg-blue-600 w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold shadow-xl shadow-blue-900/50">
                 {userTeam?.name[0]}
               </div>
               <span className="text-2xl font-bold text-slate-500">VS</span>
               <div className="bg-slate-700 w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold border-4 border-slate-600">
                 {nextOpponent?.name[0]}
               </div>
             </div>
             <p className="text-slate-400 max-w-md text-center">
               Your opponent plays a {nextOpponent?.tactics.formation} formation with {nextOpponent?.tactics.style} style. 
               Ensure your midfield is reinforced.
             </p>
             <Button onClick={startMatch} className="px-12 py-4 text-xl">KICK OFF</Button>
          </div>
        )}

        {/* --- TACTICS VIEW --- */}
        {view === View.TACTICS && userTeam && (
          <div className="space-y-8">
            <Header title="Tactical Setup" />
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Pitch Visualization (Abstract) */}
              <div className="flex-1 bg-green-900/20 border border-green-800 rounded-xl aspect-[3/4] lg:aspect-[4/3] relative p-4">
                 <div className="absolute inset-4 border-2 border-green-800/50 rounded-lg"></div>
                 <div className="absolute top-1/2 left-0 right-0 h-px bg-green-800/50"></div>
                 <div className="absolute top-1/2 left-1/2 w-24 h-24 -ml-12 -mt-12 rounded-full border border-green-800/50"></div>
                 
                 {/* Simple Formation Dots */}
                 <div className="absolute inset-0 flex flex-col justify-around py-8 items-center">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 border-2 border-slate-900 shadow-xl z-10" title="GK"></div>
                    {Array.from({length: FORMATIONS_CONFIG[userTeam.tactics.formation].def}).map((_, i) => <div key={`d-${i}`} className="w-8 h-8 rounded-full bg-blue-500 border-2 border-slate-900 shadow-xl z-10"></div>)}
                    {Array.from({length: FORMATIONS_CONFIG[userTeam.tactics.formation].mid}).map((_, i) => <div key={`m-${i}`} className="w-8 h-8 rounded-full bg-green-500 border-2 border-slate-900 shadow-xl z-10"></div>)}
                    {Array.from({length: FORMATIONS_CONFIG[userTeam.tactics.formation].att}).map((_, i) => <div key={`a-${i}`} className="w-8 h-8 rounded-full bg-red-500 border-2 border-slate-900 shadow-xl z-10"></div>)}
                 </div>
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-6">
                <Card title="Formation">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(Formation).map(f => (
                      <button 
                        key={f}
                        onClick={() => {
                          const newTeams = [...teams];
                          const t = newTeams.find(x => x.id === userTeamId);
                          if(t) t.tactics.formation = f;
                          setTeams(newTeams);
                        }}
                        className={`p-3 rounded-lg font-bold border ${userTeam.tactics.formation === f ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card title="Play Style">
                   <div className="space-y-4">
                     <div className="flex justify-between">
                       <span className="text-slate-300">Style</span>
                       <span className="font-bold text-blue-400">{userTeam.tactics.style}</span>
                     </div>
                     <input type="range" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                     
                     <div className="flex justify-between">
                       <span className="text-slate-300">Intensity</span>
                       <span className="font-bold text-red-400">{userTeam.tactics.intensity}</span>
                     </div>
                     <input type="range" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                   </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* --- LEAGUE VIEW --- */}
        {view === View.LEAGUE && (
          <div className="space-y-6">
            <Header title="League Table" />
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Pos</th>
                    <th className="p-4 font-semibold">Club</th>
                    <th className="p-4 font-semibold text-center">P</th>
                    <th className="p-4 font-semibold text-center">W</th>
                    <th className="p-4 font-semibold text-center">D</th>
                    <th className="p-4 font-semibold text-center">L</th>
                    <th className="p-4 font-semibold text-center">GD</th>
                    <th className="p-4 font-semibold text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {[...teams].sort((a,b) => b.points - a.points || b.goalDiff - a.goalDiff).map((team, index) => (
                    <tr key={team.id} className={`${team.id === userTeamId ? 'bg-blue-900/20' : ''} hover:bg-slate-700/30 transition-colors`}>
                      <td className="p-4 font-mono text-slate-500">{index + 1}</td>
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs">{team.name[0]}</div>
                        {team.name}
                      </td>
                      <td className="p-4 text-center text-slate-400 font-mono">{team.wins + team.draws + team.losses}</td>
                      <td className="p-4 text-center text-slate-400 font-mono">{team.wins}</td>
                      <td className="p-4 text-center text-slate-400 font-mono">{team.draws}</td>
                      <td className="p-4 text-center text-slate-400 font-mono">{team.losses}</td>
                      <td className="p-4 text-center text-slate-400 font-mono">{team.goalDiff}</td>
                      <td className="p-4 text-center font-bold text-white font-mono">{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
