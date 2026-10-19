import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles, Store } from "lucide-react";

type Palette = { base: string; tint: string; complement: string; ink: string };

const DEFAULT_PALETTE: Palette = {
  base: "#51866A",
  tint: "#E7F1EA",
  complement: "#8E6951",
  ink: "#173D2B",
};

function colorHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function useImagePalette(src: string) {
  const [palette, setPalette] = useState(DEFAULT_PALETTE);

  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 24;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let red = 0,
          green = 0,
          blue = 0,
          count = 0;
        for (let index = 0; index < pixels.length; index += 16) {
          if (pixels[index + 3]! < 200) continue;
          red += pixels[index]!;
          green += pixels[index + 1]!;
          blue += pixels[index + 2]!;
          count += 1;
        }
        if (!count || !alive) return;
        const r = red / count,
          g = green / count,
          b = blue / count;
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const blend = luminance < 0.38 ? 0.42 : 0.68;
        const softened = [r, g, b].map((value) => value * (1 - blend) + 255 * blend);
        const complement = [255 - r, 255 - g, 255 - b].map((value) => value * 0.72 + 255 * 0.28);
        setPalette({
          base: colorHex(r, g, b),
          tint: colorHex(softened[0]!, softened[1]!, softened[2]!),
          complement: colorHex(complement[0]!, complement[1]!, complement[2]!),
          ink: luminance < 0.48 ? "#FFFFFF" : "#17251D",
        });
      } catch (error) {
        console.warn("Could not derive a campaign-card palette from its image:", error);
        if (alive) setPalette(DEFAULT_PALETTE);
      }
    };
    image.onerror = () => {
      if (alive) setPalette(DEFAULT_PALETTE);
    };
    image.src = src;
    return () => {
      alive = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  return palette;
}

export type VisualCampaignCardProps = {
  image: string;
  title: string;
  subtitle: string;
  badge: string;
  styleIndex: number;
  enabled: boolean;
  onClick: () => void;
};

