export type IssueType = "Bug" | "Story" | "Task" | "Epic";
export type MigrationStatus = "pending" | "migrating" | "migrated" | "failed";

export interface JiraUser {
  name: string;
  initials: string;
}

export interface JiraIssue {
  id: string;
  title: string;
  assignee: JiraUser;
  type: IssueType;
  updatedAt: string; // ISO string
  migrationStatus: MigrationStatus;
  previouslyMigrated?: boolean;
  internalId?: string;
  description?: string;
}

export interface JiraConfig {
  url: string;
  pat: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraAuthConfig {
  externalJira: JiraConfig;
  internalJira: JiraConfig;
}
