export function formatNumberedPoints(text: string): string {
  const points = text
    .trim()
    .split(/(?=\b\d{1,2}[.)]\s+)/)
    .map((point) => point.trim())
    .filter(Boolean);
  const numberedPoints = points.filter((point) => /^\d{1,2}[.)]\s+/.test(point));

  if (numberedPoints.length < 2) return text.trim();

  return numberedPoints
    .slice(0, 5)
    .map((point, index) => `${index + 1}. ${point.replace(/^\d{1,2}[.)]\s*/, '').replace(/\s+/g, ' ').trim()}`)
    .join('\n');
}
