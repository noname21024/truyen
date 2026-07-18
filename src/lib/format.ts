// Compact number formatting shared across novel/chapter view-count displays
export function formatViews(val: number): string {
  const n = val || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}
