import { measureLibassFontScale } from './useLibassFontScale';

/** jsdom has no canvas: the probe must degrade to 1 rather than throw. */
const withContext = (ctx: unknown): void => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ctx as CanvasRenderingContext2D,
  );
};

describe('measureLibassFontScale', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 1 without a 2D context', () => {
    withContext(null);
    expect(measureLibassFontScale('Arial', true, false)).toBe(1);
  });

  it('scales the CSS size so ascent + descent equals the requested size', () => {
    const ctx = {
      font: '',
      measureText: () => ({ fontBoundingBoxAscent: 90.5, fontBoundingBoxDescent: 21.2 }),
    };
    withContext(ctx);
    // Arial: (1854 + 434) / 2048 units per em ≈ 1.117.
    expect(measureLibassFontScale('Arial', true, false)).toBeCloseTo(100 / 111.7, 5);
    expect(ctx.font).toBe('bold 100px "Arial", sans-serif');
  });

  it('ignores degenerate metrics', () => {
    withContext({ measureText: () => ({ fontBoundingBoxAscent: 0, fontBoundingBoxDescent: 0 }) });
    expect(measureLibassFontScale('Nope', false, true)).toBe(1);
  });
});
