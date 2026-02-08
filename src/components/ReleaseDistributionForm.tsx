/**
 * Admin Form: Release & Distribution Management
 * Schema-backed (admin-release.json). Records intent, status, and release metadata.
 * Administrative only. One screen, scrollable. No wizard, no animations.
 * Lock all fields when status.deploymentStatus === "Live"; Rollback Reference stays enabled.
 */

import React, { useState, useCallback, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { formatDateTimeUSA } from "../utils/dateFormat";
import type { AdminRelease, AdminReleaseArtifactItem, Platform } from "../schemas/admin-release";
import {
  emptyAdminRelease,
  getAtPath,
  setAtPath,
  isReleaseLive,
  releaseFormFields,
} from "../schemas/admin-release";

const STORAGE_DRAFT = "admin-release-draft";
const STORAGE_RELEASES = "admin-releases";

function loadDraft(): AdminRelease {
  try {
    const raw = localStorage.getItem(STORAGE_DRAFT);
    if (raw) {
      const d = JSON.parse(raw) as AdminRelease;
      if (d.releaseName != null && d.version != null && d.source && d.releaseNotes && d.distribution && d.status)
        return d;
    }
  } catch { /* ignore */ }
  return emptyAdminRelease();
}

function saveDraft(r: AdminRelease) {
  try {
    const next = { ...r, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_DRAFT, JSON.stringify(next));
  } catch { /* ignore */ }
}

function loadReleases(): AdminRelease[] {
  try {
    const raw = localStorage.getItem(STORAGE_RELEASES);
    if (raw) {
      const arr = JSON.parse(raw) as AdminRelease[];
      return Array.isArray(arr) ? arr : [];
    }
  } catch { /* ignore */ }
  return [];
}

function saveReleases(releases: AdminRelease[]) {
  try {
    localStorage.setItem(STORAGE_RELEASES, JSON.stringify(releases));
  } catch { /* ignore */ }
}

export function ReleaseDistributionForm() {
  const { theme } = useAdmin();
  const [form, setForm] = useState<AdminRelease>(loadDraft);
  const [releases, setReleases] = useState<AdminRelease[]>(loadReleases);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [chipInput, setChipInput] = useState("");
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);
  const [gitDirty, _setGitDirty] = useState<boolean | null>(null);

  const isLive = isReleaseLive(form);
  const lock = isLive;
  const previousLive = releases.filter((r) => r.status?.deploymentStatus === "Live").pop() ?? null;

  const update = useCallback((patch: Partial<AdminRelease>) => {
    setForm((prev) => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
  }, []);

  const updatePath = useCallback((path: string, value: unknown) => {
    setForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as AdminRelease;
      setAtPath(next as unknown as Record<string, unknown>, path, value);
      (next as { updatedAt?: string }).updatedAt = new Date().toISOString();
      return next;
    });
  }, []);

  const persistDraft = useCallback(() => {
    const next = { ...form, updatedAt: new Date().toISOString() };
    saveDraft(next);
    setForm(next);
    setLastSaved(new Date().toISOString());
  }, [form]);

  const markReady = useCallback(() => {
    const next = { ...form, updatedAt: new Date().toISOString() };
    saveDraft(next);
    setForm(next);
    setLastSaved(new Date().toISOString());
  }, [form]);

  const markLive = useCallback(() => {
    const next: AdminRelease = {
      ...form,
      status: { ...form.status, deploymentStatus: "Live" },
      updatedAt: new Date().toISOString(),
    };
    const list = loadReleases();
    list.push(next);
    saveReleases(list);
    setReleases(list);
    const fresh = emptyAdminRelease();
    saveDraft(fresh);
    setForm(fresh);
    setLastSaved(new Date().toISOString());
  }, [form]);

  const startFromRollback = useCallback(() => {
    if (!previousLive) return;
    const base = emptyAdminRelease();
    base.source = { ...previousLive.source };
    base.artifacts = previousLive.artifacts
      ? { items: [...(previousLive.artifacts.items || [])], codeSigningStatus: previousLive.artifacts.codeSigningStatus }
      : { items: [], codeSigningStatus: "Not Signed" };
    base.releaseNotes = {
      whatChanged: [...(previousLive.releaseNotes?.whatChanged || [])],
      whyThisMatters: previousLive.releaseNotes?.whyThisMatters || "",
      knownLimitations: previousLive.releaseNotes?.knownLimitations,
    };
    base.distribution = { ...previousLive.distribution };
    base.status = { ...previousLive.status, deploymentStatus: "Prepared" as const };
    base.internalNotes = previousLive.internalNotes;
    base.releaseName = "";
    base.version = "";
    base.source.commitSha = undefined;
    base.source.tagName = undefined;
    base.source.lockConfirmed = false;
    base.source.noPendingChangesConfirmed = false;
    base.distribution.downloadUrl = undefined;
    base.distribution.notificationStatus = "Not Sent";
    base.distribution.notificationDate = undefined;
    base.status.verifiedInstallerTested = false;
    base.status.verifiedDownloadedFromLiveUrl = false;
    base.status.verifiedLaunchOk = false;
    base.status.verifiedNoRegression = false;
    setForm(base);
    saveDraft(base);
  }, [previousLive]);

  const fillFromGit = useCallback(async () => {
    const api = (window as { electronAPI?: { getGitReleaseInfo?: () => Promise<unknown> } }).electronAPI;
    if (!api?.getGitReleaseInfo) {
      setGitError("Git auto-fill only available in Electron (local).");
      return;
    }
    setGitLoading(true);
    setGitError(null);
    try {
      const info = (await api.getGitReleaseInfo()) as {
        repoUrl?: string;
        branch?: string;
        commitSha?: string;
        tagName?: string;
        dirty?: boolean;
        error?: string;
      };
      if (info.error) {
        setGitError(info.error);
        return;
      }
      setForm((prev) => ({
        ...prev,
        source: {
          ...prev.source,
          repoUrl: info.repoUrl ?? prev.source.repoUrl,
          branch: info.branch ?? prev.source.branch,
          commitSha: info.commitSha ?? prev.source.commitSha,
          tagName: (info.tagName as string) ?? prev.source.tagName,
        },
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      setGitError(e instanceof Error ? e.message : "Git info failed");
    } finally {
      setGitLoading(false);
    }
  }, []);

  useEffect(() => {
    setReleases(loadReleases());
  }, []);

  const cardStyle: React.CSSProperties = {
    background: theme.backgroundCard,
    borderRadius: theme.radiusCard,
    padding: 16,
    marginBottom: 16,
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, color: theme.textSecondary, marginBottom: 4 };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    background: theme.inputBackground,
    border: `1px solid ${theme.borderSubtle}`,
    borderRadius: theme.radiusInput,
    color: theme.inputText,
    fontSize: 13,
  };
  const row = { display: "flex" as const, gap: 16, flexWrap: "wrap" as const };

  const getVal = (path: string) => getAtPath(form as unknown as Record<string, unknown>, path);
  const showDownloadUrl =
    ["Manual Download (Website)", "Combination"].indexOf(String(getVal("distribution.method"))) >= 0;
  const showNotificationDate = getVal("distribution.notificationStatus") === "Scheduled";

  const artifacts = form.artifacts?.items ?? [];
  const addArtifact = () => {
    const items = [...artifacts, { platform: "Windows" as Platform, fileName: "" }];
    updatePath("artifacts.items", items);
  };
  const removeArtifact = (i: number) => {
    const items = artifacts.filter((_, idx) => idx !== i);
    updatePath("artifacts.items", items);
  };
  const setArtifact = (i: number, patch: Partial<AdminReleaseArtifactItem>) => {
    const items = artifacts.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    updatePath("artifacts.items", items);
  };

  const whatChanged = form.releaseNotes?.whatChanged ?? [];
  const addChip = () => {
    const t = chipInput.trim();
    if (!t) return;
    updatePath("releaseNotes.whatChanged", [...whatChanged, t]);
    setChipInput("");
  };
  const removeChip = (i: number) => {
    updatePath(
      "releaseNotes.whatChanged",
      whatChanged.filter((_, idx) => idx !== i)
    );
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {lastSaved && (
        <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
          Last saved: {formatDateTimeUSA(new Date(lastSaved))}
        </p>
      )}

      {/* 1. Release Identification */}
      <div style={cardStyle}>
        <h3 style={{ color: theme.accentGold, marginBottom: 12, fontSize: 14 }}>1. Release Identification</h3>
        <div style={{ ...row, marginBottom: 12 }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>{releaseFormFields[0].label}</label>
            <input
              type="text"
              value={form.releaseName}
              onChange={(e) => update({ releaseName: e.target.value.slice(0, 120) })}
              placeholder="e.g. Header Logo Fix + AfterPassing Guide"
              style={inputStyle}
              disabled={lock}
              maxLength={120}
            />
          </div>
          <div style={{ flex: "0 0 140px" }}>
            <label style={labelStyle}>{releaseFormFields[1].label}</label>
            <input
              type="text"
              value={form.version}
              onChange={(e) => update({ version: e.target.value })}
              placeholder="v1.2.0"
              style={inputStyle}
              disabled={lock}
            />
          </div>
        </div>
        <div style={{ ...row, marginBottom: 12 }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>{releaseFormFields[2].label}</label>
            <select
              value={form.releaseType}
              onChange={(e) => update({ releaseType: e.target.value as AdminRelease["releaseType"] })}
              style={inputStyle}
              disabled={lock}
            >
              {(releaseFormFields[2] as { options: readonly string[] }).options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>{releaseFormFields[3].label}</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {(["Windows", "macOS"] as const).map((p) => (
                <label
                  key={p}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: theme.textPrimary,
                    cursor: lock ? "default" : "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.platforms.includes(p)}
                    onChange={() => {
                      if (lock) return;
                      const has = form.platforms.includes(p);
                      update({
                        platforms: has ? form.platforms.filter((x) => x !== p) : [...form.platforms, p],
                      });
                    }}
                    disabled={lock}
                  />
                  {p}
                </label>
              ))}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: theme.textPrimary,
                  cursor: lock ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.platforms.includes("Windows") && form.platforms.includes("macOS")}
                  onChange={() => {
                    if (lock) return;
                    const both = form.platforms.includes("Windows") && form.platforms.includes("macOS");
                    update({ platforms: both ? [] : (["Windows", "macOS"] as Platform[]) });
                  }}
                  disabled={lock}
                />
                Both
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Source Control Lock */}
      <div style={cardStyle}>
        <h3 style={{ color: theme.accentGold, marginBottom: 12, fontSize: 14 }}>2. Source Control Lock</h3>
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={fillFromGit}
            disabled={lock || gitLoading}
            style={{
              padding: "6px 12px",
              background: theme.buttonPrimaryBg,
              color: theme.buttonPrimaryText,
              border: "none",
              borderRadius: theme.radiusButton,
              fontSize: 12,
              fontWeight: 600,
              cursor: lock || gitLoading ? "not-allowed" : "pointer",
            }}
          >
            {gitLoading ? "Loading…" : "Auto-fill from Git"}
          </button>
          {gitError && (
            <span style={{ marginLeft: 8, fontSize: 12, color: theme.statusError }}>{gitError}</span>
          )}
          {gitDirty === true && (
            <span style={{ marginLeft: 8, fontSize: 12, color: theme.statusWarning }}>
              Uncommitted changes detected. Confirm no pending changes before release.
            </span>
          )}
        </div>
        <div style={{ ...row, marginBottom: 12 }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Repo URL</label>
            <input
              type="text"
              value={form.source?.repoUrl ?? ""}
              onChange={(e) => updatePath("source.repoUrl", e.target.value)}
              readOnly
              style={{ ...inputStyle, opacity: 0.9 }}
              disabled={lock}
            />
          </div>
          <div style={{ flex: "1 1 120px" }}>
            <label style={labelStyle}>Git Branch</label>
            <input
              type="text"
              value={form.source?.branch ?? ""}
              onChange={(e) => updatePath("source.branch", e.target.value)}
              placeholder="main"
              style={{ ...inputStyle, opacity: 0.9 }}
              readOnly
              disabled={lock}
            />
          </div>
        </div>
        <div style={{ ...row, marginBottom: 12 }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Commit SHA</label>
            <input
              type="text"
              value={form.source?.commitSha ?? ""}
              readOnly
              style={{ ...inputStyle, opacity: 0.9 }}
              disabled={lock}
            />
          </div>
          <div style={{ flex: "1 1 120px" }}>
            <label style={labelStyle}>Tag Name</label>
            <input
              type="text"
              value={form.source?.tagName ?? ""}
              readOnly
              style={{ ...inputStyle, opacity: 0.9 }}
              disabled={lock}
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: theme.textPrimary,
              cursor: lock ? "default" : "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!!form.source?.lockConfirmed}
              onChange={(e) => updatePath("source.lockConfirmed", e.target.checked)}
              disabled={lock}
            />
            I confirm changes are committed and tagged
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: theme.textPrimary,
              cursor: lock ? "default" : "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!!form.source?.noPendingChangesConfirmed}
              onChange={(e) => updatePath("source.noPendingChangesConfirmed", e.target.checked)}
              disabled={lock}
            />
            I confirm no pending changes remain
          </label>
        </div>
      </div>

      {/* 3. Build Artifacts */}
      <div style={cardStyle}>
        <h3 style={{ color: theme.accentGold, marginBottom: 12, fontSize: 14 }}>3. Build Artifacts</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Code Signing Status</label>
          <select
            value={form.artifacts?.codeSigningStatus ?? "Not Signed"}
            onChange={(e) => updatePath("artifacts.codeSigningStatus", e.target.value)}
            style={inputStyle}
            disabled={lock}
          >
            {(["Signed", "Partially Signed", "Not Signed"] as const).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Artifacts</label>
          {artifacts.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "flex-end",
                marginBottom: 8,
                padding: "10px 0",
                borderBottom: `1px solid ${theme.borderSubtle}`,
              }}
            >
              <select
                value={a.platform}
                onChange={(e) => setArtifact(i, { platform: e.target.value as Platform })}
                style={{ ...inputStyle, width: 120 }}
                disabled={lock}
              >
                <option value="Windows">Windows</option>
                <option value="macOS">macOS</option>
              </select>
              <input
                type="text"
                value={a.fileName}
                onChange={(e) => setArtifact(i, { fileName: e.target.value })}
                placeholder="Installer file name"
                style={{ ...inputStyle, flex: "1 1 180px" }}
                disabled={lock}
              />
              <input
                type="text"
                value={a.sha256 ?? ""}
                onChange={(e) => setArtifact(i, { sha256: e.target.value || undefined })}
                placeholder="SHA-256"
                style={{ ...inputStyle, width: 200 }}
                disabled={lock}
              />
              <input
                type="number"
                min={1}
                value={a.fileSizeBytes ?? ""}
                onChange={(e) =>
                  setArtifact(i, { fileSizeBytes: e.target.value ? parseInt(e.target.value, 10) : undefined })
                }
                placeholder="Size (bytes)"
                style={{ ...inputStyle, width: 110 }}
                disabled={lock}
              />
              <button
                type="button"
                onClick={() => removeArtifact(i)}
                disabled={lock}
                style={{
                  padding: "6px 10px",
                  background: "transparent",
                  color: theme.textSecondary,
                  border: `1px solid ${theme.borderSubtle}`,
                  borderRadius: theme.radiusButton,
                  cursor: lock ? "not-allowed" : "pointer",
                  fontSize: 12,
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addArtifact}
          disabled={lock}
          style={{
            padding: "6px 12px",
            background: theme.backgroundCard,
            color: theme.textPrimary,
            border: `1px solid ${theme.borderSubtle}`,
            borderRadius: theme.radiusButton,
            cursor: lock ? "not-allowed" : "pointer",
            fontSize: 12,
          }}
        >
          Add artifact
        </button>
      </div>

      {/* 4. Release Notes */}
      <div style={cardStyle}>
        <h3 style={{ color: theme.accentGold, marginBottom: 12, fontSize: 14 }}>4. Release Notes (Customer-Facing)</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>What Changed (bullets)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {whatChanged.map((s, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  background: theme.backgroundPage,
                  border: `1px solid ${theme.borderSubtle}`,
                  borderRadius: theme.radiusInput,
                  fontSize: 12,
                  color: theme.textPrimary,
                }}
              >
                {s}
                {!lock && (
                  <button
                    type="button"
                    onClick={() => removeChip(i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.textSecondary,
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {!lock && (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={chipInput}
                onChange={(e) => setChipInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChip())}
                placeholder="Add bullet…"
                style={{ ...inputStyle, flex: 1 }}
                maxLength={200}
              />
              <button
                type="button"
                onClick={addChip}
                style={{
                  padding: "8px 14px",
                  background: theme.buttonPrimaryBg,
                  color: theme.buttonPrimaryText,
                  border: "none",
                  borderRadius: theme.radiusButton,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Why This Matters</label>
          <textarea
            value={form.releaseNotes?.whyThisMatters ?? ""}
            onChange={(e) => updatePath("releaseNotes.whyThisMatters", e.target.value.slice(0, 400))}
            placeholder="Plain language"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
            disabled={lock}
            maxLength={400}
          />
        </div>
        <div>
          <label style={labelStyle}>Known Limitations / Notes</label>
          <textarea
            value={form.releaseNotes?.knownLimitations ?? ""}
            onChange={(e) => updatePath("releaseNotes.knownLimitations", e.target.value.slice(0, 600))}
            placeholder="Optional"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
            disabled={lock}
            maxLength={600}
          />
        </div>
      </div>

      {/* 5. Distribution Plan */}
      <div style={cardStyle}>
        <h3 style={{ color: theme.accentGold, marginBottom: 12, fontSize: 14 }}>5. Distribution Plan</h3>
        <div style={{ ...row, marginBottom: 12 }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Distribution Method</label>
            <select
              value={form.distribution?.method ?? "Manual Download (Website)"}
              onChange={(e) =>
                updatePath("distribution.method", e.target.value as AdminRelease["distribution"]["method"])
              }
              style={inputStyle}
              disabled={lock}
            >
              {(["Manual Download (Website)", "Email Notification", "In-App Notification", "Combination"] as const).map(
                (o) => (
                  <option key={o} value={o}>{o}</option>
                )
              )}
            </select>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Customer Notification Status</label>
            <select
              value={form.distribution?.notificationStatus ?? "Not Sent"}
              onChange={(e) =>
                updatePath("distribution.notificationStatus", e.target.value as "Not Sent" | "Scheduled" | "Sent")
              }
              style={inputStyle}
              disabled={lock}
            >
              {(["Not Sent", "Scheduled", "Sent"] as const).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          {showNotificationDate && (
            <div style={{ flex: "0 0 140px" }}>
              <label style={labelStyle}>Notification Date</label>
              <input
                type="date"
                value={form.distribution?.notificationDate ?? ""}
                onChange={(e) => updatePath("distribution.notificationDate", e.target.value)}
                style={inputStyle}
                disabled={lock}
              />
            </div>
          )}
        </div>
        {showDownloadUrl && (
          <div>
            <label style={labelStyle}>Download URL</label>
            <input
              type="text"
              value={form.distribution?.downloadUrl ?? ""}
              onChange={(e) => updatePath("distribution.downloadUrl", e.target.value)}
              placeholder="https://..."
              style={inputStyle}
              disabled={lock}
            />
          </div>
        )}
      </div>

      {/* 6. Deployment Confirmation */}
      <div style={cardStyle}>
        <h3 style={{ color: theme.accentGold, marginBottom: 12, fontSize: 14 }}>6. Deployment Confirmation</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Deployment Status</label>
          <select
            value={form.status?.deploymentStatus ?? "Prepared"}
            onChange={(e) =>
              updatePath("status.deploymentStatus", e.target.value as "Prepared" | "Live" | "Rolled Back")
            }
            style={inputStyle}
            disabled={lock}
          >
            {(["Prepared", "Live", "Rolled Back"] as const).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { key: "verifiedInstallerTested", label: "Installer tested locally" },
            { key: "verifiedDownloadedFromLiveUrl", label: "Installer downloaded from live URL" },
            { key: "verifiedLaunchOk", label: "App launches successfully" },
            { key: "verifiedNoRegression", label: "No regression observed" },
          ].map(({ key, label }) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: theme.textPrimary,
                cursor: lock ? "default" : "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={!!(form.status as Record<string, unknown>)?.[key]}
                onChange={(e) => updatePath(`status.${key}`, e.target.checked)}
                disabled={lock}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* 7. Internal Notes */}
      <div style={cardStyle}>
        <h3 style={{ color: theme.accentGold, marginBottom: 12, fontSize: 14 }}>7. Internal Notes (Admin Only)</h3>
        <textarea
          value={form.internalNotes ?? ""}
          onChange={(e) => updatePath("internalNotes", e.target.value.slice(0, 2000))}
          placeholder="e.g. LiteSpeed caching disabled prior to this release"
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          disabled={lock}
          maxLength={2000}
        />
      </div>

      {/* Primary Actions */}
      <div style={{ ...cardStyle, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={persistDraft}
          disabled={lock}
          style={{
            padding: "8px 14px",
            background: theme.buttonPrimaryBg,
            color: theme.buttonPrimaryText,
            border: "none",
            borderRadius: theme.radiusButton,
            fontWeight: 600,
            cursor: lock ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={markReady}
          disabled={lock}
          style={{
            padding: "8px 14px",
            background: theme.backgroundCard,
            color: theme.textPrimary,
            border: `1px solid ${theme.borderSubtle}`,
            borderRadius: theme.radiusButton,
            fontWeight: 600,
            cursor: lock ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          Mark Release as Ready
        </button>
        <button
          type="button"
          onClick={markLive}
          disabled={lock}
          style={{
            padding: "8px 14px",
            background: theme.buttonPrimaryBg,
            color: theme.buttonPrimaryText,
            border: "none",
            borderRadius: theme.radiusButton,
            fontWeight: 600,
            cursor: lock ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          Mark as Live
        </button>
        {previousLive && (
          <button
            type="button"
            onClick={startFromRollback}
            style={{
              padding: "8px 14px",
              background: "transparent",
              color: theme.accentGold,
              border: `1px solid ${theme.accentGold}`,
              borderRadius: theme.radiusButton,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Rollback Reference: {previousLive.version || previousLive.releaseName || "previous"}
          </button>
        )}
      </div>

      {lock && (
        <p style={{ fontSize: 12, color: theme.textMuted }}>
          This release is live and immutable. Create a new release for further changes.
        </p>
      )}
    </div>
  );
}
