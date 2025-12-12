import { Player, Team, Position, MatchResult, MatchEventType, Tactics, Formation, MatchEvent } from '../types';
import { FIRST_NAMES, LAST_NAMES, TEAM_NAMES, POSITIONS_WEIGHTS, FORMATIONS_CONFIG } from '../constants';

// --- Generators ---

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generatePlayer = (minOvr: number = 50, maxOvr: number = 90, position?: Position): Player => {
  const pos = position || (Object.keys(POSITIONS_WEIGHTS)[randomInt(0, 3)] as Position);
  const age = randomInt(16, 34);
  const baseOvr = randomInt(minOvr, maxOvr);
  const potential = Math.min(99, baseOvr + randomInt(0, 15));
  
  // Simple stat distribution based on pos
  const stats = {
    pac: randomInt(40, 99),
    sho: randomInt(30, 99),
    pas: randomInt(40, 99),
    dri: randomInt(40, 99),
    def: randomInt(20, 90),
    phy: randomInt(40, 95),
  };

  // Adjust stats for realism
  if (pos === Position.DEF) { stats.def += 10; stats.phy += 5; stats.sho -= 10; }
  if (pos === Position.ATT) { stats.sho += 10; stats.pac += 5; stats.def -= 15; }
  if (pos === Position.GK) { /* GK stats logic simplified for demo */ }

  const value = Math.floor(baseOvr * baseOvr * 100 * (1 + (potential - baseOvr) * 0.1));
  const wage = Math.floor(value * 0.005);

  return {
    id: crypto.randomUUID(),
    name: `${FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)]}`,
    age,
    position: pos,
    overall: baseOvr,
    potential,
    morale: randomInt(70, 100),
    energy: randomInt(90, 100),
    value,
    wage,
    stats,
    seasonStats: { goals: 0, assists: 0, matches: 0 }
  };
};

export const generateTeam = (name: string): Team => {
  const players: Player[] = [];
  // Generate a balanced squad
  for (let i = 0; i < 3; i++) players.push(generatePlayer(70, 85, Position.GK));
  for (let i = 0; i < 7; i++) players.push(generatePlayer(70, 88, Position.DEF));
  for (let i = 0; i < 7; i++) players.push(generatePlayer(70, 89, Position.MID));
  for (let i = 0; i < 5; i++) players.push(generatePlayer(70, 90, Position.ATT));

  return {
    id: crypto.randomUUID(),
    name,
    primaryColor: '#3b82f6', // blue-500
    secondaryColor: '#1e293b', // slate-800
    players,
    tactics: { formation: Formation.F433, intensity: 'Normal', style: 'Possession' },
    budget: 50000000, // 50M
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    goalDiff: 0
  };
};

export const initializeLeague = (): Team[] => {
  return TEAM_NAMES.map(name => generateTeam(name));
};

// --- Simulation Engine ---

const getTeamStrength = (team: Team) => {
  // Sort by overall and take top 11
  const best11 = [...team.players].sort((a, b) => b.overall - a.overall).slice(0, 11);
  const avgOvr = best11.reduce((sum, p) => sum + p.overall, 0) / 11;
  return avgOvr;
};

export const simulateMatch = (home: Team, away: Team): MatchResult => {
  const homeStr = getTeamStrength(home);
  const awayStr = getTeamStrength(away);
  
  // Tactical Influence
  let homeAdvantage = 5; // Home field advantage
  if (home.tactics.intensity === 'High') homeAdvantage += 2;
  
  const diff = (homeStr + homeAdvantage) - awayStr;
  
  // Determine goals based on strength difference
  // Base goals for match
  let homeGoals = 0;
  let awayGoals = 0;
  
  const baseChance = 1.3; // Avg goals per team
  const diffFactor = 0.05; // Goals per OVR point diff

  const homeExpected = Math.max(0, baseChance + (diff * diffFactor));
  const awayExpected = Math.max(0, baseChance - (diff * diffFactor));

  // Poisson-like distribution simulation
  homeGoals = Math.floor(homeExpected + (Math.random() * 2 - 0.5));
  awayGoals = Math.floor(awayExpected + (Math.random() * 2 - 0.5));
  
  // Sanity check
  if(homeGoals < 0) homeGoals = 0;
  if(awayGoals < 0) awayGoals = 0;

  const events: MatchEvent[] = [];
  
  // Generate Event Log
  for (let i = 0; i < homeGoals; i++) {
    events.push({
      minute: randomInt(1, 90),
      type: MatchEventType.GOAL,
      description: `GOAL! ${home.name} scores!`,
      teamId: home.id
    });
  }
  for (let i = 0; i < awayGoals; i++) {
    events.push({
      minute: randomInt(1, 90),
      type: MatchEventType.GOAL,
      description: `GOAL! ${away.name} strikes back!`,
      teamId: away.id
    });
  }

  // Add random flavor events
  const flavorCount = randomInt(2, 5);
  for(let i=0; i<flavorCount; i++) {
    const isHome = Math.random() > 0.5;
    const team = isHome ? home : away;
    events.push({
      minute: randomInt(1, 90),
      type: MatchEventType.MISS,
      description: `Close call for ${team.name}! Hit the post.`,
      teamId: team.id
    });
  }

  events.sort((a, b) => a.minute - b.minute);

  return {
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore: homeGoals,
    awayScore: awayGoals,
    events,
    stats: {
      homePossession: 50 + diff,
      awayPossession: 50 - diff,
      homeShots: homeGoals + randomInt(2, 8),
      awayShots: awayGoals + randomInt(2, 8)
    }
  };
};
