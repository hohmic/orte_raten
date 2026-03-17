import { useCallback, useEffect, useState } from 'react';
import type { Place } from '../types';
import type { GameModeConfig } from '../types';
import {
  getDayFromURL,
  getSeedFromDate,
  getSeedFromURL,
  getTodayISO,
  getCookie,
  setCookie,
  pickTargetAndRefs,
  tryCheat,
  calcDistanceInKm,
  formatDistance,
  seededRandom,
} from '../utils/gameLogic';

const ARCHIVE_DAYS = 7;

/** Maximale Anzahl Rateversuche pro Runde. */
export const MAX_GUESSES = 6;

export interface GameState {
  target: Place | null;
  ref1: Place | null;
  ref2: Place | null;
  guessedPlaces: Place[];
  gameOver: boolean;
  seedFromURL: number | null;
  dayFromURL: string | null;
  subheading: string;
  seed: number | null;
}

export function useGameState(
  places: Place[] | null,
  config: GameModeConfig | null,
  _modeId: string
) {
  const [state, setState] = useState<GameState>({
    target: null,
    ref1: null,
    ref2: null,
    guessedPlaces: [],
    gameOver: false,
    seedFromURL: null,
    dayFromURL: null,
    subheading: '',
    seed: null,
  });

  const dataFileKey = config?.dataUrl.split('/').pop() ?? '';

  const startGame = useCallback(() => {
    if (!places || places.length === 0 || !config) return;

    let seedFromURL = getSeedFromURL();
    let dayFromURL = getDayFromURL();
    const today = getTodayISO();

    if (dayFromURL != null && dayFromURL >= today) {
      dayFromURL = null;
    }

    let seed: number;
    let subheading: string;

    if (seedFromURL != null) {
      seed = seedFromURL;
      subheading = `Zufallsrätsel (Nr: ${seed})`;
    } else {
      const d = dayFromURL ? new Date(dayFromURL) : new Date();
      const dateStr = d.toLocaleDateString('de-DE');
      const dateSeed = getSeedFromDate(dayFromURL);
      seed = Math.floor(seededRandom(dateSeed) * 10000);
      subheading = `Tagesrätsel vom ${dateStr}`;
    }

    const { target, ref1, ref2 } = pickTargetAndRefs(places, seed);

    let guessedPlaces: Place[] = [];
    let gameOver = false;

    if (seedFromURL == null && dayFromURL == null) {
      const cookie = getCookie(`geoguesser_${today}_${dataFileKey}`);
      if (cookie) {
        try {
          const obj = JSON.parse(cookie) as { date: string; guessedPlaces: string[] };
          if (obj?.date === today && Array.isArray(obj.guessedPlaces)) {
            guessedPlaces = obj.guessedPlaces
              .map((name) => places.find((p) => p.name === name && p.hidden !== true))
              .filter((p): p is Place => Boolean(p));
            gameOver = true;
          }
        } catch {
          // ignore
        }
      }
    }

    setState({
      target,
      ref1,
      ref2,
      guessedPlaces,
      gameOver,
      seedFromURL,
      dayFromURL,
      subheading,
      seed,
    });
  }, [places, config, dataFileKey]);

  useEffect(() => {
    if (!places || !config) return;
    if (
      getSeedFromURL() === null &&
      getDayFromURL() === null &&
      window.location.search.length > 0
    ) {
      window.location.href = window.location.pathname;
      return;
    }
    startGame();
  }, [startGame, places, config]);

  const guess = useCallback(
    async (userInput: string): Promise<{ feedback: string }> => {
      const s = state;
      if (!s.target || !s.ref1 || !s.ref2 || !places || !config || s.gameOver) {
        return { feedback: '' };
      }

      let input = userInput.trim().toLowerCase();
      if (!input) return { feedback: '' };

      if (await tryCheat(input)) {
        input = s.target.name.toLowerCase();
      }

      const guessedPlace = places.find(
        (p) =>
          p.name.toLowerCase() === input ||
          (p.alternatives ?? []).some((alt) => alt.toLowerCase() === input)
      );

      if (!guessedPlace) {
        return { feedback: config.notFoundStr };
      }

      if (s.guessedPlaces.some((o) => o.name === guessedPlace.name)) {
        return { feedback: config.alreadyGuessedStr };
      }

      const newGuessed = [...s.guessedPlaces, guessedPlace];
      const today = getTodayISO();
      const isDaily = s.seedFromURL == null && s.dayFromURL == null;

      if (guessedPlace.name === s.target.name) {
        if (isDaily) {
          setCookie(
            `geoguesser_${today}_${dataFileKey}`,
            JSON.stringify({ date: today, guessedPlaces: newGuessed.map((p) => p.name) }),
            2
          );
        }
        setState((prev) => ({
          ...prev,
          guessedPlaces: newGuessed,
          gameOver: true,
        }));
        return { feedback: `Richtig! Der Ort war ${s.target.name}.` };
      }

      const feedback = `${guessedPlace.name} ist falsch (${formatDistance(calcDistanceInKm(guessedPlace, s.target), 1)}).`;
      const gameOver = newGuessed.length >= MAX_GUESSES;
      if (gameOver && isDaily) {
        setCookie(
          `geoguesser_${today}_${dataFileKey}`,
          JSON.stringify({ date: today, guessedPlaces: newGuessed.map((p) => p.name) }),
          2
        );
      }

      setState((prev) => ({
        ...prev,
        guessedPlaces: newGuessed,
        gameOver,
      }));
      return { feedback };
    },
    [state, places, config, dataFileKey]
  );

  const archiveDates = (() => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - ARCHIVE_DAYS);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const out: { value: string; label: string }[] = [];
    for (const d = new Date(startDate); d <= yesterday; d.setDate(d.getDate() + 1)) {
      const iso = d.toLocaleDateString('sv-SE').split('T')[0];
      out.push({ value: iso, label: iso.split('-').reverse().join('.') });
    }
    return out;
  })();

  return { state, startGame, guess, archiveDates };
}