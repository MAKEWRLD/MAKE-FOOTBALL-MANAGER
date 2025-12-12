import React, { useState, useEffect, useCallback } from 'react';
import { Users, ClipboardList, Trophy, Settings, TrendingUp, Home, ArrowRight, PlayCircle, SkipForward, Landmark, ShoppingBag, UserMinus, UserPlus, Newspaper, FileSignature, Dumbbell, Activity } from 'lucide-react';
import { Player, Team, MatchResult, MatchEventType, Formation, MatchEvent, NewsItem, NewsType } from './types';
import { initializeLeague, simulateMatch, generatePlayer, generateTransferMarket, generateMatchNews } from './services/engine';
import { Button, Card, Header, PlayerCard, MoneyDisplay, NewsCard } from './components/components';
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
  FINANCES = 'FINANCES',
  NEWS = 'NEWS',
  TRAINING = 'TRAINING'
}

// Helper to format currency
const formatMoney = (n: number) => `$${(n / 1000000).toFixed(2)}M`;

const App: React.FC = () => {
  // --- Global State ---
  const [view, setView] = useState<View>(View.HOME);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeamId, setUserTeamId] = useState<string>('');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [simulationLog, setSimulationLog] = useState<MatchEvent[]>([]); 
  const [transferMarket, setTransferMarket] = useState<Player[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  
  // Contract Negotiation State
  const [negotiatingPlayer, setNegotiatingPlayer] = useState<Player | null>(null);
  const [offerWage, setOfferWage] = useState(0);
  const [offerLength, setOfferLength] = useState(1);
  
  // --- Initialization ---
  useEffect(() => {
    // Check local storage for save game
    const saved = localStorage.getItem('MFM_SAVE_V5'); // Incremented version
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setTeams(data.teams);
        setUserTeamId(data.userTeamId);
        setCurrentWeek(data.currentWeek);
        setTransferMarket(data.transferMarket || generateTransferMarket(15));
        setNews(data.news || []);
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  }, []);

  const startNewCareer = () => {
    const newTeams = initializeLeague();
    setTeams(newTeams);
    setUserTeamId(newTeams[0].id); 
    setCurrentWeek(1);
    const initialMarket = generateTransferMarket(20);
    setTransferMarket(initialMarket);
    
    // Welcome News
    const welcomeNews: NewsItem = {
      id: crypto.randomUUID(),
      week: 1,
      type: NewsType.CLUB,
      title: 'New Manager Appointed!',
      content: `The board has officially announced the appointment of a new manager at ${newTeams[0].name}. Fans are excited to see what the future holds for the club under this new leadership.`,
      timestamp: Date.now()
    };
    setNews([welcomeNews]);
    
    setView(View.DASHBOARD);
    saveGame(newTeams, newTeams[0].id, 1, initialMarket, [welcomeNews]);
  };

  const saveGame = (currentTeams: Team[], uId: string, week: number, market: Player[], currentNews: NewsItem[]) => {
    localStorage.setItem('MFM_SAVE_V5', JSON.stringify({
      teams: currentTeams,
      userTeamId: uId,
      currentWeek: week,
      transferMarket: market,
      news: currentNews
    }));
  };

  // --- Derived State ---
  const userTeam = teams.find(t => t.id === userTeamId);
  const nextOpponent = teams.find(t => t.id !== userTeamId); 

  // --- Actions ---
  const goToMatch = () => {
    setView(View.MATCH_PREVIEW);
  };

  const startMatch = () => {
    if (!userTeam || !nextOpponent) return;
    
    setView(View.MATCH_LIVE);
    setSimulationLog([]);
    
    const result = simulateMatch(userTeam, nextOpponent);
    setMatchResult(result);

    let eventIndex = 0;
    const interval = setInterval(() => {
      if (eventIndex >= result.events.length) {
        clearInterval(interval);
        setTimeout(() => {
           handleMatchEnd(result);
        }, 2000);
        return;
      }

      const event = result.events[eventIndex];
      setSimulationLog(prev => [...prev, event]);
      eventIndex++;
    }, 600); 
  };

  const handleMatchEnd = (result: MatchResult) => {
    const home = teams.find(t => t.id === result.homeTeamId);
    const away = teams.find(t => t.id === result.awayTeamId);
    let newNews = [...news];
    
    if (home && away) {
       const matchReport = generateMatchNews(result, currentWeek, home, away);
       newNews = [matchReport, ...newNews];
    }

    const newTeams = teams.map(team => {
      // Create deep copy
      let t = { ...team, players: team.players.map(p => ({ ...p, detailedStats: {...p.detailedStats} })) };
      
      // Update Results
      if (t.id === result.homeTeamId) {
         if (result.homeScore > result.awayScore) { t.wins++; t.points += 3; }
         else if (result.awayScore > result.homeScore) { t.losses++; }
         else { t.draws++; t.points += 1; }
         t.goalDiff += (result.homeScore - result.awayScore);
         
         if (t.id === userTeamId) {
             const ticketPrice = 50;
             const attendance = 10000 * (t.stadiumLevel || 1); 
             t.budget += attendance * ticketPrice;
             t.budget -= t.players.reduce((acc, p) => acc + p.wage, 0); // Weekly wage
         }
      } 
      else if (t.id === result.awayTeamId) {
         if (result.awayScore > result.homeScore) { t.wins++; t.points += 3; }
         else if (result.homeScore > result.awayScore) { t.losses++; }
         else { t.draws++; t.points += 1; }
         t.goalDiff += (result.awayScore - result.homeScore);
      }

      // Apply Fatigue & Recovery & Injury Healing
      if (t.id === result.homeTeamId || t.id === result.awayTeamId) {
         // Determine fatigue rate based on intensity
         const fatigueMult = t.tactics.intensity === 'High' ? 1.5 : (t.tactics.intensity === 'Low' ? 0.7 : 1.0);

         const sortedPlayers = [...t.players].filter(p => !p.isInjured).sort((a,b) => b.overall - a.overall);
         
         // Starters
         for (let i = 0; i < 11; i++) {
            if (sortedPlayers[i]) {
              const fatigue = Math.floor((Math.random() * 10 + 5) * fatigueMult);
              sortedPlayers[i].energy = Math.max(0, sortedPlayers[i].energy - fatigue);
            }
         }
         // Bench/Rest
         t.players.forEach(p => {
             // Healing
             if (p.isInjured) {
                 p.injuryDuration -= 1;
                 if (p.injuryDuration <= 0) {
                     p.isInjured = false;
                     p.injuryDuration = 0;
                 }
             } else {
                // Recovery if not starter (simplified check)
                const isStarter = sortedPlayers.slice(0, 11).find(s => s.id === p.id);
                if (!isStarter) {
                    p.energy = Math.min(100, p.energy + 15);
                }
             }
         });
      } else {
         // Teams that didn't play recover
         t.players.forEach(p => {
             p.energy = Math.min(100, p.energy + 15);
             if (p.isInjured) {
                 p.injuryDuration -= 1;
                 if (p.injuryDuration <= 0) p.isInjured = false;
             }
         });
      }

      // Handle Contract Expiration at end of season (Week 38)
      // For demo, we just simulate contracts ticking down yearly in a real game, 
      // here we won't auto-decrement week by week to keep it simple, 
      // but in a full game, week 52 -> week 1, contractLength--.
      
      return t;
    });

    let newMarket = [...transferMarket];
    if (currentWeek % 4 === 0) {
      newMarket = generateTransferMarket(20);
    }

    setTeams(newTeams);
    setTransferMarket(newMarket);
    setNews(newNews);
    setCurrentWeek(w => w + 1);
    saveGame(newTeams, userTeamId, currentWeek + 1, newMarket, newNews);
    setView(View.DASHBOARD);
  };

  // --- Training System ---
  const handleTrain = (drillType: 'PHYSICAL' | 'TECHNICAL' | 'TACTICAL') => {
    if (!userTeam) return;

    const newTeams = teams.map(t => {
      if (t.id === userTeamId) {
        return {
          ...t,
          players: t.players.map(p => {
            if (p.isInjured) return p;

            // Energy Cost
            const energyCost = 15;
            
            // Injury Risk
            if (p.energy < 30) {
                if (Math.random() < 0.2) { // 20% risk if tired
                    return { ...p, isInjured: true, injuryDuration: Math.floor(Math.random() * 4) + 1, energy: Math.max(0, p.energy - energyCost) };
                }
            }

            if (p.energy < energyCost) return p;

            const newDetailed = { ...p.detailedStats };
            let growth = 0;

            // Attribute Growth based on Drill
            const boost = (stat: number) => Math.min(99, stat + (p.potential > p.overall ? 1 : 0));

            if (drillType === 'PHYSICAL') {
                newDetailed.stamina = boost(newDetailed.stamina);
                newDetailed.strength = boost(newDetailed.strength);
                newDetailed.sprintSpeed = boost(newDetailed.sprintSpeed);
                growth = 0.3;
            } else if (drillType === 'TECHNICAL') {
                newDetailed.ballControl = boost(newDetailed.ballControl);
                newDetailed.dribbling = boost(newDetailed.dribbling);
                newDetailed.shortPassing = boost(newDetailed.shortPassing);
                newDetailed.finishing = boost(newDetailed.finishing);
                growth = 0.3;
            } else {
                newDetailed.positioning = boost(newDetailed.positioning);
                newDetailed.interceptions = boost(newDetailed.interceptions);
                newDetailed.vision = boost(newDetailed.vision);
                growth = 0.3;
            }

            // Recalculate Overall (Simplified)
            const newOverall = Math.min(p.potential, p.overall + (Math.random() < growth ? 1 : 0));

            return {
              ...p,
              detailedStats: newDetailed,
              overall: newOverall,
              energy: p.energy - energyCost
            };
          })
        };
      }
      return t;
    });
    setTeams(newTeams);
    alert("Training Session Complete!");
  };

  // --- Contract System ---
  const openContractNegotiation = (player: Player) => {
      setNegotiatingPlayer(player);
      setOfferWage(player.wage); // Start with current wage
      setOfferLength(2);
  };

  const submitContractOffer = () => {
      if (!negotiatingPlayer || !userTeam) return;

      // Acceptance Logic
      // Factors: Morale, Offer Value vs Market Value, Length
      const marketWage = negotiatingPlayer.value * 0.005;
      const wageRatio = offerWage / marketWage;
      
      let chance = 0.5; // Base
      chance += (negotiatingPlayer.morale - 50) / 200; // +0.25 if high morale
      if (wageRatio > 1.2) chance += 0.4;
      else if (wageRatio > 1.0) chance += 0.2;
      else if (wageRatio < 0.8) chance -= 0.5;
      
      if (Math.random() < chance) {
          // Accepted
          const newTeams = teams.map(t => {
              if (t.id === userTeamId) {
                  return {
                      ...t,
                      players: t.players.map(p => {
                          if (p.id === negotiatingPlayer.id) {
                              return { ...p, wage: offerWage, contractLength: p.contractLength + offerLength, morale: Math.min(100, p.morale + 10) };
                          }
                          return p;
                      })
                  };
              }
              return t;
          });
          setTeams(newTeams);
          setNegotiatingPlayer(null);
          alert(`${negotiatingPlayer.name} accepted the contract offer!`);
      } else {
          // Rejected
          const newTeams = teams.map(t => {
            if (t.id === userTeamId) {
                return {
                    ...t,
                    players: t.players.map(p => {
                        if (p.id === negotiatingPlayer.id) {
                            return { ...p, morale: Math.max(0, p.morale - 10) };
                        }
                        return p;
                    })
                };
            }
            return t;
          });
          setTeams(newTeams);
          alert(`${negotiatingPlayer.name} rejected the offer. They feel insulted by the terms.`);
      }
  };

  // --- Transfers ---
  const buyPlayer = (player: Player) => {
    if (!userTeam) return;
    if (userTeam.players.length >= 30) { alert("Squad is full!"); return; }
    if (userTeam.budget < player.value) { alert("Insufficient funds!"); return; }

    const newTeams = teams.map(t => {
      if (t.id === userTeamId) {
        return {
          ...t,
          budget: t.budget - player.value,
          players: [...t.players, { ...player, id: crypto.randomUUID(), contractLength: 3 }] 
        };
      }
      return t;
    });

    const newMarket = transferMarket.filter(p => p.id !== player.id);
    setTeams(newTeams);
    setTransferMarket(newMarket);
    saveGame(newTeams, userTeamId, currentWeek, newMarket, news);
  };

  const sellPlayer = (playerId: string) => {
    if (!userTeam) return;
    const player = userTeam.players.find(p => p.id === playerId);
    if (!player) return;

    const sellValue = Math.floor(player.value * 0.8);
    const newTeams = teams.map(t => {
      if (t.id === userTeamId) {
        return {
          ...t,
          budget: t.budget + sellValue,
          players: t.players.filter(p => p.id !== playerId)
        };
      }
      return t;
    });

    setTeams(newTeams);
    saveGame(newTeams, userTeamId, currentWeek, transferMarket, news);
  };
  
  const releasePlayer = (playerId: string) => {
    if (!userTeam) return;
    const player = userTeam.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Pay out remaining contract (simplified: 50% of remaining wages)
    const severance = player.wage * 52 * 0.5 * player.contractLength;
    
    if (userTeam.budget < severance) { alert(`Cannot afford severance package of ${formatMoney(severance)}`); return; }

    const newTeams = teams.map(t => {
        if (t.id === userTeamId) {
            return {
                ...t,
                budget: t.budget - severance,
                players: t.players.filter(p => p.id !== playerId)
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
          
          <p className="text-slate-500 text-xs mt-8">v1.4.0 • Tactics & Contracts</p>
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
    <div className="min-h-screen bg-slate-900 pb-24 md:pb-0 md:pl-24 relative">
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:right-auto md:w-24 bg-slate-900/95 backdrop-blur border-t md:border-t-0 md:border-r border-slate-800 z-50 flex md:flex-col justify-around md:justify-center gap-1 md:gap-6 p-2 md:p-6 overflow-x-auto">
        <SidebarItem icon={Home} label="Home" target={View.DASHBOARD} />
        <SidebarItem icon={Newspaper} label="News" target={View.NEWS} />
        <SidebarItem icon={Users} label="Squad" target={View.SQUAD} />
        <SidebarItem icon={Dumbbell} label="Train" target={View.TRAINING} />
        <SidebarItem icon={ClipboardList} label="Tactics" target={View.TACTICS} />
        <SidebarItem icon={ShoppingBag} label="Market" target={View.TRANSFERS} />
        <SidebarItem icon={Landmark} label="Finance" target={View.FINANCES} />
        <SidebarItem icon={Trophy} label="League" target={View.LEAGUE} />
      </nav>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        
        {/* CONTRACT NEGOTIATION MODAL */}
        {negotiatingPlayer && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-600 shadow-2xl">
                    <h2 className="text-2xl font-display font-bold mb-4">Contract Renewal</h2>
                    <p className="text-slate-400 mb-6">Negotiating with <span className="text-white font-bold">{negotiatingPlayer.name}</span></p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs uppercase text-slate-500 font-bold">Weekly Wage Offer</label>
                            <input 
                                type="range" 
                                min={negotiatingPlayer.wage * 0.5} 
                                max={negotiatingPlayer.wage * 3} 
                                step={1000}
                                value={offerWage} 
                                onChange={(e) => setOfferWage(parseInt(e.target.value))}
                                className="w-full mt-2"
                            />
                            <div className="text-right font-mono font-bold text-green-400 text-xl mt-1">{formatMoney(offerWage)} / wk</div>
                            <div className="text-xs text-slate-500 text-right">Current: {formatMoney(negotiatingPlayer.wage)}</div>
                        </div>

                        <div>
                            <label className="text-xs uppercase text-slate-500 font-bold">Extension Length (Years)</label>
                            <div className="flex gap-2 mt-2">
                                {[1, 2, 3, 4, 5].map(y => (
                                    <button 
                                        key={y}
                                        onClick={() => setOfferLength(y)}
                                        className={`flex-1 py-2 rounded font-bold ${offerLength === y ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                    >
                                        +{y}y
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => setNegotiatingPlayer(null)}>CANCEL</Button>
                            <Button className="flex-1" onClick={submitContractOffer}>SUBMIT OFFER</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- DASHBOARD VIEW --- */}
        {view === View.DASHBOARD && userTeam && (
          <div className="space-y-6 animate-fadeIn">
            <Header 
              title={userTeam.name} 
              subtitle={`Season 2024 - Week ${currentWeek}`}
              rightAction={<div className="bg-slate-800 px-4 py-2 rounded-full border border-slate-700 cursor-pointer hover:bg-slate-700 transition" onClick={() => setView(View.FINANCES)}><MoneyDisplay amount={userTeam.budget} /></div>} 
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
                  <span className="text-slate-400">Stadium Lvl</span>
                  <span className="text-2xl font-bold text-white">{userTeam.stadiumLevel || 1}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">Board Trust</span>
                  <span className="text-2xl font-bold text-green-400">92%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-400">Matches Played</span>
                  <span className="text-2xl font-bold text-blue-400">{userTeam.wins + userTeam.draws + userTeam.losses}</span>
                </div>
              </Card>
            </div>
            
            {/* Latest News Preview */}
            {news.length > 0 && (
              <div>
                <div className="flex justify-between items-end mb-4">
                   <h3 className="text-xl font-display font-bold text-white">Latest News</h3>
                   <Button variant="outline" className="text-xs py-2" onClick={() => setView(View.NEWS)}>READ ALL</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {news.slice(0, 2).map(item => (
                     <NewsCard key={item.id} news={item} />
                   ))}
                </div>
              </div>
            )}

            {/* Top Players */}
            <div>
              <div className="flex justify-between items-end mb-4">
                 <h3 className="text-xl font-display font-bold text-white">Top Rated Players</h3>
                 <Button variant="outline" className="text-xs py-2" onClick={() => setView(View.SQUAD)}>VIEW ALL</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 {userTeam.players.sort((a,b) => b.overall - a.overall).slice(0, 4).map(p => <PlayerCard key={p.id} player={p} />)}
              </div>
            </div>
          </div>
        )}

        {/* --- NEWS VIEW --- */}
        {view === View.NEWS && (
          <div className="space-y-6">
            <Header title="Daily Gazette" subtitle="All the latest football news" />
            {news.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Newspaper size={64} className="mx-auto mb-4 opacity-20" />
                <p>No news yet. Play matches or make transfers to generate headlines!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map(item => (
                  <NewsCard key={item.id} news={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- SQUAD VIEW --- */}
        {view === View.SQUAD && userTeam && (
          <div className="space-y-6">
            <Header title="Squad Management" subtitle={`${userTeam.players.length}/30 Players`} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {userTeam.players.sort((a,b) => b.overall - a.overall).map(p => (
                <div key={p.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700">
                  <PlayerCard player={p} compact showContract />
                  <div className="flex gap-2">
                    <Button onClick={() => openContractNegotiation(p)} variant="primary" className="text-xs py-2 px-3 bg-indigo-600 hover:bg-indigo-500"><FileSignature size={14} /></Button>
                    <Button onClick={() => sellPlayer(p.id)} variant="secondary" className="text-xs py-2 px-3">SELL</Button>
                    <Button onClick={() => releasePlayer(p.id)} variant="danger" className="text-xs py-2 px-3">RELEASE</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TRAINING VIEW --- */}
        {view === View.TRAINING && userTeam && (
            <div className="space-y-6">
                <Header title="Training Ground" subtitle="Improve your squad's abilities" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="Physical Session" className="border-t-4 border-t-yellow-500">
                        <p className="text-slate-400 text-sm mb-4">Focus on Stamina, Strength, and Sprint Speed. High energy cost.</p>
                        <Button onClick={() => handleTrain('PHYSICAL')} className="w-full">START DRILL</Button>
                    </Card>
                    <Card title="Technical Session" className="border-t-4 border-t-blue-500">
                        <p className="text-slate-400 text-sm mb-4">Improve Ball Control, Dribbling, Passing, and Finishing.</p>
                        <Button onClick={() => handleTrain('TECHNICAL')} className="w-full">START DRILL</Button>
                    </Card>
                    <Card title="Tactical Session" className="border-t-4 border-t-purple-500">
                        <p className="text-slate-400 text-sm mb-4">Enhance Positioning, Vision, and Defensive awareness.</p>
                        <Button onClick={() => handleTrain('TACTICAL')} className="w-full">START DRILL</Button>
                    </Card>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-900/20 p-3 rounded-full"><Activity className="text-red-500" /></div>
                        <div>
                            <h4 className="font-bold text-white mb-1">Injury Warning</h4>
                            <p className="text-slate-400 text-sm max-w-2xl">
                                Training depletes player energy significantly. Training players with low energy (&lt;30%) carries a 20% risk of injury. 
                                Ensure you rotate your squad or rest players before heavy sessions.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- TRANSFERS VIEW --- */}
        {view === View.TRANSFERS && userTeam && (
           <div className="space-y-6">
             <Header title="Transfer Market" subtitle="Sign new talent for your squad" rightAction={<div className="bg-slate-800 px-4 py-2 rounded-full border border-slate-700"><MoneyDisplay amount={userTeam.budget} /></div>} />
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {transferMarket.map(p => (
                  <div key={p.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 group hover:border-blue-500 transition-colors">
                     <div className="p-4">
                        <PlayerCard player={p} />
                        <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                           <div>
                              <p className="text-xs text-slate-400">Market Value</p>
                              <p className="text-lg font-bold text-white">{formatMoney(p.value)}</p>
                           </div>
                           <Button onClick={() => buyPlayer(p)} className="px-4 py-2">BUY</Button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           </div>
        )}

        {/* --- FINANCES VIEW --- */}
        {view === View.FINANCES && userTeam && (
          <div className="space-y-6">
             <Header title="Club Finances" subtitle="Manage Budget & Stadium" />
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Financial Overview">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-xl">
                         <span className="text-slate-400">Current Budget</span>
                         <span className="text-3xl font-bold text-green-400">{formatMoney(userTeam.budget)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-xl">
                         <span className="text-slate-400">Weekly Wage Bill</span>
                         <span className="text-xl font-bold text-red-400">-{formatMoney(userTeam.players.reduce((acc, p) => acc + p.wage, 0))}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-xl">
                         <span className="text-slate-400">Est. Match Income</span>
                         <span className="text-xl font-bold text-blue-400">+{formatMoney((userTeam.stadiumLevel || 1) * 10000 * 50)}</span>
                      </div>
                   </div>
                </Card>

                <Card title="Stadium & Facilities">
                   <div className="space-y-6">
                      <div className="relative h-48 bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
                         {/* Abstract Stadium Visual */}
                         <div className="absolute inset-0 flex items-center justify-center">
                             <div className="w-32 h-20 border-4 border-slate-600 rounded-lg relative">
                                <div className="absolute inset-2 border-2 border-slate-700 border-dashed rounded"></div>
                             </div>
                         </div>
                         <div className="absolute bottom-4 left-4">
                            <p className="text-white font-bold text-lg">Stadium Level {userTeam.stadiumLevel || 1}</p>
                            <p className="text-slate-400 text-sm">Capacity: {(userTeam.stadiumLevel || 1) * 10000} Fans</p>
                         </div>
                      </div>
                      
                      <Button 
                        onClick={() => {
                            const cost = (userTeam.stadiumLevel || 1) * 10000000;
                            if(userTeam.budget < cost) { alert("Insufficient Funds"); return; }
                            const newTeams = teams.map(t => t.id === userTeamId ? {...t, budget: t.budget - cost, stadiumLevel: t.stadiumLevel + 1} : t);
                            setTeams(newTeams);
                        }} 
                        className="w-full py-4 flex flex-col items-center gap-1"
                      >
                         <span>UPGRADE STADIUM</span>
                         <span className="text-xs opacity-70">Cost: {formatMoney((userTeam.stadiumLevel || 1) * 10000000)}</span>
                      </Button>
                   </div>
                </Card>
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
                    {simulationLog.length > 0 ? (simulationLog[simulationLog.length - 1].minute < 90 ? `${simulationLog[simulationLog.length - 1].minute}'` : 'FT') : "0'"}
                 </div>
                 <div className="text-center">
                    <div className="text-5xl font-display font-bold mb-2 text-slate-500">{matchResult?.awayScore || 0}</div>
                    <div className="text-xl font-bold text-slate-400">{nextOpponent?.name}</div>
                 </div>
               </div>
             </div>

             <div className="bg-slate-800 rounded-2xl p-6 h-96 overflow-y-auto border border-slate-700 text-left space-y-3 shadow-inner">
                {simulationLog.length === 0 && <p className="text-center text-slate-500 animate-pulse">Kick off...</p>}
                {[...simulationLog].reverse().map((event, i) => (
                  <div key={i} className="flex gap-4 items-center border-b border-slate-700/50 pb-2 last:border-0 animate-fadeIn">
                     <span className="text-slate-500 font-bold font-mono w-8 text-right">{event.minute}'</span>
                     
                     <div className="w-8 flex justify-center">
                       {event.type === MatchEventType.GOAL && <span className="text-xl">⚽</span>}
                       {event.type === MatchEventType.YELLOW_CARD && <div className="w-3 h-4 bg-yellow-400 rounded-sm"></div>}
                       {event.type === MatchEventType.RED_CARD && <div className="w-3 h-4 bg-red-600 rounded-sm"></div>}
                       {event.type === MatchEventType.SUBSTITUTION && <span className="text-xl">🔄</span>}
                       {event.type === MatchEventType.MISS && <span className="text-slate-600 text-sm">●</span>}
                     </div>

                     <span className={`flex-1 ${event.type === MatchEventType.GOAL ? 'text-white font-bold text-lg' : 'text-slate-300'}`}>
                        {event.description}
                     </span>
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
                     <div>
                       <div className="flex justify-between mb-2">
                         <span className="text-slate-300">Style</span>
                         <span className="font-bold text-blue-400">{userTeam.tactics.style}</span>
                       </div>
                       <div className="flex gap-2">
                           {['Possession', 'Counter', 'Long Ball'].map(s => (
                               <button 
                                key={s} 
                                onClick={() => {
                                    const newTeams = [...teams];
                                    const t = newTeams.find(x => x.id === userTeamId);
                                    if(t) t.tactics.style = s as any;
                                    setTeams(newTeams);
                                }}
                                className={`flex-1 text-xs py-2 rounded border ${userTeam.tactics.style === s ? 'bg-blue-600 border-blue-600' : 'border-slate-600'}`}
                               >
                                   {s}
                               </button>
                           ))}
                       </div>
                     </div>
                     
                     <div>
                       <div className="flex justify-between mb-2">
                         <span className="text-slate-300">Intensity (Pressing)</span>
                         <span className="font-bold text-red-400">{userTeam.tactics.intensity}</span>
                       </div>
                       <div className="flex gap-2">
                           {['Low', 'Normal', 'High'].map(s => (
                               <button 
                                key={s} 
                                onClick={() => {
                                    const newTeams = [...teams];
                                    const t = newTeams.find(x => x.id === userTeamId);
                                    if(t) t.tactics.intensity = s as any;
                                    setTeams(newTeams);
                                }}
                                className={`flex-1 text-xs py-2 rounded border ${userTeam.tactics.intensity === s ? 'bg-red-600 border-red-600' : 'border-slate-600'}`}
                               >
                                   {s}
                               </button>
                           ))}
                       </div>
                       <p className="text-[10px] text-slate-500 mt-2">
                           High Intensity increases fatigue significantly and risks more yellow/red cards, but forces opponent errors.
                       </p>
                     </div>
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