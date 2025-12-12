import { Player, Team, Position, MatchResult, MatchEventType, Tactics, Formation, MatchEvent, NewsItem, NewsType, DetailedStats } from '../types';
import { FIRST_NAMES, LAST_NAMES, TEAM_NAMES, POSITIONS_WEIGHTS, FORMATIONS_CONFIG } from '../constants';

// --- Generators ---

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generatePlayer = (minOvr: number = 50, maxOvr: number = 90, position?: Position): Player => {
  const pos = position || (Object.keys(POSITIONS_WEIGHTS)[randomInt(0, 3)] as Position);
  const age = randomInt(16, 34);
  const baseOvr = randomInt(minOvr, maxOvr);
  const potential = Math.min(99, baseOvr + randomInt(0, 15));
  
  // Generate Detailed Attributes centered around the baseOvr
  // We add variance based on position
  const genStat = (base: number, variance: number = 10) => Math.max(10, Math.min(99, base + randomInt(-variance, variance)));

  const d: DetailedStats = {
    acceleration: genStat(baseOvr),
    sprintSpeed: genStat(baseOvr),
    agility: genStat(baseOvr),
    balance: genStat(baseOvr - 5),
    stamina: genStat(baseOvr),
    strength: genStat(baseOvr),
    composure: genStat(baseOvr),
    positioning: genStat(baseOvr),
    vision: genStat(baseOvr),
    ballControl: genStat(baseOvr),
    dribbling: genStat(baseOvr),
    crossing: genStat(baseOvr),
    shortPassing: genStat(baseOvr),
    longPassing: genStat(baseOvr),
    finishing: genStat(baseOvr),
    shotPower: genStat(baseOvr),
    longShots: genStat(baseOvr),
    volleys: genStat(baseOvr - 10),
    penalties: genStat(baseOvr),
    heading: genStat(baseOvr),
    marking: genStat(baseOvr),
    standingTackle: genStat(baseOvr),
    slidingTackle: genStat(baseOvr),
    interceptions: genStat(baseOvr),
    reflexes: genStat(10),
    handling: genStat(10)
  };

  // Positional adjustments
  if (pos === Position.DEF) {
    d.marking += 15; d.standingTackle += 15; d.strength += 10; d.heading += 10;
    d.finishing -= 20; d.dribbling -= 10;
  } else if (pos === Position.MID) {
    d.shortPassing += 10; d.vision += 10; d.ballControl += 5; d.stamina += 10;
  } else if (pos === Position.ATT) {
    d.finishing += 15; d.positioning += 10; d.shotPower += 5;
    d.standingTackle -= 20; d.marking -= 20;
  } else if (pos === Position.GK) {
    // Reset outfield stats for GK, boost GK stats
    Object.keys(d).forEach(k => {
      if(k !== 'reflexes' && k !== 'handling') (d as any)[k] = randomInt(10, 40);
    });
    d.reflexes = genStat(baseOvr + 5);
    d.handling = genStat(baseOvr + 5);
  }

  // Calculate Aggregated Stats
  const stats = {
    pac: Math.floor((d.acceleration + d.sprintSpeed) / 2),
    sho: Math.floor((d.finishing + d.shotPower + d.longShots) / 3),
    pas: Math.floor((d.shortPassing + d.longPassing + d.crossing + d.vision) / 4),
    dri: Math.floor((d.dribbling + d.ballControl + d.agility) / 3),
    def: Math.floor((d.marking + d.standingTackle + d.interceptions) / 3),
    phy: Math.floor((d.strength + d.stamina + d.balance) / 3),
  };

  // Value calculation
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
    contractLength: randomInt(1, 4), // 1 to 4 years initially
    isInjured: false,
    injuryDuration: 0,
    detailedStats: d,
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
    stadiumLevel: 1, // Default stadium level
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

export const generateTransferMarket = (count: number): Player[] => {
  const market: Player[] = [];
  for (let i = 0; i < count; i++) {
    // Market players vary from decent to world class
    market.push(generatePlayer(75, 92));
  }
  return market;
};

export const generateMatchNews = (result: MatchResult, week: number, home: Team, away: Team): NewsItem => {
  let title = '';
  let content = '';

  const totalGoals = result.homeScore + result.awayScore;
  const scoreDiff = Math.abs(result.homeScore - result.awayScore);
  const winner = result.homeScore > result.awayScore ? home : (result.awayScore > result.homeScore ? away : null);
  const loser = winner === home ? away : home;

  if (winner) {
    if (scoreDiff >= 3) {
      title = `${winner.name} Destroys ${loser.name}!`;
      content = `Fans were left in awe as ${winner.name} put on a masterclass, completely dismantling ${loser.name} with a ${result.homeScore}-${result.awayScore} victory. A humiliating day for the opposition.`;
    } else if (totalGoals > 4) {
      title = `Goal Fest at ${home.name}!`;
      content = `Defenses were absent today as ${winner.name} edged out ${loser.name} in a ${result.homeScore}-${result.awayScore} thriller. The crowd certainly got their money's worth.`;
    } else if (scoreDiff === 1) {
      title = `Tight Victory for ${winner.name}`;
      content = `A tactical battle ended with ${winner.name} taking all three points against ${loser.name}. The solitary goal difference proved enough in a ${result.homeScore}-${result.awayScore} win.`;
    } else {
      title = `${winner.name} Beats ${loser.name}`;
      content = `${winner.name} secured a comfortable ${result.homeScore}-${result.awayScore} win against ${loser.name} in Week ${week}.`;
    }
  } else {
    if (totalGoals === 0) {
      title = `Bore Draw at ${home.name}`;
      content = `Neither ${home.name} nor ${away.name} could find the net in a frustrating 0-0 stalemate. Both managers will be looking for more creativity next week.`;
    } else {
      title = `Points Shared in ${result.homeScore}-${result.awayScore} Draw`;
      content = `${home.name} and ${away.name} fought hard but couldn't be separated. Both teams take a point from an entertaining draw.`;
    }
  }

  return {
    id: crypto.randomUUID(),
    week,
    type: NewsType.MATCH,
    title,
    content,
    timestamp: Date.now()
  };
};

// --- Simulation Engine ---

// Helper to calculate momentary effective strength of a single player
const getPlayerEffectiveRating = (player: Player) => {
  if (player.isInjured) return 0;
  
  // Energy factor: Below 50% energy, stats drop significantly
  const energyFactor = player.energy < 50 ? 0.7 : 0.5 + (player.energy / 200); // 0.5 to 1.0
  // Morale factor: 0-100 maps to 0.9 to 1.1
  const moraleFactor = 0.9 + (player.morale / 500); 
  
  return player.overall * energyFactor * moraleFactor;
};

interface SimPlayer extends Player {
  hasRed: boolean;
  hasYellow: boolean;
  isSubbedOut: boolean;
}

const getLineup = (t: Team): SimPlayer[] => {
  // Simple logic: Best 11 play, prioritizing healthy players
  return t.players.filter(p => !p.isInjured).sort((a,b) => b.overall - a.overall).slice(0, 11).map(p => ({
    ...p, hasRed: false, hasYellow: false, isSubbedOut: false
  }));
};

const getBench = (t: Team, starters: SimPlayer[]): SimPlayer[] => {
  const starterIds = new Set(starters.map(s => s.id));
  return t.players.filter(p => !starterIds.has(p.id) && !p.isInjured).sort((a,b) => b.overall - a.overall).slice(0, 7).map(p => ({
    ...p, hasRed: false, hasYellow: false, isSubbedOut: false
  }));
};

export const simulateMatch = (home: Team, away: Team): MatchResult => {
  const homeXI = getLineup(home);
  const homeBench = getBench(home, homeXI);
  const awayXI = getLineup(away);
  const awayBench = getBench(away, awayXI);

  let homeScore = 0;
  let awayScore = 0;
  let homeSubsUsed = 0;
  let awaySubsUsed = 0;
  
  const events: MatchEvent[] = [];
  
  // Tactical Modifiers & Fatigue Rates
  const getTacticalModifiers = (t: Team) => {
    let fatigueRate = 1;
    let attackBonus = 1;
    let defenseBonus = 1;
    let cardChanceMult = 1;

    // Intensity
    if (t.tactics.intensity === 'High') {
      fatigueRate = 1.5;
      attackBonus += 0.05; // High press creates chances
      cardChanceMult = 1.5;
    } else if (t.tactics.intensity === 'Low') {
      fatigueRate = 0.7;
      attackBonus -= 0.05;
      cardChanceMult = 0.5;
    }

    // Play Style
    if (t.tactics.style === 'Possession') {
      defenseBonus += 0.05; // Control game, less enemy chances
      attackBonus -= 0.02; // Slower buildup
    } else if (t.tactics.style === 'Counter') {
      defenseBonus -= 0.05; // Sit back, invite pressure
      attackBonus += 0.05; // Effective on breaks
    }

    return { fatigueRate, attackBonus, defenseBonus, cardChanceMult };
  };

  const homeTactics = getTacticalModifiers(home);
  const awayTactics = getTacticalModifiers(away);

  // Apply Fatigue to start (simplified for engine purpose, actual deduction happens after match)
  // Here we determine card aggression
  const homeAggression = 0.003 * homeTactics.cardChanceMult;
  const awayAggression = 0.003 * awayTactics.cardChanceMult;

  // Simulation Loop (Minute by Minute)
  for (let minute = 1; minute <= 90; minute++) {
    
    // 1. Calculate Team Strengths
    const getTeamStrength = (xi: SimPlayer[]) => {
      return xi.reduce((sum, p) => {
        if (p.hasRed || p.isSubbedOut) return sum;
        return sum + getPlayerEffectiveRating(p);
      }, 0);
    };

    // Apply tactical bonuses to effective strength
    const hStr = getTeamStrength(homeXI) * (1 + (home.stadiumLevel * 0.02)) * homeTactics.attackBonus; 
    const aStr = getTeamStrength(awayXI) * awayTactics.attackBonus;
    
    // Defense modifies opponent strength calculation implicitly by reducing their effective goal chance
    const hDef = getTeamStrength(homeXI) * homeTactics.defenseBonus;
    const aDef = getTeamStrength(awayXI) * awayTactics.defenseBonus;
    
    const totalStr = hStr + aStr;
    const homeDominance = hStr / totalStr; // 0.5 is equal
    
    // 2. Goal Event
    // Base chance is modified by how good the attack is vs the specific defense
    const homeGoalChance = 0.015 * (hStr / aDef);
    const awayGoalChance = 0.015 * (aStr / hDef);
    
    if (Math.random() < (homeGoalChance + awayGoalChance)) {
      // Determine scorer relative to chances
      const isHomeGoal = Math.random() < (homeGoalChance / (homeGoalChance + awayGoalChance));
      
      if (isHomeGoal) {
        homeScore++;
        const activeHome = homeXI.filter(p => !p.hasRed && !p.isSubbedOut);
        const scorer = activeHome[randomInt(0, activeHome.length - 1)]; 
        events.push({ minute, type: MatchEventType.GOAL, description: `GOAL! ${scorer.name} finds the net!`, teamId: home.id });
      } else {
        awayScore++;
        const activeAway = awayXI.filter(p => !p.hasRed && !p.isSubbedOut);
        const scorer = activeAway[randomInt(0, activeAway.length - 1)];
        events.push({ minute, type: MatchEventType.GOAL, description: `GOAL! ${scorer.name} scores for ${away.name}!`, teamId: away.id });
      }
      continue; 
    }

    // 3. Card Events
    if (Math.random() < homeAggression) {
        const active = homeXI.filter(p => !p.hasRed && !p.isSubbedOut);
        if (active.length > 0) {
            const culprit = active[randomInt(0, active.length - 1)];
            if (culprit.hasYellow) {
                 culprit.hasRed = true;
                 events.push({ minute, type: MatchEventType.RED_CARD, description: `RED CARD! ${culprit.name} (2nd Yellow)`, teamId: home.id });
            } else if (Math.random() < 0.1) {
                 culprit.hasRed = true;
                 events.push({ minute, type: MatchEventType.RED_CARD, description: `RED CARD! ${culprit.name} sent off!`, teamId: home.id });
            } else {
                 culprit.hasYellow = true;
                 events.push({ minute, type: MatchEventType.YELLOW_CARD, description: `Yellow Card for ${culprit.name}.`, teamId: home.id });
            }
        }
    }
    if (Math.random() < awayAggression) {
        const active = awayXI.filter(p => !p.hasRed && !p.isSubbedOut);
        if (active.length > 0) {
            const culprit = active[randomInt(0, active.length - 1)];
            if (culprit.hasYellow) {
                 culprit.hasRed = true;
                 events.push({ minute, type: MatchEventType.RED_CARD, description: `RED CARD! ${culprit.name} (2nd Yellow)`, teamId: away.id });
            } else if (Math.random() < 0.1) {
                 culprit.hasRed = true;
                 events.push({ minute, type: MatchEventType.RED_CARD, description: `RED CARD! ${culprit.name} sent off!`, teamId: away.id });
            } else {
                 culprit.hasYellow = true;
                 events.push({ minute, type: MatchEventType.YELLOW_CARD, description: `Yellow Card for ${culprit.name}.`, teamId: away.id });
            }
        }
    }

    // 4. Substitution Events
    if (minute > 60) {
       // Home Sub
       if (homeSubsUsed < 3 && Math.random() < 0.05) {
          const active = homeXI.filter(p => !p.hasRed && !p.isSubbedOut);
          active.sort((a,b) => a.energy - b.energy);
          const subOut = active[0];
          const subIn = homeBench[homeSubsUsed]; 
          
          if (subOut && subIn) {
             subOut.isSubbedOut = true;
             homeXI.push({...subIn, hasRed: false, hasYellow: false, isSubbedOut: false});
             homeSubsUsed++;
             events.push({ minute, type: MatchEventType.SUBSTITUTION, description: `SUB: ${subIn.name} ON, ${subOut.name} OFF`, teamId: home.id });
          }
       }
       // Away Sub
       if (awaySubsUsed < 3 && Math.random() < 0.05) {
          const active = awayXI.filter(p => !p.hasRed && !p.isSubbedOut);
          active.sort((a,b) => a.energy - b.energy);
          const subOut = active[0];
          const subIn = awayBench[awaySubsUsed];
          
          if (subOut && subIn) {
             subOut.isSubbedOut = true;
             awayXI.push({...subIn, hasRed: false, hasYellow: false, isSubbedOut: false});
             awaySubsUsed++;
             events.push({ minute, type: MatchEventType.SUBSTITUTION, description: `SUB: ${subIn.name} ON, ${subOut.name} OFF`, teamId: away.id });
          }
       }
    }
    
    // 5. Flavor Events
    if (Math.random() < 0.02) {
       const isHomeChance = Math.random() < homeDominance;
       const team = isHomeChance ? home : away;
       events.push({ minute, type: MatchEventType.MISS, description: `Chance for ${team.name}, but it goes wide.`, teamId: team.id });
    }
  }

  // Generate Stats
  const homeShots = homeScore + randomInt(2, 6);
  const awayShots = awayScore + randomInt(2, 6);
  
  // Possession affected by style
  let homePossBase = 50;
  if(home.tactics.style === 'Possession') homePossBase += 10;
  if(away.tactics.style === 'Possession') homePossBase -= 10;
  if(home.tactics.style === 'Counter') homePossBase -= 5;
  if(away.tactics.style === 'Counter') homePossBase += 5;
  
  // Adjust based on strength
  const finalHStr = homeXI.reduce((acc, p) => !p.hasRed && !p.isSubbedOut ? acc + p.overall : acc, 0);
  const finalAStr = awayXI.reduce((acc, p) => !p.hasRed && !p.isSubbedOut ? acc + p.overall : acc, 0);
  const totalStr = finalHStr + finalAStr;
  const strengthDiff = (finalHStr / totalStr) - 0.5; // -0.5 to 0.5
  
  const homePoss = Math.max(20, Math.min(80, Math.floor(homePossBase + (strengthDiff * 20))));

  return {
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore,
    awayScore,
    events,
    stats: {
      homePossession: homePoss,
      awayPossession: 100 - homePoss,
      homeShots,
      awayShots
    }
  };
};