import { useCallback, useEffect, useRef, useState } from 'react';
import type { Place } from '../types';

const MAX_SUGGESTIONS = 5;

interface GuessInputProps {
  places: Place[];
  onSubmit: (value: string) => void;
  disabled: boolean;
  inputId: string;
}

export function GuessInput({ places, onSubmit, disabled, inputId }: GuessInputProps) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const updateSuggestions = useCallback(
    (val: string) => {
      const v = val.trim().toLowerCase();
      if (!v) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const matching = places
        .map((o) => {
          const words = o.name.toLowerCase().split(/[/]+/);
          const startsWithMatch = words.some((w) => w.startsWith(v));
          const includesMatch = (o.alternatives ?? []).some((a) =>
            a.toLowerCase().includes(v)
          );
          return { place: o, startsWith: startsWithMatch, includes: includesMatch };
        })
        .filter((o) => o.startsWith || o.includes)
        .sort((a, b) => {
          if (a.startsWith && !b.startsWith) return -1;
          if (!a.startsWith && b.startsWith) return 1;
          return (
            (b.place.population - a.place.population) ||
            a.place.name.localeCompare(b.place.name)
          );
        })
        .map((o) => o.place)
        .slice(0, MAX_SUGGESTIONS);
      setSuggestions(matching);
      setHighlightIndex(-1);
      setOpen(matching.length > 0);
    },
    [places]
  );

  useEffect(() => {
    updateSuggestions(value);
  }, [value, updateSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue('');
    setOpen(false);
    onSubmit(trimmed);
  }, [value, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => (i < suggestions.length - 1 ? i + 1 : i));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => (i > 0 ? i - 1 : -1));
        return;
      }
      if (e.key === 'Enter') {
        if (highlightIndex >= 0 && suggestions[highlightIndex]) {
          setValue(suggestions[highlightIndex].name);
          setHighlightIndex(-1);
          setOpen(false);
          return;
        }
        if (suggestions.length <= 1) {
          handleSubmit();
        }
        return;
      }
    },
    [suggestions, highlightIndex, handleSubmit]
  );

  const handleSelect = useCallback((place: Place) => {
    setValue(place.name);
    setOpen(false);
    setHighlightIndex(-1);
  }, []);

  return (
    <div ref={wrapperRef} className="guess-input-wrapper">
      <label htmlFor={inputId} className="visually-hidden">
        Ort eingeben
      </label>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="autosuggest-list"
        aria-activedescendant={
          highlightIndex >= 0 && suggestions[highlightIndex]
            ? `suggestion-${highlightIndex}`
            : undefined
        }
        className="guess-input"
        placeholder="Ort eingeben…"
      />
      {open && suggestions.length > 0 && (
        <ul
          id="autosuggest-list"
          ref={listRef}
          role="listbox"
          className="autosuggest-list"
        >
          {suggestions.map((place, index) => (
            <li
              key={place.name}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === highlightIndex}
              className={`autosuggest-item ${index === highlightIndex ? 'highlight' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(place);
              }}
            >
              {place.name}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="guess-button"
      >
        Raten
      </button>
    </div>
  );
}
