import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type JiraConfig, type JiraIssue } from "./jira-types";

type SyncErrorType = "permission" | "rate_limit" | "timeout" | "network" | "unknown";

type SyncAttachmentResult = {
  filename: string;
  size: number;
  action: "uploaded" | "skipped" | "failed";
  retryable: boolean;
  errorType?: SyncErrorType;
  error?: string;
};

type SyncStepError = {
  step: "fetch_source" | "fetch_target" | "update_fields" | "transfer_attachments";
  type: SyncErrorType;
  message: string;
  retryable: boolean;
  statusCode?: number;
};

class JiraHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = "JiraHttpError";
  }
}

function classifySyncError(error: unknown): {
  type: SyncErrorType;
  retryable: boolean;
  message: string;
  statusCode?: number;
} {
  if (error instanceof JiraHttpError) {
    if (error.status === 401 || error.status === 403) {
      return {
        type: "permission",
        retryable: false,
        message: error.message,
        statusCode: error.status,
      };
    }
    if (error.status === 429) {
      return {
        type: "rate_limit",
        retryable: true,
        message: error.message,
        statusCode: error.status,
      };
    }
    return {
      type: "unknown",
      retryable: error.status >= 500,
      message: error.message,
      statusCode: error.status,
    };
  }

  const maybeError = error as { name?: string; message?: string };
  if (maybeError?.name === "TimeoutError" || maybeError?.name === "AbortError") {
    return {
      type: "timeout",
      retryable: true,
      message: maybeError.message || "Request timed out",
    };
  }

  if (maybeError?.name === "TypeError") {
    return {
      type: "network",
      retryable: true,
      message: maybeError.message || "Network error",
    };
  }

  return {
    type: "unknown",
    retryable: false,
    message: maybeError?.message || "Unknown error",
  };
}

function addSyncError(
  list: SyncStepError[],
  step: SyncStepError["step"],
  error: unknown,
  fallbackMessage: string,
) {
  const classified = classifySyncError(error);
  list.push({
    step,
    type: classified.type,
    retryable: classified.retryable,
    statusCode: classified.statusCode,
    message: classified.message || fallbackMessage,
  });
}

function attachmentFingerprint(att: { filename?: string; size?: number }) {
  return `${att.filename || "unknown"}::${att.size || 0}`;
}

function splitMigrationDescription(description: string) {
  const trimmed = description.trim();
  const separatorIndex = trimmed.indexOf("\n\n");
  if (separatorIndex === -1) {
    return { prefix: trimmed, body: "" };
  }

  return {
    prefix: trimmed.slice(0, separatorIndex),
    body: trimmed.slice(separatorIndex + 2).trim(),
  };
}

function buildUpdatedDescription(existingDescription: string | undefined, sourceDescription: string) {
  const sourceBody = sourceDescription.trim();
  const existing = existingDescription?.trim();

  if (!existing) {
    return sourceBody;
  }

  const { prefix } = splitMigrationDescription(existing);
  if (/^(Ursprünglich:|Migrated from)/.test(prefix)) {
    return `${prefix}\n\n${sourceBody}`;
  }

  return `${existing}\n\n${sourceBody}`;
}

// Helper to make requests to JIRA API
function buildAuthHeader(config: JiraConfig): string {
  if (config.instanceType === "cloud" && config.email) {
    return `Basic ${btoa(`${config.email}:${config.pat}`)}`;
  }
  return `Bearer ${config.pat}`;
}

/** Returns the REST API base path for the configured instance type. */
function apiBase(config: JiraConfig): string {
  return config.instanceType === "cloud" ? "/rest/api/3" : "/rest/api/2";
}

/**
 * Converts an Atlassian Document Format (ADF) node to plain text.
 * Jira Cloud API v3 returns description/comment bodies as ADF objects.
 * Falls back to string pass-through for Server/Data Center API v2.
 */
