import { useEffect } from 'react';
import { useGraphStore } from '../store/graphStore';

export function useGraphState() {
  const hydrate = useGraphStore((s) => s.hydrate);
  const bootstrapped = useGraphStore((s) => s.bootstrapped);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return { bootstrapped };
}
