import { Position, Formation } from './types';

export const TEAM_NAMES = [
  "London FC", "Manchester Red", "Liverpool Mersey", "Madrid Royal", 
  "Barcelona Blau", "Munich Red", "Paris Saint", "Milan Red", 
  "Turin Zebra", "Dortmund Bee", "Ajax White", "Porto Blue"
];

export const FIRST_NAMES = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
  "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Donald",
  "Lionel", "Cristiano", "Kylian", "Erling", "Kevin", "Luka", "Harry", "Jude"
];

export const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Messi", "Ronaldo", "Mbappe", "Haaland", "De Bruyne", "Modric", "Kane", "Bellingham"
];

export const POSITIONS_WEIGHTS = {
  [Position.GK]: 0.1,
  [Position.DEF]: 0.35,
  [Position.MID]: 0.35,
  [Position.ATT]: 0.2
};

export const FORMATIONS_CONFIG = {
  [Formation.F433]: { def: 4, mid: 3, att: 3 },
  [Formation.F442]: { def: 4, mid: 4, att: 2 },
  [Formation.F352]: { def: 3, mid: 5, att: 2 },
  [Formation.F532]: { def: 5, mid: 3, att: 2 },
};
