// Enums
export enum Position {
  GK = 'GK',
  DEF = 'DEF',
  MID = 'MID',
  ATT = 'ATT'
}

export enum Formation {
  F433 = '4-3-3',
  F442 = '4-4-2',
  F352 = '3-5-2',
  F532 = '5-3-2'
}

export enum MatchEventType {
  GOAL = 'GOAL',
  MISS = 'MISS',
  YELLOW_CARD = 'YELLOW',
  RED_CARD = 'RED',
  HALF_TIME = 'HALF',
  FULL_TIME = 'END',
  SUBSTITUTION = 'SUB',
  INJURY = 'INJURY'
}

export enum NewsType {
  MATCH = 'MATCH',
  TRANSFER = 'TRANSFER',
  CLUB = 'CLUB',
  LEAGUE = 'LEAGUE'
}

// Interfaces
export interface NewsItem {
  id: string;
  week: number;
  type: NewsType;
  title: string;
  content: string;
  timestamp: number;
}

export interface DetailedStats {
  acceleration: number;
  sprintSpeed: number;
  agility: number;
  balance: number;
  stamina: number;
  strength: number;
  composure: number;
  positioning: number;
  vision: number;
  ballControl: number;
  dribbling: number;
  crossing: number;
  shortPassing: number;
  longPassing: number;
  finishing: number;
  shotPower: number;
  longShots: number;
  volleys: number;
  penalties: number;
  heading: number;
  marking: number;
  standingTackle: number;
  slidingTackle: number;
  interceptions: number;
  reflexes: number; // GK
  handling: number; // GK
}

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  overall: number;
  potential: number;
  morale: number; // 0-100
  energy: number; // 0-100
  value: number;
  
  // Contract
  wage: number;
  contractLength: number; // Years
  
  // Status
  isInjured: boolean;
  injuryDuration: number; // Weeks

  // Attributes
  detailedStats: DetailedStats;
  
  // Aggregated Stats (Calculated from detailed)
  stats: {
    pac: number;
    sho: number;
    pas: number;
    dri: number;
    def: number;
    phy: number;
  };
  
  seasonStats: {
    goals: number;
    assists: number;
    matches: number;
  };
}

export interface Team {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  players: Player[];
  tactics: Tactics;
  budget: number;
  stadiumLevel: number; // New: Supports stadium upgrades
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalDiff: number;
}

export interface Tactics {
  formation: Formation;
  intensity: 'Low' | 'Normal' | 'High';
  style: 'Possession' | 'Counter' | 'Long Ball';
}

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  description: string;
  teamId?: string; // which team caused it
}

export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: {
    homePossession: number;
    awayPossession: number;
    homeShots: number;
    awayShots: number;
  };
}

export interface GameState {
  currentWeek: number;
  userTeamId: string;
  league: Team[];
  history: MatchResult[];
  transferMarket: Player[];
  news: NewsItem[];
}