/**
 * Admin Release — JSON Schema–aligned model and form field spec.
 * Used by Admin Portal Release & Distribution tab.
 */

/** Release type enum */
export type ReleaseType =
  | "Bug Fix"
  | "Enhancement"
  | "Content / UI Update"
  | "Security / Stability"
  | "Other";

/** Target platform */
export type Platform = "Windows" | "macOS";

/** Source control lock */
export interface AdminReleaseSource {
  repoUrl?: string;
  branch: string;
  commitSha?: string;
  tagName?: string;
  lockConfirmed?: boolean;
  noPendingChangesConfirmed?: boolean;
}

/** Single artifact (installer) */
export interface AdminReleaseArtifactItem {
  platform: Platform;
  fileName: string;
  sha256?: string;
  fileSizeBytes?: number;
}

/** Build artifacts */
export interface AdminReleaseArtifacts {
  items?: AdminReleaseArtifactItem[];
  codeSigningStatus?: "Signed" | "Partially Signed" | "Not Signed";
}

/** Release notes (customer-facing) */
export interface AdminReleaseNotes {
  whatChanged: string[];
  whyThisMatters: string;
  knownLimitations?: string;
}

/** Distribution plan */
export interface AdminReleaseDistribution {
  method:
    | "Manual Download (Website)"
    | "Email Notification"
    | "In-App Notification"
    | "Combination";
  downloadUrl?: string;
  notificationStatus?: "Not Sent" | "Scheduled" | "Sent";
  notificationDate?: string;
}

/** Deployment status */
export interface AdminReleaseStatus {
  deploymentStatus: "Prepared" | "Live" | "Rolled Back";
  verifiedInstallerTested?: boolean;
  verifiedDownloadedFromLiveUrl?: boolean;
  verifiedLaunchOk?: boolean;
  verifiedNoRegression?: boolean;
}

/** Full admin release (schema-backed) */
export interface AdminRelease {
  id?: string;
  createdAt?: string;
  updatedAt?: string;

  releaseName: string;
  version: string;
  releaseType: ReleaseType;
  platforms: Platform[];

  source: AdminReleaseSource;
  artifacts?: AdminReleaseArtifacts;
  releaseNotes: AdminReleaseNotes;
  distribution: AdminReleaseDistribution;
  status: AdminReleaseStatus;

  internalNotes?: string;
  rollbackNote?: string;
  channel?: "stable" | "beta";
  minSupportedVersion?: string;
}

/** Form field definition */
export type ReleaseFormField =
  | { name: string; label: string; type: "text"; required?: boolean; maxLength?: number; pattern?: RegExp; readOnly?: boolean }
  | { name: string; label: string; type: "number"; min?: number; required?: boolean; readOnly?: boolean }
  | { name: string; label: string; type: "select"; required?: boolean; options: readonly string[]; readOnly?: boolean }
  | { name: string; label: string; type: "multiselect"; required?: boolean; options: readonly string[]; readOnly?: boolean }
  | { name: string; label: string; type: "checkbox"; readOnly?: boolean }
  | { name: string; label: string; type: "textarea"; required?: boolean; maxLength?: number; readOnly?: boolean }
  | { name: string; label: string; type: "date"; required?: boolean; readOnly?: boolean; showWhen?: { field: string; equals: string } }
  | { name: string; label: string; type: "chips"; required?: boolean; minItems?: number; readOnly?: boolean }
  | { name: string; label: string; type: "repeat"; itemFields: readonly { name: string; label: string; type: string; options?: readonly string[]; required?: boolean; pattern?: RegExp; min?: number }[]; readOnly?: boolean }
  | { name: string; label: string; type: "text"; required?: boolean; maxLength?: number; showWhen?: { field: string; includes: string[] }; readOnly?: boolean };

