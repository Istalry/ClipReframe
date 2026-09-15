import { Scissors, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatTime } from '../../lib/format';
import { usePlayerStore } from '../../store/player';
import { useProjectStore } from '../../store/project';
import { Button } from '../ui/Button';

/** Set the trim in/out points at the playhead (also I / O keys) and clear them. */
export function TrimControls(): ReactNode {
  const trim = useProjectStore((s) => s.trim);
  const setTrimStart = useProjectStore((s) => s.setTrimStart);
  const setTrimEnd = useProjectStore((s) => s.setTrimEnd);
  const setTrim = useProjectStore((s) => s.setTrim);
  const currentTime = usePlayerStore((s) => s.currentTime);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        title="Set start of the exported range at the playhead (I)"
        aria-label="Set trim start"
        onClick={() => {
          setTrimStart(currentTime);
        }}
      >
        [
      </Button>
      <Button
        variant="ghost"
        size="sm"
        title="Set end of the exported range at the playhead (O)"
        aria-label="Set trim end"
        onClick={() => {
          setTrimEnd(currentTime);
        }}
      >
        ]
      </Button>
      {trim && (
        <span className="text-accent flex shrink-0 items-center gap-1 text-xs whitespace-nowrap tabular-nums">
          <Scissors size={12} />
          {formatTime(trim.start)} – {formatTime(trim.end)}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Clear trim"
            title="Export the whole clip again"
            icon={<X size={12} />}
            onClick={() => {
              setTrim(null);
            }}
          />
        </span>
      )}
    </div>
  );
}
