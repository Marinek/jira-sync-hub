import { useMemo, useState } from "react";
import {
  Bug,
  BookOpen,
  CheckSquare,
  Zap,
  Search,
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  History,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  formatRelative,
  migrateIssueApi,
  mockIssues,
  type IssueType,
  type JiraIssue,
} from "@/lib/jira-mock";
import { cn } from "@/lib/utils";

const typeMeta: Record<
  IssueType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  Bug: { icon: Bug, color: "text-[color:var(--bug)]" },
  Story: { icon: BookOpen, color: "text-[color:var(--story)]" },
  Task: { icon: CheckSquare, color: "text-[color:var(--task)]" },
  Epic: { icon: Zap, color: "text-[color:var(--epic)]" },
};

export function MigrationDashboard() {
  const [issues, setIssues] = useState<JiraIssue[]>(mockIssues);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const assignees = useMemo(
    () => Array.from(new Set(issues.map((i) => i.assignee.name))).sort(),
    [issues],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((i) => {
      if (q && !i.title.toLowerCase().includes(q) && !i.id.toLowerCase().includes(q))
        return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (assigneeFilter !== "all" && i.assignee.name !== assigneeFilter) return false;
      return true;
    });
  }, [issues, query, typeFilter, assigneeFilter]);

  // === Backend integration point ==========================================
  // Replace `migrateIssueApi` inside this handler with your real endpoint.
  // Keep the state transitions the same so the UI stays consistent.
  const handleMigration = async (issueId: string) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, migrationStatus: "migrating" } : i)),
    );
    try {
      const { internalId } = await migrateIssueApi(issueId);
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId
            ? { ...i, migrationStatus: "migrated", previouslyMigrated: true, internalId }
            : i,
        ),
      );
      toast.success(`Migrated ${issueId} → ${internalId}`);
    } catch (err) {
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, migrationStatus: "failed" } : i)),
      );
      toast.error(`Failed to migrate ${issueId}`);
    }
  };
  // ========================================================================

  const stats = useMemo(() => {
    const migrated = issues.filter((i) => i.migrationStatus === "migrated").length;
    const pending = issues.filter((i) => i.migrationStatus === "pending").length;
    const failed = issues.filter((i) => i.migrationStatus === "failed").length;
    return { total: issues.length, migrated, pending, failed };
  }, [issues]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                External JIRA → Internal JIRA
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">
                Migration Dashboard
              </h1>
            </div>
            <div className="flex gap-6 text-right">
              <Stat label="Total" value={stats.total} />
              <Stat label="Migrated" value={stats.migrated} tone="success" />
              <Stat label="Pending" value={stats.pending} tone="warning" />
              {stats.failed > 0 && <Stat label="Failed" value={stats.failed} tone="destructive" />}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-6">
          {/* Filter bar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title or issue ID…"
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="Bug">Bug</SelectItem>
                <SelectItem value="Story">Story</SelectItem>
                <SelectItem value="Task">Task</SelectItem>
                <SelectItem value="Epic">Epic</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="grid grid-cols-[110px_1fr_180px_110px_120px_190px] gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div>Issue</div>
              <div>Summary</div>
              <div>Assignee</div>
              <div>Type</div>
              <div>Updated</div>
              <div className="text-right">Action</div>
            </div>

            {filtered.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No issues match your filters.
              </div>
            )}

            {filtered.map((issue) => (
              <IssueRow key={issue.id} issue={issue} onMigrate={handleMigration} />
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {issues.length} issues
          </p>
        </main>
      </div>
    </TooltipProvider>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "success"
      ? "text-[color:var(--success)]"
      : tone === "warning"
        ? "text-[color:var(--warning)]"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="min-w-16">
      <div className={cn("text-lg font-semibold tabular-nums leading-none", toneClass)}>
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function IssueRow({
  issue,
  onMigrate,
}: {
  issue: JiraIssue;
  onMigrate: (id: string) => void;
}) {
  const meta = typeMeta[issue.type];
  const Icon = meta.icon;

  return (
    <div className="grid grid-cols-[110px_1fr_180px_110px_120px_190px] items-center gap-3 border-b px-4 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-muted/30">
      <div className="flex items-center gap-1.5">
        <span className="rounded border bg-background px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
          {issue.id}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-foreground">{issue.title}</span>
        {issue.previouslyMigrated && issue.migrationStatus !== "migrated" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Previously migrated</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {issue.assignee.initials}
        </div>
        <span className="truncate text-muted-foreground">{issue.assignee.name}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", meta.color)} />
        <span className="text-xs text-foreground">{issue.type}</span>
      </div>

      <div className="text-xs text-muted-foreground tabular-nums">
        {formatRelative(issue.updatedAt)}
      </div>

      <div className="flex justify-end">
        <MigrationButton issue={issue} onMigrate={onMigrate} />
      </div>
    </div>
  );
}

function MigrationButton({
  issue,
  onMigrate,
}: {
  issue: JiraIssue;
  onMigrate: (id: string) => void;
}) {
  if (issue.migrationStatus === "migrated") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-[color:var(--success)]/30 bg-[color:var(--success)]/10 text-[color:var(--success)] font-medium"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Migrated{issue.internalId ? ` · ${issue.internalId}` : ""}
      </Badge>
    );
  }

  if (issue.migrationStatus === "migrating") {
    return (
      <Button size="sm" disabled className="h-7 gap-1.5 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Migrating…
      </Button>
    );
  }

  if (issue.migrationStatus === "failed") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => onMigrate(issue.id)}
        className="h-7 gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Retry
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => onMigrate(issue.id)}
      className="h-7 gap-1.5 text-xs"
    >
      <ArrowRightLeft className="h-3.5 w-3.5" />
      Migrate
    </Button>
  );
}
