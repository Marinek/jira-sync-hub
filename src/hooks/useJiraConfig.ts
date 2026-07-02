import { useState, useEffect } from "react";
import { type JiraAuthConfig, type JiraConfig } from "@/lib/jira-types";

const LOCAL_STORAGE_KEY = "jira_sync_auth_config";

const defaultConfig: JiraAuthConfig = {
  externalJira: { url: "", pat: "" },
  internalJira: { url: "", pat: "" },
};

export function useJiraConfig() {
  const [config, setConfig] = useState<JiraAuthConfig>(defaultConfig);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse JIRA config from localStorage:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveConfig = (newConfig: JiraAuthConfig) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
      return true;
    } catch (e) {
      console.error("Failed to save JIRA config to localStorage:", e);
      return false;
    }
  };

  const isConfigured = (jiraConfig: JiraConfig) => {
    return (
      jiraConfig.url.trim() !== "" &&
      jiraConfig.pat.trim() !== ""
    );
  };

  const isFullyConfigured =
    isConfigured(config.externalJira) && isConfigured(config.internalJira);

  return {
    config,
    saveConfig,
    isFullyConfigured,
    isLoaded,
    isExternalConfigured: isConfigured(config.externalJira),
    isInternalConfigured: isConfigured(config.internalJira),
  };
}
