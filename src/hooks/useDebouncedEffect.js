import { useEffect } from "react";

/**
 * Ejecuta `effect()` después de `delay` ms cuando cambian `deps`.
 * Limpia el timer si deps vuelven a cambiar.
 */
export function useDebouncedEffect(effect, deps, delay = 700) {
  useEffect(() => {
    const t = setTimeout(() => effect(), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}