export function VisualCampaignCard({
  image,
  title,
  subtitle,
  badge,
  styleIndex,
  enabled,
  onClick,
}: VisualCampaignCardProps) {
  const palette = useImagePalette(image);
  const reduceMotion = useReducedMotion();
  const variant = ((styleIndex % 4) + 4) % 4;

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-[calc(50%-6px)] min-w-[188px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm"
      >
        <img src={image} alt="" loading="lazy" className="h-28 w-full object-cover" />
        <span className="block p-2.5">
          <span className="block truncate text-xs font-black text-foreground">{title}</span>
          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
            {subtitle}
          </span>
        </span>
      </button>
    );
  }

  const enter = reduceMotion
    ? {}
    : { whileHover: { y: -3, scale: 1.015 }, whileTap: { scale: 0.98 } };
  const badgeStyle = {
    backgroundColor: palette.tint,
    color: palette.ink,
    borderColor: palette.base,
  };

  if (variant === 2) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        {...enter}
        className="relative h-[252px] w-[calc(50%-6px)] min-w-[188px] shrink-0 snap-start overflow-hidden rounded-[1.6rem] border border-border bg-white text-left shadow-[0_12px_24px_-18px_rgba(18,38,28,.65)]"
      >
        <span
          className="absolute inset-x-0 top-0 h-[164px] overflow-hidden"
          style={{ clipPath: "ellipse(96% 84% at 50% 15%)" }}
        >
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        </span>
        <span className="absolute left-1/2 top-[132px] grid h-14 w-14 -translate-x-1/2 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-md">
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        </span>
        <span className="absolute inset-x-2 bottom-2 text-center">
          <span className="block truncate text-xs font-black text-[#23372b]">{title}</span>
          <span className="mt-0.5 block truncate text-[9px] font-medium text-muted-foreground">
            {subtitle}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-black text-primary">
            Claim now <ArrowRight className="h-3 w-3" />
          </span>
        </span>
        <span
          className="absolute left-2 top-2 rounded-full border px-2 py-1 text-[8px] font-black shadow-sm"
          style={badgeStyle}
        >
          {badge}
        </span>
      </motion.button>
    );
  }

  if (variant === 3) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        {...enter}
        className="relative h-[252px] w-[calc(50%-6px)] min-w-[188px] shrink-0 snap-start overflow-hidden rounded-[1.6rem] border border-[#d8b85d] bg-[linear-gradient(150deg,#271442,#49265d_60%,#17223f)] text-left shadow-[0_0_25px_-12px_rgba(179,133,53,.75)]"
        style={{ boxShadow: `0 0 24px -12px ${palette.base}` }}
      >
        <img src={image} alt="" loading="lazy" className="h-28 w-full object-cover opacity-85" />
        <span className="absolute inset-x-0 top-20 h-10 bg-gradient-to-t from-[#271442] to-transparent" />
        <span className="absolute left-2 top-2 rounded-full border border-[#e0be64] bg-black/35 px-2 py-1 text-[8px] font-black text-[#ffe6a0]">
          {badge}
        </span>
        <span className="absolute inset-x-2 bottom-2">
          <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.16em] text-[#f3d782]">
            <Sparkles className="h-3 w-3" /> Festive glow
          </span>
          <span className="mt-1 block truncate text-xs font-black text-white">{title}</span>
          <span className="mt-0.5 block truncate text-[9px] font-medium text-white/70">
            {subtitle}
          </span>
        </span>
      </motion.button>
    );
  }

  if (variant === 1) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        {...enter}
        className="relative h-[252px] w-[calc(50%-6px)] min-w-[188px] shrink-0 snap-start overflow-hidden rounded-[1.6rem] border-2 p-2 text-left shadow-[0_12px_24px_-18px_rgba(18,38,28,.65)]"
        style={{
          borderColor: palette.base,
          background: `linear-gradient(145deg,${palette.complement},${palette.base})`,
          color: palette.ink,
        }}
      >
        <img
          src={image}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-soft-light"
        />
        <span className="relative flex h-full flex-col justify-between">
          <span className="flex items-start justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/85 text-primary">
              <Store className="h-4 w-4" />
            </span>
            <span className="rounded-full bg-white/90 px-2 py-1 text-[8px] font-black text-[#26372d] shadow-sm">
              {badge}
            </span>
          </span>
          <span className="rounded-xl bg-white/90 p-2 text-[#20342a] backdrop-blur-sm">
            <span className="block truncate text-xs font-black">{title}</span>
            <span className="mt-0.5 block truncate text-[9px] font-medium">{subtitle}</span>
          </span>
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      {...enter}
      className="relative h-[252px] w-[calc(50%-6px)] min-w-[188px] shrink-0 snap-start overflow-hidden rounded-[1.6rem] border p-2.5 text-left shadow-[0_12px_24px_-18px_rgba(18,38,28,.65)]"
      style={{
        borderColor: palette.base,
        background: `linear-gradient(145deg,${palette.tint},#ffffff 75%)`,
      }}
    >
      <span
        className="absolute -right-7 -top-7 h-24 w-24 rounded-full opacity-25 blur-2xl"
        style={{ backgroundColor: palette.base }}
      />
      <span className="relative flex h-full flex-col justify-between">
        <span className="flex justify-end">
          <span className="rounded-full border px-2 py-1 text-[8px] font-black" style={badgeStyle}>
            {badge}
          </span>
        </span>
        <img
          src={image}
          alt=""
          loading="lazy"
          className="mx-auto h-[112px] w-[150px] rounded-[2rem_2rem_1.2rem_1.2rem] object-cover shadow-md"
        />
        <span
          className="rounded-full px-2.5 py-2 text-center text-[#20382b]"
          style={{ backgroundColor: "rgba(255,255,255,.82)" }}
        >
          <span className="block truncate text-xs font-black">{title}</span>
          <span className="mt-0.5 block truncate text-[9px] font-medium">{subtitle}</span>
        </span>
      </span>
    </motion.button>
  );
}
