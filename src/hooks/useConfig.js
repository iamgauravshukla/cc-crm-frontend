import { useState, useEffect } from 'react';
import { getConfig } from '../services/api';

// Module-level cache so all components share one fetch per session
let _cache = null;
let _cacheTime = 0;
const TTL = 5 * 60 * 1000; // 5 minutes

export function invalidateConfigCache() {
  _cache = null;
  _cacheTime = 0;
}

export function useConfig() {
  const [config, setConfig] = useState(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError]   = useState('');

  useEffect(() => {
    const now = Date.now();
    if (_cache && (now - _cacheTime) < TTL) {
      setConfig(_cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    getConfig()
      .then(res => {
        _cache = res.data.config;
        _cacheTime = Date.now();
        setConfig(_cache);
      })
      .catch(() => setError('Failed to load dropdown options'))
      .finally(() => setLoading(false));
  }, []);

  // Returns plain arrays (just value strings) for easy use in <select>
  const options = {
    branches:  (config?.branch         || []).map(o => o.value),
    statuses:  (config?.booking_status || []).map(o => o.value),
    treatments:(config?.treatment       || []).map(o => o.value),
    agents:    (config?.agent           || []).map(o => o.value),
  };

  return { config, options, loading, error };
}
