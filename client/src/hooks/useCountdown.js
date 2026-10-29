import { useEffect, useState } from 'react';

export default function useCountdown(deadline) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!deadline) {
      setSecs(0);
      return;
    }

    // Force MySQL string formats to parse as UTC correctly
    let dateStr = deadline;
    if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
      dateStr = dateStr.replace(' ', 'T') + 'Z';
    }

    const target = new Date(dateStr).getTime();

    if (isNaN(target)) {
      console.error("Invalid deadline provided to useCountdown:", deadline);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.ceil((target - now) / 1000));
      setSecs(diff);
    };

    updateTimer(); // Run immediately
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return secs;
}