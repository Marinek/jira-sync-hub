import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type JiraConfig, type JiraIssue } from "./jira-types";

// Helper to make requests to JIRA API
async function fetchJira(url: string, path: string, pat: string, options: RequestInit = {}) {
  const cleanUrl = url.replace(/\/$/, "");
  const targetUrl = `${cleanUrl}${path}`;
  
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${pat}`);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  const response = await fetch(targetUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`JIRA API request failed: ${response.statusText} (${response.status}) - ${errorText}`);
  }

  return response.json();
}

const jiraConfigSchema = z.object({
  url: z.string(),
  pat: z.string(),
});

export const searchJiraIssuesFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      config: jiraConfigSchema,
      jql: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { config, jql } = data;
    
    // Default search parameters: get standard fields
    const fields = "summary,description,updated,assignee,issuetype,status";
    const path = `/rest/api/2/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=100`;
    
    try {
      const result = await fetchJira(config.url, path, config.pat);
      
      const issues: JiraIssue[] = (result.issues || []).map((issue: any) => {
        const fields = issue.fields || {};
        const assigneeName = fields.assignee?.displayName || fields.assignee?.name || "Unassigned";
        
        // Generate initials
        const initials = assigneeName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2) || "UA";

        return {
          id: issue.key,
          title: fields.summary || "",
          description: fields.description || "",
          assignee: {
            name: assigneeName,
            initials,
          },
          type: fields.issuetype?.name || "Task",
          updatedAt: fields.updated || new Date().toISOString(),
          migrationStatus: "pending",
        };
      });

      return { issues };
    } catch (error: any) {
      console.error("Error in searchJiraIssuesFn:", error);
      throw error;
    }
  });

export const getJiraProjectsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      config: jiraConfigSchema,
    })
  )
  .handler(async ({ data }) => {
    const { config } = data;
    try {
      const result = await fetchJira(config.url, "/rest/api/2/project", config.pat);
      const projects = (result || []).map((p: any) => ({
        id: p.id,
        key: p.key,
        name: p.name,
      }));
      return { projects };
    } catch (error: any) {
      console.error("Error in getJiraProjectsFn:", error);
      throw error;
    }
  });

export const migrateJiraIssueFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      externalConfig: jiraConfigSchema,
      internalConfig: jiraConfigSchema,
      issueId: z.string(),
      targetProjectKey: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { externalConfig, internalConfig, issueId, targetProjectKey } = data;

    try {
      // 1. Fetch issue details from external JIRA
      const issueDetailsPath = `/rest/api/2/issue/${issueId}`;
      const extIssue = await fetchJira(externalConfig.url, issueDetailsPath, externalConfig.pat);

      // 2. Prepare internal issue fields
      const createBody = {
        fields: {
          project: {
            key: targetProjectKey,
          },
          summary: extIssue.fields.summary,
          description: `Migrated from ${issueId} (${externalConfig.url}/browse/${issueId})\n\n${extIssue.fields.description || ""}`,
          issuetype: {
            name: extIssue.fields.issuetype?.name || "Task",
          },
        },
      };

      // 3. Post to internal JIRA
      const createResult = await fetchJira(
        internalConfig.url,
        "/rest/api/2/issue",
        internalConfig.pat,
        {
          method: "POST",
          body: JSON.stringify(createBody),
        }
      );

      return {
        internalId: createResult.key, // returns something like "INT-1234"
      };
    } catch (error: any) {
      console.error("Error in migrateJiraIssueFn:", error);
      throw error;
    }
  });
