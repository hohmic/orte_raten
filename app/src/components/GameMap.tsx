import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place } from '../types';
import { calcDistanceInKm, formatDistance } from '../utils/gameLogic';
import { placeLabelsForce } from '../utils/forceLabelLayout';
const MAP_SIZE = 500;
const MAP_CENTER: [number, number] = [250, 250];
/** Kompakte Label-Maße, damit die Textfelder weniger Platz nehmen. */
const MAP_LABEL_LINE_HEIGHT = 11;
const MAP_LABEL_CHAR_WIDTH = 5.8;
const MAP_LABEL_PADDING = 3;
const MAP_LABEL_BG_PADDING = 3;
const MAP_LABEL_FONT_SIZE = 11;
const MAP_LABEL_DIST_LINE_HEIGHT = 9;
const MAP_LABEL_DIST_FONT_SIZE = 9;
const MAP_LABEL_NAME_TO_DIST_GAP = 2;
const MAP_LABEL_DIST_BOTTOM_PAD = 4;

interface MapPoint {
  place: Place;
  x: number;
  y: number;
  dist: number;
}

interface GameMapProps {
  target: Place | null;
  ref1: Place | null;
  ref2: Place | null;
  guessedPlaces: Place[];
  gameOver: boolean;
}

function getColor(
  place: Place,
  ref1: Place,
  ref2: Place,
  target: Place,
  gameOver: boolean
): string {
  if (place.name === ref1.name) return '#2563eb';
  if (place.name === ref2.name) return '#15803d';
  if (place.name === target.name && gameOver) return '#dc2626';
  return '#ea580c';
}

