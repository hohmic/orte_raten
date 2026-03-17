import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GameMap } from '../components/GameMap';
import { GuessInput } from '../components/GuessInput';
import { Toolbar } from '../components/Toolbar';
import { GAME_MODES, MODE_IDS, type ModeId } from '../config/modes';
import { useGameState, MAX_GUESSES } from '../hooks/useGameState';
import type { Place } from '../types';

export function GamePage() {
  const { modeId } = useParams<{ modeId: string }>();
  const navigate = useNavigate();
  const validMode = modeId && MODE_IDS.includes(modeId as ModeId) ? (modeId as ModeId) : 'orte';

  useEffect(() => {
    if (modeId && !MODE_IDS.includes(modeId as ModeId)) {
      navigate(`/${validMode}`, { replace: true });
    }
  }, [modeId, validMode, navigate]);

  const config = GAME_MODES[validMode];
  const [places, setPlaces] = useState<Place[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(config.dataUrl)
      .then((res) => res.json())
      .then((data: Place[]) => {
        if (!cancelled) {
          const filtered = data.filter((p) => !('hidden' in p) || p.hidden === false);
          setPlaces(filtered);
        }
      })
      .catch(() => {
        if (!cancelled) setPlaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, [config.dataUrl]);

  const { state, startGame, guess, archiveDates } = useGameState(places, config, validMode);
  const { target, ref1, ref2, guessedPlaces, gameOver, subheading, seedFromURL, dayFromURL } =
    state;

  const [feedback, setFeedback] = useState('');
  const [statsOptIn, setStatsOptIn] = useState(false);

  const handleGuessSubmit = async (value: string) => {
    const result = await guess(value);
    setFeedback(result.feedback);
  };

  const hasWon =
    gameOver && guessedPlaces.length > 0 && target && guessedPlaces[guessedPlaces.length - 1].name === target.name;

  const hintValue =
    target != null
      ? target.population != null
        ? target.population.toLocaleString()
        : String((target as Place & { elevation?: number }).elevation ?? target.population ?? '')
      : '';

  return (
    <main className="game-page">
      <header className="game-header">
        <h1>{config.title}</h1>
        <nav className="mode-nav" aria-label="Spielmodi">
          <Link to="/orte" className={validMode === 'orte' ? 'active' : ''}>Orte</Link>
          <Link to="/gemeinden" className={validMode === 'gemeinden' ? 'active' : ''}>Gemeinden</Link>
          <Link to="/gipfel" className={validMode === 'gipfel' ? 'active' : ''}>Gipfel</Link>
          <Link to="/provinzen" className={validMode === 'provinzen' ? 'active' : ''}>Provinzen</Link>
        </nav>
      </header>

      <Toolbar
        config={config}
        modePath={`/${validMode}`}
        subheading={subheading}
        seedFromURL={seedFromURL}
        dayFromURL={dayFromURL}
        archiveDates={archiveDates}
        guessedPlaces={guessedPlaces}
        target={target}
        gameOver={gameOver}
        onStartGame={startGame}
      />

      {!gameOver && target && (
        <div className="map-attempts-row" aria-live="polite" aria-label={`Noch ${MAX_GUESSES - guessedPlaces.length} Versuche`}>
          {Array.from({ length: MAX_GUESSES }, (_, i) => {
            const used = i < guessedPlaces.length;
            const correct = used && guessedPlaces[i].name === target.name;
            const wrong = used && !correct;
            return (
              <span
                key={i}
                className={`map-attempt-box ${wrong ? 'wrong' : correct ? 'correct' : ''}`}
                aria-hidden="true"
              >
                {wrong && (
                  <span className="map-attempt-x" aria-hidden="true">✕</span>
                )}
                {correct && (
                  <span className="map-attempt-check" aria-hidden="true">✓</span>
                )}
              </span>
            );
          })}
        </div>
      )}
      <div className="game-map-wrapper-container">
        <GameMap
          key={`game-${target?.name ?? ''}-${ref1?.name ?? ''}-${ref2?.name ?? ''}`}
          target={target}
          ref1={ref1}
          ref2={ref2}
          guessedPlaces={guessedPlaces}
          gameOver={gameOver}
        />
        <div className="map-overlay-text" aria-live="polite">
          {guessedPlaces.length >= 2 && !gameOver && target && (
            <p className="hint">{config.sugg2Str.replace('{}', hintValue)}</p>
          )}
          {gameOver && target && (
            <p className={hasWon ? 'result win' : 'result lose'}>
              {hasWon
                ? `Richtig in ${guessedPlaces.length} Versuch${guessedPlaces.length === 1 ? '' : 'en'}!`
                : `Game Over! Gesucht war: ${target.name}`}
            </p>
          )}
        </div>
      </div>

      {!gameOver && (
        <GuessInput
          places={places ?? []}
          onSubmit={handleGuessSubmit}
          disabled={gameOver}
          inputId="guess"
        />
      )}

      {feedback && (
        <p className="feedback" role="status">
          {feedback}
        </p>
      )}

      {gameOver && (
        <div className="stats-opt-in">
          <label>
            <input
              type="checkbox"
              checked={statsOptIn}
              onChange={(e) => setStatsOptIn(e.target.checked)}
            />
            Anonyme Statistik teilen?
          </label>
        </div>
      )}
    </main>
  );
}
