export const ASSET_DND_TYPE = 'application/x-open-cards-asset';

export type AssetDragPayload = { name: string; scope: 'slide' | 'global' };

export function hasAssetDrag(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes(ASSET_DND_TYPE);
}

export function readAssetDrag(dt: DataTransfer): AssetDragPayload | null {
  const raw = dt.getData(ASSET_DND_TYPE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AssetDragPayload>;
    if (typeof parsed.name !== 'string' || !parsed.name) return null;
    if (parsed.scope !== 'slide' && parsed.scope !== 'global') return null;
    return { name: parsed.name, scope: parsed.scope };
  } catch {
    return null;
  }
}

export function assetPathFor(payload: AssetDragPayload): string {
  return payload.scope === 'global' ? `@assets/${payload.name}` : `./assets/${payload.name}`;
}
