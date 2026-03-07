import { useState, useEffect } from 'react';

/**
 * Returns `true` only after `delayMs` has passed while `loading` is true.
 * This prevents flash-of-spinner for fast loads (< 2s).
 */
export function useDelayedLoading(loading: boolean, delayMs = 1500): boolean {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowLoader(false);
      return;
    }

    const timer = setTimeout(() => setShowLoader(true), delayMs);
    return () => clearTimeout(timer);
  }, [loading, delayMs]);

  return showLoader;
}
