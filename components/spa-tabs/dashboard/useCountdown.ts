"use client";

import { useEffect, useState } from "react";

export function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft("");
      return;
    }

    const target = new Date(targetDate).getTime();
    if (!Number.isFinite(target)) {
      setTimeLeft("");
      return;
    }

    const update = () => {
      const diff = target - Date.now();

      if (diff <= 0) {
        setTimeLeft("Iniciada");
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const parts: string[] = [];

      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0 && days === 0) parts.push(`${seconds}s`);

      setTimeLeft(parts.join(" "));
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}
