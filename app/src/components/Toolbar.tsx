import { useCallback } from 'react';
import type { GameModeConfig } from '../types';
import { calcDistanceInKm, formatDistance } from '../utils/gameLogic';
import type { Place } from '../types';

interface ToolbarProps {
  config: GameModeConfig;
  modePath: string;
  subheading: string;
  seedFromURL: number | null;
  dayFromURL: string | null;
  archiveDates: { value: string; label: string }[];
  guessedPlaces: Place[];
  target: Place | null;
  gameOver: boolean;
  onStartGame: () => void;
}

export function Toolbar({
  config,
  modePath,
  subheading,
  seedFromURL,
  dayFromURL,
  archiveDates,
  guessedPlaces,
  target,
  gameOver,
  onStartGame,
}: ToolbarProps) {
  const handleDaily = useCallback(() => {
    window.location.href = window.location.origin + modePath;
  }, [modePath]);

  const handleRandom = useCallback(() => {
    const gameId = Math.floor(Math.random() * 1000000);
    const url = `${window.location.origin}${modePath}?game=${gameId}`;
    if (window.history.pushState) {
      window.history.pushState({ path: url }, '', url);
      onStartGame();
    } else {
      window.location.href = url;
    }
  }, [modePath, onStartGame]);

  const handleArchiveChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val) {
        const url = `${window.location.origin}${modePath}?day=${val}`;
        if (window.history.pushState) {
          window.history.pushState({ path: url }, '', url);
          onStartGame();
        } else {
          window.location.href = url;
        }
      }
    },
    [modePath, onStartGame]
  );

  const handleShare = useCallback(() => {
    if (!navigator.share) {
      alert('Teilen wird auf diesem Gerät nicht unterstützt.');
      return;
    }
    if (!target) return;
    const rows = guessedPlaces.map((p, i) => {
      const d = calcDistanceInKm(target, p);
      const dist = d === 0 ? '📍' : formatDistance(d, 0);
      return `Versuch ${i + 1}: ${dist}`;
    });
    const d = dayFromURL ? new Date(dayFromURL) : new Date();
    const dateStr = d.toLocaleDateString('de-DE');
    const identifier =
      seedFromURL !== null ? `Nr. ${seedFromURL}` : `vom ${dateStr}`;
    const url = window.location.href;
    const text = `🌍 ${config.shareNameStr}Raten ${identifier}\n${rows.join('\n')}\n-\n${url}`;
    navigator.share({ text });
  }, [target, guessedPlaces, dayFromURL, seedFromURL, config.shareNameStr]);

  return (
    <nav className="toolbar" aria-label="Spielmodus und Aktionen">
      <p className="subheading" id="subheading">
        {subheading}
      </p>
      <div className="toolbar-buttons">
        <button type="button" onClick={handleDaily} className="toolbar-btn">
          Tagesrätsel
        </button>
        <button type="button" onClick={handleRandom} className="toolbar-btn">
          Zufallsrätsel
        </button>
        <label htmlFor="archive-date" className="visually-hidden">
          Archiv-Datum wählen
        </label>
        <select
          id="archive-date"
          value={dayFromURL ?? ''}
          onChange={handleArchiveChange}
          className="toolbar-select"
          aria-label="Archiv-Datum"
        >
          <option value="">Archiv…</option>
          {archiveDates.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        {gameOver && (
          <button
            type="button"
            onClick={handleShare}
            className="toolbar-btn share-button"
          >
            Teilen
          </button>
        )}
      </div>
    </nav>
  );
}
