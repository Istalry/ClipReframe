import { fireEvent, render, screen } from '@testing-library/react';

import type { Rect } from '@shared/types';

import { TransformRect } from './TransformRect';

const STAGE = { width: 1000, height: 500 };
const base: Rect = { x: 0.2, y: 0.2, width: 0.4, height: 0.2 };

function setup(rect: Rect = base, selected = false): { onChange: ReturnType<typeof vi.fn>; onSelect: ReturnType<typeof vi.fn> } {
  const onChange = vi.fn();
  const onSelect = vi.fn();
  render(
    <TransformRect
      kind="gameplay"
      rect={rect}
      normalizedAspect={2}
      selected={selected}
      getStageSize={() => STAGE}
      onChange={onChange}
      onSelect={onSelect}
    />,
  );
  return { onChange, onSelect };
}

beforeAll(() => {
  // jsdom does not implement pointer capture.
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

describe('TransformRect', () => {
  it('positions itself from the normalised rect', () => {
    setup();
    const el = screen.getByTestId('rect-gameplay');
    expect(el.style.left).toBe('20%');
    expect(el.style.top).toBe('20%');
    expect(el.style.width).toBe('40%');
    expect(el.style.height).toBe('20%');
  });

  it('moves by the pointer delta scaled to the stage size', () => {
    const { onChange, onSelect } = setup();
    const el = screen.getByTestId('rect-gameplay');
    fireEvent.pointerDown(el, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    expect(onSelect).toHaveBeenCalled();
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 200, clientY: 150 });
    const moved = onChange.mock.lastCall?.[0] as Rect;
    expect(moved.x).toBeCloseTo(0.3);
    expect(moved.y).toBeCloseTo(0.3);
    expect(moved.width).toBeCloseTo(0.4);
    fireEvent.pointerUp(window, { pointerId: 1 });
    // No further updates after release.
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 900, clientY: 400 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('resizes from the south-east handle keeping the aspect and the anchor', () => {
    const { onChange } = setup();
    fireEvent.pointerDown(screen.getByTestId('handle-gameplay-se'), {
      button: 0,
      pointerId: 2,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 100, clientY: 0 });
    const resized = onChange.mock.lastCall?.[0] as Rect;
    expect(resized.x).toBeCloseTo(base.x);
    expect(resized.y).toBeCloseTo(base.y);
    expect(resized.width).toBeCloseTo(0.5);
    expect(resized.width / resized.height).toBeCloseTo(2);
  });

  it('ignores pointers other than the one that started the drag', () => {
    const { onChange } = setup();
    fireEvent.pointerDown(screen.getByTestId('rect-gameplay'), { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { pointerId: 99, clientX: 500, clientY: 0 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores non-primary buttons', () => {
    const { onChange, onSelect } = setup();
    fireEvent.pointerDown(screen.getByTestId('rect-gameplay'), { button: 2, pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 500, clientY: 0 });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
