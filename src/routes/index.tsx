import { createFileRoute } from "@tanstack/react-router";
import { MigrationDashboard } from "@/components/MigrationDashboard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JIRA Migration Dashboard" },
      {
        name: "description",
        content: "Track and migrate JIRA issues from an external instance to your internal JIRA.",
      },
      { property: "og:title", content: "JIRA Migration Dashboard" },
      {
        property: "og:description",
        content:
          "Project manager dashboard to review external JIRA issues and migrate them into your internal system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <MigrationDashboard />
      <Toaster position="bottom-right" />
    </>
  );
}
