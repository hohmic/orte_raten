import type { GameModeConfig } from '../types';

const base = `${import.meta.env.BASE_URL}data`;
export const GAME_MODES: Record<string, GameModeConfig> = {
  orte: {
    dataUrl: `${base}/orte_suedtirol.json`,
    title: 'Orte raten',
    notFoundStr: 'Ort nicht gefunden.',
    alreadyGuessedStr: 'Diesen Ort hast du schon geraten.',
    sugg2Str: 'Einwohner: {}',
    shareNameStr: 'Südtirol-',
  },
  gemeinden: {
    dataUrl: `${base}/gemeinden_suedtirol.json`,
    title: 'Gemeinden raten',
    notFoundStr: 'Gemeinde nicht gefunden.',
    alreadyGuessedStr: 'Diese Gemeinde hast du schon geraten.',
    sugg2Str: 'Einwohner: {}',
    shareNameStr: 'Gemeinden-',
  },
  gipfel: {
    dataUrl: `${base}/peaks_suedtirol.json`,
    title: 'Gipfel raten',
    notFoundStr: 'Gipfel nicht gefunden.',
    alreadyGuessedStr: 'Diesen Gipfel hast du schon geraten.',
    sugg2Str: 'Höhe: {} m',
    shareNameStr: 'Gipfel-',
  },
  provinzen: {
    dataUrl: `${base}/province.json`,
    title: 'Provinzen raten',
    notFoundStr: 'Provinz nicht gefunden.',
    alreadyGuessedStr: 'Diese Provinz hast du schon geraten.',
    sugg2Str: 'Einwohner: {}',
    shareNameStr: 'Provinzen-',
  },
};

export const MODE_IDS = ['orte', 'gemeinden', 'gipfel', 'provinzen'] as const;
export type ModeId = (typeof MODE_IDS)[number];
