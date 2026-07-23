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
  Edit2,
  Trash2,
  Link2,
  X,
  Check,
  RefreshCw,
  Eye,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import {
  searchJiraIssuesFn,
  migrateJiraIssueFn,
  updateMappedJiraIssueFn,
  getJiraProjectsFn,
  getJiraProjectDetailsFn,
  getMigrationMappingsFn,
  updateMigrationMappingFn,
  getJiraIssueDetailsFn,
} from "@/lib/jira-server";
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
  const [searchTrigger, setSearchTrigger] = useState(0);

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

  // Issue details dialog state
  const [detailsIssueId, setDetailsIssueId] = useState<string | null>(null);
  const [detailsIssueTitle, setDetailsIssueTitle] = useState<string>("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsDescription, setDetailsDescription] = useState("");
  const [detailsComments, setDetailsComments] = useState<any[]>([]);
  const [detailsAttachments, setDetailsAttachments] = useState<any[]>([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const [syncStateByIssueId, setSyncStateByIssueId] = useState<
    Record<
      string,
      {
        isLoading: boolean;
        lastStatus?: "success" | "partial" | "failure";
        message?: string;
        hasRetryableErrors?: boolean;
        failedCount?: number;
        failedAttachments?: string[];
      }
    >
  >({});

  const handleOpenDetails = async (issueId: string, issueTitle: string) => {
    setDetailsIssueId(issueId);
    setDetailsIssueTitle(issueTitle);
    setDetailsLoading(true);
    setDetailsDescription("");
    setDetailsComments([]);
    setDetailsAttachments([]);
    setDetailsDialogOpen(true);

    try {
      const res = await getJiraIssueDetailsFn({
        data: {
          config: config.externalJira,
          issueId,
        },
      });
      setDetailsDescription(res.description || "No description provided.");
      setDetailsComments(res.comments || []);
      setDetailsAttachments((res as any).attachments || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load issue details: " + err.message);
      setDetailsDescription("Error loading description.");
    } finally {
      setDetailsLoading(false);
    }
  };

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

  // Fetch live issues when configuration, active project, or search trigger changes
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

        if (typeFilter !== "all") {
          jql += ` AND issuetype = "${typeFilter}"`;
        }

        if (assigneeFilter.trim() !== "") {
          const cleanAssignee = assigneeFilter.trim();
          jql += ` AND assignee = "${cleanAssignee}"`;
        }

        if (query.trim() !== "") {
          const cleanQuery = query.trim().replace(/"/g, '\\"');
          jql += ` AND (summary ~ "${cleanQuery}" OR description ~ "${cleanQuery}" OR key = "${cleanQuery}")`;
        }

        const result = await searchJiraIssuesFn({
          data: {
            config: config.externalJira,
            jql,
          },
        });

        // Merge with server migrations mappings
        const mappingsResult = await getMigrationMappingsFn();
        const mappings = mappingsResult.mappings || {};

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

    fetchLiveIssues();
  }, [isFullyConfigured, config, selectedExtProjectKey, searchTrigger, refreshTrigger]);

  // Automatic target project selection when source project changes
  useEffect(() => {
    if (!isFullyConfigured || !selectedExtProjectKey || intProjects.length === 0) {
      return;
    }

    const autoSelectTargetProject = async () => {
      try {
        const mappingsResult = await getMigrationMappingsFn();
        const mappings = mappingsResult.mappings || {};

        // Find any mapping where the source issue starts with selectedExtProjectKey (e.g. "PROJ-")
        const matchingSourceKey = Object.keys(mappings).find((key) =>
          key.startsWith(`${selectedExtProjectKey}-`),
        );

        if (matchingSourceKey) {
          const targetId = mappings[matchingSourceKey];
          if (targetId && targetId.includes("-")) {
            const targetProjectKey = targetId.split("-")[0];
            const projectExists = intProjects.some((p) => p.key === targetProjectKey);
            if (projectExists && targetProjectKey !== selectedIntProjectKey) {
              setSelectedIntProjectKey(targetProjectKey);
              toast.info(
                `Automatically set target project to ${targetProjectKey} based on existing mappings.`,
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed to auto-select target project:", err);
      }
    };

    autoSelectTargetProject();
  }, [selectedExtProjectKey, isFullyConfigured, intProjects, selectedIntProjectKey]);

  const triggerSearch = () => {
    setSearchTrigger((prev) => prev + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      triggerSearch();
    }
  };

  const filtered = useMemo(() => {
    return issues;
  }, [issues]);

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
        },
      });

      // Update server mappings
      await updateMigrationMappingFn({
        data: {
          issueId,
          internalId,
        },
      });

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
      (t) => t.name.toLowerCase() === issue.type.toLowerCase(),
    );

    if (typeExists) {
      // Migrate directly using the original issue type name
      const matchingType = targetIssueTypes.find(
        (t) => t.name.toLowerCase() === issue.type.toLowerCase(),
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
          (t) => t.name.toLowerCase() === savedMappedType.toLowerCase(),
        )?.name;
        await executeMigration(issueId, validTypeName);
      } else {
        // Prompt user to choose target mapping type
        setMappingIssue(issue);
        const defaultTargetType =
          targetIssueTypes.find((t) => t.name === "Task")?.name || targetIssueTypes[0]?.name || "";
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
      JSON.stringify(savedMappings),
    );

    setMappingDialogOpen(false);
    const targetIssueId = mappingIssue.id;
    setMappingIssue(null);

    await executeMigration(targetIssueId, selectedMappedType);
  };

  const handleUpdateMapping = async (issueId: string, newInternalId: string | null) => {
    try {
      const cleanInternalId = newInternalId ? newInternalId.trim().toUpperCase() : null;
      // 1. Update server mappings
      await updateMigrationMappingFn({
        data: {
          issueId,
          internalId: cleanInternalId,
        },
      });

      // 2. Update state issues
      setIssues((prev) =>
        prev.map((i) => {
          if (i.id === issueId) {
            if (cleanInternalId) {
              return {
                ...i,
                migrationStatus: "migrated" as const,
                previouslyMigrated: true,
                internalId: cleanInternalId,
              };
            } else {
              return {
                ...i,
                migrationStatus: "pending" as const,
                previouslyMigrated: false,
                internalId: undefined,
              };
            }
          }
          return i;
        }),
      );

      toast.success(
        cleanInternalId
          ? `Mapped ${issueId} to ${cleanInternalId}`
          : `Removed mapping for ${issueId}`,
      );
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to update mapping on server: ${err.message}`);
    }
  };

  const handleSyncMappedIssue = async (issueId: string) => {
    const issue = issues.find((i) => i.id === issueId);
    if (!issue?.internalId) {
      toast.error(`No mapped target issue exists for ${issueId}.`);
      return;
    }

    setSyncStateByIssueId((prev) => ({
      ...prev,
      [issueId]: {
        ...(prev[issueId] || {}),
        isLoading: true,
      },
    }));

    try {
      const result = await updateMappedJiraIssueFn({
        data: {
          externalConfig: config.externalJira,
          internalConfig: config.internalJira,
          issueId,
          internalId: issue.internalId,
        },
      });

      const summary = result.attachmentSummary;
      const failedList = result.attachments.filter((a: any) => a.action === "failed");
      const failedAttachments = failedList.map((a: any) => a.filename).slice(0, 3);
      const hasRetryableErrors =
        failedList.some((a: any) => a.retryable) || result.errors.some((e: any) => e.retryable);

      const message =
        result.status === "success"
          ? `Updated ${issueId} (${summary.uploadedCount} uploaded, ${summary.skippedCount} already present)`
          : result.status === "partial"
            ? `Partially updated ${issueId} (${summary.uploadedCount} uploaded, ${summary.failedCount} failed)`
            : `Failed to update ${issueId}`;

      setSyncStateByIssueId((prev) => ({
        ...prev,
        [issueId]: {
          isLoading: false,
          lastStatus: result.status,
          message,
          hasRetryableErrors,
          failedCount: summary.failedCount,
          failedAttachments,
        },
      }));

      if (result.status === "success") {
        toast.success(message);
      } else if (result.status === "partial") {
        toast.warning(message);
      } else {
        const firstError = result.errors[0]?.message;
        toast.error(firstError ? `${message}: ${firstError}` : message);
      }

      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId ? { ...i, migrationStatus: "migrated", updatedAt: new Date().toISOString() } : i,
        ),
      );
    } catch (err: any) {
      const message = `Failed to update ${issueId}: ${err.message}`;
      setSyncStateByIssueId((prev) => ({
        ...prev,
        [issueId]: {
          isLoading: false,
          lastStatus: "failure",
          message,
          hasRetryableErrors: true,
        },
      }));
      toast.error(message);
    }
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
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Migration Dashboard</h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex gap-6 text-right">
                <Stat label="Total" value={stats.total} />
                <Stat label="Migrated" value={stats.migrated} tone="success" />
                <Stat label="Pending" value={stats.pending} tone="warning" />
                {stats.failed > 0 && (
                  <Stat label="Failed" value={stats.failed} tone="destructive" />
                )}
              </div>
              <div className="flex items-center gap-3 border-l pl-6">
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isFullyConfigured ? "bg-green-500 animate-pulse" : "bg-red-500",
                      )}
                    />
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
                <span>
                  No JIRA connection configured. Please configure your JIRA credentials in Settings
                  to query and sync real issues.
                </span>
              </div>
              <SettingsModal
                trigger={
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 font-semibold text-yellow-600 dark:text-yellow-400 hover:underline"
                  >
                    Configure now →
                  </Button>
                }
              />
            </div>
          )}

          {/* Project & Connection Selectors */}
          {isFullyConfigured && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center rounded-lg border bg-muted/20 p-3 text-sm">
              <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-center">
                <span className="font-semibold text-muted-foreground whitespace-nowrap">
                  Source Project:
                </span>
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
                <span className="font-semibold text-muted-foreground whitespace-nowrap">
                  Target Project:
                </span>
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
                onKeyDown={handleKeyDown}
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
                onKeyDown={handleKeyDown}
                placeholder="Assignee name (e.g. Marcus Chen)..."
                className="pl-9"
              />
            </div>

            {isFullyConfigured && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={triggerSearch}
                  disabled={isLoading}
                  className="flex-1 sm:flex-initial"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRefreshTrigger((prev) => prev + 1)}
                  disabled={isLoading}
                  title="Refresh issues"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </div>
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
                <span>
                  No JIRA connection configured. Please configure settings to load issues.
                </span>
              </div>
            )}

            {isFullyConfigured && !isLoading && filtered.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No issues match your filters or search criteria.
              </div>
            )}

            {!isLoading &&
              filtered.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  onMigrate={handleMigration}
                  onSyncMappedIssue={handleSyncMappedIssue}
                  onUpdateMapping={handleUpdateMapping}
                  onViewDetails={handleOpenDetails}
                  internalJiraUrl={config.internalJira?.url}
                  syncState={syncStateByIssueId[issue.id]}
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
              The issue type <strong>{mappingIssue?.type}</strong> does not exist in target project{" "}
              <strong>{selectedIntProjectKey}</strong>. Please map it to one of the available target
              issue types.
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
            <Button onClick={handleConfirmMapping}>Confirm & Migrate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {detailsIssueId}
              </span>
              <span>{detailsIssueTitle}</span>
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading details and comments...</span>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Description Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Description
                </h3>
                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {detailsDescription}
                </div>
              </div>

              {/* Attachments Section */}
              {detailsAttachments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Attachments ({detailsAttachments.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detailsAttachments.map((att: any) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-1.5 rounded border bg-muted/30 px-2.5 py-1.5 text-xs text-foreground"
                      >
                        <span className="truncate max-w-[180px]" title={att.filename}>
                          {att.filename}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          ({Math.round(att.size / 1024)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Comments ({detailsComments.length})
                </h3>
                {detailsComments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No comments on this issue.</p>
                ) : (
                  <div className="space-y-3">
                    {detailsComments.map((comment) => (
                      <div key={comment.id} className="rounded-lg border p-3.5 space-y-2 bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                              {comment.author.initials}
                            </div>
                            <span className="text-xs font-semibold text-foreground">
                              {comment.author.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRelative(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {comment.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
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
      <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function IssueRow({
  issue,
  onMigrate,
  onSyncMappedIssue,
  onUpdateMapping,
  onViewDetails,
  internalJiraUrl,
  syncState,
}: {
  issue: JiraIssue;
  onMigrate: (id: string) => void;
  onSyncMappedIssue: (id: string) => void;
  onUpdateMapping: (issueId: string, newInternalId: string | null) => void;
  onViewDetails: (issueId: string, issueTitle: string) => void;
  internalJiraUrl?: string;
  syncState?: {
    isLoading: boolean;
    lastStatus?: "success" | "partial" | "failure";
    message?: string;
    hasRetryableErrors?: boolean;
    failedCount?: number;
    failedAttachments?: string[];
  };
}) {
  const meta = typeMeta[issue.type] || typeMeta["Task"];
  const Icon = meta.icon;

  const [isEditing, setIsEditing] = useState(false);
  const [manualId, setManualId] = useState(issue.internalId || "");

  useEffect(() => {
    setManualId(issue.internalId || "");
  }, [issue.internalId]);

  const handleSave = () => {
    if (!manualId.trim()) {
      toast.error("Please enter a valid JIRA issue key");
      return;
    }
    onUpdateMapping(issue.id, manualId.trim().toUpperCase());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setManualId(issue.internalId || "");
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-[110px_1fr_180px_110px_120px_190px] items-center gap-3 border-b px-4 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-muted/30 group">
      <div className="flex items-center gap-1.5">
        <span className="rounded border bg-background px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
          {issue.id}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => onViewDetails(issue.id, issue.title)}
          className="truncate font-medium text-foreground hover:text-primary hover:underline text-left focus:outline-none"
          title="Click to view details and comments"
        >
          {issue.title}
        </button>
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

      <div className="flex justify-end gap-1.5 items-center">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onViewDetails(issue.id, issue.title)}
          title="View Issue Details"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="INT-123"
              className="h-7 w-24 text-xs font-mono uppercase px-2 bg-background"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-green-600 hover:bg-green-50"
              onClick={handleSave}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:bg-muted"
              onClick={handleCancel}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <MigrationButton
              issue={issue}
              onMigrate={onMigrate}
              onSyncMappedIssue={onSyncMappedIssue}
              internalJiraUrl={internalJiraUrl}
              onStartEdit={() => setIsEditing(true)}
              onDeleteMapping={() => onUpdateMapping(issue.id, null)}
              syncState={syncState}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MigrationButton({
  issue,
  onMigrate,
  onSyncMappedIssue,
  internalJiraUrl,
  onStartEdit,
  onDeleteMapping,
  syncState,
}: {
  issue: JiraIssue;
  onMigrate: (id: string) => void;
  onSyncMappedIssue: (id: string) => void;
  internalJiraUrl?: string;
  onStartEdit: () => void;
  onDeleteMapping: () => void;
  syncState?: {
    isLoading: boolean;
    lastStatus?: "success" | "partial" | "failure";
    message?: string;
    hasRetryableErrors?: boolean;
    failedCount?: number;
    failedAttachments?: string[];
  };
}) {
  const lastSyncTone =
    syncState?.lastStatus === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-600"
      : syncState?.lastStatus === "partial"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
        : syncState?.lastStatus === "failure"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "";

  if (issue.migrationStatus === "migrated") {
    const issueLink =
      internalJiraUrl && issue.internalId
        ? `${internalJiraUrl.replace(/\/$/, "")}/browse/${issue.internalId}`
        : null;

    return (
      <div className="flex items-center gap-1">
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
              className="hover:underline flex items-center animate-fade-in"
            >
              Migrated · {issue.internalId}
            </a>
          ) : (
            <span>Migrated{issue.internalId ? ` · ${issue.internalId}` : ""}</span>
          )}
        </Badge>
        <Button
          size="sm"
          variant={syncState?.lastStatus === "failure" ? "outline" : "ghost"}
          className="h-7 gap-1.5 text-xs"
          onClick={() => onSyncMappedIssue(issue.id)}
          disabled={syncState?.isLoading}
          title={syncState?.message || "Update mapped target issue"}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", syncState?.isLoading && "animate-spin")} />
          {syncState?.isLoading
            ? "Updating..."
            : syncState?.lastStatus === "failure" && syncState?.hasRetryableErrors
              ? "Retry Update"
              : "Update"}
        </Button>
        {syncState?.lastStatus && (
          <Badge
            variant="outline"
            className={cn("h-7 px-2 text-[10px]", lastSyncTone)}
            title={
              syncState.lastStatus === "partial" && syncState.failedAttachments?.length
                ? `Failed attachments: ${syncState.failedAttachments.join(", ")}${syncState.failedCount && syncState.failedCount > syncState.failedAttachments.length ? "..." : ""}`
                : syncState.message
            }
          >
            {syncState.lastStatus === "partial" && syncState.failedCount
              ? `partial (${syncState.failedCount} failed)`
              : syncState.lastStatus}
          </Badge>
        )}
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:bg-muted"
            onClick={onStartEdit}
            title="Edit Mapping"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive hover:bg-destructive/10"
            onClick={onDeleteMapping}
            title="Remove Mapping"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
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
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onMigrate(issue.id)}
          className="h-7 gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Retry
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onStartEdit}
          title="Manually link existing issue"
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" onClick={() => onMigrate(issue.id)} className="h-7 gap-1.5 text-xs">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Migrate
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onStartEdit}
        title="Manually link existing issue"
      >
        <Link2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
