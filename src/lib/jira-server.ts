import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type JiraConfig, type JiraIssue } from "./jira-types";

// Helper to make requests to JIRA API
async function fetchJira(url: string, path: string, pat: string, options: RequestInit = {}) {
  const cleanUrl = url.replace(/\/$/, "");
  const targetUrl = `${cleanUrl}${path}`;
  const method = options.method || "GET";

  console.log(`📡 [JIRA Outgoing] ${method} -> ${targetUrl}`);

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${pat}`);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  const response = await fetch(targetUrl, {
    ...options,
    headers,
  });

  console.log(`📥 [JIRA Response] ${method} -> ${targetUrl} [Status: ${response.status}]`);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `JIRA API request failed: ${response.statusText} (${response.status}) - ${errorText}`,
    );
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
    }),
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
        const initials =
          assigneeName
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
    }),
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

export const getJiraProjectDetailsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      config: jiraConfigSchema,
      projectKey: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { config, projectKey } = data;
    try {
      const result = await fetchJira(config.url, `/rest/api/2/project/${projectKey}`, config.pat);
      const issueTypes = (result.issueTypes || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        subtask: t.subtask,
      }));
      return { key: result.key, name: result.name, issueTypes };
    } catch (error: any) {
      console.error("Error in getJiraProjectDetailsFn:", error);
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
      targetIssueTypeName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { externalConfig, internalConfig, issueId, targetProjectKey, targetIssueTypeName } = data;

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
            name: targetIssueTypeName || extIssue.fields.issuetype?.name || "Task",
          },
          labels: [issueId],
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
        },
      );

      // 4. Copy attachments if present
      const attachments = extIssue.fields.attachment || [];
      if (attachments.length > 0) {
        console.log(`📎 Found ${attachments.length} attachments to copy for issue ${issueId}`);
        for (const att of attachments) {
          try {
            console.log(`📎 Copying attachment: ${att.filename} (${att.size} bytes)`);

            // Download from external
            const downloadRes = await fetch(att.content, {
              headers: {
                Authorization: `Bearer ${externalConfig.pat}`,
              },
            });
            if (!downloadRes.ok) {
              throw new Error(`Failed to download: ${downloadRes.statusText}`);
            }
            const blob = await downloadRes.blob();

            // Prepare upload FormData
            const uploadForm = new FormData();
            uploadForm.append("file", blob, att.filename);

            const uploadUrl = `${internalConfig.url.replace(/\/$/, "")}/rest/api/2/issue/${createResult.key}/attachments`;

            const uploadRes = await fetch(uploadUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${internalConfig.pat}`,
                "X-Atlassian-Token": "no-check", // Mandatory for JIRA attachment endpoint
              },
              body: uploadForm,
            });

            if (!uploadRes.ok) {
              const errBody = await uploadRes.text().catch(() => "");
              console.error(`Failed to upload attachment ${att.filename}:`, errBody);
            } else {
              console.log(`✓ Copied attachment: ${att.filename}`);
            }
          } catch (attErr: any) {
            console.error(`Error copying attachment ${att.filename}:`, attErr);
          }
        }
      }

      return {
        internalId: createResult.key, // returns something like "INT-1234"
      };
    } catch (error: any) {
      console.error("Error in migrateJiraIssueFn:", error);
      throw error;
    }
  });

async function getMappingsFilePath() {
  const path = await import("node:path");
  return path.join(process.cwd(), "data", "mappings.json");
}

async function ensureMappingsFile() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const filePath = await getMappingsFilePath();
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify({}, null, 2), "utf-8");
    }
  } catch (error) {
    console.error("Error ensuring mappings file:", error);
  }
}

async function readMappings(): Promise<Record<string, string>> {
  const fs = await import("node:fs/promises");
  const filePath = await getMappingsFilePath();
  await ensureMappingsFile();
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading mappings file:", error);
    return {};
  }
}

async function writeMappings(mappings: Record<string, string>): Promise<void> {
  const fs = await import("node:fs/promises");
  const filePath = await getMappingsFilePath();
  await ensureMappingsFile();
  try {
    await fs.writeFile(filePath, JSON.stringify(mappings, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing mappings file:", error);
    throw error;
  }
}

export const getMigrationMappingsFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const mappings = await readMappings();
    return { mappings };
  } catch (error: any) {
    console.error("Error in getMigrationMappingsFn:", error);
    throw error;
  }
});

export const updateMigrationMappingFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      issueId: z.string(),
      internalId: z.string().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { issueId, internalId } = data;
    try {
      const mappings = await readMappings();
      if (internalId) {
        mappings[issueId] = internalId;
      } else {
        delete mappings[issueId];
      }
      await writeMappings(mappings);
      return { success: true };
    } catch (error: any) {
      console.error("Error in updateMigrationMappingFn:", error);
      throw error;
    }
  });
