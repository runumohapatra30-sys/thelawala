export type CareIntent = "tickets" | "support" | "products" | "about" | "orders" | "other";

export function careIntent(text: string): CareIntent {
  const value = text.toLowerCase().trim();
  if (/ticket|tiket|ଟିକେଟ/.test(value) && /track|status|ରସିଦ|receipt/.test(value)) return "tickets";
  if (/complaint|refund|problem|issue|support|help|ticket|tiket|ଅଭିଯୋଗ|ସହାୟତା/.test(value)) return "support";
  if (/order|delivery|otp|ଅର୍ଡର/.test(value)) return "orders";
  if (/food|product|menu|add|eat|chaat|roll|bara|biryani|momo|chai|pizza|burger|bhata|dalma|ଖାଦ୍ୟ/.test(value)) return "products";
  if (/thelawala|hello|hi\b|namaskar|info|about|ନମସ୍କାର/.test(value)) return "about";
  return "other";
}

export function matchesCareProduct(text: string, name: string, stall: string): boolean {
  const terms = text.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && !["food", "product", "products", "menu", "show", "some", "want", "please", "add", "thelawala"].includes(word));
  return terms.length === 0 || terms.some((word) => `${name} ${stall}`.toLowerCase().includes(word));
}