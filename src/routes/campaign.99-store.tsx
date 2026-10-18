import { createFileRoute } from "@tanstack/react-router";
import { NinetyNineStorePage } from "@/components/CampaignPages";

export const Route = createFileRoute("/campaign/99-store")({
  head: () => ({
    meta: [
      { title: "99 Store — ThelaWala" },
      {
        name: "description",
        content: "Shop limited-time local street-food deals with free delivery.",
      },
    ],
  }),
  component: NinetyNineStorePage,
});
