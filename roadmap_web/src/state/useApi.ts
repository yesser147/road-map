import { useEffect, useState, type DependencyList } from "react";
import { useSession } from "./session";

/** Charge une ressource de l'API ; recharge quand `deps` ou le profil actif changent. */
export function useApi<T>(load: () => Promise<T>, deps: DependencyList = []) {
  const { version } = useSession();
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e: Error) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, tick, ...deps]);

  return { data, error, loading, reload: () => setTick((t) => t + 1), setData };
}
