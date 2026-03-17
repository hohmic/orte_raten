export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

export function lineSegmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  left: number,
  top: number,
  width: number,
  height: number
): boolean {
  const pad = 3;
  const L = left - pad;
  const R = left + width + pad;
  const T = top - pad;
  const B = top + height + pad;
  const segs: [number, number, number, number][] = [
    [L, T, R, T],
    [R, T, R, B],
    [R, B, L, B],
    [L, B, L, T],
  ];
  for (const [ax, ay, bx, by] of segs) {
    const den = (bx - ax) * (y2 - y1) - (by - ay) * (x2 - x1);
    if (Math.abs(den) < 1e-10) continue;
    const t = ((ax - x1) * (by - ay) - (ay - y1) * (bx - ax)) / den;
    const u = ((x1 - ax) * (y2 - y1) - (y1 - ay) * (x2 - x1)) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  if (x1 >= L && x1 <= R && y1 >= T && y1 <= B) return true;
  if (x2 >= L && x2 <= R && y2 >= T && y2 <= B) return true;
  return false;
}

export function placeLabelNoOverlap(
  pointX: number,
  pointY: number,
  width: number,
  height: number,
  used: Box[],
  viewW: number,
  viewH: number,
  lineSegments: LineSegment[]
): { x: number; y: number; useLeader: boolean } {
  const pad = 8;
  const tries = [
    { x: pointX + 12, y: pointY - height - 4 },
    { x: pointX - width - 12, y: pointY - height - 4 },
    { x: pointX + 12, y: pointY + 8 },
    { x: pointX - width - 12, y: pointY + 8 },
    { x: pointX - width - 12, y: pointY - height / 2 },
    { x: pointX + 12, y: pointY - height / 2 },
    { x: pointX - width / 2, y: pointY - height - 16 },
    { x: pointX - width / 2, y: pointY + 16 },
  ];
  for (let i = 0; i < tries.length; i++) {
    const pos = tries[i];
    const box: Box = { left: pos.x, top: pos.y, width, height };
    const hitsLine = lineSegments.some((s) =>
      lineSegmentIntersectsRect(s.x1, s.y1, s.x2, s.y2, pos.x, pos.y, width, height)
    );
    if (
      pos.x >= -pad &&
      pos.x + width <= viewW + pad &&
      pos.y >= -pad &&
      pos.y + height <= viewH + pad &&
      !used.some((u) => boxesOverlap(box, u)) &&
      !hitsLine
    ) {
      used.push(box);
      return { ...pos, useLeader: i > 0 };
    }
  }
  const fallbackY = pointY - height;
  const box: Box = { left: pointX + 10, top: fallbackY, width, height };
  used.push(box);
  return { x: pointX + 10, y: fallbackY, useLeader: false };
}

const DIST_LABEL_W = 58;
const DIST_LABEL_H = 18;

export function placeDistanceLabel(
  mx: number,
  my: number,
  lineSegs: LineSegment[],
  used: Box[]
): { x: number; y: number; moved: boolean } {
  const defaultX = mx + 5;
  const defaultY = my - 5;
  const box: Box = {
    left: defaultX,
    top: defaultY - 14,
    width: DIST_LABEL_W,
    height: DIST_LABEL_H,
  };
  const hitsLine = lineSegs.some((s) =>
    lineSegmentIntersectsRect(s.x1, s.y1, s.x2, s.y2, box.left, box.top, box.width, box.height)
  );
  const hitsOther = used.some((u) => boxesOverlap(box, u));
  if (!hitsLine && !hitsOther) {
    used.push(box);
    return { x: defaultX, y: defaultY, moved: false };
  }
  const tries: [number, number][] = [
    [mx + 8, my - 18],
    [mx - DIST_LABEL_W - 5, my - 18],
    [mx + 8, my + 6],
    [mx - DIST_LABEL_W - 5, my + 6],
    [mx - DIST_LABEL_W / 2, my - 22],
    [mx - DIST_LABEL_W / 2, my + 8],
  ];
  for (const [xx, yy] of tries) {
    const b: Box = {
      left: xx,
      top: yy - 14,
      width: DIST_LABEL_W,
      height: DIST_LABEL_H,
    };
    const hitL = lineSegs.some((s) =>
      lineSegmentIntersectsRect(s.x1, s.y1, s.x2, s.y2, b.left, b.top, b.width, b.height)
    );
    const hitU = used.some((u) => boxesOverlap(b, u));
    if (!hitL && !hitU) {
      used.push(b);
      return { x: xx, y: yy, moved: true };
    }
  }
  used.push(box);
  return { x: defaultX, y: defaultY, moved: false };
}

export const LABEL_FONT_SIZE = 12;
export const LABEL_LINE_HEIGHT = 14;
export const LABEL_CHAR_WIDTH = 7;
export const LABEL_PADDING = 6;
