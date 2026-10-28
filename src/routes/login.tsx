import { createFileRoute } from "@tanstack/react-router";
import { CustomerAuthScreen } from "@/components/CustomerAuthScreen";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — ThelaWala" },
      { name: "description", content: "Log in to ThelaWala to order street food and manage your account." },
    ],
  }),
  component: CustomerAuthScreen,
});
