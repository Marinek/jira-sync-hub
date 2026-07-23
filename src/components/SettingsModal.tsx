import { useState, useEffect } from "react";
import { Settings, ShieldAlert, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJiraConfig } from "@/hooks/useJiraConfig";
import { toast } from "sonner";

interface SettingsModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsModal({ trigger, open, onOpenChange }: SettingsModalProps) {
  const { config, saveConfig } = useJiraConfig();
  const [isOpen, setIsOpen] = useState(false);

  // Manage open state either internally or externally
  const activeOpen = open !== undefined ? open : isOpen;
  const setActiveOpen = onOpenChange !== undefined ? onOpenChange : setIsOpen;

  // External Jira state
  const [extUrl, setExtUrl] = useState("");
  const [extPat, setExtPat] = useState("");
  const [extInstanceType, setExtInstanceType] = useState<"server" | "cloud">("server");
  const [extEmail, setExtEmail] = useState("");

  // Internal Jira state
  const [intUrl, setIntUrl] = useState("");
  const [intPat, setIntPat] = useState("");

  // Populate states when config loads
  useEffect(() => {
    if (activeOpen) {
      setExtUrl(config.externalJira.url);
      setExtPat(config.externalJira.pat);
      setExtInstanceType(config.externalJira.instanceType ?? "server");
      setExtEmail(config.externalJira.email ?? "");

      setIntUrl(config.internalJira.url);
      setIntPat(config.internalJira.pat);
    }
  }, [activeOpen, config]);

  const handleSave = () => {
    if (!extUrl || !extPat || !intUrl || !intPat) {
      toast.error("Please fill in all configuration fields");
      return;
    }

    if (extInstanceType === "cloud" && !extEmail.trim()) {
      toast.error("Email is required for Jira Cloud authentication");
      return;
    }

    const success = saveConfig({
      externalJira: {
        url: extUrl.trim(),
        pat: extPat.trim(),
        instanceType: extInstanceType,
        email: extInstanceType === "cloud" ? extEmail.trim() : undefined,
      },
      internalJira: {
        url: intUrl.trim(),
        pat: intPat.trim(),
      },
    });

    if (success) {
      toast.success("Jira configuration saved successfully!");
      setActiveOpen(false);
      // Reload page to apply config to active states
      window.location.reload();
    } else {
      toast.error("Failed to save JIRA settings.");
    }
  };

  return (
    <Dialog open={activeOpen} onOpenChange={setActiveOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            JIRA Integration Settings
          </DialogTitle>
          <DialogDescription>
            Configure connections to your external and internal JIRA instances.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 flex items-start gap-2.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-600 dark:text-yellow-400">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
          <div>
            <span className="font-semibold">Security Warning:</span> Credentials are stored in
            plaintext in the browser's <code>localStorage</code>. Make sure you only run this
            application in a trusted local environment and do not deploy it publicly.
          </div>
        </div>

        <div className="grid gap-6 py-4 md:grid-cols-2">
          {/* External JIRA */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <h3 className="font-semibold text-sm border-b pb-2 text-foreground">
              External JIRA Instance (Source)
            </h3>
            <div className="space-y-2">
              <Label>Instance Type</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="ext-instance-type"
                    value="server"
                    checked={extInstanceType === "server"}
                    onChange={() => setExtInstanceType("server")}
                  />
                  Server / Data Center
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="ext-instance-type"
                    value="cloud"
                    checked={extInstanceType === "cloud"}
                    onChange={() => setExtInstanceType("cloud")}
                  />
                  Cloud
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ext-url">JIRA Base URL</Label>
              <Input
                id="ext-url"
                placeholder={extInstanceType === "cloud" ? "https://yourcompany.atlassian.net" : "https://jira.company.com"}
                value={extUrl}
                onChange={(e) => setExtUrl(e.target.value)}
              />
            </div>
            {extInstanceType === "cloud" && (
              <div className="space-y-2">
                <Label htmlFor="ext-email">Email</Label>
                <Input
                  id="ext-email"
                  type="email"
                  placeholder="you@company.com"
                  value={extEmail}
                  onChange={(e) => setExtEmail(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ext-pat">
                {extInstanceType === "cloud" ? "API Token" : "Personal Access Token (PAT)"}
              </Label>
              <Input
                id="ext-pat"
                type="password"
                placeholder={extInstanceType === "cloud" ? "Atlassian API Token" : "JIRA PAT Token"}
                value={extPat}
                onChange={(e) => setExtPat(e.target.value)}
              />
            </div>
          </div>

          {/* Internal JIRA */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <h3 className="font-semibold text-sm border-b pb-2 text-foreground">
              Internal JIRA Instance (Target)
            </h3>
            <div className="space-y-2">
              <Label htmlFor="int-url">JIRA Base URL</Label>
              <Input
                id="int-url"
                placeholder="https://internal-jira.company.com"
                value={intUrl}
                onChange={(e) => setIntUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="int-pat">Personal Access Token (PAT)</Label>
              <Input
                id="int-pat"
                type="password"
                placeholder="JIRA PAT Token"
                value={intPat}
                onChange={(e) => setIntPat(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} className="gap-1.5">
            <Check className="h-4 w-4" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
