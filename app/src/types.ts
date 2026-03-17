export interface Place {
  name: string;
  alternatives: string[];
  latitude: number;
  longitude: number;
  population: number;
  selectable: boolean;
  hidden?: boolean;
  elevation?: number;
}

export interface GameModeConfig {
  dataUrl: string;
  title: string;
  notFoundStr: string;
  alreadyGuessedStr: string;
  sugg2Str: string; // e.g. "Einwohner: {}" or "Höhe: {} m"
  shareNameStr: string;
}
