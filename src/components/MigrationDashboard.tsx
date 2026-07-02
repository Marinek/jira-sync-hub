import { useMemo, useState, useEffect } from "react";
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
  Settings,
  RefreshCw,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatRelative, mockIssues } from "@/lib/jira-mock";
import { type IssueType, type JiraIssue, type JiraProject } from "@/lib/jira-types";
import { searchJiraIssuesFn, migrateJiraIssueFn, getJiraProjectsFn, getJiraProjectDetailsFn } from "@/lib/jira-server";
import { cn } from "@/lib/utils";
import { SettingsModal } from "@/components/SettingsModal";
import { useJiraConfig } from "@/hooks/useJiraConfig";

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
  const { isFullyConfigured, config } = useJiraConfig();
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Projects list state
  const [extProjects, setExtProjects] = useState<JiraProject[]>([]);
  const [intProjects, setIntProjects] = useState<JiraProject[]>([]);
  const [selectedExtProjectKey, setSelectedExtProjectKey] = useState<string>("");
  const [selectedIntProjectKey, setSelectedIntProjectKey] = useState<string>("");

  // Target project issue types state
  const [targetIssueTypes, setTargetIssueTypes] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingTargetTypes, setIsLoadingTargetTypes] = useState(false);

  // Mapping dialog state
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingIssue, setMappingIssue] = useState<JiraIssue | null>(null);
  const [selectedMappedType, setSelectedMappedType] = useState<string>("");

  // Fetch target project details (issue types) when target project changes
  useEffect(() => {
    if (!isFullyConfigured || !selectedIntProjectKey) {
      setTargetIssueTypes([]);
      return;
    }

    const fetchTargetDetails = async () => {
      setIsLoadingTargetTypes(true);
      try {
        const result = await getJiraProjectDetailsFn({
          data: {
            config: config.internalJira,
            projectKey: selectedIntProjectKey,
          },
        });
        setTargetIssueTypes(result.issueTypes);
      } catch (err: any) {
        console.error("Failed to load target project issue types:", err);
      } finally {
        setIsLoadingTargetTypes(false);
      }
    };

    fetchTargetDetails();
  }, [isFullyConfigured, config, selectedIntProjectKey]);

  // Fetch projects from both JIRA instances once authenticated
  useEffect(() => {
    if (!isFullyConfigured) {
      setExtProjects([]);
      setIntProjects([]);
      setSelectedExtProjectKey("");
      setSelectedIntProjectKey("");
      return;
    }

    const fetchProjects = async () => {
      try {
        const [extRes, intRes] = await Promise.all([
          getJiraProjectsFn({ data: { config: config.externalJira } }),
          getJiraProjectsFn({ data: { config: config.internalJira } }),
        ]);

        setExtProjects(extRes.projects);
        setIntProjects(intRes.projects);

        if (extRes.projects.length > 0) {
          setSelectedExtProjectKey(extRes.projects[0].key);
        }
        if (intRes.projects.length > 0) {
          setSelectedIntProjectKey(intRes.projects[0].key);
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load JIRA projects: " + err.message);
      }
    };

    fetchProjects();
  }, [isFullyConfigured, config]);

  // Load issues from selected JIRA project
  useEffect(() => {
    if (!isFullyConfigured || !selectedExtProjectKey) {
      setIssues([]);
      return;
    }

    const fetchLiveIssues = async () => {
      setIsLoading(true);
      try {
        // Construct JQL dynamically with selected project key
        let jql = `project = "${selectedExtProjectKey}" AND statusCategory != Done`;
        
        if (assigneeFilter.trim() !== "") {
          const cleanAssignee = assigneeFilter.trim();
          jql += ` AND assignee = "${cleanAssignee}"`;
        }

        const result = await searchJiraIssuesFn({
          data: {
            config: config.externalJira,
            jql,
          }
        });

        // Merge with local migrations mappings
        const localMappingStr = localStorage.getItem("jira_sync_migration_mapping");
        const mappings = localMappingStr ? JSON.parse(localMappingStr) : {};

        const mappedIssues = result.issues.map((issue) => {
          if (mappings[issue.id]) {
            return {
              ...issue,
              migrationStatus: "migrated" as const,
              previouslyMigrated: true,
              internalId: mappings[issue.id],
            };
          }
          return issue;
        });

        setIssues(mappedIssues);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to query JIRA issues: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchLiveIssues, 500);
    return () => clearTimeout(timer);
  }, [isFullyConfigured, config, assigneeFilter, selectedExtProjectKey, refreshTrigger]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((i) => {
      if (q && !i.title.toLowerCase().includes(q) && !i.id.toLowerCase().includes(q))
        return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      return true;
    });
  }, [issues, query, typeFilter]);

  const executeMigration = async (issueId: string, mappedType?: string) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, migrationStatus: "migrating" } : i)),
    );

    try {
      const { internalId } = await migrateJiraIssueFn({
        data: {
          externalConfig: config.externalJira,
          internalConfig: config.internalJira,
          issueId,
          targetProjectKey: selectedIntProjectKey,
          targetIssueTypeName: mappedType,
        }
      });

      // Update local storage mappings
      const localMappingStr = localStorage.getItem("jira_sync_migration_mapping");
      const mappings = localMappingStr ? JSON.parse(localMappingStr) : {};
      mappings[issueId] = internalId;
      localStorage.setItem("jira_sync_migration_mapping", JSON.stringify(mappings));

      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId
            ? { ...i, migrationStatus: "migrated", previouslyMigrated: true, internalId }
            : i,
        ),
      );

      toast.success(`Successfully migrated ${issueId} → ${internalId}`);
    } catch (err: any) {
      console.error(err);
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, migrationStatus: "failed" } : i)),
      );
      toast.error(`Failed to migrate ${issueId}: ${err.message}`);
    }
  };

  const handleMigration = async (issueId: string) => {
    if (!isFullyConfigured || !selectedIntProjectKey) {
      toast.error("Please configure JIRA credentials and select a target project first.");
      return;
    }

    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;

    // Check if issue type exists in target project
    const typeExists = targetIssueTypes.some(
      (t) => t.name.toLowerCase() === issue.type.toLowerCase()
    );

    if (typeExists) {
      // Migrate directly using the original issue type name
      const matchingType = targetIssueTypes.find(
        (t) => t.name.toLowerCase() === issue.type.toLowerCase()
      )?.name;
      await executeMigration(issueId, matchingType);
    } else {
      // Check for saved project-specific mapping
      const savedMappingsStr = localStorage.getItem(`jira_type_mapping_${selectedIntProjectKey}`);
      const savedMappings = savedMappingsStr ? JSON.parse(savedMappingsStr) : {};
      const savedMappedType = savedMappings[issue.type];
      
      const mappingValid =
        savedMappedType &&
        targetIssueTypes.some((t) => t.name.toLowerCase() === savedMappedType.toLowerCase());

      if (mappingValid) {
        // Reuse mapping automatically
        const validTypeName = targetIssueTypes.find(
          (t) => t.name.toLowerCase() === savedMappedType.toLowerCase()
        )?.name;
        await executeMigration(issueId, validTypeName);
      } else {
        // Prompt user to choose target mapping type
        setMappingIssue(issue);
        const defaultTargetType =
          targetIssueTypes.find((t) => t.name === "Task")?.name ||
          targetIssueTypes[0]?.name ||
          "";
        setSelectedMappedType(defaultTargetType);
        setMappingDialogOpen(true);
      }
    }
  };

  const handleConfirmMapping = async () => {
    if (!mappingIssue || !selectedMappedType) return;
    
    // Save to localStorage under project-specific key
    const savedMappingsStr = localStorage.getItem(`jira_type_mapping_${selectedIntProjectKey}`);
    const savedMappings = savedMappingsStr ? JSON.parse(savedMappingsStr) : {};
    savedMappings[mappingIssue.type] = selectedMappedType;
    localStorage.setItem(
      `jira_type_mapping_${selectedIntProjectKey}`,
      JSON.stringify(savedMappings)
    );

    setMappingDialogOpen(false);
    const targetIssueId = mappingIssue.id;
    setMappingIssue(null);

    await executeMigration(targetIssueId, selectedMappedType);
  };

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
            <div className="flex items-center gap-6">
              <div className="flex gap-6 text-right">
                <Stat label="Total" value={stats.total} />
                <Stat label="Migrated" value={stats.migrated} tone="success" />
                <Stat label="Pending" value={stats.pending} tone="warning" />
                {stats.failed > 0 && <Stat label="Failed" value={stats.failed} tone="destructive" />}
              </div>
              <div className="flex items-center gap-3 border-l pl-6">
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={cn("h-2 w-2 rounded-full", isFullyConfigured ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                    <span className="font-medium text-muted-foreground">
                      {isFullyConfigured ? "Connected" : "Not Configured"}
                    </span>
                  </div>
                  {isFullyConfigured && selectedExtProjectKey && selectedIntProjectKey && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {selectedExtProjectKey} → {selectedIntProjectKey}
                    </span>
                  )}
                </div>
                <SettingsModal />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-6">
          {/* JIRA connection configuration notice banner */}
          {!isFullyConfigured && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                <span>No JIRA connection configured. Please configure your JIRA credentials in Settings to query and sync real issues.</span>
              </div>
              <SettingsModal trigger={<Button variant="link" size="sm" className="h-auto p-0 font-semibold text-yellow-600 dark:text-yellow-400 hover:underline">Configure now →</Button>} />
            </div>
          )}

          {/* Project & Connection Selectors */}
          {isFullyConfigured && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center rounded-lg border bg-muted/20 p-3 text-sm">
              <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-center">
                <span className="font-semibold text-muted-foreground whitespace-nowrap">Source Project:</span>
                <Select value={selectedExtProjectKey} onValueChange={setSelectedExtProjectKey}>
                  <SelectTrigger className="w-full sm:w-64 bg-background">
                    <SelectValue placeholder="Select external project" />
                  </SelectTrigger>
                  <SelectContent>
                    {extProjects.map((project) => (
                      <SelectItem key={project.key} value={project.key}>
                        {project.name} ({project.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-end">
                <span className="font-semibold text-muted-foreground whitespace-nowrap">Target Project:</span>
                <Select value={selectedIntProjectKey} onValueChange={setSelectedIntProjectKey}>
                  <SelectTrigger className="w-full sm:w-64 bg-background">
                    <SelectValue placeholder="Select target project" />
                  </SelectTrigger>
                  <SelectContent>
                    {intProjects.map((project) => (
                      <SelectItem key={project.key} value={project.key}>
                        {project.name} ({project.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
            
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                placeholder="Assignee name (e.g. Marcus Chen)..."
                className="pl-9"
              />
            </div>

            {isFullyConfigured && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setRefreshTrigger((prev) => prev + 1)}
                disabled={isLoading}
                title="Refresh issues"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            )}
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

            {isLoading && (
              <div className="p-12 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/5">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Fetching live JIRA issues...</span>
              </div>
            )}

            {!isFullyConfigured && (
              <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                <span>No JIRA connection configured. Please configure settings to load issues.</span>
              </div>
            )}

            {isFullyConfigured && !isLoading && filtered.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No issues match your filters or search criteria.
              </div>
            )}

            {!isLoading && filtered.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onMigrate={handleMigration}
                internalJiraUrl={config.internalJira?.url}
              />
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {issues.length} issues
          </p>
        </main>
      </div>

      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Map Issue Type</DialogTitle>
            <DialogDescription>
              The issue type <strong>{mappingIssue?.type}</strong> does not exist in target project <strong>{selectedIntProjectKey}</strong>. Please map it to one of the available target issue types.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Issue Type</label>
              <Select value={selectedMappedType} onValueChange={setSelectedMappedType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select target issue type" />
                </SelectTrigger>
                <SelectContent>
                  {targetIssueTypes.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMapping}>
              Confirm & Migrate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  internalJiraUrl,
}: {
  issue: JiraIssue;
  onMigrate: (id: string) => void;
  internalJiraUrl?: string;
}) {
  const meta = typeMeta[issue.type] || typeMeta["Task"];
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
        <MigrationButton issue={issue} onMigrate={onMigrate} internalJiraUrl={internalJiraUrl} />
      </div>
    </div>
  );
}

function MigrationButton({
  issue,
  onMigrate,
  internalJiraUrl,
}: {
  issue: JiraIssue;
  onMigrate: (id: string) => void;
  internalJiraUrl?: string;
}) {
  if (issue.migrationStatus === "migrated") {
    const issueLink = internalJiraUrl && issue.internalId
      ? `${internalJiraUrl.replace(/\/$/, "")}/browse/${issue.internalId}`
      : null;

    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-[color:var(--success)]/30 bg-[color:var(--success)]/10 text-[color:var(--success)] font-medium"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {issueLink ? (
          <a
            href={issueLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center"
          >
            Migrated · {issue.internalId}
          </a>
        ) : (
          <span>Migrated{issue.internalId ? ` · ${issue.internalId}` : ""}</span>
        )}
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
