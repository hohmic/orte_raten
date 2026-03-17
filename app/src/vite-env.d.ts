/// <reference types="vite/client" />

declare module '@d3fc/d3fc-label-layout' {
  export function layoutGreedy(): {
    bounds(rect: { x: number; y: number; width: number; height: number }): (data: Array<{ x: number; y: number; width: number; height: number }>) => Array<{ x: number; y: number; width: number; height: number }>;
  };
}
