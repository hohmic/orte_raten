/**
 * Mindmap-artiges Label-Layout mit d3-force:
 * Labels werden von ihren Ankern angezogen und stoßen sich gegenseitig
 * sowie von den Kartenpunkten ab. Ergebnis: kollisionsfrei, lesbar, stabil.
 */
import {
  forceSimulation,
  forceCollide,
  forceX as d3ForceX,
  forceY as d3ForceY,
  type SimulationNodeDatum,
} from 'd3-force';

const LABEL_PADDING = 10;
const POINT_RADIUS = 16;
const POINT_LABEL_MARGIN = 8;
const TICKS = 280;
const ANCHOR_STRENGTH = 0.07;

export interface ForceLabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  [key: string]: unknown;
}

interface SimNode extends SimulationNodeDatum {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  radius: number;
  fixed: boolean;
  boxIndex: number;
}

/**
 * Platziert Labels mit Force-Simulation: Anziehung zum Anker, Kollision
 * untereinander und mit allen Kartenpunkten. Alle Texte bleiben sichtbar.
 */
export function placeLabelsForce<T extends ForceLabelBox>(
  boxes: T[],
  points: Array<{ x: number; y: number }>,
  viewWidth: number,
  viewHeight: number
): T[] {
  if (boxes.length === 0) return [];

  const nodes: SimNode[] = [];

  points.forEach((pt) => {
    nodes.push({
      x: pt.x,
      y: pt.y,
      vx: 0,
      vy: 0,
      fx: pt.x,
      fy: pt.y,
      width: 0,
      height: 0,
      anchorX: pt.x,
      anchorY: pt.y,
      radius: POINT_RADIUS + POINT_LABEL_MARGIN,
      fixed: true,
      boxIndex: -1,
    });
  });

  boxes.forEach((box, i) => {
    const cx = box.anchorX;
    const cy = box.anchorY;
    const radius = Math.hypot(box.width, box.height) / 2 + LABEL_PADDING;
    nodes.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      width: box.width,
      height: box.height,
      anchorX: box.anchorX,
      anchorY: box.anchorY,
      radius,
      fixed: false,
      boxIndex: i,
    });
  });

  const collide = forceCollide<SimNode>()
    .radius((d: SimNode) => d.radius)
    .strength(0.85)
    .iterations(3);

  const anchorForceX = d3ForceX<SimNode>((d: SimNode) => (d.fixed ? d.x : d.anchorX))
    .strength((d: SimNode) => (d.fixed ? 0 : ANCHOR_STRENGTH));
  const anchorForceY = d3ForceY<SimNode>((d: SimNode) => (d.fixed ? d.y : d.anchorY))
    .strength((d: SimNode) => (d.fixed ? 0 : ANCHOR_STRENGTH));

  const sim = forceSimulation<SimNode>(nodes)
    .force('collide', collide)
    .force('x', anchorForceX)
    .force('y', anchorForceY)
    .stop();

  for (let i = 0; i < TICKS; i++) sim.tick();

  const out = boxes.slice();
  nodes.forEach((n) => {
    if (n.fixed || n.boxIndex < 0) return;
    let x = n.x - n.width / 2;
    let y = n.y - n.height / 2;
    x = Math.max(0, Math.min(viewWidth - n.width, x));
    y = Math.max(0, Math.min(viewHeight - n.height, y));
    out[n.boxIndex] = { ...out[n.boxIndex], x, y };
  });
  return out;
}