export const releaseFormFields: readonly ReleaseFormField[] = [
  { name: "releaseName", label: "Release Name", type: "text", required: true, maxLength: 120 },
  { name: "version", label: "Version (vX.Y.Z)", type: "text", required: true, pattern: /^v\d+\.\d+\.\d+$/ },
  { name: "releaseType", label: "Release Type", type: "select", required: true, options: ["Bug Fix", "Enhancement", "Content / UI Update", "Security / Stability", "Other"] },
  { name: "platforms", label: "Target Platform(s)", type: "multiselect", required: true, options: ["Windows", "macOS"] },
  { name: "source.repoUrl", label: "Repo URL", type: "text", readOnly: true },
  { name: "source.branch", label: "Git Branch", type: "text", required: true, readOnly: true },
  { name: "source.commitSha", label: "Commit SHA", type: "text", readOnly: true },
  { name: "source.tagName", label: "Tag Name", type: "text", readOnly: true },
  { name: "source.lockConfirmed", label: "I confirm changes are committed and tagged", type: "checkbox" },
  { name: "source.noPendingChangesConfirmed", label: "I confirm no pending changes remain", type: "checkbox" },
  { name: "artifacts.codeSigningStatus", label: "Code Signing Status", type: "select", options: ["Signed", "Partially Signed", "Not Signed"] },
  { name: "artifacts.items", label: "Artifacts", type: "repeat", itemFields: [
    { name: "platform", label: "Platform", type: "select", options: ["Windows", "macOS"], required: true },
    { name: "fileName", label: "Installer File Name", type: "text", required: true },
    { name: "sha256", label: "SHA-256", type: "text", pattern: /^[0-9a-fA-F]{64}$/ },
    { name: "fileSizeBytes", label: "File Size (bytes)", type: "number", min: 1 },
  ] },
  { name: "releaseNotes.whatChanged", label: "What Changed (bullets)", type: "chips", required: true, minItems: 1 },
  { name: "releaseNotes.whyThisMatters", label: "Why This Matters", type: "textarea", required: true, maxLength: 400 },
  { name: "releaseNotes.knownLimitations", label: "Known Limitations / Notes", type: "textarea", maxLength: 600 },
  { name: "distribution.method", label: "Distribution Method", type: "select", required: true, options: ["Manual Download (Website)", "Email Notification", "In-App Notification", "Combination"] },
  { name: "distribution.downloadUrl", label: "Download URL", type: "text", showWhen: { field: "distribution.method", includes: ["Manual Download (Website)", "Combination"] } },
  { name: "distribution.notificationStatus", label: "Customer Notification Status", type: "select", options: ["Not Sent", "Scheduled", "Sent"] },
  { name: "distribution.notificationDate", label: "Notification Date", type: "date", showWhen: { field: "distribution.notificationStatus", equals: "Scheduled" } },
  { name: "status.deploymentStatus", label: "Deployment Status", type: "select", required: true, options: ["Prepared", "Live", "Rolled Back"] },
  { name: "status.verifiedInstallerTested", label: "Installer tested locally", type: "checkbox" },
  { name: "status.verifiedDownloadedFromLiveUrl", label: "Installer downloaded from live URL", type: "checkbox" },
  { name: "status.verifiedLaunchOk", label: "App launches successfully", type: "checkbox" },
  { name: "status.verifiedNoRegression", label: "No regression observed", type: "checkbox" },
  { name: "internalNotes", label: "Internal Notes (admin only)", type: "textarea", maxLength: 2000 },
] as const;

export function emptyAdminRelease(): AdminRelease {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    releaseName: "",
    version: "",
    releaseType: "Enhancement",
    platforms: [],
    source: { branch: "main", lockConfirmed: false, noPendingChangesConfirmed: false },
    artifacts: { items: [], codeSigningStatus: "Not Signed" },
    releaseNotes: { whatChanged: [], whyThisMatters: "", knownLimitations: "" },
    distribution: { method: "Manual Download (Website)", notificationStatus: "Not Sent" },
    status: { deploymentStatus: "Prepared" },
    internalNotes: "",
  };
}

export function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in cur) || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export function isReleaseLive(r: AdminRelease): boolean {
  return r.status?.deploymentStatus === "Live";
}