export function GameMap({ target, ref1, ref2, guessedPlaces, gameOver }: GameMapProps) {
  const leafletRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [containerSize, setContainerSize] = useState({ w: MAP_SIZE, h: MAP_SIZE });

  const placesToDraw = useMemo(() => {
    if (!ref1 || !ref2) return [];
    return [ref1, ref2, ...guessedPlaces];
  }, [ref1, ref2, guessedPlaces]);

  const placesWithTarget = useMemo(() => {
    if (!target) return placesToDraw;
    return gameOver ? [...placesToDraw, target] : placesToDraw;
  }, [target, placesToDraw, gameOver]);

  const { points, targetPx, targetPy, w, h } = useMemo(() => {
    if (!target || placesWithTarget.length === 0) {
      return {
        points: [] as MapPoint[],
        targetPx: MAP_CENTER[0],
        targetPy: MAP_CENTER[1],
        w: MAP_SIZE,
        h: MAP_SIZE,
      };
    }

    const useMapUnderlay = gameOver && typeof L !== 'undefined' && mapInstanceRef.current && leafletRef.current;
    if (useMapUnderlay) {
      const map = mapInstanceRef.current!;
      const mapEl = leafletRef.current!;
      map.invalidateSize();
      const cw = mapEl.offsetWidth || MAP_SIZE;
      const ch = mapEl.offsetHeight || MAP_SIZE;
      const points: MapPoint[] = placesWithTarget.map((p) => {
        const pt = map.latLngToContainerPoint([p.latitude, p.longitude]);
        return {
          place: p,
          x: pt.x,
          y: pt.y,
          dist: calcDistanceInKm(target, p),
        };
      });
      const tp = map.latLngToContainerPoint([target.latitude, target.longitude]);
      return {
        points,
        targetPx: tp.x,
        targetPy: tp.y,
        w: cw,
        h: ch,
      };
    }

    const offsets = placesWithTarget.map((p) => ({
      place: p,
      dx: (p.longitude - target.longitude) * 85,
      dy: (p.latitude - target.latitude) * 111,
      dist: calcDistanceInKm(target, p),
    }));
    const maxDist = Math.max(...offsets.map((v) => Math.hypot(v.dx, v.dy)));
    const scale = 200 / (maxDist || 1);
    const points: MapPoint[] = offsets.map((v) => ({
      place: v.place,
      x: MAP_CENTER[0] + v.dx * scale,
      y: MAP_CENTER[1] - v.dy * scale,
      dist: v.dist,
    }));
    return {
      points,
      targetPx: MAP_CENTER[0],
      targetPy: MAP_CENTER[1],
      w: MAP_SIZE,
      h: MAP_SIZE,
    };
  }, [target, ref1, ref2, guessedPlaces, placesWithTarget, gameOver, containerSize]);

  useLayoutEffect(() => {
    if (gameOver && leafletRef.current && !mapInstanceRef.current) {
      const allForBounds = [target!, ref1!, ref2!, ...guessedPlaces];
      const bounds = L.latLngBounds(
        allForBounds.map((p) => [p.latitude, p.longitude] as [number, number])
      ).pad(0.35);
      const map = L.map(leafletRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
      }).fitBounds(bounds);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        opacity: 1,
      }).addTo(map);
      mapInstanceRef.current = map;
      const el = leafletRef.current;
      requestAnimationFrame(() => {
        map.invalidateSize();
        setContainerSize({ w: el.offsetWidth || MAP_SIZE, h: el.offsetHeight || MAP_SIZE });
      });
    }
  }, [gameOver, target, ref1, ref2, guessedPlaces]);

  useEffect(() => {
    if (!gameOver && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  }, [gameOver]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const allLabelBoxes = useMemo(() => {
    if (!target || points.length === 0) return [];
    const placeBoxes: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      anchorX: number;
      anchorY: number;
      type: 'place';
      p: MapPoint;
      nameLines: string[];
      distText: string | null;
    }> = [];
    points.forEach((p) => {
      const nameLines = p.place.name.split('/').map((s) => s.trim());
      const distText = p.place.name === target.name ? null : formatDistance(p.dist, 1);
      const lineLen = Math.max(
        ...nameLines.map((s) => s.length),
        distText ? distText.length : 0,
        1
      );
      const width = lineLen * MAP_LABEL_CHAR_WIDTH + MAP_LABEL_PADDING * 2 + MAP_LABEL_BG_PADDING * 2;
      const height =
        nameLines.length * MAP_LABEL_LINE_HEIGHT +
        (distText ? MAP_LABEL_DIST_LINE_HEIGHT + MAP_LABEL_NAME_TO_DIST_GAP + MAP_LABEL_DIST_BOTTOM_PAD : 0) +
        MAP_LABEL_PADDING * 2 +
        MAP_LABEL_BG_PADDING * 2;
      placeBoxes.push({
        x: p.x,
        y: p.y,
        width,
        height,
        anchorX: p.x,
        anchorY: p.y,
        type: 'place',
        p,
        nameLines,
        distText,
      });
    });
    const pointPositions = [
      ...points.map((p) => ({ x: p.x, y: p.y })),
      { x: targetPx, y: targetPy },
    ];
    return placeLabelsForce(placeBoxes, pointPositions, w, h);
  }, [points, targetPx, targetPy, target, w, h]);

  const placeLabels = allLabelBoxes;

  const pointsWithoutTarget = points.filter((p) => target && p.place.name !== target.name);
  const lineSegments = pointsWithoutTarget.map((p) => ({ x1: targetPx, y1: targetPy, x2: p.x, y2: p.y }));

  if (!target || !ref1 || !ref2) return null;

  const labelTransition = 'transform 0.4s ease-out';
  const leaderStroke = '#64748b';
  const leaderStrokeWidth = 1.5;

  const svgContent = (
    <>
      <defs>
        <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx={0} dy={1} stdDeviation={2} floodOpacity={0.15} />
        </filter>
      </defs>
      {/* 1. Linien */}
      {lineSegments.map((seg, i) => (
        <line
          key={i}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
          stroke={getColor(pointsWithoutTarget[i].place, ref1, ref2, target, gameOver)}
          strokeWidth={2}
          strokeOpacity={0.9}
        />
      ))}
      {/* 2. Schwarzer Zielpunkt (gesuchter Ort) – Linien enden hier sichtbar */}
      <circle
        cx={targetPx}
        cy={targetPy}
        r={8}
        fill="#1a1a1a"
        stroke="#000"
        strokeWidth={1.5}
      />
      {/* 3. Punkte (Referenzen + geratene Orte) – wie Textfelder, können von Labels überdeckt werden */}
      {points.filter((p) => p.place.name !== target.name).map((p) => (
        <circle
          key={`point-${p.place.name}`}
          cx={p.x}
          cy={p.y}
          r={8}
          fill={getColor(p.place, ref1, ref2, target, gameOver)}
          stroke="#1a1a1a"
          strokeWidth={2}
        />
      ))}
      {/* 4. Orts-Labels (mit km-Angabe im Feld) + Leader-Linie wenn verschoben */}
      {placeLabels.map((item) => {
        const labelCx = item.x + item.width / 2;
        const labelCy = item.y + item.height / 2;
        const distFromPoint = Math.hypot(labelCx - item.p.x, labelCy - item.p.y);
        const moved = distFromPoint > 25;
        return (
          <g key={`place-${item.p.place.name}`}>
            {moved && (
              <line
                x1={item.p.x}
                y1={item.p.y}
                x2={labelCx}
                y2={labelCy}
                stroke={leaderStroke}
                strokeWidth={leaderStrokeWidth}
                strokeDasharray="4,3"
              />
            )}
            <g
              transform={`translate(${item.x},${item.y})`}
              style={{ transition: labelTransition }}
            >
              <rect
                x={0}
                y={0}
                width={item.width}
                height={item.height}
                rx={4}
                ry={4}
                fill="#ffffff"
                stroke="#374151"
                strokeWidth={1}
                filter="url(#labelShadow)"
              />
              {(() => {
                const totalTextHeight =
                  item.nameLines.length * MAP_LABEL_LINE_HEIGHT +
                  (item.distText ? MAP_LABEL_DIST_LINE_HEIGHT + MAP_LABEL_NAME_TO_DIST_GAP + MAP_LABEL_DIST_BOTTOM_PAD : 0);
                const firstBaseline = (item.height - totalTextHeight) / 2 + MAP_LABEL_LINE_HEIGHT - 2;
                return (
                  <>
                    {item.nameLines.map((line, idx) => (
                      <text
                        key={idx}
                        x={item.width / 2}
                        y={firstBaseline + idx * MAP_LABEL_LINE_HEIGHT}
                        textAnchor="middle"
                        fontSize={MAP_LABEL_FONT_SIZE}
                        fontFamily="system-ui, sans-serif"
                        fontWeight="600"
                        fill="#111827"
                      >
                        {line}
                      </text>
                    ))}
                    {item.distText && (
                      <text
                        x={item.width / 2}
                        y={firstBaseline + item.nameLines.length * MAP_LABEL_LINE_HEIGHT + MAP_LABEL_NAME_TO_DIST_GAP + MAP_LABEL_DIST_LINE_HEIGHT - 2}
                        textAnchor="middle"
                        fontSize={MAP_LABEL_DIST_FONT_SIZE}
                        fontFamily="system-ui, sans-serif"
                        fontWeight="700"
                        fill="#374151"
                      >
                        {item.distText}
                      </text>
                    )}
                  </>
                );
              })()}
            </g>
          </g>
        );
      })}
    </>
  );

  return (
    <div className="game-map-wrapper">
      <div
        id="game-map"
        ref={leafletRef}
        className="game-map-leaflet"
        style={{ display: gameOver ? 'block' : 'none' }}
        aria-hidden={!gameOver}
      />
      <svg
        id="map"
        className="game-map-svg"
        viewBox={`0 0 ${w} ${h}`}
        style={{
          position: gameOver ? 'absolute' : 'relative',
          top: gameOver ? 0 : undefined,
          left: gameOver ? 0 : undefined,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 1,
        }}
      >
        {svgContent}
      </svg>
    </div>
  );
}
