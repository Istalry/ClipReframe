import { OUTPUT_HEIGHT, OUTPUT_WIDTH, RECT_MIN_SIZE } from '../constants';
import type { Rect } from '../types';

import {
  clampRect,
  clampSplitRatio,
  defaultRects,
  fitRectToAspect,
  getOutputRegions,
  getRegionAspect,
  moveRect,
  resizeRect,
  toNormalizedAspect,
  toPixelRect,
} from './layout';

const HD = { width: 1920, height: 1080 };

const expectInFrame = (r: Rect): void => {
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.y).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(1 + 1e-9);
  expect(r.y + r.height).toBeLessThanOrEqual(1 + 1e-9);
};

describe('getOutputRegions', () => {
  it('fill uses the whole canvas', () => {
    expect(getOutputRegions('fill', 0.35)).toEqual([
      { kind: 'gameplay', y: 0, height: OUTPUT_HEIGHT },
    ]);
  });

  it('split produces two even-height bands that sum to the canvas', () => {
    const [top, bottom] = getOutputRegions('split', 0.35);
    expect(top?.kind).toBe('webcam');
    expect(bottom?.kind).toBe('gameplay');
    expect(top!.height % 2).toBe(0);
    expect(bottom!.height % 2).toBe(0);
    expect(top!.height + bottom!.height).toBe(OUTPUT_HEIGHT);
    expect(bottom!.y).toBe(top!.height);
  });

  it('clamps the split ratio', () => {
    expect(clampSplitRatio(0)).toBe(0.2);
    expect(clampSplitRatio(0.9)).toBe(0.6);
    expect(getOutputRegions('split', 0.01)[0]?.height).toBe(
      getOutputRegions('split', 0.2)[0]?.height,
    );
  });
});

describe('getRegionAspect / toNormalizedAspect', () => {
  it('fill region is 9:16', () => {
    expect(getRegionAspect('fill', 0.35, 'gameplay')).toBeCloseTo(OUTPUT_WIDTH / OUTPUT_HEIGHT);
  });

  it('split regions are wider than tall', () => {
    expect(getRegionAspect('split', 0.35, 'webcam')).toBeGreaterThan(1);
    expect(getRegionAspect('split', 0.35, 'gameplay')).toBeLessThan(1);
  });

  it('converts pixel aspect to normalised aspect for a 16:9 frame', () => {
    // A 1:1 pixel square in a 16:9 frame is 9/16 as wide as it is tall in normalised units.
    expect(toNormalizedAspect(1, HD)).toBeCloseTo(9 / 16);
  });
});

describe('clampRect', () => {
  it('keeps a rect inside the frame', () => {
    expectInFrame(clampRect({ x: 0.9, y: -0.2, width: 0.5, height: 0.5 }));
  });

  it('enforces the minimum size', () => {
    const r = clampRect({ x: 0, y: 0, width: 0.001, height: 0.001 });
    expect(r.width).toBe(RECT_MIN_SIZE);
    expect(r.height).toBe(RECT_MIN_SIZE);
  });
});

describe('fitRectToAspect', () => {
  it('keeps the centre and applies the aspect', () => {
    const r = fitRectToAspect({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, 2);
    expect(r.width / r.height).toBeCloseTo(2);
    expect(r.x + r.width / 2).toBeCloseTo(0.5);
    expect(r.y + r.height / 2).toBeCloseTo(0.5);
  });

  it('shrinks a rect that would overflow the frame', () => {
    const r = fitRectToAspect({ x: 0, y: 0, width: 1, height: 1 }, 0.25);
    expectInFrame(r);
    expect(r.width / r.height).toBeCloseTo(0.25);
  });
});

describe('moveRect', () => {
  it('translates and clamps', () => {
    const r = moveRect({ x: 0.5, y: 0.5, width: 0.4, height: 0.4 }, 0.5, -1);
    expect(r).toEqual({ x: 0.6, y: 0, width: 0.4, height: 0.4 });
  });
});

describe('resizeRect', () => {
  const base: Rect = { x: 0.3, y: 0.3, width: 0.4, height: 0.2 };
  const aspect = 2;

  it.each(['e', 'w', 'n', 's', 'ne', 'nw', 'se', 'sw'] as const)(
    'handle %s preserves the aspect and stays in frame',
    (handle) => {
      const r = resizeRect(base, handle, 0.05, 0.05, aspect);
      expect(r.width / r.height).toBeCloseTo(aspect, 5);
      expectInFrame(r);
    },
  );

  it('anchors the opposite corner when dragging se', () => {
    const r = resizeRect(base, 'se', 0.1, 0, aspect);
    expect(r.x).toBeCloseTo(base.x);
    expect(r.y).toBeCloseTo(base.y);
    expect(r.width).toBeCloseTo(0.5);
  });

  it('anchors the right edge when dragging w', () => {
    const r = resizeRect(base, 'w', -0.1, 0, aspect);
    expect(r.x + r.width).toBeCloseTo(base.x + base.width);
    expect(r.width).toBeCloseTo(0.5);
  });

  it('caps growth at the frame edge instead of sliding', () => {
    const r = resizeRect({ x: 0.5, y: 0.5, width: 0.4, height: 0.2 }, 'se', 5, 5, aspect);
    expect(r.x).toBeCloseTo(0.5);
    expect(r.y).toBeCloseTo(0.5);
    expectInFrame(r);
    expect(r.width / r.height).toBeCloseTo(aspect, 5);
  });

  it('never goes below the minimum size', () => {
    const r = resizeRect(base, 'se', -5, -5, aspect);
    expect(r.width).toBeGreaterThanOrEqual(RECT_MIN_SIZE);
    expect(r.height).toBeGreaterThanOrEqual(RECT_MIN_SIZE);
  });
});

describe('toPixelRect', () => {
  it('produces even coordinates and sizes', () => {
    const p = toPixelRect({ x: 0.1234, y: 0.4321, width: 0.333, height: 0.2 }, HD);
    for (const v of Object.values(p)) {
      expect(v % 2).toBe(0);
    }
  });

  it('never exceeds the frame', () => {
    const p = toPixelRect(
      { x: 0.999, y: 0.999, width: 1, height: 1 },
      { width: 1921, height: 1081 },
    );
    expect(p.x + p.width).toBeLessThanOrEqual(1920);
    expect(p.y + p.height).toBeLessThanOrEqual(1080);
  });
});

describe('defaultRects', () => {
  it('returns aspect-correct rects inside the frame', () => {
    const { webcamRect, gameplayRect } = defaultRects('split', 0.35, HD);
    expectInFrame(webcamRect);
    expectInFrame(gameplayRect);
    expect(webcamRect.width / webcamRect.height).toBeCloseTo(
      toNormalizedAspect(getRegionAspect('split', 0.35, 'webcam'), HD),
    );
    expect(gameplayRect.width / gameplayRect.height).toBeCloseTo(
      toNormalizedAspect(getRegionAspect('split', 0.35, 'gameplay'), HD),
    );
  });
});
