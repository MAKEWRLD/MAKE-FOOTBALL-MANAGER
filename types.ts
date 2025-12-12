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
  FULL_TIME = 'END'
}

// Interfaces
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
  wage: number;
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
}
