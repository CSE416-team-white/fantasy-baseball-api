// Rookie averages by year and position, used as stand-in stats when a player
// is missing data for a given season.
// Hitter stats: ba, hr, rbi, walk, sb
// Pitcher stats: era, wins, losses, saves, strikeouts, innings
//
// Keep in sync with ryan-draft-kit-ui/src/features/Notebook/utils/rookieAverages.ts

type HitterStats = {
  ba: number;
  hr: number;
  rbi: number;
  walk: number;
  sb: number;
};
type PitcherStats = {
  era: number;
  wins: number;
  losses: number;
  saves: number;
  strikeouts: number;
  innings: number;
};

type RookieAveragesByPosition = {
  C: HitterStats;
  '1B': HitterStats;
  '2B': HitterStats;
  '3B': HitterStats;
  SS: HitterStats;
  OF: HitterStats;
  DH: HitterStats;
  SP: PitcherStats;
  RP: PitcherStats;
};

export const ROOKIE_AVERAGES: Record<string, RookieAveragesByPosition> = {
  // 2025: C computed from Baldwin, Teel, Rice, Narvaez, Dingler.
  // All other positions estimated from 2024 actuals with small forward adjustments.
  '2025': {
    C: { ba: 0.264, hr: 17.0, rbi: 60.0, walk: 42.3, sb: 2.0 },
    '1B': { ba: 0.238, hr: 11.2, rbi: 37.0, walk: 38.0, sb: 2.1 },
    '2B': { ba: 0.251, hr: 5.8, rbi: 31.0, walk: 18.5, sb: 6.4 },
    '3B': { ba: 0.236, hr: 5.2, rbi: 22.0, walk: 17.5, sb: 5.5 },
    SS: { ba: 0.256, hr: 7.8, rbi: 32.5, walk: 30.0, sb: 14.0 },
    OF: { ba: 0.25, hr: 8.0, rbi: 30.0, walk: 21.5, sb: 6.5 },
    DH: { ba: 0.235, hr: 14.2, rbi: 44.5, walk: 29.0, sb: 1.9 },
    SP: {
      era: 3.35,
      wins: 6.2,
      losses: 4.0,
      saves: 0.1,
      strikeouts: 102.0,
      innings: 98.5,
    },
    RP: {
      era: 3.45,
      wins: 2.6,
      losses: 2.9,
      saves: 3.0,
      strikeouts: 51.5,
      innings: 46.0,
    },
  },
  // 2024: C from Herrera, Del Castillo, Wells, Pagés, McCann.
  // 1B from Busch, Horwitz, Soderstrom, Schanuel, Shenton, Rice.
  // 2B from Lopez, Keith, Gonzales, Wagner, Bliss, Holliday, Loftin.
  // 3B from Ortiz, Norby, Rosario, Jung, Marte, Lipscomb, Barger, Tena.
  // SS from Fitzgerald, Edwards, Winn, Hamilton, Rocchio, Jiménez, Schuemann, Schneemann, Alexander.
  // OF from 18 qualifiers including Merrill, Chourio, Cowser, Ramos, Mitchell, Schneider.
  // SP from Myers, Woods Richardson, Francis, Baz, Holmes, Brown, Skenes, Gil.
  // RP/DH estimated from 2023 actuals.
  '2024': {
    C: { ba: 0.263, hr: 6.8, rbi: 28.6, walk: 21.6, sb: 1.8 },
    '1B': { ba: 0.23, hr: 10.5, rbi: 35.2, walk: 36.8, sb: 2.0 },
    '2B': { ba: 0.244, hr: 5.1, rbi: 29.4, walk: 17.4, sb: 6.0 },
    '3B': { ba: 0.229, hr: 4.8, rbi: 20.0, walk: 16.8, sb: 5.3 },
    SS: { ba: 0.249, hr: 7.3, rbi: 30.8, walk: 29.0, sb: 13.6 },
    OF: { ba: 0.244, hr: 7.4, rbi: 28.2, walk: 20.8, sb: 6.1 },
    DH: { ba: 0.233, hr: 13.8, rbi: 43.2, walk: 28.5, sb: 1.9 },
    SP: {
      era: 3.25,
      wins: 6.0,
      losses: 3.9,
      saves: 0.0,
      strikeouts: 100.4,
      innings: 97.5,
    },
    RP: {
      era: 3.4,
      wins: 2.5,
      losses: 2.8,
      saves: 2.8,
      strikeouts: 50.0,
      innings: 45.0,
    },
  },
  '2023': {
    C: { ba: 0.235, hr: 13.8, rbi: 40.8, walk: 21.0, sb: 1.3 },
    '1B': { ba: 0.229, hr: 10.6, rbi: 35.1, walk: 25.0, sb: 1.4 },
    '2B': { ba: 0.253, hr: 10.7, rbi: 33.1, walk: 23.4, sb: 7.5 },
    '3B': { ba: 0.245, hr: 10.6, rbi: 32.5, walk: 23.4, sb: 4.4 },
    SS: { ba: 0.252, hr: 11.2, rbi: 34.0, walk: 24.1, sb: 7.8 },
    OF: { ba: 0.248, hr: 12.1, rbi: 38.6, walk: 27.2, sb: 9.4 },
    DH: { ba: 0.231, hr: 13.5, rbi: 42.4, walk: 28.1, sb: 1.8 },
    SP: {
      era: 4.61,
      wins: 5.2,
      losses: 6.4,
      saves: 0.1,
      strikeouts: 88.5,
      innings: 92.4,
    },
    RP: {
      era: 4.24,
      wins: 3.1,
      losses: 3.2,
      saves: 2.4,
      strikeouts: 49.3,
      innings: 44.8,
    },
  },
};
