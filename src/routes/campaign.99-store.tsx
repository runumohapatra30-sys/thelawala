import { createFileRoute } from "@tanstack/react-router";
import { NinetyNineStorePage } from "@/components/CampaignPages";

export const Route = createFileRoute("/campaign/99-store")({
  head: () => ({
    meta: [
      { title: "99 Store — ThelaWala" },
      { property: "og:title", content: "99 Store — ThelaWala" },
      { property: "og:description", content: "Explore curated local street-food campaign deals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content: "Shop limited-time local street-food deals with free delivery.",
      },
    ],
  }),
  component: NinetyNineStorePage,
});
