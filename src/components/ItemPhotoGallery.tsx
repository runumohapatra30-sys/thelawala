import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ItemPhotoGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [name]);
  const current = images[selected] ?? images[0];
  return <div className="relative aspect-[4/3] max-h-[420px] bg-brand-soft">
    <img src={current} alt={`${name} · photo ${selected + 1}`} className="h-full w-full object-cover" />
    {images.length > 1 ? <>
      <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
        <Button variant="secondary" size="icon" aria-label="Previous item photo" className="rounded-full" onClick={() => setSelected((selected + images.length - 1) % images.length)}><ChevronLeft /></Button>
        <Button variant="secondary" size="icon" aria-label="Next item photo" className="rounded-full" onClick={() => setSelected((selected + 1) % images.length)}><ChevronRight /></Button>
      </div>
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-card/95 px-2 shadow-sm">{images.map((url, index) => <Button key={url} variant="ghost" size="icon" className="h-7 w-7" aria-label={`Show item photo ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)}><span className={`h-1.5 w-1.5 rounded-full ${selected === index ? "bg-primary" : "bg-muted-foreground/40"}`} /></Button>)}</div>
    </> : null}
  </div>;
}