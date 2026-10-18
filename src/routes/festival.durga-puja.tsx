import { createFileRoute } from "@tanstack/react-router";
import { DurgaPujaPage } from "@/components/CampaignPages";

export const Route = createFileRoute("/festival/durga-puja")({
  head: () => ({
    meta: [
      { title: "Durga Puja Celebration — ThelaWala" },
      {
        name: "description",
        content:
          "Celebrate Durga Puja with festive favourites from neighbourhood street-food stalls.",
      },
    ],
  }),
  component: DurgaPujaPage,
});