function adfToText(adf: unknown): string {
  if (!adf || typeof adf !== "object") {
    return typeof adf === "string" ? adf : "";
  }
  const node = adf as {
    type?: string;
    text?: string;
    content?: unknown[];
    attrs?: Record<string, unknown>;
  };
  switch (node.type) {
    case "text":
      return node.text ?? "";
    case "hardBreak":
      return "\n";
    case "mention":
      return `@${node.attrs?.text ?? node.attrs?.id ?? ""}`;
    case "emoji":
      return node.attrs?.shortName ? String(node.attrs.shortName) : "";
    case "inlineCard":
      return node.attrs?.url ? String(node.attrs.url) : "";
    case "mediaInline":
    case "media":
      return "";
    default:
      break;
  }
  if (!Array.isArray(node.content)) return "";
  const parts = node.content.map(adfToText);
  switch (node.type) {
    case "paragraph":
    case "heading":
      return parts.join("") + "\n";
    case "listItem":
      return "• " + parts.join("").trimEnd() + "\n";
    case "bulletList":
    case "orderedList":
      return parts.join("") + "\n";
    case "blockquote":
      return parts.map((p) => "> " + p).join("") + "\n";
    case "codeBlock":
      return "```\n" + parts.join("") + "```\n";
    case "rule":
      return "\n---\n";
    default:
      return parts.join("");
  }
}

async function fetchJira(config: JiraConfig, path: string, options: RequestInit = {}) {
  const cleanUrl = config.url.replace(/\/$/, "");
  const targetUrl = `${cleanUrl}${path}`;
  const method = options.method || "GET";

  console.log(`📡 [JIRA Outgoing] ${method} -> ${targetUrl}`);

  const headers = new Headers(options.headers);
  headers.set("Authorization", buildAuthHeader(config));
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  const response = await fetch(targetUrl, {
    ...options,
    headers,
  });

  console.log(`📥 [JIRA Response] ${method} -> ${targetUrl} [Status: ${response.status}]`);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new JiraHttpError(
      `JIRA API request failed: ${response.statusText} (${response.status}) - ${errorText}`,
      response.status,
      response.statusText,
      errorText,
    );
  }

  if (response.status === 204) {
    return null;
  }

  const body = await response.text();
  if (!body.trim()) {
    return null;
  }

  return JSON.parse(body);
}

