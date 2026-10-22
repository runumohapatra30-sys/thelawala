import { useEffect, useState } from "react";
import { CloudRain } from "lucide-react";
import { isRainWeather } from "@/lib/homePresentation";

export function RainIndicator({ enabled }: { enabled: boolean }) {
  const [raining, setRaining] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const check = async () => {
      try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=20.2961&longitude=85.8245&current=precipitation,weather_code", { signal: controller.signal });
        if (!response.ok) return;
        const data: { current?: { precipitation?: number; weather_code?: number } } = await response.json();
        setRaining(isRainWeather(Number(data.current?.precipitation ?? 0), Number(data.current?.weather_code ?? 0)));
      } catch { /* Weather failure must not interfere with ordering. */ }
    };
    void check();
    const timer = window.setInterval(check, 600000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [enabled]);
  return enabled && raining ? <span className="rain-indicator" role="img" aria-label="Rain in Bhubaneswar"><CloudRain className="h-5 w-5" /><span className="text-[10px] font-bold">ବର୍ଷା</span></span> : null;
}