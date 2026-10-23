import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { itemPhotos, validateItemPhotoCount } from "@/lib/itemPhotos";

export function ItemPhotoEditor({ primary, gallery, upload, save }: {
  primary: string | null; gallery: string[]; upload: (file: File) => Promise<string>; save: (urls: string[]) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const images = itemPhotos(primary, gallery);
  async function add(files: File[]) {
    if (!validateItemPhotoCount(images.length + files.length)) { toast.error("Choose up to four photos in total."); return; }
    setBusy(true);
    try { const urls = await Promise.all(files.map(upload)); await save([...images, ...urls]); toast.success("Item photos updated."); }
    catch { toast.error("Could not save the item photos. Please try again."); }
    finally { setBusy(false); }
  }
  async function remove(index: number) {
    setBusy(true);
    try { await save(images.filter((_, current) => current !== index)); }
    catch { toast.error("Could not remove that photo."); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-2" aria-label="Item photos">
    {images.map((url, index) => <div key={url} className="relative"><img src={url} alt={`Dish photo ${index + 1}`} className="h-14 w-14 rounded-lg object-cover" /><Button variant="secondary" size="icon" className="absolute -right-1 -top-1 h-5 w-5 rounded-full" aria-label={`Remove dish photo ${index + 1}`} disabled={busy} onClick={() => void remove(index)}><X className="h-3 w-3" /></Button></div>)}
    {images.length < 4 ? <label className={`grid h-14 w-14 cursor-pointer place-items-center rounded-lg border border-dashed border-primary text-primary ${busy ? "pointer-events-none opacity-50" : ""}`}><ImagePlus className="h-5 w-5" /><input aria-label="Add item photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} className="sr-only" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; if (files.length) void add(files); }} /></label> : null}
    <span className="text-[10px] text-muted-foreground">{busy ? "Saving…" : `${images.length}/4 photos`}</span>
  </div>;
}