async function downloadAttachment(
  contentUrl: string,
  externalConfig: JiraConfig,
  filename: string,
): Promise<Blob> {
  const response = await fetch(contentUrl, {
    headers: {
      Authorization: buildAuthHeader(externalConfig),
    },
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new JiraHttpError(
      `Failed to download attachment ${filename}: ${response.statusText} (${response.status}) - ${body}`,
      response.status,
      response.statusText,
      body,
    );
  }

  return response.blob();
}

async function uploadAttachment(
  internalUrl: string,
  internalPat: string,
  targetIssueId: string,
  filename: string,
  payload: Blob,
): Promise<void> {
  const uploadUrl = `${internalUrl.replace(/\/$/, "")}/rest/api/2/issue/${targetIssueId}/attachments`;
  const form = new FormData();
  form.append("file", payload, filename);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${internalPat}`,
      "X-Atlassian-Token": "no-check",
    },
    body: form,
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new JiraHttpError(
      `Failed to upload attachment ${filename}: ${response.statusText} (${response.status}) - ${body}`,
      response.status,
      response.statusText,
      body,
    );
  }
}

const jiraConfigSchema = z.object({
  url: z.string(),
  pat: z.string(),
  instanceType: z.enum(["server", "cloud"]).optional(),
  email: z.string().optional(),
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
    const fieldList = ["summary", "description", "updated", "assignee", "issuetype", "status"];

    let result: any;
    try {
      if (config.instanceType === "cloud") {
        // Jira Cloud dropped GET /rest/api/2/search — use POST /rest/api/3/search/jql
        result = await fetchJira(config, "/rest/api/3/search/jql", {
          method: "POST",
          body: JSON.stringify({ jql, fields: fieldList, maxResults: 100 }),
        });
      } else {
        const fields = fieldList.join(",");
        const path = `/rest/api/2/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=100`;
        result = await fetchJira(config, path);
      }

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
          description: adfToText(fields.description),
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
      const result = await fetchJira(config, `${apiBase(config)}/project`);
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
      const result = await fetchJira(config, `${apiBase(config)}/project/${projectKey}`);
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
      const issueDetailsPath = `${apiBase(externalConfig)}/issue/${issueId}`;
      const extIssue = await fetchJira(externalConfig, issueDetailsPath);
      const extDescription = adfToText(extIssue.fields.description);

      // 2. Prepare internal issue fields
      const createBody = {
        fields: {
          project: {
            key: targetProjectKey,
          },
          summary: extIssue.fields.summary,
          description: `Migrated from ${issueId} (${externalConfig.url}/browse/${issueId})\n\n${extDescription}`,
          issuetype: {
            name: targetIssueTypeName || extIssue.fields.issuetype?.name || "Task",
          },
          labels: [issueId],
        },
      };

      // 3. Post to internal JIRA
      const createResult = await fetchJira(internalConfig, "/rest/api/2/issue", {
        method: "POST",
        body: JSON.stringify(createBody),
      });

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
                Authorization: buildAuthHeader(externalConfig),
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
                Authorization: buildAuthHeader(internalConfig),
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

export const getJiraIssueDetailsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      config: jiraConfigSchema,
      issueId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { config, issueId } = data;
    try {
      if (!config.url || !config.pat) {
        const { getMockIssueDetails } = await import("./jira-mock");
        return getMockIssueDetails(issueId);
      }
      const result = await fetchJira(config, `${apiBase(config)}/issue/${issueId}?fields=description,comment,attachment`);
      const fields = result.fields || {};
      const description = adfToText(fields.description);
      const commentsList = fields.comment?.comments || [];

      const comments = commentsList.map((c: any) => {
        const authorName = c.author?.displayName || c.author?.name || "Unknown Author";
        const initials =
          authorName
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "UA";

        return {
          id: c.id,
          author: {
            name: authorName,
            initials,
          },
          body: adfToText(c.body),
          createdAt: c.created || new Date().toISOString(),
        };
      });

      const attachments = (fields.attachment || []).map((att: any) => ({
        id: att.id,
        filename: att.filename || "unknown",
        size: att.size || 0,
        mimeType: att.mimeType || "",
        content: att.content || "",
      }));

      return { description, comments, attachments };
    } catch (error: any) {
      console.error("Error in getJiraIssueDetailsFn:", error);
      throw error;
    }
  });

export const updateMappedJiraIssueFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      externalConfig: jiraConfigSchema,
      internalConfig: jiraConfigSchema,
      issueId: z.string(),
      internalId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { externalConfig, internalConfig, issueId, internalId } = data;
    const errors: SyncStepError[] = [];
    const attachmentResults: SyncAttachmentResult[] = [];

    let sourceAttachmentsCount = 0;
    let targetAttachmentsCount = 0;
    let fieldsUpdated = false;

    try {
      const sourceIssuePath = `${apiBase(externalConfig)}/issue/${issueId}?fields=summary,description,attachment`;
      const targetIssuePath = `/rest/api/2/issue/${internalId}?fields=description,attachment`;

      let sourceIssue: any;
      try {
        sourceIssue = await fetchJira(externalConfig, sourceIssuePath);
      } catch (error) {
        addSyncError(errors, "fetch_source", error, "Failed to fetch source issue");
        return {
          issueId,
          internalId,
          status: "failure" as const,
          fieldsUpdated,
          attachments: attachmentResults,
          attachmentSummary: {
            sourceCount: sourceAttachmentsCount,
            targetCount: targetAttachmentsCount,
            uploadedCount: 0,
            skippedCount: 0,
            failedCount: 0,
          },
          errors,
        };
      }

      let targetIssue: any;
      try {
        targetIssue = await fetchJira(internalConfig, targetIssuePath);
      } catch (error) {
        addSyncError(errors, "fetch_target", error, "Failed to fetch target issue");
        return {
          issueId,
          internalId,
          status: "failure" as const,
          fieldsUpdated,
          attachments: attachmentResults,
          attachmentSummary: {
            sourceCount: sourceAttachmentsCount,
            targetCount: targetAttachmentsCount,
            uploadedCount: 0,
            skippedCount: 0,
            failedCount: 0,
          },
          errors,
        };
      }

      try {
        await fetchJira(internalConfig, `/rest/api/2/issue/${internalId}`, {
          method: "PUT",
          body: JSON.stringify({
            fields: {
              summary: sourceIssue.fields?.summary || "",
              description: buildUpdatedDescription(
                targetIssue.fields?.description,
                adfToText(sourceIssue.fields?.description),
              ),
            },
          }),
        });
        fieldsUpdated = true;
      } catch (error) {
        addSyncError(errors, "update_fields", error, "Failed to update target fields");
        return {
          issueId,
          internalId,
          status: "failure" as const,
          fieldsUpdated,
          attachments: attachmentResults,
          attachmentSummary: {
            sourceCount: sourceAttachmentsCount,
            targetCount: targetAttachmentsCount,
            uploadedCount: 0,
            skippedCount: 0,
            failedCount: 0,
          },
          errors,
        };
      }

      const sourceAttachments = sourceIssue.fields?.attachment || [];
      const targetAttachments = targetIssue.fields?.attachment || [];
      sourceAttachmentsCount = sourceAttachments.length;
      targetAttachmentsCount = targetAttachments.length;

      const targetFingerprintSet = new Set<string>(
        targetAttachments.map((att: any) => attachmentFingerprint(att)),
      );

      for (const sourceAttachment of sourceAttachments) {
        const filename = sourceAttachment.filename || "unknown";
        const size = sourceAttachment.size || 0;
        const fingerprint = attachmentFingerprint(sourceAttachment);

        if (targetFingerprintSet.has(fingerprint)) {
          attachmentResults.push({
            filename,
            size,
            action: "skipped",
            retryable: false,
          });
          continue;
        }

        try {
          const payload = await downloadAttachment(
            sourceAttachment.content,
            externalConfig,
            filename,
          );
          await uploadAttachment(
            internalConfig.url,
            internalConfig.pat,
            internalId,
            filename,
            payload,
          );
          attachmentResults.push({
            filename,
            size,
            action: "uploaded",
            retryable: false,
          });
        } catch (error) {
          const classified = classifySyncError(error);
          attachmentResults.push({
            filename,
            size,
            action: "failed",
            retryable: classified.retryable,
            errorType: classified.type,
            error: classified.message,
          });
          addSyncError(errors, "transfer_attachments", error, `Failed to transfer ${filename}`);
        }
      }

      const uploadedCount = attachmentResults.filter((a) => a.action === "uploaded").length;
      const skippedCount = attachmentResults.filter((a) => a.action === "skipped").length;
      const failedCount = attachmentResults.filter((a) => a.action === "failed").length;
      const status = failedCount === 0 ? "success" : "partial";

      return {
        issueId,
        internalId,
        status,
        fieldsUpdated,
        attachments: attachmentResults,
        attachmentSummary: {
          sourceCount: sourceAttachmentsCount,
          targetCount: targetAttachmentsCount,
          uploadedCount,
          skippedCount,
          failedCount,
        },
        errors,
      };
    } catch (error) {
      addSyncError(errors, "transfer_attachments", error, "Unexpected update failure");
      return {
        issueId,
        internalId,
        status: "failure" as const,
        fieldsUpdated,
        attachments: attachmentResults,
        attachmentSummary: {
          sourceCount: sourceAttachmentsCount,
          targetCount: targetAttachmentsCount,
          uploadedCount: attachmentResults.filter((a) => a.action === "uploaded").length,
          skippedCount: attachmentResults.filter((a) => a.action === "skipped").length,
          failedCount: attachmentResults.filter((a) => a.action === "failed").length,
        },
        errors,
      };
    }
  });
