export type FestiveEvent = "navratri" | "diwali" | "shivratri" | "default";

export type FestiveFilter = {
  label: string;
  query: string;
};

export type FestiveContext = {
  event: FestiveEvent;
  eventLabel: string;
  title: string;
  description: string;
  background: string;
  foreground: string;
  accent: string;
  image: string;
  filters: FestiveFilter[];
};

const CONTEXTS: Record<FestiveEvent, Omit<FestiveContext, "event">> = {
  navratri: {
    eventLabel: "Navratri & Durga Puja",
    title: "Fasting, but make it tasty",
    description: "Vrat-friendly bites, puja bhog and festive sweets from local stalls.",
    background: "linear-gradient(135deg, #FFF5E8 0%, #FFE3C2 52%, #FFD4AE 100%)",
    foreground: "#542D20",
    accent: "#D84A16",
    image: "/food/food-tiffin.jpg",
    filters: [
      { label: "Atta & Millets", query: "atta" },
      { label: "Snacks", query: "snack" },
      { label: "Makhana & Sabudana", query: "makhana" },
    ],
  },
  diwali: {
    eventLabel: "Diwali",
    title: "Celebrate with Sweet Delights",
    description: "Share the light with mithai, dry fruits, gift packs and festive snacks.",
    background: "linear-gradient(135deg, #FFF3CE 0%, #FFE1A1 52%, #F6BE63 100%)",
    foreground: "#51331A",
    accent: "#A85B08",
    image: "/food/food-sweets.jpg",
    filters: [
      { label: "Mithai", query: "sweet" },
      { label: "Dry Fruits", query: "dry fruit" },
      { label: "Savouries", query: "snack" },
      { label: "Pooja Needs", query: "puja" },
    ],
  },
  shivratri: {
    eventLabel: "Maha Shivratri",
    title: "A little vrat, a lot of goodness",
    description: "Keep it simple with satvik vrat favourites, fresh fruit and milk specials.",
    background: "linear-gradient(135deg, #F5F3EE 0%, #E5E1D8 55%, #D5DED4 100%)",
    foreground: "#26372D",
    accent: "#476B4D",
    image: "/food/food-tiffin.jpg",
    filters: [
      { label: "Pure Satvik Vrat", query: "satvik" },
      { label: "Fruits", query: "fruit" },
      { label: "Milk Specials", query: "milk" },
    ],
  },
  default: {
    eventLabel: "Weekend Craves",
    title: "A little treat for your cravings",
    description: "Rain or shine, your neighbourhood favourites are just around the corner.",
    background: "linear-gradient(135deg, #F1F8F4 0%, #E1F0E8 55%, #D8E9E5 100%)",
    foreground: "#163B32",
    accent: "#0A7656",
    image: "/food/food-chaat.jpg",
    filters: [
      { label: "Best Sellers", query: "best seller" },
      { label: "Hot Chaat", query: "chaat" },
      { label: "Beverages", query: "beverage" },
    ],
  },
};

function localCalendarDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    month: Number(value("month")),
    day: Number(value("day")),
    weekday: value("weekday"),
  };
}

function isBetween(month: number, day: number, start: [number, number], end: [number, number]) {
  const current = month * 100 + day;
  return current >= start[0] * 100 + start[1] && current <= end[0] * 100 + end[1];
}

/** Uses broad seasonal windows so the experience works without a per-year festival API. */
export function getFestiveContext(date = new Date(), timeZone = "Asia/Kolkata"): FestiveContext {
  const { month, day, weekday } = localCalendarDate(date, timeZone);
  let event: FestiveEvent = "default";

  if (isBetween(month, day, [9, 20], [10, 15])) {
    event = "navratri";
  } else if (isBetween(month, day, [10, 16], [11, 15])) {
    event = "diwali";
  } else if (isBetween(month, day, [2, 1], [3, 15])) {
    event = "shivratri";
  }

  const context = CONTEXTS[event];
  if (event !== "default") return { event, ...context };

  const isWeekend = weekday === "Sat" || weekday === "Sun";
  return {
    event,
    ...context,
    eventLabel: isWeekend ? "Weekend Craves" : "Regular Days",
    title: isWeekend ? "Weekend cravings, sorted" : "Fresh street-food favourites",
    description: isBetween(month, day, [6, 1], [9, 30])
      ? "Monsoon snacks and street chaat, made fresh by your neighbourhood stalls."
      : context.description,
  };
}
