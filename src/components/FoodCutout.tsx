import { useEffect, useState } from "react";

const cuts = new Map<string, Promise<string>>();
let queue = Promise.resolve();
function cutout(source: string): Promise<string> {
  const existing = cuts.get(source);
  if (existing) return existing;
  const task = queue.then(async () => {
    const { removeBackground } = await import("@imgly/background-removal");
    const response = await fetch(source);
    if (!response.ok) throw new Error("Food photo unavailable");
    const image = await removeBackground(await response.blob(), { model: "isnet_quint8", device: "cpu" });
    return URL.createObjectURL(image);
  });
  cuts.set(source, task);
  queue = task.then(() => undefined, () => undefined);
  return task;
}

export function FoodCutout({ src, alt }: { src: string; alt: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setImage(null); setFailed(false);
    void cutout(src).then((url) => { if (alive) setImage(url); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [src]);
  return image ? <img src={image} alt={alt} className="festival-food-cutout" /> : failed ? <img src={src} alt={alt} className="festival-food-cutout" /> : <span className="festival-food-loading" aria-label={`Preparing ${alt} photo`} />;
}