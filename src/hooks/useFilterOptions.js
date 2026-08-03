import { useState, useEffect } from 'react';
import { getFilterOptions } from '../services/api';
import { useConfig } from './useConfig';

// Module-level cache — the distinct values change rarely; one fetch per session.
let _cache = null;

/**
 * Filter dropdown options that reflect the REAL data (distinct branch/status/agent
 * present in bookings), falling back to the configured lists when the data query
 * hasn't loaded yet or returns nothing. Config agent lists in particular drift.
 */
export function useFilterOptions() {
  const { options: cfg } = useConfig();
  const [data, setData] = useState(_cache);

  useEffect(() => {
    if (_cache) return;
    getFilterOptions()
      .then((r) => { if (r.data?.options) { _cache = r.data.options; setData(_cache); } })
      .catch(() => {});
  }, []);

  const pick = (key) => (data && data[key] && data[key].length ? data[key] : (cfg[key] || []));
  return { branches: pick('branches'), statuses: pick('statuses'), agents: pick('agents') };
}
