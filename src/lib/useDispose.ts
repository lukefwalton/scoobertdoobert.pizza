import { useEffect } from 'react';

// A three.js disposable (material / geometry / texture / render target) — anything
// with a .dispose(). Kept structural so we don't import three just for the type.
type Disposable = { dispose: () => void };

/** Dispose three.js resources (materials, geometries, textures) when the component
 *  unmounts. Replaces the ubiquitous `useEffect(() => () => { a.dispose(); b.dispose() }, [...])`
 *  boilerplate that was hand-spelled in dozens of room/effect components.
 *
 *  Pass the same memoized resources you create with useMemo. Nullish entries are
 *  skipped, so conditional resources are fine. The cleanup runs on unmount (and if
 *  the set identity changes), exactly like the inline pattern it replaces. */
export function useDispose(...items: (Disposable | null | undefined)[]): void {
  useEffect(
    () => () => {
      for (const item of items) item?.dispose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    items,
  );
}
