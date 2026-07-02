export type IssueType = "Bug" | "Story" | "Task" | "Epic";
export type MigrationStatus = "pending" | "migrating" | "migrated" | "failed";

export interface JiraIssue {
  id: string;
  title: string;
  assignee: { name: string; initials: string };
  type: IssueType;
  updatedAt: string; // ISO
  migrationStatus: MigrationStatus;
  previouslyMigrated?: boolean;
  internalId?: string;
}

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

export const mockIssues: JiraIssue[] = [
  { id: "EXT-1042", title: "Checkout crashes when applying expired promo code", assignee: { name: "Priya Shah", initials: "PS" }, type: "Bug", updatedAt: hoursAgo(2), migrationStatus: "pending" },
  { id: "EXT-1043", title: "As a user, I can export invoices as PDF", assignee: { name: "Marcus Chen", initials: "MC" }, type: "Story", updatedAt: hoursAgo(5), migrationStatus: "migrated", previouslyMigrated: true, internalId: "INT-8801" },
  { id: "EXT-1044", title: "Upgrade Node runtime to 22 LTS across services", assignee: { name: "Diego Alvarez", initials: "DA" }, type: "Task", updatedAt: hoursAgo(9), migrationStatus: "pending" },
  { id: "EXT-1045", title: "Q3 Billing Platform Overhaul", assignee: { name: "Nadia Petrova", initials: "NP" }, type: "Epic", updatedAt: hoursAgo(26), migrationStatus: "pending" },
  { id: "EXT-1046", title: "Fix flaky signup e2e test on Safari", assignee: { name: "Marcus Chen", initials: "MC" }, type: "Bug", updatedAt: hoursAgo(1), migrationStatus: "pending" },
  { id: "EXT-1047", title: "Dark mode support for settings panel", assignee: { name: "Aisha Okafor", initials: "AO" }, type: "Story", updatedAt: hoursAgo(52), migrationStatus: "pending", previouslyMigrated: true },
  { id: "EXT-1048", title: "Rotate production database credentials", assignee: { name: "Diego Alvarez", initials: "DA" }, type: "Task", updatedAt: hoursAgo(72), migrationStatus: "pending" },
  { id: "EXT-1049", title: "Webhook retries never back off past 5s", assignee: { name: "Priya Shah", initials: "PS" }, type: "Bug", updatedAt: hoursAgo(14), migrationStatus: "pending" },
  { id: "EXT-1050", title: "Customer Portal Redesign", assignee: { name: "Nadia Petrova", initials: "NP" }, type: "Epic", updatedAt: hoursAgo(120), migrationStatus: "pending" },
  { id: "EXT-1051", title: "Add SSO login via Okta", assignee: { name: "Aisha Okafor", initials: "AO" }, type: "Story", updatedAt: hoursAgo(3), migrationStatus: "pending" },
  { id: "EXT-1052", title: "Document new release procedure in Confluence", assignee: { name: "Marcus Chen", initials: "MC" }, type: "Task", updatedAt: hoursAgo(48), migrationStatus: "migrated", previouslyMigrated: true, internalId: "INT-8790" },
  { id: "EXT-1053", title: "Email notifications sent twice on retry", assignee: { name: "Priya Shah", initials: "PS" }, type: "Bug", updatedAt: hoursAgo(6), migrationStatus: "pending" },
];

/**
 * Simulated migration call. Replace with a real API request, e.g.:
 *   return fetch(`/api/migrate/${issueId}`, { method: "POST" }).then(r => r.json())
 */
export async function migrateIssueApi(issueId: string): Promise<{ internalId: string }> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 800));
  if (Math.random() < 0.05) throw new Error("Migration failed");
  const suffix = issueId.split("-")[1];
  return { internalId: `INT-${8800 + Number(suffix) - 1000}` };
}

export function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = Math.floor(diff / 86400);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}
