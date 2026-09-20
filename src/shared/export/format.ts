/** Filter and CLI numbers: integers stay short, everything else gets millisecond precision. */
export const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(3));
