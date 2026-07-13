import { type Context, createContext, type ReactNode, useContext } from 'react';

const globalStore = globalThis as typeof globalThis & {
  __openCardsPngExportVariantContext?: Context<string | null>;
};

// The app and authored slides can load separate core module instances in dev.
const PngExportVariantContext =
  globalStore.__openCardsPngExportVariantContext ?? createContext<string | null>(null);
globalStore.__openCardsPngExportVariantContext = PngExportVariantContext;

export function PngExportVariantProvider({
  children,
  value,
}: {
  children?: ReactNode;
  value: string | null;
}) {
  return (
    <PngExportVariantContext.Provider value={value}>{children}</PngExportVariantContext.Provider>
  );
}

export function usePngExportVariant(): string | null {
  return useContext(PngExportVariantContext);
}
