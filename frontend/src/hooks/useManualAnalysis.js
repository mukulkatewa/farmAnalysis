import { useEffect, useRef, useState } from "react";
import {
  getAnalysis,
  requestAnalysis,
  saveAnalysis,
} from "../utils/analysisRequests.js";

export function useManualAnalysis(key, run, load) {
  const [state, setState] = useState(() => ({ key, result: getAnalysis(key) }));
  const active = useRef(key);
  active.current = key;
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    active.current = key;
    setState({ key, result: getAnalysis(key) });
    let cancelled = false;
    if (loader.current) {
      const loadCurrent = loader.current;
      setState({ key, result: getAnalysis(key), loading: true });
      Promise.resolve()
        .then(() => loadCurrent())
        .then((data) => {
          if (!cancelled)
            setState({ key, result: data ? saveAnalysis(key, data) : null });
        })
        .catch((error) => {
          if (!cancelled) setState({ key, error: error.message });
        });
    }
    return () => {
      cancelled = true;
      active.current = null;
    };
  }, [key]);
  const visible = state.key === key ? state : { result: getAnalysis(key) };
  const analyze = async (refresh = false) => {
    if (!key || visible.loading) return;
    setState({ key, result: visible.result, loading: true });
    try {
      const result = await requestAnalysis(key, () => run(refresh === true));
      if (active.current === key) setState({ key, result });
    } catch (error) {
      if (active.current === key)
        setState({ key, result: visible.result, error: error.message });
    }
  };
  return {
    data: visible.result?.data,
    completedAt: visible.result?.completedAt,
    loading: !!visible.loading,
    error: visible.error,
    stale: !!visible.result?.data?.analysis?.stale,
    analyze,
  };
}
