export function pngFileName(index: number, total: number): string {
  const width = String(total).length;
  return `card-${String(index + 1).padStart(width, '0')}.png`;
}
