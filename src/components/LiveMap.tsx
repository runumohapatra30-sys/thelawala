import { useEffect, useState, type ComponentType } from "react";
import type { LatLng } from "@/lib/types";

type Props = {
  from: LatLng;
  to: LatLng;
  rider?: LatLng | null;
  fromKind?: "stall" | "rider";
  onEta?: (min: number, km: number) => void;
  className?: string;
};

type CanvasProps = Props;

export function LiveMap(props: Props) {
  const [Canvas, setCanvas] = useState<ComponentType<CanvasProps> | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    void import("./LiveMapCanvas")
      .then(({ LiveMapCanvas }) => {
        if (alive) setCanvas(() => LiveMapCanvas);
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoadError(error instanceof Error ? error : new Error("Could not load the map."));
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loadError) {
    console.error("Could not load the live map:", loadError);
    return (
      <div className={props.className}>
        <div className="flex h-full items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground">
          Live map is unavailable. Your latest order status is shown below.
        </div>
      </div>
    );
  }
  if (!Canvas) {
    return (
      <div className={props.className}>
        <div className="h-full w-full animate-pulse bg-[#F0F2EE]" />
      </div>
    );
  }
  return <Canvas {...props} />;
}
