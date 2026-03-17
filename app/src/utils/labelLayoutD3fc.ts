/**
 * Nutzt @d3fc/d3fc-label-layout (layoutGreedy) zur kollisionsfreien
 * Platzierung von Orts- und Distanz-Labels.
 */
import { layoutGreedy } from '@d3fc/d3fc-label-layout';

export interface LabelBoxInput {
  x: number;
  y: number;
  width: number;
  height: number;
  [key: string]: unknown;
}

/** Abstand zwischen Labels, damit sie sich nicht berühren. */
const LAYOUT_PADDING = 22;

/**
 * Wendet die Greedy-Strategie an: verschiebt Labels in Kandidatenpositionen,
 * sodass sie sich nicht überlappen. Verwendet vergrößerte Bounds (Padding),
 * damit zwischen allen Labels und zum Rand Abstand bleibt.
 */
export function placeLabelsGreedy<T extends LabelBoxInput>(
  boxes: T[],
  viewWidth: number,
  viewHeight: number
): Array<T & { x: number; y: number }> {
  if (boxes.length === 0) return [];
  const strategy = layoutGreedy().bounds({
    x: LAYOUT_PADDING,
    y: LAYOUT_PADDING,
    width: viewWidth - 2 * LAYOUT_PADDING,
    height: viewHeight - 2 * LAYOUT_PADDING,
  });
  const input = boxes.map((b) => ({
    x: b.x,
    y: b.y,
    width: b.width + 2 * LAYOUT_PADDING,
    height: b.height + 2 * LAYOUT_PADDING,
  }));
  let result: Array<{ x: number; y: number; width: number; height: number }>;
  try {
    const out = strategy(input);
    result = Array.isArray(out) ? out : input;
  } catch {
    result = input;
  }
  const withPadding = result.map((placed, i) => ({
    ...boxes[i],
    x: placed.x + LAYOUT_PADDING,
    y: placed.y + LAYOUT_PADDING,
  }));
  return withPadding;
}

const POINT_RADIUS = 14;
const POINT_LABEL_MARGIN = 6;

/** Prüft, ob ein Rechteck mit einem Kreis (Punkt) überlappt. */
function rectOverlapsCircle(
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  cx: number,
  cy: number,
  cr: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dist = Math.hypot(cx - closestX, cy - closestY);
  return dist < cr;
}

/**
 * Verschiebt Labels so, dass sie keine Punkte überdecken.
 * Jedes Label wird bei Überlappung vom Punkt wegbewegt.
 */
export function nudgeLabelsAwayFromPoints<T extends { x: number; y: number; width: number; height: number }>(
  boxes: T[],
  points: Array<{ x: number; y: number }>,
  viewWidth: number,
  viewHeight: number
): T[] {
  if (points.length === 0) return boxes;
  const minDist = POINT_RADIUS + POINT_LABEL_MARGIN;
  return boxes.map((box) => {
    let x = box.x;
    let y = box.y;
    const cwx = box.width / 2;
    const cwy = box.height / 2;
    for (let pass = 0; pass < 12; pass++) {
      let anyOverlap = false;
      for (const pt of points) {
        if (!rectOverlapsCircle(x, y, box.width, box.height, pt.x, pt.y, minDist)) continue;
        anyOverlap = true;
        const lcx = x + cwx;
        const lcy = y + cwy;
        const dx = lcx - pt.x;
        const dy = lcy - pt.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = pt.x + (dx / d) * (minDist + Math.max(cwx, cwy));
        const ny = pt.y + (dy / d) * (minDist + Math.max(cwx, cwy));
        x = nx - cwx;
        y = ny - cwy;
        x = Math.max(0, Math.min(viewWidth - box.width, x));
        y = Math.max(0, Math.min(viewHeight - box.height, y));
      }
      if (!anyOverlap) break;
    }
    return { ...box, x, y };
  });
}
