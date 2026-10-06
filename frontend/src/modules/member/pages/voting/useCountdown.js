import { useState, useEffect } from 'react';

// Live countdown to a date. Calls onDone once when it reaches zero.
export default function useCountdown(target, onDone) {
  const compute = () => {
    const ms = target ? new Date(target).getTime() - Date.now() : 0;
    return Math.max(0, ms);
  };
  const [ms, setMs] = useState(compute);

  useEffect(() => {
    if (!target) return undefined;
    setMs(compute());
    const timer = setInterval(() => {
      const next = compute();
      setMs(next);
      if (next <= 0) {
        clearInterval(timer);
        if (onDone) onDone();
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const total = Math.floor(ms / 1000);
  return {
    done: ms <= 0,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60
  };
}

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
