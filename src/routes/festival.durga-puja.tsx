import { createFileRoute } from "@tanstack/react-router";
import { DurgaPujaPage } from "@/components/CampaignPages";

export const Route = createFileRoute("/festival/durga-puja")({
  head: () => ({
    meta: [
      { title: "Durga Puja Celebration — ThelaWala" },
      { property: "og:title", content: "Durga Puja Celebration — ThelaWala" },
      { property: "og:description", content: "Discover festive picks from local Bhubaneswar stalls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content:
          "Celebrate Durga Puja with festive favourites from neighbourhood street-food stalls.",
      },
    ],
  }),
  component: DurgaPujaPage,
});
