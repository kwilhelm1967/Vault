import React, { useState, useCallback, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { formatDateUSA, formatDateTimeUSA } from "../utils/dateFormat";
import { ReleaseDistributionForm } from "./ReleaseDistributionForm";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type TabId = "metrics" | "overview" | "recent" | "search" | "trials" | "customers" | "profile" | "webhooks" | "texas" | "scripts" | "release" | "releaseNotes" | "emails" | "orders" | "licenses" | "funnel" | "downloads" | "support" | "attribution" | "leads" | "playbooks" | "analytics" | "bugs" | "audit" | "policy" | "status" | "partners" | "builds" | "extras";

const TABS: { id: TabId; label: string }[] = [
  { id: "metrics", label: "Home" },
  { id: "overview", label: "Overview" },
  { id: "recent", label: "Recent" },
  { id: "search", label: "Search" },
  { id: "licenses", label: "Licenses" },
  { id: "trials", label: "Trials" },
  { id: "funnel", label: "Trials & Funnel" },
  { id: "customers", label: "Customers" },
  { id: "profile", label: "Users & Timeline" },
  { id: "webhooks", label: "Webhooks" },
  { id: "texas", label: "Texas Filing" },
  { id: "scripts", label: "Scripts" },
  { id: "release", label: "Release and Distribution" },
  { id: "releaseNotes", label: "Release Notes" },
  { id: "emails", label: "Email templates" },
  { id: "downloads", label: "Downloads & Email" },
  { id: "attribution", label: "Campaign Attribution" },
  { id: "leads", label: "Leads" },
  { id: "playbooks", label: "Common Problems & Troubleshooting" },
  { id: "analytics", label: "Analytics" },
  { id: "bugs", label: "Bug Reports" },
  { id: "audit", label: "Audit Log" },
  { id: "policy", label: "Policy Center" },
  { id: "status", label: "System Status" },
  { id: "partners", label: "Partner Codes" },
  { id: "builds", label: "Build Artifacts" },
  { id: "extras", label: "Extras" },
];

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

type HomeMetrics = {
  period?: string;
  tiles?: {
    trialsStarted?: number;
    purchasesCompleted?: number;
    activationsCompleted?: number;
    conversionRate?: number;
    refundsRequested?: number;
    supportTicketsOpened?: number;
    emailBounces?: number;
    activationFailures?: number;
  };
  trends?: {
    trialsPerDay?: { date: string; count: number }[];
    purchasesPerDay?: { date: string; count: number }[];
    topFailureReasons?: { reason: string; count: number }[];
    supportVolumeByCategory?: { category: string; count: number }[];
    activationFailureRateByDay?: { date: string; success: number; fail: number; rate_pct: number }[];
  };
  alerts?: {
    activationFailuresSpike?: boolean;
    refundsSpike?: boolean;
    bounceRateHigh?: boolean;
    webhookFailuresAboveThreshold?: boolean;
  };
} & Record<string, unknown>;

function HomeDashboard({
  metrics,
  period,
  onPeriodChange,
  onRefresh,
  onNavigateTab,
  theme,
  loading,
}: {
  metrics: Record<string, unknown>;
  period: "24h" | "30d";
  onPeriodChange: (p: "24h" | "30d") => void;
  onRefresh: () => void;
  onNavigateTab?: (tab: TabId) => void;
  theme: { textPrimary: string; textSecondary: string; textMuted: string; accentGold: string; backgroundCard: string; radiusCard: string; statusError: string; statusSuccess?: string; borderSubtle: string };
  loading: boolean;
}) {
  const m = metrics as HomeMetrics;
  const tiles = m.tiles ?? {};
  const trends = m.trends ?? {};
  const alerts = m.alerts ?? {};

  const TILE_ITEMS = [
    { key: "trialsStarted", label: "Trials started", value: tiles.trialsStarted ?? 0 },
    { key: "purchasesCompleted", label: "Purchases completed", value: tiles.purchasesCompleted ?? 0 },
    { key: "activationsCompleted", label: "Activations completed", value: tiles.activationsCompleted ?? 0 },
    { key: "conversionRate", label: "Conversion rate", value: tiles.conversionRate != null ? `${tiles.conversionRate}%` : "—" },
    { key: "refundsRequested", label: "Refunds requested", value: tiles.refundsRequested ?? 0 },
    { key: "supportTicketsOpened", label: "Support tickets", value: tiles.supportTicketsOpened ?? 0 },
    { key: "emailBounces", label: "Email bounces", value: tiles.emailBounces ?? 0 },
    { key: "activationFailures", label: "Activation failures", value: tiles.activationFailures ?? 0 },
  ];

  const trialsData = trends.trialsPerDay ?? [];
  const purchasesData = trends.purchasesPerDay ?? [];
  const maxTrials = Math.max(1, ...trialsData.map((d) => d.count));
  const maxPurchases = Math.max(1, ...purchasesData.map((d) => d.count));

  const checklistItems: { label: string; tab?: TabId; href?: string; external?: boolean }[] = [
    { label: "Review last 24 hours exceptions", tab: "metrics" },
    { label: "Check refunds and chargebacks", tab: "orders" },
    { label: "Check support inbox", tab: "support" },
    { label: "Check trial funnel", tab: "funnel" },
    { label: "Check top support issues", tab: "playbooks" },
    { label: "Confirm download links healthy", tab: "status" },
    { label: "Check license key inventory", tab: "licenses" },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => onPeriodChange("24h")}
            style={{
              padding: "10px 18px",
              background: period === "24h" ? theme.accentGold : "rgba(255,255,255,0.05)",
              color: period === "24h" ? "#1a1a1a" : theme.textSecondary,
              border: `1px solid ${period === "24h" ? theme.accentGold : "rgba(255,255,255,0.1)"}`,
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Last 24h
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange("30d")}
            style={{
              padding: "10px 18px",
              background: period === "30d" ? theme.accentGold : "rgba(255,255,255,0.05)",
              color: period === "30d" ? "#1a1a1a" : theme.textSecondary,
              border: `1px solid ${period === "30d" ? theme.accentGold : "rgba(255,255,255,0.1)"}`,
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Last 30d
          </button>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.06)", color: theme.textSecondary, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16, marginBottom: 28 }}>
        {TILE_ITEMS.map((t) => (
          <div key={t.key} style={{ background: theme.backgroundCard, borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            <div style={{ color: theme.textMuted, fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t.label}</div>
            <div style={{ color: theme.textPrimary, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{t.value}</div>
          </div>
        ))}
      </div>

      {(alerts.activationFailuresSpike || alerts.refundsSpike || alerts.bounceRateHigh || alerts.webhookFailuresAboveThreshold) && (
        <div style={{ marginBottom: 24, padding: 18, background: "rgba(220, 38, 38, 0.12)", borderRadius: 10, border: "1px solid rgba(220, 38, 38, 0.35)" }}>
          <div style={{ color: theme.statusError, fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Alerts</div>
          <ul style={{ margin: 0, paddingLeft: 20, color: theme.textPrimary, fontSize: 13, lineHeight: 1.6 }}>
            {alerts.activationFailuresSpike && <li>Activation failures up 3× vs previous period</li>}
            {alerts.refundsSpike && <li>Refunds up 2× vs previous period</li>}
            {alerts.bounceRateHigh && <li>Email bounce rate above 5%</li>}
            {alerts.webhookFailuresAboveThreshold && <li>Stripe webhook failures above threshold (≥3 in 24h)</li>}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        <div style={{ background: theme.backgroundCard, borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          <h4 style={{ color: theme.accentGold, margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>Trials per day</h4>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trialsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme.textMuted }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: theme.textMuted }} />
                <Tooltip contentStyle={{ background: theme.backgroundCard, border: `1px solid ${theme.accentGold}` }} labelStyle={{ color: theme.textPrimary }} formatter={(v: number) => [v, "Trials"]} />
                <Line type="monotone" dataKey="count" stroke={theme.accentGold} strokeWidth={2} dot={{ r: 3 }} name="Trials" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ background: theme.backgroundCard, borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          <h4 style={{ color: theme.accentGold, margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>Purchases per day</h4>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={purchasesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme.textMuted }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: theme.textMuted }} />
                <Tooltip contentStyle={{ background: theme.backgroundCard, border: `1px solid ${theme.accentGold}` }} labelStyle={{ color: theme.textPrimary }} formatter={(v: number) => [v, "Purchases"]} />
                <Line type="monotone" dataKey="count" stroke={theme.accentGold} strokeWidth={2} dot={{ r: 3 }} name="Purchases" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {trends.activationFailureRateByDay && trends.activationFailureRateByDay.length > 0 && (
        <div style={{ background: theme.backgroundCard, borderRadius: 12, padding: 20, marginBottom: 24, border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          <h4 style={{ color: theme.accentGold, margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>Activation failure rate by day</h4>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.activationFailureRateByDay.map((d) => ({ ...d, rate: d.rate_pct }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme.textMuted }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: theme.textMuted }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: theme.backgroundCard, border: `1px solid ${theme.accentGold}` }} formatter={(v: number, n: string) => [n === "rate" ? `${v}%` : v, n === "rate" ? "Fail rate" : n]} />
                <Line type="monotone" dataKey="rate" stroke={theme.statusError} strokeWidth={2} dot={{ r: 3 }} name="rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {trends.supportVolumeByCategory && trends.supportVolumeByCategory.length > 0 && (
        <div style={{ background: theme.backgroundCard, borderRadius: 12, padding: 20, marginBottom: 24, border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          <h4 style={{ color: theme.accentGold, margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>Support volume by category</h4>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends.supportVolumeByCategory.map((c) => ({ name: c.category || "other", count: c.count }))} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: theme.textMuted }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: theme.textMuted }} width={80} />
                <Tooltip contentStyle={{ background: theme.backgroundCard, border: `1px solid ${theme.accentGold}` }} />
                <Bar dataKey="count" fill={theme.accentGold} name="Tickets" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {trends.topFailureReasons && trends.topFailureReasons.length > 0 && (
        <div style={{ background: theme.backgroundCard, borderRadius: 12, padding: 20, marginBottom: 24, border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          <h4 style={{ color: theme.accentGold, margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>Top failure reasons</h4>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <tbody>
              {trends.topFailureReasons.map((r, i) => (
                <tr key={i} style={{ background: i % 2 ? "rgba(0,0,0,0.06)" : "transparent" }}>
                  <td style={{ padding: "12px 16px", color: theme.textPrimary, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", borderBottom: "1px solid rgba(255,255,255,0.06)" }} title={r.reason}>{r.reason}</td>
                  <td style={{ padding: "12px 16px", color: theme.textMuted, textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ background: theme.backgroundCard, borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <h4 style={{ color: theme.accentGold, margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>Founder daily checklist</h4>
        <ul style={{ margin: 0, paddingLeft: 20, listStyle: "none" }}>
          {checklistItems.map((c, i) => (
            <li key={i} style={{ marginBottom: 10 }}>
              {c.external && c.href ? (
                <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ color: theme.textSecondary, textDecoration: "none", fontSize: 14 }}>{c.label}</a>
              ) : c.tab && onNavigateTab ? (
                <button type="button" onClick={() => onNavigateTab(c.tab!)} style={{ background: "none", border: "none", padding: 0, color: theme.textSecondary, cursor: "pointer", fontSize: 14, textAlign: "left" }}>{c.label}</button>
              ) : (
                <span style={{ color: theme.textMuted, fontSize: 14 }}>{c.label}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const { token, apiBase, resetIdleTimer, lock, theme, productLabel, supabaseAnonKey } = useAdmin();
  const [tab, setTab] = useState<TabId>("metrics");
  const [metricsPeriod, setMetricsPeriod] = useState<"24h" | "30d">("24h");
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [recent, setRecent] = useState<{ licenses?: unknown[] } | null>(null);
  const [trials, setTrials] = useState<Record<string, unknown> | null>(null);
  const [customers, setCustomers] = useState<{ stats?: { topCustomers?: unknown[] } } | null>(null);
  const [webhooks, setWebhooks] = useState<{ webhooks?: unknown[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ licenses?: unknown[]; trials?: unknown[]; tickets?: unknown[]; purchases?: unknown[]; q?: string } | null>(null);
  const [profileEmail, setProfileEmail] = useState("");
  const [profileNote, setProfileNote] = useState("");
  const [profileTag, setProfileTag] = useState("");
  const [profileActionStatus, setProfileActionStatus] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    email?: string;
    userRecord?: { createdDate?: string; productTier?: string; status?: string; tags?: string[] };
    timeline?: { ts: string; type: string; label: string; detail?: string; success?: boolean }[];
    licenses?: unknown[];
    purchases?: unknown[];
    trials?: unknown[];
    activation_events?: unknown[];
    email_events?: unknown[];
    support_tickets?: unknown[];
    notes?: unknown[];
    tags?: { tag?: string }[];
  } | null>(null);
  const [txPeriodStart, setTxPeriodStart] = useState("");
  const [txPeriodEnd, setTxPeriodEnd] = useState("");
  const [txData, setTxData] = useState<{
    period_start?: string;
    period_end?: string;
    summary?: { gross_sales_cents?: number; tax_collected_cents?: number; tax_refunded_cents?: number; net_tax_due_cents?: number };
    transactions?: unknown[];
  } | null>(null);
  const [txLog, setTxLog] = useState<unknown[]>([]);
  const [txConfirmation, setTxConfirmation] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [ordersDateFrom, setOrdersDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [ordersDateTo, setOrdersDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [ordersState, setOrdersState] = useState("");
  const [ordersStatus, setOrdersStatus] = useState("");
  const [ordersRefunded, setOrdersRefunded] = useState<boolean | null>(null);
  const [ordersData, setOrdersData] = useState<{ orders?: unknown[]; date_from?: string; date_to?: string } | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refundRequests, setRefundRequests] = useState<{ reason_category?: string; resolution?: string; notes?: string; created_at?: string }[]>([]);
  const [refundReason, setRefundReason] = useState("");
  const [refundResolution, setRefundResolution] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [refundSubmitStatus, setRefundSubmitStatus] = useState<string | null>(null);
  const [fraudSignals, setFraudSignals] = useState<{ duplicatePurchases?: { email: string; count: number }[]; chargebacksByDomain?: { domain: string; count: number }[]; manyTrialsByDomain?: { domain: string; count: number }[]; highBounceDomains?: { domain: string; count: number }[]; openDisputesCount?: number } | null>(null);

  const [downloadHealth, setDownloadHealth] = useState<{ probes?: { platform?: string; url?: string; status?: number; responseTimeMs?: number; contentLength?: number | null; ok?: boolean }[]; allHealthy?: boolean } | null>(null);
  const [emailLogs, setEmailLogs] = useState<{ type?: string; recipient?: string; email?: string; template?: string; event_type?: string; status?: string; at?: string }[]>([]);
  const [emailDeliverability, setEmailDeliverability] = useState<{ bounceRate?: number; delivered?: number; bounces?: number; topBounceDomains?: { domain: string; count: number }[]; topFailingProviders?: { provider: string; count: number }[]; byDay?: { date: string; delivered: number; bounces: number; bounceRate: number }[] } | null>(null);
  const [suppressionEmails, setSuppressionEmails] = useState<{ email?: string; reason?: string; created_at?: string }[]>([]);
  const [suppressionAdd, setSuppressionAdd] = useState("");
  const [suppressionReason, setSuppressionReason] = useState("");
  const [suppressionStatus, setSuppressionStatus] = useState<string | null>(null);

  const [ticketsList, setTicketsList] = useState<{ tickets?: { id?: string; ticket_number?: string; name?: string; email?: string; category?: string; subject?: string; status?: string; created_at?: string; first_response_at?: string | null; resolved_at?: string | null }[] } | null>(null);
  const [ticketsFilterStatus, setTicketsFilterStatus] = useState("");
  const [ticketsFilterCategory, setTicketsFilterCategory] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<{ ticket?: Record<string, unknown>; scripts?: { id?: string; category?: string; title?: string; when_to_use?: string; short_version?: string; long_version?: string }[]; playbooks?: { title?: string; symptoms?: string; fix_steps?: string; workaround?: string }[]; kb_articles?: { id?: string; title?: string; url?: string; category?: string }[] } | null>(null);
  const [ticketInternalNotes, setTicketInternalNotes] = useState("");
  const [ticketActionStatus, setTicketActionStatus] = useState<string | null>(null);

  const [attributionData, setAttributionData] = useState<{ attribution?: { source: string; trials: number; conversions: number; conversionRate: number }[]; totalTrials?: number; totalPurchases?: number } | null>(null);
  const [attributionDays, setAttributionDays] = useState(30);
  const [leadsList, setLeadsList] = useState<{ id?: string; organization_name?: string; contact_name?: string; email?: string; type?: string; status?: string; notes?: string; created_at?: string }[]>([]);
  const [leadForm, setLeadForm] = useState({ organization_name: "", contact_name: "", email: "", type: "other", status: "not_contacted", notes: "" });
  const [leadStatus, setLeadStatus] = useState<string | null>(null);
  const [playbooksData, setPlaybooksData] = useState<{ issues?: { id?: string; title?: string; symptoms?: string; fix_steps?: string }[]; scripts?: { id?: string; title?: string; short_version?: string; long_version?: string }[] } | null>(null);
  const [playbookSearch, setPlaybookSearch] = useState("");
  const [selectedPlaybookIssueId, setSelectedPlaybookIssueId] = useState<string | null>(null);
  const [playbookDetail, setPlaybookDetail] = useState<{ issue?: Record<string, unknown>; suggestedScripts?: { title?: string; short_version?: string; long_version?: string }[]; generated?: { customerReply?: string; internalNotes?: string; bugReportTemplate?: string } } | null>(null);

  const [bugReports, setBugReports] = useState<{ id?: string; title?: string; severity?: string; status?: string; created_at?: string }[]>([]);
  const [bugForm, setBugForm] = useState({ title: "", severity: "normal", steps: "", expected: "", customerImpacted: false, appVersion: "", os: "", logs: "" });
  const [bugStatus, setBugStatus] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<{ acted_at?: string; actor_identifier?: string; action?: string; entity_type?: string; entity_id?: string; reason?: string; details?: Record<string, unknown> }[]>([]);
  const [policyVersions, setPolicyVersions] = useState<Record<string, { id?: string; version?: string; published_at?: string; content?: string }[]>>({});
  const [policyForm, setPolicyForm] = useState({ policy_type: "eula", version: "", content: "" });
  const [policyStatus, setPolicyStatus] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<{ integrations?: Record<string, { healthy?: boolean; probes?: unknown[]; last_delivered_at?: string; last_paid_at?: string }>; all_healthy?: boolean } | null>(null);
  const [partnerCodes, setPartnerCodes] = useState<{ id?: string; code?: string; name?: string; type?: string; created_at?: string }[]>([]);
  const [partnerForm, setPartnerForm] = useState({ code: "", name: "", type: "referral" });
  const [partnerStatus, setPartnerStatus] = useState<string | null>(null);
  const [bugDashboard, setBugDashboard] = useState<{ openBugs?: number; byStatus?: Record<string, number>; bySeverity?: Record<string, number>; byAppVersion?: Record<string, number>; topErrorCodes?: { errorId?: string; count?: number }[] } | null>(null);
  const [buildArtifacts, setBuildArtifacts] = useState<{ id?: string; version?: string; platform?: string; url?: string; file_size_bytes?: number; checksum_sha256?: string; is_current?: boolean; created_at?: string }[]>([]);
  const [buildForm, setBuildForm] = useState({ version: "", platform: "windows", url: "", fileSize: "", checksum: "" });
  const [buildStatus, setBuildStatus] = useState<string | null>(null);
  const [releaseNotesList, setReleaseNotesList] = useState<{ id?: string; version?: string; notes?: string; is_current?: boolean; created_at?: string }[]>([]);
  const [releaseNoteForm, setReleaseNoteForm] = useState({ version: "", notes: "" });
  const [releaseNoteStatus, setReleaseNoteStatus] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<{ id?: string; message?: string; severity?: string; active?: boolean; created_at?: string; expires_at?: string }[]>([]);
  const [announcementForm, setAnnouncementForm] = useState({ message: "", severity: "info", expires_at: "" });
  const [announcementStatus, setAnnouncementStatus] = useState<string | null>(null);
  const [npsData, setNpsData] = useState<{ responses?: { id?: string; license_key_last4?: string; score?: number; feedback?: string; created_at?: string }[]; summary?: { count?: number; avg_score?: number; nps_score?: number; promoters?: number; passives?: number; detractors?: number } } | null>(null);
  const [featureRequests, setFeatureRequests] = useState<{ id?: string; title?: string; description?: string; source?: string; status?: string; votes?: number; created_at?: string }[]>([]);
  const [featureRequestForm, setFeatureRequestForm] = useState({ title: "", description: "" });
  const [featureRequestStatus, setFeatureRequestStatus] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{ summary?: { total_events?: number; installs?: number; activation_success?: number; activation_fail?: number; activation_success_rate_pct?: number; screen_first_record?: number; time_to_first_value_pct?: number; errors?: number; crashes?: number; crash_free_sessions?: number }; by_event_type?: Record<string, number>; by_app_version?: { version?: string; count?: number }[] } | null>(null);
  const [errorRatesData, setErrorRatesData] = useState<{ activation_by_day?: { date: string; success: number; fail: number; total: number; fail_rate_pct: number }[]; app_errors_by_day?: { date: string; activation_fail?: number; error?: number; fail_rate_pct?: number }[] } | null>(null);
  const [rolloutRollouts, setRolloutRollouts] = useState<{ version?: string; rollout_pct?: number }[]>([]);
  const [rolloutForm, setRolloutForm] = useState({ version: "", platform: "", rollout_pct: 100 });
  const [rolloutStatus, setRolloutStatus] = useState<string | null>(null);
  const [campaignCosts, setCampaignCosts] = useState<{ id?: string; period_start?: string; period_end?: string; cost_cents?: number; cost_type?: string; utm_source?: string; notes?: string }[]>([]);
  const [campaignCostForm, setCampaignCostForm] = useState({ period_start: "", period_end: "", cost_cents: 0, cost_type: "campaign" as string, utm_source: "", notes: "" });
  const [campaignCostStatus, setCampaignCostStatus] = useState<string | null>(null);
  const [automationConfig, setAutomationConfig] = useState<{ id?: string; day_offset?: number; template_id?: string; template_name?: string; active?: boolean }[]>([]);
  const [automationAttribution, setAutomationAttribution] = useState<{ template?: string; sent?: number; delivered?: number; converted?: number }[]>([]);
  const [kbArticles, setKbArticles] = useState<{ id?: string; title?: string; url?: string; category?: string }[]>([]);
  const [kbForm, setKbForm] = useState({ title: "", url: "", category: "general" });
  const [kbStatus, setKbStatus] = useState<string | null>(null);
  const [resendTemplate, setResendTemplate] = useState("purchase-confirmation");
  const [resendParams, setResendParams] = useState("");
  const [resendTo, setResendTo] = useState("");
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const SUGGESTED_TAGS = ["VIP", "influencer", "estate attorney lead"];
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createTrialEmail, setCreateTrialEmail] = useState("");
  const [createTrialKey, setCreateTrialKey] = useState<string | null>(null);
  const [createTrialLoading, setCreateTrialLoading] = useState(false);
  const [createTrialError, setCreateTrialError] = useState<string | null>(null);
  const [createLicenseEmail, setCreateLicenseEmail] = useState("");
  const [createLicenseReason, setCreateLicenseReason] = useState("");
  const [createLicenseConfirm, setCreateLicenseConfirm] = useState("");
  const [createLicenseKey, setCreateLicenseKey] = useState<string | null>(null);
  const [createLicenseLoading, setCreateLicenseLoading] = useState(false);
  const [createLicenseError, setCreateLicenseError] = useState<string | null>(null);
  const [reactivateLicenseKey, setReactivateLicenseKey] = useState("");
  const [reactivateLicenseReason, setReactivateLicenseReason] = useState("");
  const [reactivateLicenseConfirm, setReactivateLicenseConfirm] = useState("");
  const [reactivateLicenseStatus, setReactivateLicenseStatus] = useState<string | null>(null);
  const [reactivateLicenseLoading, setReactivateLicenseLoading] = useState(false);
  const [reactivateLicenseError, setReactivateLicenseError] = useState<string | null>(null);
  const [reactivateTrialKey, setReactivateTrialKey] = useState("");
  const [reactivateTrialReason, setReactivateTrialReason] = useState("");
  const [reactivateTrialDays, setReactivateTrialDays] = useState(14);
  const [reactivateTrialStatus, setReactivateTrialStatus] = useState<string | null>(null);
  const [reactivateTrialLoading, setReactivateTrialLoading] = useState(false);
  const [reactivateTrialError, setReactivateTrialError] = useState<string | null>(null);

  const [licensesList, setLicensesList] = useState<{ licenses: { id?: string; licenseKey?: string; last4?: string; product?: string; planType?: string; email?: string; status?: string; deviceBound?: boolean; activatedAt?: string | null; createdAt?: string; activationCount?: number; lastActivationAttempt?: string | null }[]; total?: number } | null>(null);
  const [licensesFilterStatus, setLicensesFilterStatus] = useState("");
  const [licenseDetail, setLicenseDetail] = useState<{ license?: { keyMasked?: string; last4?: string; product?: string; planType?: string; email?: string; status?: string; deviceBound?: boolean; activatedAt?: string | null; createdAt?: string; notes?: string | null }; activationAttempts?: { timestamp?: string; result?: string; errorId?: string; whatThisMeans?: string }[] } | null>(null);
  const [licenseReports, setLicenseReports] = useState<{ activationSuccessRate?: number | null; totalAttempts?: number; deviceMismatchCount?: number; topFailureReasons?: { errorId?: string; count?: number }[] } | null>(null);
  const [reissueLicenseKey, setReissueLicenseKey] = useState("");
  const [reissueReason, setReissueReason] = useState("");
  const [reissueConfirm, setReissueConfirm] = useState("");
  const [reissueStatus, setReissueStatus] = useState<string | null>(null);
  const [reissueLoading, setReissueLoading] = useState(false);
  const [reissueNewKey, setReissueNewKey] = useState<string | null>(null);
  const [revokeLicenseKey, setRevokeLicenseKey] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeConfirm, setRevokeConfirm] = useState("");
  const [revokeStatus, setRevokeStatus] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [resetBindingKey, setResetBindingKey] = useState("");
  const [resetBindingReason, setResetBindingReason] = useState("");
  const [resetBindingConfirm, setResetBindingConfirm] = useState("");
  const [resetBindingStatus, setResetBindingStatus] = useState<string | null>(null);
  const [resetBindingLoading, setResetBindingLoading] = useState(false);
  const [rebindExceptionKey, setRebindExceptionKey] = useState("");
  const [rebindExceptionReason, setRebindExceptionReason] = useState("");
  const [rebindExceptionHours, setRebindExceptionHours] = useState(48);
  const [rebindExceptionStatus, setRebindExceptionStatus] = useState<string | null>(null);
  const [rebindExceptionLoading, setRebindExceptionLoading] = useState(false);

  const [funnelData, setFunnelData] = useState<{ periodDays?: number; cohort?: { trialsByDay?: { date: string; count: number }[]; totalTrials?: number; activationRate?: number; expirationRate?: number; conversionRate?: number; timeToActivationHoursMedian?: number | null; timeToActivationHoursAvg?: number | null; timeToPurchaseDaysMedian?: number | null; timeToPurchaseDaysAvg?: number | null }; funnel?: { signup?: number; delivered?: number; clicked?: number; activationAttempt?: number; activationSuccess?: number; purchased?: number } } | null>(null);
  const [funnelDays, setFunnelDays] = useState(30);
  const [funnelCohortEmails, setFunnelCohortEmails] = useState<{ step?: string; emails?: string[] } | null>(null);

  const fetchAdmin = useCallback(
    async (path: string, opts?: RequestInit) => {
      if (!token) return null;
      resetIdleTimer();
      const res = await fetch(`${apiBase}${path}`, {
        ...opts,
        headers: { ...authHeaders(token), ...(opts?.headers as HeadersInit) },
      });
      return res;
    },
    [token, apiBase, resetIdleTimer]
  );

  const loadMetrics = useCallback(async () => {
    setLoading("metrics");
    setError(null);
    try {
      const res = await fetchAdmin(`/admin-dashboard-metrics?period=${metricsPeriod}`);
      const data = res ? await res.json() : null;
      if (data?.success) setMetrics(data.metrics);
      else setError("Failed to load metrics");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin, metricsPeriod]);

  const loadOverview = useCallback(async () => {
    setLoading("overview");
    setError(null);
    try {
      const res = await fetchAdmin("/admin-stats-overview");
      const data = res ? await res.json() : null;
      if (data?.success) setOverview(data.stats);
      else setError("Failed to load overview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin]);

  const loadRecent = useCallback(async () => {
    setLoading("recent");
    setError(null);
    try {
      const res = await fetchAdmin("/admin-stats-recent");
      const data = res ? await res.json() : null;
      if (data?.success) setRecent(data);
      else setError("Failed to load recent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin]);

  const loadTrials = useCallback(async () => {
    setLoading("trials");
    setError(null);
    try {
      const res = await fetchAdmin("/admin-stats-trials");
      const data = res ? await res.json() : null;
      if (data?.success) setTrials(data.stats);
      else setError("Failed to load trials");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin]);

  const loadCustomers = useCallback(async () => {
    setLoading("customers");
    setError(null);
    try {
      const res = await fetchAdmin("/admin-stats-customers");
      const data = res ? await res.json() : null;
      if (data?.success) setCustomers(data);
      else setError("Failed to load customers");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin]);

  const loadWebhooks = useCallback(async () => {
    setLoading("webhooks");
    setError(null);
    try {
      const res = await fetchAdmin("/admin-webhooks-failed");
      const data = res ? await res.json() : null;
      if (data?.success) setWebhooks(data);
      else setError("Failed to load webhooks");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin]);

  const loadProfile = useCallback(async () => {
    const e = profileEmail.trim();
    if (!e) return;
    setLoading("profile");
    setError(null);
    setProfileActionStatus(null);
    try {
      const res = await fetchAdmin(`/admin-customer-profile?email=${encodeURIComponent(e)}`);
      const data = res ? await res.json() : null;
      if (data?.success) setProfile(data.profile);
      else setError("Failed to load profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [profileEmail, fetchAdmin]);

  const addCustomerNote = useCallback(async () => {
    const e = profile?.email?.trim();
    const body = profileNote.trim();
    if (!e || !body) {
      setProfileActionStatus("Enter a note");
      return;
    }
    setProfileActionStatus(null);
    try {
      const res = await fetchAdmin("/admin-customer-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_note", customer_email: e, body }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setProfileNote("");
        loadProfile();
      } else {
        setProfileActionStatus(data?.error || "Failed");
      }
    } catch (err) {
      setProfileActionStatus(err instanceof Error ? err.message : "Error");
    }
  }, [profile?.email, profileNote, fetchAdmin, loadProfile]);

  const addCustomerTag = useCallback(async (tagOverride?: string) => {
    const e = profile?.email?.trim();
    const tag = (tagOverride ?? profileTag).trim();
    if (!e || !tag) {
      setProfileActionStatus("Enter a tag");
      return;
    }
    setProfileActionStatus(null);
    try {
      const res = await fetchAdmin("/admin-customer-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_tag", customer_email: e, tag }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setProfileTag("");
        loadProfile();
      } else {
        setProfileActionStatus(data?.error || "Failed");
      }
    } catch (err) {
      setProfileActionStatus(err instanceof Error ? err.message : "Error");
    }
  }, [profile?.email, profileTag, fetchAdmin, loadProfile]);

  const loadLicensesList = useCallback(async () => {
    setLoading("licenses");
    setError(null);
    try {
      let path = "/admin-licenses-list?limit=50&offset=0";
      if (licensesFilterStatus) path += `&status=${encodeURIComponent(licensesFilterStatus)}`;
      const res = await fetchAdmin(path);
      const data = res ? await res.json() : null;
      if (data?.success) setLicensesList({ licenses: data.licenses, total: data.total });
      else setError("Failed to load licenses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin, licensesFilterStatus]);

  const loadLicenseDetail = useCallback(async (last4: string) => {
    if (!last4) return;
    setLoading("license-detail");
    try {
      const res = await fetchAdmin(`/admin-license-detail?last4=${encodeURIComponent(last4)}`);
      const data = res ? await res.json() : null;
      if (data?.success) setLicenseDetail(data.detail);
      else setLicenseDetail(null);
    } catch {
      setLicenseDetail(null);
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin]);

  const loadLicenseReports = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-license-reports?days=30");
      const data = res ? await res.json() : null;
      if (data?.success) setLicenseReports(data.reports);
    } catch {
      setLicenseReports(null);
    }
  }, [fetchAdmin]);

  const reissueLicenseAction = useCallback(async () => {
    const key = reissueLicenseKey.trim();
    const reason = reissueReason.trim();
    if (!key) {
      setReissueStatus("Enter the full license key.");
      return;
    }
    if (!reason) {
      setReissueStatus("Enter a reason.");
      return;
    }
    if (reissueConfirm.trim() !== "REISSUE") {
      setReissueStatus('Type REISSUE to confirm.');
      return;
    }
    setReissueLoading(true);
    setReissueStatus(null);
    setReissueNewKey(null);
    try {
      const res = await fetchAdmin("/admin-license-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reissue_license",
          licenseKey: key,
          reason,
          confirmationPhrase: "REISSUE",
        }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setReissueNewKey(data.license_key);
        loadLicensesList();
        if (licenseDetail?.license?.last4) loadLicenseDetail(licenseDetail.license.last4);
      } else {
        setReissueStatus(data?.error || "Failed");
      }
    } catch (e) {
      setReissueStatus(e instanceof Error ? e.message : "Error");
    } finally {
      setReissueLoading(false);
    }
  }, [fetchAdmin, reissueLicenseKey, reissueReason, reissueConfirm, loadLicensesList, loadLicenseDetail, licenseDetail?.license?.last4]);

  const revokeLicenseAction = useCallback(async () => {
    const key = revokeLicenseKey.trim();
    const reason = revokeReason.trim();
    if (!key) {
      setRevokeStatus("Enter the full license key.");
      return;
    }
    if (!reason) {
      setRevokeStatus("Enter a reason.");
      return;
    }
    if (revokeConfirm.trim() !== "REVOKE") {
      setRevokeStatus('Type REVOKE to confirm.');
      return;
    }
    setRevokeLoading(true);
    setRevokeStatus(null);
    try {
      const res = await fetchAdmin("/admin-license-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_license", licenseKey: key, reason, confirmationPhrase: "REVOKE" }),
      });
      const data = res ? await res.json().catch(() => ({})) : {};
      if (data.success) {
        setRevokeStatus("License revoked.");
        setRevokeLicenseKey("");
        setRevokeReason("");
        setRevokeConfirm("");
        loadLicensesList();
        if (licenseDetail?.license?.last4) loadLicenseDetail(licenseDetail.license.last4);
      } else {
        setRevokeStatus(data.error || `Request failed (${res?.status ?? 0})`);
      }
    } catch (e) {
      setRevokeStatus(e instanceof Error ? e.message : "Network error");
    } finally {
      setRevokeLoading(false);
    }
  }, [fetchAdmin, revokeLicenseKey, revokeReason, revokeConfirm, loadLicensesList, loadLicenseDetail, licenseDetail?.license?.last4]);

  const resetBindingLicenseAction = useCallback(async () => {
    const key = resetBindingKey.trim();
    const reason = resetBindingReason.trim();
    if (!key) {
      setResetBindingStatus("Enter the full license key.");
      return;
    }
    if (!reason) {
      setResetBindingStatus("Enter a reason.");
      return;
    }
    if (resetBindingConfirm.trim() !== "RESET") {
      setResetBindingStatus('Type RESET to confirm.');
      return;
    }
    setResetBindingLoading(true);
    setResetBindingStatus(null);
    try {
      const res = await fetchAdmin("/admin-license-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_binding", licenseKey: key, reason, confirmationPhrase: "RESET" }),
      });
      const data = res ? await res.json().catch(() => ({})) : {};
      if (data.success) {
        setResetBindingStatus("Device binding reset. User can activate on a new device.");
        setResetBindingKey("");
        setResetBindingReason("");
        setResetBindingConfirm("");
        loadLicensesList();
        if (licenseDetail?.license?.last4) loadLicenseDetail(licenseDetail.license.last4);
      } else {
        setResetBindingStatus(data.error || `Request failed (${res?.status ?? 0})`);
      }
    } catch (e) {
      setResetBindingStatus(e instanceof Error ? e.message : "Network error");
    } finally {
      setResetBindingLoading(false);
    }
  }, [fetchAdmin, resetBindingKey, resetBindingReason, resetBindingConfirm, loadLicensesList, loadLicenseDetail, licenseDetail?.license?.last4]);

  const rebindExceptionAction = useCallback(async () => {
    const key = rebindExceptionKey.trim();
    const reason = rebindExceptionReason.trim();
    if (!key || !reason) {
      setRebindExceptionStatus("Enter license key and reason");
      return;
    }
    setRebindExceptionLoading(true);
    setRebindExceptionStatus(null);
    try {
      const res = await fetchAdmin("/admin-license-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rebind_exception", licenseKey: key, reason, rebindHours: rebindExceptionHours }),
      });
      const data = res ? await res.json().catch(() => ({})) : {};
      if (data.success) {
        setRebindExceptionStatus(`Rebind exception granted for ${rebindExceptionHours}h. User can activate on new device until ${data.expires_at ? new Date(data.expires_at).toLocaleString() : ""}`);
        setRebindExceptionKey("");
        setRebindExceptionReason("");
        loadLicensesList();
      } else {
        setRebindExceptionStatus(data.error || "Request failed");
      }
    } catch (e) {
      setRebindExceptionStatus(e instanceof Error ? e.message : "Network error");
    } finally {
      setRebindExceptionLoading(false);
    }
  }, [fetchAdmin, rebindExceptionKey, rebindExceptionReason, rebindExceptionHours, loadLicensesList]);

  const loadFunnel = useCallback(async () => {
    setLoading("funnel");
    setError(null);
    try {
      const res = await fetchAdmin(`/admin-trial-funnel?days=${funnelDays}`);
      const data = res ? await res.json() : null;
      if (data?.success) setFunnelData(data.funnel);
      else setError("Failed to load funnel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin, funnelDays]);

  const loadFunnelCohort = useCallback(async (step: string) => {
    try {
      const res = await fetchAdmin(`/admin-trial-funnel?days=${funnelDays}&step=${encodeURIComponent(step)}`);
      const data = res ? await res.json() : null;
      if (data?.success) setFunnelCohortEmails({ step, emails: data.emails || [] });
    } catch {
      setFunnelCohortEmails(null);
    }
  }, [fetchAdmin, funnelDays]);

  const removeCustomerTag = useCallback(async (tag: string) => {
    const e = profile?.email?.trim();
    if (!e) return;
    setProfileActionStatus(null);
    try {
      const res = await fetchAdmin("/admin-customer-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_tag", customer_email: e, tag }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) loadProfile();
    } catch {
      setProfileActionStatus("Failed to remove tag");
    }
  }, [profile?.email, fetchAdmin, loadProfile]);

  const loadOrders = useCallback(async () => {
    const from = ordersDateFrom.trim();
    const to = ordersDateTo.trim();
    if (!from || !to) {
      setError("Enter date range (YYYY-MM-DD)");
      return;
    }
    setLoading("orders");
    setError(null);
    try {
      let path = `/admin-orders?date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`;
      if (ordersState.trim()) path += `&state=${encodeURIComponent(ordersState.trim())}`;
      if (ordersStatus) path += `&status=${encodeURIComponent(ordersStatus)}`;
      if (ordersRefunded === true) path += "&refunded=true";
      else if (ordersRefunded === false) path += "&refunded=false";
      const res = await fetchAdmin(path);
      const data = res ? await res.json() : null;
      if (data?.success) setOrdersData({ orders: data.orders, date_from: data.date_from, date_to: data.date_to });
      else setError(data?.error || "Failed to load orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [ordersDateFrom, ordersDateTo, ordersState, ordersStatus, ordersRefunded, fetchAdmin]);

  const loadRefundRequests = useCallback(async (purchaseId: string) => {
    try {
      const res = await fetchAdmin(`/admin-refund-workflow?purchase_id=${encodeURIComponent(purchaseId)}`);
      const data = res ? await res.json() : null;
      if (data?.success) setRefundRequests(data.requests || []);
    } catch {
      setRefundRequests([]);
    }
  }, [fetchAdmin]);

  const submitRefundRequest = useCallback(async () => {
    if (!selectedOrderId || !refundReason || !refundResolution) {
      setRefundSubmitStatus("Select reason and resolution.");
      return;
    }
    setRefundSubmitStatus(null);
    try {
      const res = await fetchAdmin("/admin-refund-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchase_id: selectedOrderId,
          reason_category: refundReason,
          resolution: refundResolution,
          notes: refundNotes.trim() || undefined,
        }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setRefundSubmitStatus("Saved.");
        setRefundReason("");
        setRefundResolution("");
        setRefundNotes("");
        loadRefundRequests(selectedOrderId);
      } else {
        setRefundSubmitStatus(data?.error || "Failed");
      }
    } catch (e) {
      setRefundSubmitStatus(e instanceof Error ? e.message : "Error");
    }
  }, [selectedOrderId, refundReason, refundResolution, refundNotes, fetchAdmin, loadRefundRequests]);

  const loadFraudSignals = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-fraud-signals?days=30");
      const data = res ? await res.json() : null;
      if (data?.success) setFraudSignals(data.signals);
    } catch {
      setFraudSignals(null);
    }
  }, [fetchAdmin]);

  const loadDownloadHealth = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-download-health");
      const data = res ? await res.json() : null;
      if (data?.success) setDownloadHealth(data);
    } catch {
      setDownloadHealth(null);
    }
  }, [fetchAdmin]);

  const loadEmailLogs = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-email-logs?limit=50");
      const data = res ? await res.json() : null;
      if (data?.success) setEmailLogs(data.logs || []);
    } catch {
      setEmailLogs([]);
    }
  }, [fetchAdmin]);

  const loadEmailDeliverability = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-email-deliverability?days=14");
      const data = res ? await res.json() : null;
      if (data?.success) setEmailDeliverability(data.deliverability);
    } catch {
      setEmailDeliverability(null);
    }
  }, [fetchAdmin]);

  const loadSuppression = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-suppression");
      const data = res ? await res.json() : null;
      if (data?.success) setSuppressionEmails(data.emails || []);
    } catch {
      setSuppressionEmails([]);
    }
  }, [fetchAdmin]);

  const addSuppressionEmail = useCallback(async () => {
    const email = suppressionAdd.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setSuppressionStatus("Enter valid email");
      return;
    }
    setSuppressionStatus(null);
    try {
      const res = await fetchAdmin("/admin-suppression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason: suppressionReason.trim() || undefined }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setSuppressionStatus("Added.");
        setSuppressionAdd("");
        setSuppressionReason("");
        loadSuppression();
      } else {
        setSuppressionStatus(data?.error || "Failed");
      }
    } catch (e) {
      setSuppressionStatus(e instanceof Error ? e.message : "Error");
    }
  }, [suppressionAdd, suppressionReason, fetchAdmin, loadSuppression]);

  const loadTicketsInbox = useCallback(async () => {
    setLoading("tickets");
    setError(null);
    try {
      let path = "/admin-tickets-inbox?limit=50&offset=0";
      if (ticketsFilterStatus) path += `&status=${encodeURIComponent(ticketsFilterStatus)}`;
      if (ticketsFilterCategory) path += `&category=${encodeURIComponent(ticketsFilterCategory)}`;
      const res = await fetchAdmin(path);
      const data = res ? await res.json() : null;
      if (data?.success) setTicketsList({ tickets: data.tickets });
      else setError("Failed to load tickets");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin, ticketsFilterStatus, ticketsFilterCategory]);

  const loadTicketDetail = useCallback(async (id: string) => {
    setLoading("ticket-detail");
    try {
      const res = await fetchAdmin(`/admin-ticket-detail?id=${encodeURIComponent(id)}`);
      const data = res ? await res.json() : null;
      if (data?.success) {
        setTicketDetail({ ticket: data.ticket, scripts: data.scripts, playbooks: data.playbooks, kb_articles: data.kb_articles });
        setTicketInternalNotes((data.ticket?.internal_notes as string) || "");
      } else setTicketDetail(null);
    } catch {
      setTicketDetail(null);
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin]);

  const updateTicketAction = useCallback(async (action: string, payload?: Record<string, unknown>) => {
    if (!selectedTicketId) return;
    setTicketActionStatus(null);
    try {
      const res = await fetchAdmin("/admin-ticket-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: selectedTicketId, action, ...payload }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setTicketActionStatus("Saved.");
        loadTicketDetail(selectedTicketId);
        loadTicketsInbox();
      } else {
        setTicketActionStatus(data?.error || "Failed");
      }
    } catch (e) {
      setTicketActionStatus(e instanceof Error ? e.message : "Error");
    }
  }, [selectedTicketId, fetchAdmin, loadTicketDetail, loadTicketsInbox]);

  const loadAttribution = useCallback(async () => {
    try {
      const res = await fetchAdmin(`/admin-campaign-attribution?days=${attributionDays}`);
      const data = res ? await res.json() : null;
      if (data?.success) setAttributionData({ attribution: data.attribution, totalTrials: data.totalTrials, totalPurchases: data.totalPurchases });
    } catch {
      setAttributionData(null);
    }
  }, [fetchAdmin, attributionDays]);

  const loadLeads = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-leads");
      const data = res ? await res.json() : null;
      if (data?.success) setLeadsList(data.leads || []);
    } catch {
      setLeadsList([]);
    }
  }, [fetchAdmin]);

  const addLead = useCallback(async () => {
    const { organization_name, contact_name, email } = leadForm;
    if (!contact_name.trim() || !email.trim() || !email.includes("@")) {
      setLeadStatus("Contact name and valid email required");
      return;
    }
    setLeadStatus(null);
    try {
      const res = await fetchAdmin("/admin-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadForm),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setLeadStatus("Added.");
        setLeadForm({ organization_name: "", contact_name: "", email: "", type: "other", status: "not_contacted", notes: "" });
        loadLeads();
      } else {
        setLeadStatus(data?.error || "Failed");
      }
    } catch (e) {
      setLeadStatus(e instanceof Error ? e.message : "Error");
    }
  }, [leadForm, fetchAdmin, loadLeads]);

  const updateLeadStatus = useCallback(async (id: string, status: string) => {
    try {
      const res = await fetchAdmin("/admin-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) loadLeads();
    } catch {
      // ignore
    }
  }, [fetchAdmin, loadLeads]);

  const loadPlaybooks = useCallback(async () => {
    try {
      const path = playbookSearch ? `/admin-playbooks?search=${encodeURIComponent(playbookSearch)}` : "/admin-playbooks";
      const res = await fetchAdmin(path);
      const data = res ? await res.json() : null;
      if (data?.success) setPlaybooksData({ issues: data.issues, scripts: data.scripts });
    } catch {
      setPlaybooksData(null);
    }
  }, [fetchAdmin, playbookSearch]);

  const loadBugDashboard = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-bug-dashboard");
      const data = res ? await res.json() : null;
      if (data?.success) setBugDashboard(data);
      else setBugDashboard(null);
    } catch {
      setBugDashboard(null);
    }
  }, [fetchAdmin]);

  const loadBuilds = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-builds");
      const data = res ? await res.json() : null;
      if (data?.success) setBuildArtifacts(data.artifacts || []);
    } catch {
      setBuildArtifacts([]);
    }
  }, [fetchAdmin]);

  const addBuildArtifact = useCallback(async () => {
    if (!buildForm.version.trim() || !buildForm.url.trim()) {
      setBuildStatus("Version and URL required");
      return;
    }
    setBuildStatus(null);
    try {
      const res = await fetchAdmin("/admin-builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: buildForm.version,
          platform: buildForm.platform,
          url: buildForm.url,
          file_size_bytes: buildForm.fileSize ? parseInt(buildForm.fileSize, 10) : undefined,
          checksum_sha256: buildForm.checksum || undefined,
        }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setBuildStatus("Added.");
        setBuildForm({ version: "", platform: "windows", url: "", fileSize: "", checksum: "" });
        loadBuilds();
      } else {
        setBuildStatus(data?.error || "Failed");
      }
    } catch (e) {
      setBuildStatus(e instanceof Error ? e.message : "Error");
    }
  }, [buildForm, fetchAdmin, loadBuilds]);

  const loadReleaseNotes = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-release-notes");
      const data = res ? await res.json() : null;
      if (data?.success) setReleaseNotesList(data.notes || []);
    } catch {
      setReleaseNotesList([]);
    }
  }, [fetchAdmin]);

  const addReleaseNote = useCallback(async () => {
    if (!releaseNoteForm.version.trim()) {
      setReleaseNoteStatus("Version required");
      return;
    }
    setReleaseNoteStatus(null);
    try {
      const res = await fetchAdmin("/admin-release-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: releaseNoteForm.version, notes: releaseNoteForm.notes || undefined }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setReleaseNoteStatus("Added.");
        setReleaseNoteForm({ version: "", notes: "" });
        loadReleaseNotes();
      } else {
        setReleaseNoteStatus(data?.error || "Failed");
      }
    } catch (e) {
      setReleaseNoteStatus(e instanceof Error ? e.message : "Error");
    }
  }, [releaseNoteForm, fetchAdmin, loadReleaseNotes]);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-announcements");
      const data = res ? await res.json() : null;
      if (data?.success) setAnnouncements(data.announcements || []);
    } catch {
      setAnnouncements([]);
    }
  }, [fetchAdmin]);

  const addAnnouncement = useCallback(async () => {
    if (!announcementForm.message.trim()) {
      setAnnouncementStatus("Message required");
      return;
    }
    setAnnouncementStatus(null);
    try {
      const res = await fetchAdmin("/admin-announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: announcementForm.message, severity: announcementForm.severity, expires_at: announcementForm.expires_at || undefined }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setAnnouncementStatus("Added.");
        setAnnouncementForm({ message: "", severity: "info", expires_at: "" });
        loadAnnouncements();
      } else {
        setAnnouncementStatus(data?.error || "Failed");
      }
    } catch (e) {
      setAnnouncementStatus(e instanceof Error ? e.message : "Error");
    }
  }, [announcementForm, fetchAdmin, loadAnnouncements]);

  const toggleAnnouncement = useCallback(async (id: string, active: boolean) => {
    try {
      const res = await fetchAdmin("/admin-announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) loadAnnouncements();
    } catch {
      // ignore
    }
  }, [fetchAdmin, loadAnnouncements]);

  const loadNps = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-nps?days=90");
      const data = res ? await res.json() : null;
      if (data?.success) setNpsData({ responses: data.responses, summary: data.summary });
    } catch {
      setNpsData(null);
    }
  }, [fetchAdmin]);

  const loadFeatureRequests = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-feature-requests");
      const data = res ? await res.json() : null;
      if (data?.success) setFeatureRequests(data.feature_requests || []);
    } catch {
      setFeatureRequests([]);
    }
  }, [fetchAdmin]);

  const addFeatureRequest = useCallback(async () => {
    if (!featureRequestForm.title.trim()) {
      setFeatureRequestStatus("Title required");
      return;
    }
    setFeatureRequestStatus(null);
    try {
      const res = await fetchAdmin("/admin-feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: featureRequestForm.title, description: featureRequestForm.description || undefined }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setFeatureRequestStatus("Added.");
        setFeatureRequestForm({ title: "", description: "" });
        loadFeatureRequests();
      } else {
        setFeatureRequestStatus(data?.error || "Failed");
      }
    } catch (e) {
      setFeatureRequestStatus(e instanceof Error ? e.message : "Error");
    }
  }, [featureRequestForm, fetchAdmin, loadFeatureRequests]);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-analytics?days=30");
      const data = res ? await res.json() : null;
      if (data?.success) setAnalyticsData(data.analytics);
    } catch {
      setAnalyticsData(null);
    }
  }, [fetchAdmin]);

  const loadErrorRates = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-error-rates?days=30");
      const data = res ? await res.json() : null;
      if (data?.success) setErrorRatesData({ activation_by_day: data.activation_by_day || [], app_errors_by_day: data.app_errors_by_day || [] });
    } catch {
      setErrorRatesData(null);
    }
  }, [fetchAdmin]);

  const loadRollouts = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-rollout");
      const data = res ? await res.json() : null;
      if (data?.success) setRolloutRollouts(data.rollouts || []);
    } catch {
      setRolloutRollouts([]);
    }
  }, [fetchAdmin]);

  const saveRollout = useCallback(async () => {
    if (!rolloutForm.version.trim()) {
      setRolloutStatus("Version required");
      return;
    }
    setRolloutStatus(null);
    try {
      const res = await fetchAdmin("/admin-rollout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: rolloutForm.version, rollout_pct: rolloutForm.rollout_pct }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setRolloutStatus("Saved.");
        setRolloutForm({ version: "", platform: "", rollout_pct: 100 });
        loadRollouts();
      } else setRolloutStatus(data?.error || "Failed");
    } catch (e) {
      setRolloutStatus(e instanceof Error ? e.message : "Error");
    }
  }, [rolloutForm, fetchAdmin, loadRollouts]);

  const loadCampaignCosts = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-campaign-costs?days=90");
      const data = res ? await res.json() : null;
      if (data?.success) setCampaignCosts(data.costs || []);
    } catch {
      setCampaignCosts([]);
    }
  }, [fetchAdmin]);

  const addCampaignCost = useCallback(async () => {
    if (!campaignCostForm.period_start || !campaignCostForm.period_end) {
      setCampaignCostStatus("Period required");
      return;
    }
    setCampaignCostStatus(null);
    try {
      const res = await fetchAdmin("/admin-campaign-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start: campaignCostForm.period_start,
          period_end: campaignCostForm.period_end,
          cost_cents: Math.round(Number(campaignCostForm.cost_cents) || 0),
          cost_type: campaignCostForm.cost_type,
          utm_source: campaignCostForm.utm_source.trim() || undefined,
          notes: campaignCostForm.notes.trim() || undefined,
        }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setCampaignCostStatus("Added.");
        setCampaignCostForm({ period_start: "", period_end: "", cost_cents: 0, cost_type: "campaign", utm_source: "", notes: "" });
        loadCampaignCosts();
      } else setCampaignCostStatus(data?.error || "Failed");
    } catch (e) {
      setCampaignCostStatus(e instanceof Error ? e.message : "Error");
    }
  }, [campaignCostForm, fetchAdmin, loadCampaignCosts]);

  const loadAutomationConfig = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-automation");
      const data = res ? await res.json() : null;
      if (data?.success) setAutomationConfig(data.config || []);
    } catch {
      setAutomationConfig([]);
    }
  }, [fetchAdmin]);

  const loadAutomationAttribution = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-automation?action=attribution&days=30");
      const data = res ? await res.json() : null;
      if (data?.success) setAutomationAttribution(data.attribution || []);
    } catch {
      setAutomationAttribution([]);
    }
  }, [fetchAdmin]);

  const loadKbArticles = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-kb-articles");
      const data = res ? await res.json() : null;
      if (data?.success) setKbArticles(data.articles || []);
    } catch {
      setKbArticles([]);
    }
  }, [fetchAdmin]);

  const addKbArticle = useCallback(async () => {
    if (!kbForm.title.trim() || !kbForm.url.trim()) {
      setKbStatus("Title and URL required");
      return;
    }
    setKbStatus(null);
    try {
      const res = await fetchAdmin("/admin-kb-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: kbForm.title, url: kbForm.url, category: kbForm.category }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setKbStatus("Added.");
        setKbForm({ title: "", url: "", category: "general" });
        loadKbArticles();
      } else {
        setKbStatus(data?.error || "Failed");
      }
    } catch (e) {
      setKbStatus(e instanceof Error ? e.message : "Error");
    }
  }, [kbForm, fetchAdmin, loadKbArticles]);

  const toggleAutomation = useCallback(async (id: string, active: boolean) => {
    try {
      const res = await fetchAdmin("/admin-automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) loadAutomationConfig();
    } catch {
      // ignore
    }
  }, [fetchAdmin, loadAutomationConfig]);

  const updateFeatureRequestStatus = useCallback(async (id: string, status: string) => {
    try {
      const res = await fetchAdmin("/admin-feature-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) loadFeatureRequests();
    } catch {
      // ignore
    }
  }, [fetchAdmin, loadFeatureRequests]);

  const setReleaseNoteCurrent = useCallback(async (id: string) => {
    try {
      const res = await fetchAdmin("/admin-release-notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_current: true }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) loadReleaseNotes();
    } catch {
      // ignore
    }
  }, [fetchAdmin, loadReleaseNotes]);

  const setBuildAsCurrent = useCallback(async (id: string) => {
    try {
      const res = await fetchAdmin("/admin-builds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_current: true }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) loadBuilds();
    } catch {
      // ignore
    }
  }, [fetchAdmin, loadBuilds]);

  const loadBugReports = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-bug-reports");
      const data = res ? await res.json() : null;
      if (data?.success) setBugReports(data.reports || []);
    } catch {
      setBugReports([]);
    }
  }, [fetchAdmin]);

  const submitBugReport = useCallback(async () => {
    if (!bugForm.title.trim()) {
      setBugStatus("Title required");
      return;
    }
    setBugStatus(null);
    try {
      const res = await fetchAdmin("/admin-bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bugForm.title,
          severity: bugForm.severity,
          steps_to_reproduce: bugForm.steps || undefined,
          expected_vs_actual: bugForm.expected || undefined,
          customer_impacted: bugForm.customerImpacted,
          app_version: bugForm.appVersion || undefined,
          os: bugForm.os || undefined,
          logs_attachment: bugForm.logs || undefined,
        }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setBugStatus("Submitted.");
        setBugForm({ title: "", severity: "normal", steps: "", expected: "", customerImpacted: false, appVersion: "", os: "", logs: "" });
        loadBugReports();
      } else {
        setBugStatus(data?.error || "Failed");
      }
    } catch (e) {
      setBugStatus(e instanceof Error ? e.message : "Error");
    }
  }, [bugForm, fetchAdmin, loadBugReports]);

  const updateBugStatus = useCallback(async (id: string, status: string) => {
    try {
      const res = await fetchAdmin("/admin-bug-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) loadBugReports();
    } catch {
      // ignore
    }
  }, [fetchAdmin, loadBugReports]);

  const loadAuditLog = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-audit-log?limit=100");
      const data = res ? await res.json() : null;
      if (data?.success) setAuditEntries(data.entries || []);
    } catch {
      setAuditEntries([]);
    }
  }, [fetchAdmin]);

  const loadPolicy = useCallback(async () => {
    try {
      const res = await fetchAdmin("/admin-policy");
      const data = res ? await res.json() : null;
      if (data?.success) setPolicyVersions(data.byType || {});
    } catch {
      setPolicyVersions({});
    }
  }, [fetchAdmin]);

  const addPolicyVersion = useCallback(async () => {
    if (!policyForm.version.trim()) {
      setPolicyStatus("Version required");
      return;
    }
    setPolicyStatus(null);
    try {
      const res = await fetchAdmin("/admin-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy_type: policyForm.policy_type,
          version: policyForm.version,
          content: policyForm.content || undefined,
        }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setPolicyStatus("Added.");
        setPolicyForm((f) => ({ ...f, version: "", content: "" }));
        loadPolicy();
      } else {
        setPolicyStatus(data?.error || "Failed");
      }
    } catch (e) {
      setPolicyStatus(e instanceof Error ? e.message : "Error");
    }
  }, [policyForm, fetchAdmin, loadPolicy]);

  const loadPlaybookDetail = useCallback(async (issueId: string) => {
    try {
      const res = await fetchAdmin(`/admin-playbooks?issue_id=${encodeURIComponent(issueId)}`);
      const data = res ? await res.json() : null;
      if (data?.success) setPlaybookDetail({ issue: data.issue, suggestedScripts: data.suggestedScripts, generated: data.generated });
    } catch {
      setPlaybookDetail(null);
    }
  }, [fetchAdmin]);

  const removeSuppressionEmail = useCallback(async (email: string) => {
    try {
      const res = await fetchAdmin(`/admin-suppression?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      const data = res ? await res.json() : null;
      if (data?.success) loadSuppression();
    } catch {
      // ignore
    }
  }, [fetchAdmin, loadSuppression]);

  const downloadChargebackPacket = useCallback(async (purchaseId: string, sessionId?: string) => {
    const path = purchaseId ? `purchase_id=${purchaseId}` : `session_id=${encodeURIComponent(sessionId || "")}`;
    const res = await fetchAdmin(`/admin-chargeback-export?${path}`);
    if (!res?.ok) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chargeback-packet-${sessionId || purchaseId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [fetchAdmin]);

  const exportOrdersCsv = useCallback(() => {
    const orders = ordersData?.orders as { created_at?: string; session_id?: string; customer_email?: string; customer_name?: string; product?: string; plan_type?: string; status?: string; amount_cents?: number; amount_subtotal_cents?: number; amount_tax_cents?: number; amount_refunded_cents?: number; tax_refunded_cents?: number; refunded_at?: string; customer_state?: string; customer_postal_code?: string; currency?: string }[] | undefined;
    if (!orders?.length) return;
    const headers = "Date,Session ID,Email,Name,Product,Plan,Status,Subtotal ($),Tax ($),Total ($),Refunded ($),Tax Refunded ($),Refunded At,State,Postal,Currency";
    const rows = orders.map((o) => [
      o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : "",
      o.session_id ?? "",
      o.customer_email ?? "",
      o.customer_name ?? "",
      o.product ?? "",
      o.plan_type ?? "",
      o.status ?? "",
      ((o.amount_subtotal_cents ?? 0) / 100).toFixed(2),
      ((o.amount_tax_cents ?? 0) / 100).toFixed(2),
      ((o.amount_cents ?? 0) / 100).toFixed(2),
      ((o.amount_refunded_cents ?? 0) / 100).toFixed(2),
      ((o.tax_refunded_cents ?? 0) / 100).toFixed(2),
      o.refunded_at ?? "",
      o.customer_state ?? "",
      o.customer_postal_code ?? "",
      o.currency ?? "",
    ]);
    const csv = [headers, ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `orders-${ordersData?.date_from ?? ""}-${ordersData?.date_to ?? ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [ordersData]);

  const resendEmail = useCallback(async () => {
    const to = resendTo.trim() || (profile?.email || "").toString().trim();
    if (!to || !to.includes("@")) {
      setResendStatus("Load a customer profile or enter recipient");
      return;
    }
    setResendStatus(null);
    setLoading("resend");
    try {
      let params: Record<string, string> = {};
      if (resendParams.trim()) {
        try {
          params = JSON.parse(resendParams) as Record<string, string>;
        } catch {
          setResendStatus("Invalid JSON in params");
          return;
        }
      }
      const isChangeRecipient = resendTo.trim().length > 0;
      const originalRecipient = isChangeRecipient && profile?.email ? (profile.email as string).trim() : undefined;
      const res = await fetchAdmin("/admin-resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, template: resendTemplate, params, ...(originalRecipient ? { originalRecipient } : {}) }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) setResendStatus(`Sent (messageId: ${data.messageId || "—"})`);
      else setResendStatus(data?.error || "Failed");
    } catch (e) {
      setResendStatus(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [profile?.email, resendTemplate, resendParams, resendTo, fetchAdmin]);

  const loadTexasFiling = useCallback(async () => {
    const start = txPeriodStart.trim();
    const end = txPeriodEnd.trim();
    if (!start || !end) {
      setError("Enter period start and end (YYYY-MM-DD)");
      return;
    }
    setLoading("texas");
    setError(null);
    try {
      const res = await fetchAdmin(`/admin-texas-filing?period_start=${encodeURIComponent(start)}&period_end=${encodeURIComponent(end)}`);
      const data = res ? await res.json() : null;
      if (data?.success) setTxData({ period_start: data.period_start, period_end: data.period_end, summary: data.summary, transactions: data.transactions });
      else setError(data?.error || "Failed to load TX filing data");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [txPeriodStart, txPeriodEnd, fetchAdmin]);

  const loadTexasFilingLog = useCallback(async () => {
    setLoading("texas-log");
    setError(null);
    try {
      const res = await fetchAdmin("/admin-texas-filing?log=1");
      const data = res ? await res.json() : null;
      if (data?.success) setTxLog(data.log || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [fetchAdmin]);

  const recordTexasFiling = useCallback(async () => {
    const start = txPeriodStart.trim();
    const end = txPeriodEnd.trim();
    if (!start || !end) {
      setError("Enter period start and end");
      return;
    }
    setLoading("texas-record");
    setError(null);
    try {
      const res = await fetchAdmin("/admin-texas-filing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start: start,
          period_end: end,
          confirmation_number: txConfirmation.trim() || undefined,
          notes: txNotes.trim() || undefined,
        }),
      });
      const data = res ? await res.json() : null;
      if (data?.success) {
        setTxConfirmation("");
        setTxNotes("");
        loadTexasFilingLog();
      } else setError(data?.error || "Failed to record filing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [txPeriodStart, txPeriodEnd, txConfirmation, txNotes, fetchAdmin, loadTexasFilingLog]);

  const exportTexasCsv = useCallback(() => {
    const txns = txData?.transactions as { session_id?: string; created_at?: string; customer_email?: string; customer_state?: string; customer_postal_code?: string; amount_subtotal_cents?: number; amount_tax_cents?: number; amount_cents?: number; amount_refunded_cents?: number; tax_refunded_cents?: number; status?: string }[] | undefined;
    if (!txns?.length) return;
    const headers = "Date,Session ID,Email,State,Postal Code,Subtotal ($),Tax ($),Total ($),Refunded ($),Tax Refunded ($),Status";
    const rows = txns.map((t) => {
      const date = t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : "";
      const sub = ((t.amount_subtotal_cents ?? 0) / 100).toFixed(2);
      const tax = ((t.amount_tax_cents ?? 0) / 100).toFixed(2);
      const tot = ((t.amount_cents ?? 0) / 100).toFixed(2);
      const ref = ((t.amount_refunded_cents ?? 0) / 100).toFixed(2);
      const taxRef = ((t.tax_refunded_cents ?? 0) / 100).toFixed(2);
      const cells = [date, t.session_id ?? "", t.customer_email ?? "", t.customer_state ?? "", t.customer_postal_code ?? "", sub, tax, tot, ref, taxRef, t.status ?? ""];
      return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.split(",").map((h) => `"${h}"`).join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `texas-filing-${txData?.period_start ?? "start"}-${txData?.period_end ?? "end"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [txData]);

  const createTrialKeyAction = useCallback(async () => {
    const email = createTrialEmail.trim();
    if (!email || !email.includes("@")) {
      setCreateTrialError("Enter a valid email address.");
      return;
    }
    setCreateTrialLoading(true);
    setCreateTrialError(null);
    setCreateTrialKey(null);
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
      const res = await fetch(`${apiBase}/trial-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(anonKey ? { Authorization: `Bearer ${anonKey}` } : {}),
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.trialKey) {
        setCreateTrialKey(data.trialKey);
      } else {
        setCreateTrialError(data.error || `Request failed (${res.status})`);
      }
    } catch (e) {
      setCreateTrialError(e instanceof Error ? e.message : "Network error");
    } finally {
      setCreateTrialLoading(false);
    }
  }, [apiBase, createTrialEmail, supabaseAnonKey]);

  const createLicenseKeyAction = useCallback(async () => {
    const email = createLicenseEmail.trim();
    const reason = createLicenseReason.trim();
    if (!email || !email.includes("@")) {
      setCreateLicenseError("Enter a valid email address.");
      return;
    }
    if (!reason) {
      setCreateLicenseError("Enter a reason for the comp license.");
      return;
    }
    if (createLicenseConfirm.trim() !== "COMP") {
      setCreateLicenseError('Type COMP to confirm.');
      return;
    }
    setCreateLicenseLoading(true);
    setCreateLicenseError(null);
    setCreateLicenseKey(null);
    try {
      const res = await fetchAdmin("/admin-license-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comp_license",
          reason,
          confirmationPhrase: "COMP",
          customerEmail: email,
        }),
      });
      const data = res ? await res.json().catch(() => ({})) : {};
      if (data.success && data.license_key) {
        setCreateLicenseKey(data.license_key);
      } else {
        setCreateLicenseError(data.error || `Request failed (${res?.status ?? 0})`);
      }
    } catch (e) {
      setCreateLicenseError(e instanceof Error ? e.message : "Network error");
    } finally {
      setCreateLicenseLoading(false);
    }
  }, [fetchAdmin, createLicenseEmail, createLicenseReason, createLicenseConfirm]);

  const reactivateLicenseAction = useCallback(async () => {
    const key = reactivateLicenseKey.trim();
    const reason = reactivateLicenseReason.trim();
    if (!key) {
      setReactivateLicenseError("Enter the license key.");
      return;
    }
    if (!reason) {
      setReactivateLicenseError("Enter a reason.");
      return;
    }
    if (reactivateLicenseConfirm.trim() !== "RESET") {
      setReactivateLicenseError('Type RESET to confirm.');
      return;
    }
    setReactivateLicenseLoading(true);
    setReactivateLicenseError(null);
    setReactivateLicenseStatus(null);
    try {
      const res = await fetchAdmin("/admin-license-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_binding",
          licenseKey: key,
          reason,
          confirmationPhrase: "RESET",
        }),
      });
      const data = res ? await res.json().catch(() => ({})) : {};
      if (data.success) {
        setReactivateLicenseStatus("Device binding reset. User can activate this license on a new device.");
      } else {
        setReactivateLicenseError(data.error || `Request failed (${res?.status ?? 0})`);
      }
    } catch (e) {
      setReactivateLicenseError(e instanceof Error ? e.message : "Network error");
    } finally {
      setReactivateLicenseLoading(false);
    }
  }, [fetchAdmin, reactivateLicenseKey, reactivateLicenseReason, reactivateLicenseConfirm]);

  const reactivateTrialAction = useCallback(async () => {
    const key = reactivateTrialKey.trim();
    const reason = reactivateTrialReason.trim();
    if (!key) {
      setReactivateTrialError("Enter the trial key.");
      return;
    }
    if (!reason) {
      setReactivateTrialError("Enter a reason.");
      return;
    }
    setReactivateTrialLoading(true);
    setReactivateTrialError(null);
    setReactivateTrialStatus(null);
    try {
      const res = await fetchAdmin("/admin-license-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extend_trial",
          trialKey: key,
          reason,
          extendDays: Math.max(1, Math.min(90, reactivateTrialDays)),
        }),
      });
      const data = res ? await res.json().catch(() => ({})) : {};
      if (data.success) {
        setReactivateTrialStatus(data.newEnd ? `Trial extended. New end: ${formatDateTimeUSA(new Date(data.newEnd))}` : "Trial extended.");
      } else {
        setReactivateTrialError(data.error || `Request failed (${res?.status ?? 0})`);
      }
    } catch (e) {
      setReactivateTrialError(e instanceof Error ? e.message : "Network error");
    } finally {
      setReactivateTrialLoading(false);
    }
  }, [fetchAdmin, reactivateTrialKey, reactivateTrialReason, reactivateTrialDays]);

  const doSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) return;
    setLoading("search");
    setError(null);
    try {
      const res = await fetchAdmin(`/admin-global-search?q=${encodeURIComponent(q)}`);
      const data = res ? await res.json() : null;
      if (data?.success) setSearchResults(data);
      else setError("Search failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }, [searchQuery, fetchAdmin]);

  const exportCsv = useCallback(
    async (type: string) => {
      if (!token) return;
      resetIdleTimer();
      try {
        const res = await fetch(`${apiBase}/admin-exports?type=${encodeURIComponent(type)}`, {
          headers: authHeaders(token),
        });
        const csv = await res.text();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `llv-${type}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Export failed");
      }
    },
    [token, apiBase, resetIdleTimer]
  );

  useEffect(() => {
    if (tab === "metrics") loadMetrics();
    else if (tab === "overview") loadOverview();
    else if (tab === "recent") loadRecent();
    else if (tab === "trials") loadTrials();
    else if (tab === "customers") loadCustomers();
    else if (tab === "webhooks") loadWebhooks();
    else if (tab === "texas") loadTexasFilingLog();
    else if (tab === "licenses") {
      loadLicensesList();
      loadLicenseReports();
    } else if (tab === "funnel") {
      loadFunnel();
      loadAutomationConfig();
      loadAutomationAttribution();
    } else if (tab === "orders") {
      loadOrders();
      loadFraudSignals();
    } else if (tab === "downloads") {
      loadDownloadHealth();
      loadEmailLogs();
      loadEmailDeliverability();
      loadSuppression();
    } else if (tab === "support") {
      loadTicketsInbox();
      loadKbArticles();
    } else if (tab === "attribution") {
      loadAttribution();
      loadCampaignCosts();
    } else if (tab === "leads") {
      loadLeads();
    } else if (tab === "playbooks") {
      loadPlaybooks();
    } else if (tab === "bugs") {
      loadBugReports();
      loadBugDashboard();
    } else if (tab === "audit") {
      loadAuditLog();
    } else if (tab === "policy") {
      loadPolicy();
    } else if (tab === "status") {
      loadStatus();
    } else if (tab === "partners") {
      loadPartnerCodes();
    } else if (tab === "builds") {
      loadBuilds();
      loadRollouts();
    } else if (tab === "releaseNotes") {
      loadReleaseNotes();
    } else if (tab === "extras") {
      loadAnnouncements();
      loadNps();
      loadFeatureRequests();
    }
  }, [tab, loadMetrics, loadOverview, loadRecent, loadTrials, loadCustomers, loadWebhooks, loadTexasFilingLog, loadLicensesList, loadLicenseReports, loadFunnel, loadOrders, loadFraudSignals, loadDownloadHealth, loadEmailLogs, loadEmailDeliverability, loadSuppression, loadTicketsInbox, loadAttribution, loadLeads, loadPlaybooks, loadBugReports, loadAuditLog, loadPolicy, loadStatus, loadPartnerCodes, loadBugDashboard, loadBuilds, loadReleaseNotes, loadAnnouncements, loadNps, loadFeatureRequests, loadAnalytics, loadAutomationConfig, loadAutomationAttribution]);
  useEffect(() => {
    if (tab === "profile" && profileEmail.trim()) loadProfile();
  }, [tab, profileEmail, loadProfile]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9 && TABS[n - 1]) {
        setTab(TABS[n - 1].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!token) return null;

  const bgPage = (theme as { backgroundPage?: string }).backgroundPage ?? "#262E3A";
  const shadowCard = (theme as { shadowCard?: string }).shadowCard ?? "0 2px 8px rgba(0,0,0,0.2)";

  const cardStyle: React.CSSProperties = {
    background: theme.backgroundCard,
    borderRadius: theme.radiusCard,
    padding: 20,
    marginBottom: 20,
    border: `1px solid ${(theme as { borderCard?: string }).borderCard ?? "rgba(255,255,255,0.06)"}`,
    boxShadow: shadowCard,
  };
  const tableHeader: React.CSSProperties = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: theme.textMuted,
    borderBottom: `1px solid ${theme.borderSubtle}`,
    background: bgPage,
  };
  const tableCell: React.CSSProperties = {
    padding: "12px 16px",
    borderBottom: `1px solid ${theme.borderSubtle}`,
    fontSize: 13,
    color: theme.textPrimary,
  };
  const tableCellAlt: React.CSSProperties = {
    ...tableCell,
    background: "rgba(0,0,0,0.08)",
  };
  const btnPrimary: React.CSSProperties = {
    padding: "10px 16px",
    background: theme.buttonPrimaryBg,
    color: theme.buttonPrimaryText,
    border: "none",
    borderRadius: theme.radiusButton,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  };
  const btnSecondary: React.CSSProperties = {
    padding: "10px 16px",
    background: "transparent",
    color: theme.textSecondary,
    border: `1px solid ${theme.borderSubtle}`,
    borderRadius: theme.radiusButton,
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
  };
  const inputStyle: React.CSSProperties = {
    padding: "10px 14px",
    background: bgPage,
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: theme.radiusInput,
    color: theme.inputText,
    fontSize: 14,
  };
  const sectionTitle: React.CSSProperties = {
    color: theme.accentGold,
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 16,
    letterSpacing: "0.02em",
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${theme.borderSubtle}`, flexShrink: 0, background: "rgba(0,0,0,0.2)" }}>
        <h1 style={{ color: theme.textPrimary, fontSize: 20, margin: 0, fontWeight: 600, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/lpv-logo.svg" alt="LPV" width={28} height={28} style={{ display: "block" }} />
          <span style={{ color: theme.accentGold, marginRight: 8 }}>Admin</span>
          <span style={{ color: theme.textMuted, fontWeight: 400 }}>— {productLabel}</span>
        </h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => exportCsv("licenses")} style={btnPrimary}>Export Licenses</button>
          <button type="button" onClick={() => exportCsv("revenue")} style={btnPrimary}>Export Revenue</button>
          <button type="button" onClick={() => exportCsv("refunds")} style={btnPrimary}>Export Refunds</button>
          <button type="button" onClick={() => exportCsv("trials")} style={btnPrimary}>Export Trials</button>
          <button type="button" onClick={() => exportCsv("tickets")} style={btnPrimary}>Export Tickets</button>
          <button type="button" onClick={() => exportCsv("attribution")} style={btnPrimary}>Export Attribution</button>
          <button type="button" onClick={lock} style={btnSecondary}>Lock</button>
          <button type="button" onClick={onClose} style={btnSecondary}>Close</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "14px 24px", borderBottom: `1px solid ${theme.borderSubtle}`, flexShrink: 0, flexWrap: "wrap", background: "rgba(0,0,0,0.06)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            title={i < 9 ? `Shortcut: ${i + 1}` : undefined}
            style={{
              padding: "10px 16px",
              background: tab === t.id ? theme.accentGold : "transparent",
              color: tab === t.id ? theme.buttonPrimaryText : theme.textSecondary,
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {error && <p style={{ color: theme.statusError, marginBottom: 12 }}>{error}</p>}
        {loading && <p style={{ color: theme.textSecondary }}>Loading…</p>}

        {tab === "metrics" && metrics && (
          <HomeDashboard
            metrics={metrics}
            period={metricsPeriod}
            onPeriodChange={(p) => { setMetricsPeriod(p); }}
            onRefresh={loadMetrics}
            onNavigateTab={setTab}
            theme={theme}
            loading={loading === "metrics"}
          />
        )}
        {tab === "overview" && overview && (
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Overview</h3>
            <pre style={{ fontSize: 12, overflow: "auto", color: theme.textSecondary }}>{JSON.stringify(overview, null, 2)}</pre>
          </div>
        )}
        {tab === "recent" && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Recent licenses</h3>
            {recent?.licenses?.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={tableHeader}>Key</th><th style={tableHeader}>Product</th><th style={tableHeader}>Plan</th><th style={tableHeader}>Date</th></tr></thead>
                <tbody>
                  {(recent.licenses as { licenseKey?: string; productType?: string; planType?: string; createdAt?: string }[]).slice(0, 30).map((l, i) => (
                    <tr key={i} style={{ background: i % 2 ? "rgba(0,0,0,0.04)" : "transparent" }}><td style={tableCell}>{l.licenseKey}</td><td style={tableCell}>{l.productType}</td><td style={tableCell}>{l.planType}</td><td style={tableCell}>{l.createdAt ? formatDateUSA(new Date(l.createdAt)) : ""}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p style={{ color: theme.textSecondary }}>No recent licenses</p>}
          </div>
        )}
        {tab === "search" && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Global search</h3>
            <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>Search across licenses, trials, tickets, purchases (min 2 chars).</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Email, name, subject, key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                style={{ flex: 1, padding: "10px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}
              />
              <button type="button" onClick={doSearch} disabled={loading === "search"} style={{ padding: "10px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Search</button>
            </div>
            {loading === "search" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ height: 40, background: "linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: 8 }} />
                <div style={{ height: 120, background: "linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: 8 }} />
              </div>
            )}
            {searchResults && !loading && (
              <>
                {searchResults.licenses?.length || searchResults.trials?.length || searchResults.tickets?.length || searchResults.purchases?.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {searchResults.licenses && searchResults.licenses.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 13, marginBottom: 8 }}>Licenses</h4>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr><th style={tableHeader}>Key</th><th style={tableHeader}>Email</th><th style={tableHeader}>Status</th></tr></thead><tbody>
                          {(searchResults.licenses as { key?: string; email?: string; status?: string }[]).map((l, i) => (
                            <tr key={i}><td style={tableCell}>{l.key}</td><td style={tableCell}>{l.email}</td><td style={tableCell}>{l.status}</td></tr>
                          ))}</tbody></table>
                      </div>
                    )}
                    {searchResults.trials && searchResults.trials.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 13, marginBottom: 8 }}>Trials</h4>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr><th style={tableHeader}>Email</th><th style={tableHeader}>Date</th></tr></thead><tbody>
                          {(searchResults.trials as { email?: string; date?: string }[]).map((t, i) => (
                            <tr key={i}><td style={tableCell}>{t.email}</td><td style={tableCell}>{t.date ? formatDateUSA(new Date(t.date)) : ""}</td></tr>
                          ))}</tbody></table>
                      </div>
                    )}
                    {searchResults.tickets && searchResults.tickets.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 13, marginBottom: 8 }}>Tickets</h4>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr><th style={tableHeader}>#</th><th style={tableHeader}>Subject</th><th style={tableHeader}>Email</th><th style={tableHeader}>Status</th></tr></thead><tbody>
                          {(searchResults.tickets as { id?: string; ticket_number?: string; subject?: string; email?: string; status?: string }[]).map((t, i) => (
                            <tr key={i} style={{ cursor: "pointer" }} onClick={() => { if (t.id) { setSelectedTicketId(t.id); loadTicketDetail(t.id); setTab("support"); } }}><td style={tableCell}>{t.ticket_number || t.id}</td><td style={tableCell}>{t.subject}</td><td style={tableCell}>{t.email}</td><td style={tableCell}>{t.status}</td></tr>
                          ))}</tbody></table>
                      </div>
                    )}
                    {searchResults.purchases && searchResults.purchases.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 13, marginBottom: 8 }}>Purchases</h4>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr><th style={tableHeader}>Email</th><th style={tableHeader}>Product</th><th style={tableHeader}>Status</th></tr></thead><tbody>
                          {(searchResults.purchases as { email?: string; product?: string; status?: string }[]).map((p, i) => (
                            <tr key={i}><td style={tableCell}>{p.email}</td><td style={tableCell}>{p.product}</td><td style={tableCell}>{p.status}</td></tr>
                          ))}</tbody></table>
                      </div>
                    )}
                  </div>
                ) : <p style={{ color: theme.textMuted }}>No results for &quot;{searchResults.q}&quot;</p>}
              </>
            )}
            {!searchResults && !loading && (
              <div style={{ padding: 24, textAlign: "center", color: theme.textMuted }}>
                <p style={{ marginBottom: 8 }}>Search across licenses, trials, tickets, and purchases.</p>
                <p style={{ fontSize: 12 }}>Try: email address, name, ticket subject, or license key (min 2 chars). Press Enter to search.</p>
              </div>
            )}
          </div>
        )}
        {tab === "licenses" && (
          <>
            {licenseReports && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <div style={{ ...cardStyle, minWidth: 120 }}>
                  <div style={{ color: theme.textMuted, fontSize: 12 }}>Activation success rate (30d)</div>
                  <div style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 600 }}>{licenseReports.activationSuccessRate != null ? `${licenseReports.activationSuccessRate}%` : "—"}</div>
                </div>
                <div style={{ ...cardStyle, minWidth: 120 }}>
                  <div style={{ color: theme.textMuted, fontSize: 12 }}>Total attempts</div>
                  <div style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 600 }}>{licenseReports.totalAttempts ?? "—"}</div>
                </div>
                <div style={{ ...cardStyle, minWidth: 120 }}>
                  <div style={{ color: theme.textMuted, fontSize: 12 }}>Device mismatches</div>
                  <div style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 600 }}>{licenseReports.deviceMismatchCount ?? "—"}</div>
                </div>
              </div>
            )}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>License list</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <select value={licensesFilterStatus} onChange={(e) => setLicensesFilterStatus(e.target.value)} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="revoked">Revoked</option>
                  <option value="replaced">Replaced</option>
                </select>
                <button type="button" onClick={loadLicensesList} disabled={loading === "licenses"} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>{loading === "licenses" ? "Loading…" : "Refresh"}</button>
              </div>
              {licensesList?.licenses?.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><th style={tableHeader}>Key</th><th style={tableHeader}>Product</th><th style={tableHeader}>Plan</th><th style={tableHeader}>Email</th><th style={tableHeader}>Status</th><th style={tableHeader}>Bound</th><th style={tableHeader}>Activations</th><th style={tableHeader}>Created</th></tr></thead>
                  <tbody>
                    {licensesList.licenses.map((l, i) => (
                      <tr key={i} style={{ cursor: "pointer" }} onClick={() => l.last4 && loadLicenseDetail(l.last4)}>
                        <td style={tableCell}>{l.licenseKey}</td><td style={tableCell}>{l.product}</td><td style={tableCell}>{l.planType}</td><td style={tableCell}>{l.email}</td><td style={tableCell}>{l.status}</td><td style={tableCell}>{l.deviceBound ? "Yes" : "No"}</td><td style={tableCell}>{l.activationCount ?? 0}</td><td style={tableCell}>{l.createdAt ? formatDateUSA(new Date(l.createdAt)) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : loading === "licenses" ? <p style={{ color: theme.textSecondary }}>Loading…</p> : <p style={{ color: theme.textSecondary }}>No licenses</p>}
            </div>
            {licenseDetail && (
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>License detail: {licenseDetail.license?.keyMasked}</h3>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                  <span style={{ color: theme.textMuted }}>Status: {licenseDetail.license?.status}</span>
                  <span style={{ color: theme.textMuted }}>Device bound: {licenseDetail.license?.deviceBound ? "Yes" : "No"}</span>
                  <span style={{ color: theme.textMuted }}>Email: {licenseDetail.license?.email}</span>
                  <span style={{ color: theme.textMuted }}>Activated: {licenseDetail.license?.activatedAt ? formatDateTimeUSA(new Date(licenseDetail.license.activatedAt)) : "—"}</span>
                </div>
                <h4 style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 8 }}>Activation attempts</h4>
                {licenseDetail.activationAttempts?.length ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
                    <thead><tr><th style={tableHeader}>Time</th><th style={tableHeader}>Result</th><th style={tableHeader}>Error</th><th style={tableHeader}>What this means</th></tr></thead>
                    <tbody>
                      {licenseDetail.activationAttempts.slice(0, 30).map((a, i) => (
                        <tr key={i}>
                          <td style={tableCell}>{a.timestamp ? formatDateTimeUSA(new Date(a.timestamp)) : ""}</td>
                          <td style={tableCell}><span style={{ color: a.result === "success" ? theme.statusSuccess : theme.statusError }}>{a.result}</span></td>
                          <td style={tableCell}>{a.errorId ?? "—"}</td>
                          <td style={tableCell}>{a.whatThisMeans ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p style={{ color: theme.textMuted, fontSize: 13 }}>No activation attempts</p>}
                <div style={{ paddingTop: 12, borderTop: `1px solid ${theme.borderSubtle}` }}>
                  <h4 style={{ color: theme.accentGold, fontSize: 13, marginBottom: 8 }}>Re-issue license</h4>
                  <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>Generates a new key and marks the old one replaced. Give the new key to the user. Requires full license key (from customer).</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400 }}>
                    <input type="text" placeholder="Full license key (XXXX-XXXX-XXXX-XXXX)" value={reissueLicenseKey} onChange={(e) => { setReissueLicenseKey(e.target.value); setReissueStatus(null); setReissueNewKey(null); }} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="text" placeholder="Reason for re-issue" value={reissueReason} onChange={(e) => { setReissueReason(e.target.value); setReissueStatus(null); }} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="text" placeholder='Type REISSUE to confirm' value={reissueConfirm} onChange={(e) => { setReissueConfirm(e.target.value); setReissueStatus(null); }} style={{ padding: "8px 12px", width: 180, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <button type="button" onClick={reissueLicenseAction} disabled={reissueLoading} style={{ alignSelf: "flex-start", padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>{reissueLoading ? "Re-issuing…" : "Re-issue"}</button>
                    {reissueNewKey && <p style={{ color: theme.statusSuccess ?? "green", fontSize: 13 }}>New key: <code>{reissueNewKey}</code> <button type="button" onClick={() => navigator.clipboard.writeText(reissueNewKey)} style={{ marginLeft: 8, padding: "4px 8px", fontSize: 11 }}>Copy</button></p>}
                    {reissueStatus && <p style={{ color: theme.statusError, fontSize: 13 }}>{reissueStatus}</p>}
                  </div>
                  <h4 style={{ color: theme.accentGold, fontSize: 13, marginTop: 20, marginBottom: 8 }}>Time-boxed rebind exception</h4>
                  <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>Grants a temporary window (e.g. 48h) during which the user can rebind to a new device. Use for hardware replacement. No confirmation required.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, marginBottom: 16 }}>
                    <input type="text" placeholder="Full license key" value={rebindExceptionKey} onChange={(e) => { setRebindExceptionKey(e.target.value); setRebindExceptionStatus(null); }} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="number" placeholder="Hours (default 48)" value={rebindExceptionHours} onChange={(e) => setRebindExceptionHours(Math.max(1, Math.min(168, parseInt(e.target.value, 10) || 48)))} style={{ padding: "8px 12px", width: 120, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="text" placeholder="Reason" value={rebindExceptionReason} onChange={(e) => { setRebindExceptionReason(e.target.value); setRebindExceptionStatus(null); }} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <button type="button" onClick={rebindExceptionAction} disabled={rebindExceptionLoading} style={{ alignSelf: "flex-start", padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>{rebindExceptionLoading ? "Granting…" : "Grant rebind exception"}</button>
                    {rebindExceptionStatus && <p style={{ color: theme.statusSuccess ?? "green", fontSize: 13 }}>{rebindExceptionStatus}</p>}
                  </div>
                  <h4 style={{ color: theme.accentGold, fontSize: 13, marginTop: 20, marginBottom: 8 }}>Reset device binding (full reset)</h4>
                  <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>Clears device binding immediately so the user can activate on a new device. Use when rebind exception is not appropriate.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, marginBottom: 16 }}>
                    <input type="text" placeholder="Full license key" value={resetBindingKey} onChange={(e) => { setResetBindingKey(e.target.value); setResetBindingStatus(null); }} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="text" placeholder="Reason" value={resetBindingReason} onChange={(e) => { setResetBindingReason(e.target.value); setResetBindingStatus(null); }} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="text" placeholder='Type RESET to confirm' value={resetBindingConfirm} onChange={(e) => { setResetBindingConfirm(e.target.value); setResetBindingStatus(null); }} style={{ padding: "8px 12px", width: 180, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <button type="button" onClick={resetBindingLicenseAction} disabled={resetBindingLoading} style={{ alignSelf: "flex-start", padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>{resetBindingLoading ? "Resetting…" : "Reset binding"}</button>
                    {resetBindingStatus && <p style={{ color: resetBindingStatus.includes("reset") ? (theme.statusSuccess ?? "green") : theme.statusError, fontSize: 13 }}>{resetBindingStatus}</p>}
                  </div>
                  <h4 style={{ color: theme.statusError, fontSize: 13, marginTop: 8, marginBottom: 8 }}>Revoke license</h4>
                  <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8 }}>Permanently revokes the license. Use for fraud or chargeback.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400 }}>
                    <input type="text" placeholder="Full license key" value={revokeLicenseKey} onChange={(e) => { setRevokeLicenseKey(e.target.value); setRevokeStatus(null); }} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="text" placeholder="Reason" value={revokeReason} onChange={(e) => { setRevokeReason(e.target.value); setRevokeStatus(null); }} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="text" placeholder='Type REVOKE to confirm' value={revokeConfirm} onChange={(e) => { setRevokeConfirm(e.target.value); setRevokeStatus(null); }} style={{ padding: "8px 12px", width: 180, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <button type="button" onClick={revokeLicenseAction} disabled={revokeLoading} style={{ alignSelf: "flex-start", padding: "8px 16px", background: theme.statusError, color: "#fff", border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>{revokeLoading ? "Revoking…" : "Revoke"}</button>
                    {revokeStatus && <p style={{ color: theme.statusError, fontSize: 13 }}>{revokeStatus}</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {tab === "trials" && (
          <>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Create trial key</h3>
              <p style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>Enter the user’s email. A new 14-day trial key is created and ready to use—give the key to the user to paste in the app under Activation.</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={createTrialEmail}
                  onChange={(e) => { setCreateTrialEmail(e.target.value); setCreateTrialError(null); setCreateTrialKey(null); }}
                  onKeyDown={(e) => e.key === "Enter" && createTrialKeyAction()}
                  style={{ padding: "10px 12px", minWidth: 220, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}
                />
                <button type="button" onClick={createTrialKeyAction} disabled={createTrialLoading} style={{ padding: "10px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: createTrialLoading ? "wait" : "pointer" }}>
                  {createTrialLoading ? "Creating…" : "Create trial key"}
                </button>
              </div>
              {createTrialError && <p style={{ color: theme.statusError, fontSize: 13, marginBottom: 8 }}>{createTrialError}</p>}
              {createTrialKey && (
                <div style={{ marginTop: 12, padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                  <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>Trial key (give this to the user):</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <code style={{ fontSize: 15, fontWeight: 600, color: theme.accentGold, letterSpacing: 0.5 }}>{createTrialKey}</code>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(createTrialKey); }} style={{ padding: "6px 12px", background: theme.backgroundCard, color: theme.textSecondary, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12 }}>Copy</button>
                  </div>
                  <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>User pastes this in the app under Activation → Activate.</div>
                </div>
              )}
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Create license key</h3>
              <p style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>Create a full (lifetime) comp license. Enter the user’s email and a reason; type COMP to confirm. Give the key to the user to paste in the app under Activation.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={createLicenseEmail}
                  onChange={(e) => { setCreateLicenseEmail(e.target.value); setCreateLicenseError(null); setCreateLicenseKey(null); }}
                  style={{ padding: "10px 12px", maxWidth: 320, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}
                />
                <input
                  type="text"
                  placeholder="Reason for comp license"
                  value={createLicenseReason}
                  onChange={(e) => { setCreateLicenseReason(e.target.value); setCreateLicenseError(null); setCreateLicenseKey(null); }}
                  style={{ padding: "10px 12px", maxWidth: 320, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}
                />
                <input
                  type="text"
                  placeholder='Type COMP to confirm'
                  value={createLicenseConfirm}
                  onChange={(e) => { setCreateLicenseConfirm(e.target.value); setCreateLicenseError(null); }}
                  style={{ padding: "10px 12px", maxWidth: 160, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}
                />
                <button type="button" onClick={createLicenseKeyAction} disabled={createLicenseLoading} style={{ padding: "10px 16px", alignSelf: "flex-start", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: createLicenseLoading ? "wait" : "pointer" }}>
                  {createLicenseLoading ? "Creating…" : "Create license key"}
                </button>
              </div>
              {createLicenseError && <p style={{ color: theme.statusError, fontSize: 13, marginBottom: 8 }}>{createLicenseError}</p>}
              {createLicenseKey && (
                <div style={{ marginTop: 12, padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                  <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>License key (give this to the user):</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <code style={{ fontSize: 15, fontWeight: 600, color: theme.accentGold, letterSpacing: 0.5 }}>{createLicenseKey.length === 16 ? `${createLicenseKey.slice(0, 4)}-${createLicenseKey.slice(4, 8)}-${createLicenseKey.slice(8, 12)}-${createLicenseKey.slice(12, 16)}` : createLicenseKey}</code>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(createLicenseKey.length === 16 ? `${createLicenseKey.slice(0, 4)}-${createLicenseKey.slice(4, 8)}-${createLicenseKey.slice(8, 12)}-${createLicenseKey.slice(12, 16)}` : createLicenseKey); }} style={{ padding: "6px 12px", background: theme.backgroundCard, color: theme.textSecondary, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12 }}>Copy</button>
                  </div>
                  <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>User pastes this in the app under Activation → Activate.</div>
                </div>
              )}
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Reactivate key</h3>
              <p style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>Reset license device binding so the key works on a new device, or extend a trial so it works again.</p>
              <div style={{ display: "grid", gap: 16, marginBottom: 12 }}>
                <div style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, marginBottom: 8 }}>Reset license device binding</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input type="text" placeholder="License key" value={reactivateLicenseKey} onChange={(e) => { setReactivateLicenseKey(e.target.value); setReactivateLicenseError(null); setReactivateLicenseStatus(null); }} style={{ padding: "10px 12px", maxWidth: 280, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="text" placeholder="Reason" value={reactivateLicenseReason} onChange={(e) => { setReactivateLicenseReason(e.target.value); setReactivateLicenseError(null); setReactivateLicenseStatus(null); }} style={{ padding: "10px 12px", maxWidth: 280, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="text" placeholder='Type RESET to confirm' value={reactivateLicenseConfirm} onChange={(e) => { setReactivateLicenseConfirm(e.target.value); setReactivateLicenseError(null); }} style={{ padding: "10px 12px", maxWidth: 160, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <button type="button" onClick={reactivateLicenseAction} disabled={reactivateLicenseLoading} style={{ alignSelf: "flex-start", padding: "10px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: reactivateLicenseLoading ? "wait" : "pointer" }}>{reactivateLicenseLoading ? "Resetting…" : "Reset binding"}</button>
                    {reactivateLicenseStatus && <p style={{ color: theme.statusSuccess ?? "green", fontSize: 13 }}>{reactivateLicenseStatus}</p>}
                    {reactivateLicenseError && <p style={{ color: theme.statusError, fontSize: 13 }}>{reactivateLicenseError}</p>}
                  </div>
                </div>
                <div style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, marginBottom: 8 }}>Extend trial</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input type="text" placeholder="Trial key" value={reactivateTrialKey} onChange={(e) => { setReactivateTrialKey(e.target.value); setReactivateTrialError(null); setReactivateTrialStatus(null); }} style={{ padding: "10px 12px", maxWidth: 280, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <input type="text" placeholder="Reason" value={reactivateTrialReason} onChange={(e) => { setReactivateTrialReason(e.target.value); setReactivateTrialError(null); setReactivateTrialStatus(null); }} style={{ padding: "10px 12px", maxWidth: 280, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label style={{ fontSize: 13, color: theme.textSecondary }}>Extend by (days):</label>
                      <input type="number" min={1} max={90} value={reactivateTrialDays} onChange={(e) => setReactivateTrialDays(Number(e.target.value) || 14)} style={{ width: 64, padding: "8px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    </div>
                    <button type="button" onClick={reactivateTrialAction} disabled={reactivateTrialLoading} style={{ alignSelf: "flex-start", padding: "10px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: reactivateTrialLoading ? "wait" : "pointer" }}>{reactivateTrialLoading ? "Extending…" : "Extend trial"}</button>
                    {reactivateTrialStatus && <p style={{ color: theme.statusSuccess ?? "green", fontSize: 13 }}>{reactivateTrialStatus}</p>}
                    {reactivateTrialError && <p style={{ color: theme.statusError, fontSize: 13 }}>{reactivateTrialError}</p>}
                  </div>
                </div>
              </div>
            </div>
            {trials && (
              <div style={cardStyle}>
                <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Trials</h3>
                <pre style={{ fontSize: 12, overflow: "auto", color: theme.textSecondary }}>{JSON.stringify(trials, null, 2)}</pre>
              </div>
            )}
          </>
        )}
        {tab === "funnel" && (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <select value={funnelDays} onChange={(e) => setFunnelDays(Number(e.target.value))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button type="button" onClick={loadFunnel} disabled={loading === "funnel"} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>{loading === "funnel" ? "Loading…" : "Refresh"}</button>
            </div>
            {funnelData && (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
                  <div style={{ ...cardStyle, minWidth: 100 }}>
                    <div style={{ color: theme.textMuted, fontSize: 12 }}>Activation rate</div>
                    <div style={{ color: theme.textPrimary, fontSize: 20, fontWeight: 600 }}>{funnelData.cohort?.activationRate ?? 0}%</div>
                  </div>
                  <div style={{ ...cardStyle, minWidth: 100 }}>
                    <div style={{ color: theme.textMuted, fontSize: 12 }}>Conversion rate</div>
                    <div style={{ color: theme.textPrimary, fontSize: 20, fontWeight: 600 }}>{funnelData.cohort?.conversionRate ?? 0}%</div>
                  </div>
                  <div style={{ ...cardStyle, minWidth: 100 }}>
                    <div style={{ color: theme.textMuted, fontSize: 12 }}>Time to activation (median)</div>
                    <div style={{ color: theme.textPrimary, fontSize: 20, fontWeight: 600 }}>{funnelData.cohort?.timeToActivationHoursMedian != null ? `${Math.round(funnelData.cohort.timeToActivationHoursMedian)}h` : "—"}</div>
                  </div>
                  <div style={{ ...cardStyle, minWidth: 100 }}>
                    <div style={{ color: theme.textMuted, fontSize: 12 }}>Time to purchase (median)</div>
                    <div style={{ color: theme.textPrimary, fontSize: 20, fontWeight: 600 }}>{funnelData.cohort?.timeToPurchaseDaysMedian != null ? `${Math.round(funnelData.cohort.timeToPurchaseDaysMedian)}d` : "—"}</div>
                  </div>
                </div>
                <div style={{ ...cardStyle, marginBottom: 24 }}>
                  <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Drop-off funnel (click a step to see emails)</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { key: "signup", label: "Trial signup", count: funnelData.funnel?.signup ?? 0 },
                      { key: "delivered", label: "Email delivered", count: funnelData.funnel?.delivered ?? 0 },
                      { key: "clicked", label: "Download/email clicked", count: funnelData.funnel?.clicked ?? 0 },
                      { key: "activation_attempt", label: "App activation attempt", count: funnelData.funnel?.activationAttempt ?? 0 },
                      { key: "activation_success", label: "Activation success", count: funnelData.funnel?.activationSuccess ?? 0 },
                      { key: "purchased", label: "Purchase complete", count: funnelData.funnel?.purchased ?? 0 },
                    ].map((step) => (
                      <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button type="button" onClick={() => loadFunnelCohort(step.key)} style={{ padding: "8px 12px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 13, minWidth: 120, textAlign: "left" }}>{step.label}</button>
                        <span style={{ color: theme.textPrimary, fontWeight: 600 }}>{step.count}</span>
                      </div>
                    ))}
                  </div>
                  {funnelCohortEmails && (
                    <div style={{ marginTop: 16, padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>Emails at step &quot;{funnelCohortEmails.step}&quot; ({funnelCohortEmails.emails?.length ?? 0})</div>
                      <div style={{ maxHeight: 200, overflowY: "auto", fontSize: 13 }}>
                        {funnelCohortEmails.emails?.length ? funnelCohortEmails.emails.slice(0, 100).map((e, i) => <div key={i}>{e}</div>) : "None"}
                        {funnelCohortEmails.emails && funnelCohortEmails.emails.length > 100 && <div style={{ color: theme.textMuted }}>… and {funnelCohortEmails.emails.length - 100} more</div>}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ ...cardStyle, marginBottom: 16 }}>
                  <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Email automation controls</h3>
                  <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>Day 0, 2, 5, 6, 7 trial sequence. Toggle active to enable/disable. Actual sending via Brevo automations or cron calling send-email.</p>
                  <button type="button" onClick={() => { loadAutomationConfig(); loadAutomationAttribution(); }} style={{ marginBottom: 12, ...btnSecondary }}>Refresh</button>
                  {automationConfig.length ? (
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                      <thead><tr><th style={tableHeader}>Day</th><th style={tableHeader}>Template</th><th style={tableHeader}>Active</th></tr></thead>
                      <tbody>
                        {automationConfig.map((c) => (
                          <tr key={c.id}>
                            <td style={tableCell}>Day {c.day_offset}</td>
                            <td style={tableCell}>{c.template_name || c.template_id}</td>
                            <td style={tableCell}>
                              <button type="button" onClick={() => c.id && toggleAutomation(c.id, !c.active)} style={{ padding: "4px 8px", fontSize: 11 }}>{c.active ? "Active" : "Inactive"} — click to toggle</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  {automationAttribution.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h4 style={{ fontSize: 13, marginBottom: 8 }}>Conversion attribution (emails delivered → trial → purchase)</h4>
                      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                        <thead><tr><th style={tableHeader}>Template</th><th style={tableHeader}>Sent</th><th style={tableHeader}>Delivered</th><th style={tableHeader}>Converted</th></tr></thead>
                        <tbody>
                          {automationAttribution.map((a, i) => (
                            <tr key={i}><td style={tableCell}>{a.template}</td><td style={tableCell}>{a.sent ?? 0}</td><td style={tableCell}>{a.delivered ?? 0}</td><td style={tableCell}>{a.converted ?? 0}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div style={cardStyle}>
                  <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Trials by day</h3>
                  {funnelData.cohort?.trialsByDay?.length ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", minHeight: 80 }}>
                      {funnelData.cohort.trialsByDay.map((d, i) => {
                        const max = Math.max(1, ...funnelData.cohort!.trialsByDay!.map((x) => x.count));
                        return <div key={i} title={`${d.date}: ${d.count}`} style={{ flex: 1, height: `${Math.max(4, (d.count / max) * 60)}px`, background: theme.accentGold, borderRadius: 2, minWidth: 4 }} />;
                      })}
                    </div>
                  ) : <p style={{ color: theme.textSecondary }}>No trial data</p>}
                </div>
              </>
            )}
          </>
        )}
        {tab === "customers" && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Top customers</h3>
            {customers?.stats?.topCustomers?.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={tableHeader}>Email</th><th style={tableHeader}>Name</th><th style={tableHeader}>Licenses</th></tr></thead>
                <tbody>
                  {(customers.stats.topCustomers as { email?: string; name?: string; licenseCount?: number }[]).slice(0, 30).map((c, i) => (
                    <tr key={i}><td style={tableCell}>{c.email}</td><td style={tableCell}>{c.name}</td><td style={tableCell}>{c.licenseCount}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p style={{ color: theme.textSecondary }}>No customer data</p>}
          </div>
        )}
        {tab === "profile" && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Users & Timeline</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <input
                type="email"
                placeholder="Customer email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadProfile()}
                style={{ padding: "10px 12px", width: 280, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}
              />
              <button type="button" onClick={loadProfile} disabled={loading === "profile"} style={{ padding: "10px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>{loading === "profile" ? "Loading…" : "Load"}</button>
            </div>
            {profile && (
              <>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20, padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                  <div><span style={{ color: theme.textMuted, fontSize: 12 }}>Email</span><div style={{ color: theme.textPrimary }}>{profile.email}</div></div>
                  <div><span style={{ color: theme.textMuted, fontSize: 12 }}>Created</span><div style={{ color: theme.textPrimary }}>{profile.userRecord?.createdDate ? formatDateUSA(new Date(profile.userRecord.createdDate)) : "—"}</div></div>
                  <div><span style={{ color: theme.textMuted, fontSize: 12 }}>Tier</span><div style={{ color: theme.textPrimary }}>{profile.userRecord?.productTier ?? "—"}</div></div>
                  <div><span style={{ color: theme.textMuted, fontSize: 12 }}>Status</span><div style={{ color: theme.textPrimary }}>{profile.userRecord?.status ?? "—"}</div></div>
                  <div><span style={{ color: theme.textMuted, fontSize: 12 }}>Tags</span><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(profile.userRecord?.tags ?? []).map((t) => <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: theme.backgroundCard, borderRadius: 6, fontSize: 12 }}>{t}<button type="button" onClick={() => removeCustomerTag(t)} style={{ background: "none", border: "none", color: theme.textMuted, cursor: "pointer", padding: 0 }} title="Remove">×</button></span>)}</div></div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="text" placeholder="Add note…" value={profileNote} onChange={(e) => { setProfileNote(e.target.value); setProfileActionStatus(null); }} onKeyDown={(e) => e.key === "Enter" && addCustomerNote()} style={{ padding: "8px 12px", width: 200, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                    <button type="button" onClick={addCustomerNote} style={{ padding: "8px 14px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Add note</button>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="text" placeholder="Add tag (e.g. VIP)" value={profileTag} onChange={(e) => { setProfileTag(e.target.value); setProfileActionStatus(null); }} onKeyDown={(e) => e.key === "Enter" && addCustomerTag()} style={{ padding: "8px 12px", width: 140, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                      {["VIP", "influencer", "estate attorney lead"].map((t) => (
                        <button key={t} type="button" onClick={() => addCustomerTag(t)} style={{ padding: "6px 10px", fontSize: 11, background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer" }}>+ {t}</button>
                      ))}
                    </div>
                    <button type="button" onClick={addCustomerTag} style={{ padding: "8px 14px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Add tag</button>
                    {SUGGESTED_TAGS.map((t) => (
                      <button key={t} type="button" onClick={() => addCustomerTag(t)} style={{ padding: "6px 10px", fontSize: 11, background: theme.backgroundPage, color: theme.textSecondary, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer" }}>{t}</button>
                    ))}
                  </div>
                  {profileActionStatus && <span style={{ color: theme.statusError, fontSize: 13 }}>{profileActionStatus}</span>}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ color: theme.accentGold, fontSize: 14, marginBottom: 10 }}>Timeline</h4>
                  {profile.timeline?.length ? (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13 }}>
                      {(profile.timeline as { ts: string; type: string; label: string; detail?: string; success?: boolean }[]).slice(0, 80).map((item, i) => (
                        <li key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
                          <span style={{ color: theme.textMuted, fontSize: 11, marginRight: 12 }}>{item.ts ? formatDateTimeUSA(new Date(item.ts)) : ""}</span>
                          <span style={{ color: item.success === false ? theme.statusError : theme.textPrimary }}>{item.label}</span>
                          {item.detail && <span style={{ color: theme.textSecondary, marginLeft: 8 }}>{item.detail}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : <p style={{ color: theme.textMuted, fontSize: 13 }}>No timeline events</p>}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 8 }}>Licenses</h4>
                  {profile.licenses?.length ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr><th style={tableHeader}>Key (masked)</th><th style={tableHeader}>Product</th><th style={tableHeader}>Plan</th><th style={tableHeader}>Status</th><th style={tableHeader}>Created</th></tr></thead>
                      <tbody>
                        {(profile.licenses as { license_key_last4?: string; product?: string; plan_type?: string; status?: string; created_at?: string }[]).map((l, i) => (
                          <tr key={i}><td style={tableCell}>{l.license_key_last4 ? `****-****-****-${l.license_key_last4}` : "—"}</td><td style={tableCell}>{l.product ?? "—"}</td><td style={tableCell}>{l.plan_type ?? "—"}</td><td style={tableCell}>{l.status ?? "—"}</td><td style={tableCell}>{l.created_at ? formatDateUSA(new Date(l.created_at)) : "—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p style={{ color: theme.textMuted, fontSize: 13 }}>No licenses</p>}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 8 }}>Purchases</h4>
                  {profile.purchases?.length ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr><th style={tableHeader}>Session</th><th style={tableHeader}>Product</th><th style={tableHeader}>Amount</th><th style={tableHeader}>Date</th><th style={tableHeader}>Refunded</th></tr></thead>
                      <tbody>
                        {(profile.purchases as { session_id?: string; product?: string; amount_cents?: number; created_at?: string; refunded_at?: string }[]).map((p, i) => (
                          <tr key={i}><td style={tableCell}>{p.session_id ?? "—"}</td><td style={tableCell}>{p.product ?? "—"}</td><td style={tableCell}>${((p.amount_cents ?? 0) / 100).toFixed(2)}</td><td style={tableCell}>{p.created_at ? formatDateUSA(new Date(p.created_at)) : "—"}</td><td style={tableCell}>{p.refunded_at ? "Yes" : "—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p style={{ color: theme.textMuted, fontSize: 13 }}>No purchases</p>}
                </div>
                <div style={{ paddingTop: 12, borderTop: `1px solid ${theme.borderSubtle}` }}>
                  <h4 style={{ color: theme.accentGold, fontSize: 13, marginBottom: 8 }}>Resend email</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select value={resendTemplate} onChange={(e) => setResendTemplate(e.target.value)} style={{ padding: "8px 10px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary }}>
                        {RESEND_EMAIL_TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span style={{ color: theme.textMuted, fontSize: 13 }}>To: {profile.email}</span>
                      <button type="button" onClick={resendEmail} disabled={loading === "resend"} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>{loading === "resend" ? "Sending…" : "Resend"}</button>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ color: theme.textMuted, fontSize: 12 }}>Change recipient (audit trail):</span>
                      <input type="email" placeholder="New email address" value={resendTo} onChange={(e) => { setResendTo(e.target.value); setResendStatus(null); }} style={{ padding: "8px 12px", width: 220, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                      <span style={{ color: theme.textMuted, fontSize: 11 }}>Original: {profile.email}</span>
                    </div>
                  </div>
                  <label style={{ display: "block", color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Params (JSON, optional)</label>
                  <textarea value={resendParams} onChange={(e) => setResendParams(e.target.value)} placeholder='{"customer_name": "Jane"}' rows={2} style={{ width: "100%", maxWidth: 400, padding: "8px 10px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary, fontSize: 12 }} />
                  {resendStatus && <p style={{ marginTop: 8, color: resendStatus.startsWith("Sent") ? theme.statusSuccess : theme.textSecondary, fontSize: 13 }}>{resendStatus}</p>}
                </div>
              </>
            )}
            {!profile && profileEmail.trim() && loading !== "profile" && <p style={{ color: theme.textMuted }}>Enter email and click Load</p>}
          </div>
        )}
        {tab === "support" && (
          <>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Ticket inbox</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <select value={ticketsFilterStatus} onChange={(e) => setTicketsFilterStatus(e.target.value)} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="responded">Responded</option>
                  <option value="closed">Closed</option>
                </select>
                <select value={ticketsFilterCategory} onChange={(e) => setTicketsFilterCategory(e.target.value)} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                  <option value="">All categories</option>
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="license_billing">License / Billing</option>
                  <option value="license_activation">License / Activation</option>
                  <option value="feature_request">Feature request</option>
                  <option value="bug_report">Bug report</option>
                </select>
                <button type="button" onClick={loadTicketsInbox} disabled={loading === "tickets"} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>{loading === "tickets" ? "Loading…" : "Refresh"}</button>
              </div>
              {ticketsList?.tickets?.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><th style={tableHeader}>#</th><th style={tableHeader}>From</th><th style={tableHeader}>Category</th><th style={tableHeader}>Subject</th><th style={tableHeader}>Status</th><th style={tableHeader}>SLA</th><th style={tableHeader}>Created</th></tr></thead>
                  <tbody>
                    {ticketsList.tickets.map((t) => {
                      const created = t.created_at ? new Date(t.created_at).getTime() : 0;
                      const firstResp = t.first_response_at ? new Date(t.first_response_at).getTime() : 0;
                      const now = Date.now();
                      const hoursOpen = created ? Math.round((now - created) / 3600000) : 0;
                      const slaLabel = firstResp ? `Responded in ${Math.round((firstResp - created) / 3600000)}h` : (hoursOpen >= 24 ? <span style={{ color: theme.statusError }}>Open {hoursOpen}h</span> : `Open ${hoursOpen}h`);
                      return (
                        <tr key={t.id} style={{ cursor: "pointer", background: selectedTicketId === t.id ? "rgba(255,255,255,0.05)" : undefined }} onClick={() => { setSelectedTicketId(t.id || null); if (t.id) loadTicketDetail(t.id); }}>
                          <td style={tableCell}>{t.ticket_number}</td>
                          <td style={tableCell}>{t.name} &lt;{t.email}&gt;</td>
                          <td style={tableCell}>{t.category}</td>
                          <td style={tableCell}>{t.subject}</td>
                          <td style={tableCell}>{t.status}</td>
                          <td style={tableCell}>{slaLabel}</td>
                          <td style={tableCell}>{t.created_at ? formatDateTimeUSA(new Date(t.created_at)) : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : loading === "tickets" ? <p style={{ color: theme.textSecondary }}>Loading…</p> : <p style={{ color: theme.textSecondary }}>No tickets</p>}
            </div>
            {selectedTicketId && ticketDetail && (
              <div style={cardStyle}>
                <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Ticket: {ticketDetail.ticket?.ticket_number}</h3>
                {(() => {
                  const t = ticketDetail.ticket;
                  const created = t?.created_at ? new Date(t.created_at as string).getTime() : 0;
                  const firstResp = t?.first_response_at ? new Date(t.first_response_at as string).getTime() : 0;
                  const slaText = firstResp ? `Responded in ${Math.round((firstResp - created) / 3600000)}h` : `Open ${Math.round((Date.now() - created) / 3600000)}h`;
                  return <div style={{ marginBottom: 12, padding: 8, background: theme.backgroundPage, borderRadius: theme.radiusInput, fontSize: 13, display: "inline-block" }}><strong>SLA:</strong> {slaText}</div>;
                })()}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 16 }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ marginBottom: 12 }}>
                      <strong>{ticketDetail.ticket?.name}</strong> &lt;{ticketDetail.ticket?.email}&gt;
                    </div>
                    <div style={{ marginBottom: 8 }}><strong>Subject:</strong> {ticketDetail.ticket?.subject}</div>
                    <div style={{ marginBottom: 12 }}><strong>Message:</strong></div>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: theme.textSecondary }}>{ticketDetail.ticket?.message}</pre>
                    <div style={{ marginTop: 12 }}>
                      <button type="button" onClick={() => { setProfileEmail(String(ticketDetail.ticket?.email || "")); setTab("profile"); }} style={{ padding: "6px 12px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12 }}>View customer profile</button>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <strong>Internal notes</strong>
                      <textarea value={ticketInternalNotes} onChange={(e) => setTicketInternalNotes(e.target.value)} rows={3} style={{ width: "100%", marginTop: 6, padding: 8, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                      <button type="button" onClick={() => updateTicketAction("update_notes", { internal_notes: ticketInternalNotes })} style={{ marginTop: 8, padding: "6px 12px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12 }}>Save notes</button>
                      <div style={{ marginTop: 12 }}>
                        <span style={{ marginRight: 8 }}>Status:</span>
                        <button type="button" onClick={() => updateTicketAction("update_status", { status: "open" })} style={{ marginRight: 4, padding: "4px 8px", fontSize: 11 }}>Open</button>
                        <button type="button" onClick={() => updateTicketAction("set_first_response")} style={{ marginRight: 4, padding: "4px 8px", fontSize: 11 }}>Responded</button>
                        <button type="button" onClick={() => updateTicketAction("resolve")} style={{ padding: "4px 8px", fontSize: 11 }}>Close</button>
                      </div>
                      {ticketActionStatus && <span style={{ marginLeft: 8, fontSize: 12 }}>{ticketActionStatus}</span>}
                    </div>
                  </div>
                  <div style={{ flex: "0 0 320px" }}>
                    <h4 style={{ color: theme.textPrimary, fontSize: 13, marginBottom: 8 }}>Canned replies</h4>
                    {ticketDetail.scripts?.length ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {ticketDetail.scripts.map((s) => (
                          <div key={s.id} style={{ padding: 8, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                            <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>{s.when_to_use}</div>
                            <div style={{ fontSize: 12, marginBottom: 6 }}>{s.short_version}</div>
                            <button type="button" onClick={() => navigator.clipboard.writeText(s.long_version || s.short_version || "")} style={{ padding: "4px 8px", fontSize: 11, background: theme.backgroundCard, color: theme.accentGold, border: "none", borderRadius: 4, cursor: "pointer" }}>Copy</button>
                          </div>
                        ))}
                      </div>
                    ) : <p style={{ color: theme.textMuted, fontSize: 12 }}>No scripts for this category</p>}
                    <h4 style={{ color: theme.textPrimary, fontSize: 13, marginTop: 16, marginBottom: 8 }}>Playbooks</h4>
                    {ticketDetail.playbooks?.length ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {ticketDetail.playbooks.map((p, i) => (
                          <div key={i} style={{ padding: 8, background: theme.backgroundPage, borderRadius: theme.radiusInput, fontSize: 12 }}>
                            <strong>{p.title}</strong>
                            <div style={{ color: theme.textMuted, marginTop: 4 }}>{p.fix_steps}</div>
                          </div>
                        ))}
                      </div>
                    ) : <p style={{ color: theme.textMuted, fontSize: 12 }}>No playbooks</p>}
                    {ticketDetail.kb_articles && ticketDetail.kb_articles.length > 0 && (
                      <>
                        <h4 style={{ color: theme.textPrimary, fontSize: 13, marginTop: 16, marginBottom: 8 }}>KB articles (link by category)</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {ticketDetail.kb_articles.map((a, i) => (
                            <a key={a.id || i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ padding: 8, background: theme.backgroundPage, borderRadius: theme.radiusInput, fontSize: 12, color: theme.accentGold, textDecoration: "none" }}>{a.title}</a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Knowledge base articles</h3>
              <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>Add articles; ticket detail suggests by category. Use category: general, technical, license_billing, license_activation, feature_request, bug_report.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500, marginBottom: 16 }}>
                <input type="text" placeholder="Title" value={kbForm.title} onChange={(e) => setKbForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
                <input type="text" placeholder="URL" value={kbForm.url} onChange={(e) => setKbForm((f) => ({ ...f, url: e.target.value }))} style={inputStyle} />
                <select value={kbForm.category} onChange={(e) => setKbForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle}>
                  <option value="general">general</option>
                  <option value="technical">technical</option>
                  <option value="license_billing">license_billing</option>
                  <option value="license_activation">license_activation</option>
                  <option value="feature_request">feature_request</option>
                  <option value="bug_report">bug_report</option>
                </select>
                <button type="button" onClick={addKbArticle} style={btnPrimary}>Add KB article</button>
                {kbStatus && <span style={{ fontSize: 13 }}>{kbStatus}</span>}
              </div>
              <button type="button" onClick={loadKbArticles} style={{ marginBottom: 12, ...btnSecondary }}>Refresh</button>
              {kbArticles.length ? (
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead><tr><th style={tableHeader}>Title</th><th style={tableHeader}>Category</th><th style={tableHeader}>URL</th></tr></thead>
                  <tbody>
                    {kbArticles.map((a) => (
                      <tr key={a.id}><td style={tableCell}>{a.title}</td><td style={tableCell}>{a.category}</td><td style={tableCell}><a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.accentGold }}>{a.url?.slice(0, 40)}…</a></td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: theme.textMuted, fontSize: 12 }}>No KB articles. Add one above.</p>}
            </div>
          </>
        )}
        {tab === "attribution" && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Campaign attribution</h3>
            <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>Trials by UTM source. Add utm_source, utm_medium, utm_campaign to trial signup form to capture.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <select value={attributionDays} onChange={(e) => setAttributionDays(Number(e.target.value))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
              <button type="button" onClick={loadAttribution} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Refresh</button>
            </div>
            {attributionData?.attribution?.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr><th style={tableHeader}>Source</th><th style={tableHeader}>Trials</th><th style={tableHeader}>Conversions</th><th style={tableHeader}>Rate</th><th style={tableHeader}>Cost</th><th style={tableHeader}>Cost/trial</th><th style={tableHeader}>Cost/purchase</th></tr></thead>
                <tbody>
                  {attributionData.attribution.map((a: { source?: string; trials?: number; conversions?: number; conversionRate?: number; cost_cents?: number; cost_per_trial_cents?: number | null; cost_per_purchase_cents?: number | null }, i: number) => (
                    <tr key={i}>
                      <td style={tableCell}>{a.source}</td>
                      <td style={tableCell}>{a.trials}</td>
                      <td style={tableCell}>{a.conversions}</td>
                      <td style={tableCell}>{a.conversionRate}%</td>
                      <td style={tableCell}>{a.cost_cents != null ? `$${((a.cost_cents || 0) / 100).toFixed(2)}` : "—"}</td>
                      <td style={tableCell}>{a.cost_per_trial_cents != null ? `$${((a.cost_per_trial_cents || 0) / 100).toFixed(2)}` : "—"}</td>
                      <td style={tableCell}>{a.cost_per_purchase_cents != null ? `$${((a.cost_per_purchase_cents || 0) / 100).toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p style={{ color: theme.textMuted }}>No attribution data. Trials without UTM show as &quot;direct&quot;. Add campaign costs below for ROI.</p>}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${theme.borderSubtle}` }}>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Add campaign cost (for cost per trial/purchase)</h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <input type="text" placeholder="UTM source (e.g. instagram)" value={campaignCostForm.utm_source} onChange={(e) => setCampaignCostForm((f) => ({ ...f, utm_source: e.target.value }))} style={{ ...inputStyle, width: 140 }} />
                <input type="date" placeholder="Period start" value={campaignCostForm.period_start} onChange={(e) => setCampaignCostForm((f) => ({ ...f, period_start: e.target.value }))} style={inputStyle} />
                <input type="date" placeholder="Period end" value={campaignCostForm.period_end} onChange={(e) => setCampaignCostForm((f) => ({ ...f, period_end: e.target.value }))} style={inputStyle} />
                <input type="number" placeholder="Cost (cents)" value={campaignCostForm.cost_cents || ""} onChange={(e) => setCampaignCostForm((f) => ({ ...f, cost_cents: parseInt(e.target.value, 10) || 0 }))} style={{ ...inputStyle, width: 100 }} />
                <button type="button" onClick={addCampaignCost} style={btnPrimary}>Add cost</button>
                {campaignCostStatus && <span style={{ fontSize: 13 }}>{campaignCostStatus}</span>}
              </div>
            </div>
          </div>
        )}
        {tab === "leads" && (
          <>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Add lead</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, marginBottom: 12 }}>
                <input type="text" placeholder="Organization" value={leadForm.organization_name} onChange={(e) => setLeadForm((f) => ({ ...f, organization_name: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <input type="text" placeholder="Contact name *" value={leadForm.contact_name} onChange={(e) => setLeadForm((f) => ({ ...f, contact_name: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <input type="email" placeholder="Email *" value={leadForm.email} onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <select value={leadForm.type} onChange={(e) => setLeadForm((f) => ({ ...f, type: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                  <option value="attorney">Attorney</option>
                  <option value="planner">Planner</option>
                  <option value="hospice">Hospice</option>
                  <option value="senior_living">Senior living</option>
                  <option value="organizer">Organizer</option>
                  <option value="other">Other</option>
                </select>
                <select value={leadForm.status} onChange={(e) => setLeadForm((f) => ({ ...f, status: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                  <option value="not_contacted">Not contacted</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                  <option value="follow_up">Follow up</option>
                  <option value="onboarded">Onboarded</option>
                  <option value="declined">Declined</option>
                </select>
                <input type="text" placeholder="Notes" value={leadForm.notes} onChange={(e) => setLeadForm((f) => ({ ...f, notes: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <button type="button" onClick={addLead} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Add lead</button>
                {leadStatus && <span style={{ fontSize: 13 }}>{leadStatus}</span>}
              </div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Leads</h3>
              {leadsList.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><th style={tableHeader}>Contact</th><th style={tableHeader}>Org</th><th style={tableHeader}>Email</th><th style={tableHeader}>Type</th><th style={tableHeader}>Status</th><th style={tableHeader}>Created</th></tr></thead>
                  <tbody>
                    {leadsList.map((l) => (
                      <tr key={l.id}>
                        <td style={tableCell}>{l.contact_name}</td>
                        <td style={tableCell}>{l.organization_name ?? "—"}</td>
                        <td style={tableCell}>{l.email}</td>
                        <td style={tableCell}>{l.type}</td>
                        <td style={tableCell}>
                          <select value={l.status} onChange={(e) => l.id && updateLeadStatus(l.id, e.target.value)} style={{ padding: "4px 8px", fontSize: 12, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                            <option value="not_contacted">Not contacted</option>
                            <option value="contacted">Contacted</option>
                            <option value="interested">Interested</option>
                            <option value="follow_up">Follow up</option>
                            <option value="onboarded">Onboarded</option>
                            <option value="declined">Declined</option>
                          </select>
                        </td>
                        <td style={tableCell}>{l.created_at ? formatDateUSA(new Date(l.created_at)) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: theme.textMuted }}>No leads</p>}
            </div>
          </>
        )}
        {tab === "playbooks" && (
          <>
            <div style={cardStyle}>
              <h3 style={{ ...sectionTitle, marginBottom: 12 }}>Most common problems and how to fix them</h3>
              <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 16 }}>Select a problem to see troubleshooting steps and copy-paste scripts.</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input type="text" placeholder="Search problems, scripts…" value={playbookSearch} onChange={(e) => setPlaybookSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadPlaybooks()} style={{ flex: 1, padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <button type="button" onClick={loadPlaybooks} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, cursor: "pointer" }}>Search</button>
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                  <h4 style={{ color: theme.textPrimary, fontSize: 13, marginBottom: 8 }}>Problems</h4>
                  {playbooksData?.issues?.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {playbooksData.issues.map((i) => (
                        <div key={i.id} style={{ padding: 12, background: selectedPlaybookIssueId === i.id ? theme.accentGold + "22" : theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${selectedPlaybookIssueId === i.id ? theme.accentGold : theme.borderSubtle}`, cursor: "pointer" }} onClick={() => { setSelectedPlaybookIssueId(i.id || null); if (i.id) loadPlaybookDetail(i.id); }}>
                          <strong>{i.title}</strong>
                          {i.symptoms && <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>{i.symptoms}</div>}
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ color: theme.textMuted }}>No problems found</p>}
                </div>
                <div style={{ flex: "1 1 400px", minWidth: 0 }}>
                  <h4 style={{ color: theme.textPrimary, fontSize: 13, marginBottom: 8 }}>Troubleshooting steps & scripts</h4>
                  {selectedPlaybookIssueId && playbookDetail ? (
                    <div style={{ padding: 16, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>{playbookDetail.issue?.title}</div>
                      {playbookDetail.issue?.symptoms && (
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase" }}>What the customer reports</span>
                          <div style={{ fontSize: 13 }}>{playbookDetail.issue.symptoms}</div>
                        </div>
                      )}
                      {playbookDetail.issue?.root_cause && (
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase" }}>Root cause</span>
                          <div style={{ fontSize: 13 }}>{playbookDetail.issue.root_cause}</div>
                        </div>
                      )}
                      {playbookDetail.issue?.how_to_confirm && (
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase" }}>How to confirm</span>
                          <div style={{ fontSize: 13 }}>{playbookDetail.issue.how_to_confirm}</div>
                        </div>
                      )}
                      {playbookDetail.issue?.fix_steps && (
                        <div style={{ marginBottom: 12 }}>
                          <span style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase" }}>Troubleshooting steps</span>
                          <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{playbookDetail.issue.fix_steps}</div>
                        </div>
                      )}
                      {playbookDetail.issue?.workaround && (
                        <div style={{ marginBottom: 12 }}>
                          <span style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase" }}>Workaround</span>
                          <div style={{ fontSize: 13 }}>{playbookDetail.issue.workaround}</div>
                        </div>
                      )}
                      {(playbookDetail.generated?.customerReply || playbookDetail.generated?.internalNotes || playbookDetail.generated?.bugReportTemplate) ? (
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${theme.borderSubtle}` }}>
                          <span style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase" }}>One-click generated</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
                            {playbookDetail.generated.customerReply && (
                              <div style={{ padding: 10, background: theme.backgroundCard, borderRadius: 6, border: `1px solid ${theme.borderSubtle}` }}>
                                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Customer reply</div>
                                <div style={{ fontSize: 12, whiteSpace: "pre-wrap", marginBottom: 8, maxHeight: 100, overflowY: "auto" }}>{playbookDetail.generated.customerReply.slice(0, 200)}{playbookDetail.generated.customerReply.length > 200 ? "…" : ""}</div>
                                <button type="button" onClick={() => navigator.clipboard.writeText(playbookDetail.generated!.customerReply!)} style={{ padding: "6px 12px", background: theme.accentGold, color: "#1a1a1a", border: "none", borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Copy</button>
                              </div>
                            )}
                            {playbookDetail.generated.internalNotes && (
                              <div style={{ padding: 10, background: theme.backgroundCard, borderRadius: 6, border: `1px solid ${theme.borderSubtle}` }}>
                                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Internal notes template</div>
                                <div style={{ fontSize: 12, whiteSpace: "pre-wrap", marginBottom: 8, maxHeight: 80, overflowY: "auto" }}>{playbookDetail.generated.internalNotes.slice(0, 150)}…</div>
                                <button type="button" onClick={() => navigator.clipboard.writeText(playbookDetail.generated!.internalNotes!)} style={{ padding: "6px 12px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Copy</button>
                              </div>
                            )}
                            {playbookDetail.generated.bugReportTemplate && (
                              <div style={{ padding: 10, background: theme.backgroundCard, borderRadius: 6, border: `1px solid ${theme.borderSubtle}` }}>
                                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Bug report template</div>
                                <div style={{ fontSize: 11, whiteSpace: "pre-wrap", marginBottom: 8, maxHeight: 80, overflowY: "auto" }}>{playbookDetail.generated.bugReportTemplate}</div>
                                <button type="button" onClick={() => navigator.clipboard.writeText(playbookDetail.generated!.bugReportTemplate!)} style={{ padding: "6px 12px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12 }}>Copy</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                      {playbookDetail.suggestedScripts?.length ? (
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${theme.borderSubtle}` }}>
                          <span style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase" }}>Scripts to send</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                            {playbookDetail.suggestedScripts.map((s, idx) => {
                              const text = s.long_version || s.short_version || "";
                              return (
                                <div key={idx} style={{ padding: 10, background: theme.backgroundCard, borderRadius: 6, border: `1px solid ${theme.borderSubtle}` }}>
                                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>{s.title}</div>
                                  <div style={{ fontSize: 12, whiteSpace: "pre-wrap", marginBottom: 8, maxHeight: 120, overflowY: "auto" }}>{text.slice(0, 300)}{text.length > 300 ? "…" : ""}</div>
                                  <button type="button" onClick={() => navigator.clipboard.writeText(text)} style={{ padding: "6px 12px", background: theme.accentGold, color: "#1a1a1a", border: "none", borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Copy</button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : !playbookDetail.generated?.customerReply && <p style={{ color: theme.textMuted, fontSize: 12, marginTop: 12 }}>No matching script. Use Scripts tab or compose manually.</p>}
                    </div>
                  ) : <p style={{ color: theme.textMuted, padding: 24, textAlign: "center" }}>Select a problem to see troubleshooting steps and scripts</p>}
                </div>
              </div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>All scripts (quick copy)</h3>
              {playbooksData?.scripts?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {playbooksData.scripts.reduce((acc: { cat: string; items: { id?: string; category?: string; title?: string; when_to_use?: string; short_version?: string; long_version?: string }[] }[], s: { id?: string; category?: string; title?: string; when_to_use?: string; short_version?: string; long_version?: string }) => {
                    const cat = s.category || "Other";
                    const found = acc.find((x) => x.cat === cat);
                    if (found) found.items.push(s); else acc.push({ cat, items: [s] });
                    return acc;
                  }, [] as { cat: string; items: { id?: string; category?: string; title?: string; when_to_use?: string; short_version?: string; long_version?: string }[] }[]).map((g) => (
                    <div key={g.cat} style={{ flex: "1 1 280px", minWidth: 0, marginBottom: 16 }}>
                      <h4 style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>{g.cat}</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {g.items.map((s) => {
                          const text = s.long_version || s.short_version || "";
                          return (
                            <div key={s.id} style={{ padding: 10, background: theme.backgroundPage, borderRadius: 6, border: `1px solid ${theme.borderSubtle}` }}>
                              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{s.title}</div>
                              <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 6 }}>{s.when_to_use}</div>
                              <button type="button" onClick={() => navigator.clipboard.writeText(text)} style={{ padding: "4px 10px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: 4, cursor: "pointer", fontSize: 11 }}>Copy</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color: theme.textMuted }}>No scripts. Run migration to seed admin_scripts.</p>}
            </div>
          </>
        )}
        {tab === "analytics" && (
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Product analytics</h3>
            <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 16 }}>App sends events to <code style={{ background: theme.backgroundPage, padding: "2px 6px", borderRadius: 4 }}>POST /app-events-submit</code> (install, activation_success, activation_fail, screen_first_record, error, crash). Metadata only.</p>
            <button type="button" onClick={loadAnalytics} style={{ marginBottom: 16, ...btnSecondary }}>Refresh</button>
            {analyticsData?.summary ? (
              <>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
                  <div style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>Total events</span>
                    <div style={{ fontSize: 20, fontWeight: 700, color: theme.accentGold }}>{analyticsData.summary.total_events ?? 0}</div>
                  </div>
                  <div style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>Installs</span>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{analyticsData.summary.installs ?? 0}</div>
                  </div>
                  <div style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>Activation success rate</span>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{analyticsData.summary.activation_success_rate_pct ?? 0}%</div>
                  </div>
                  <div style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>Time to first value</span>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{analyticsData.summary.time_to_first_value_pct ?? 0}%</div>
                  </div>
                  <div style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>Crash-free sessions</span>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{analyticsData.summary.crash_free_sessions ?? 100}%</div>
                  </div>
                </div>
                {analyticsData.by_event_type && Object.keys(analyticsData.by_event_type).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 13, marginBottom: 8 }}>By event type</h4>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(analyticsData.by_event_type).map(([t, c]) => (
                        <span key={t} style={{ padding: "6px 12px", background: theme.backgroundPage, borderRadius: 6, fontSize: 12 }}>{t}: {c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analyticsData.by_app_version && analyticsData.by_app_version.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: 13, marginBottom: 8 }}>Top app versions</h4>
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                      <thead><tr><th style={tableHeader}>Version</th><th style={tableHeader}>Events</th></tr></thead>
                      <tbody>
                        {analyticsData.by_app_version.map((v, i) => (
                          <tr key={i}><td style={tableCell}>{v.version}</td><td style={tableCell}>{v.count}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : <p style={{ color: theme.textMuted }}>No app events yet. Instrument the app to POST to /app-events-submit.</p>}
          </div>
        )}
        {tab === "bugs" && (
          <>
            {bugDashboard && (
              <div style={cardStyle}>
                <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Engineering dashboard</h3>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
                  <div style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>Open bugs</span>
                    <div style={{ fontSize: 24, fontWeight: 700, color: theme.accentGold }}>{bugDashboard.openBugs ?? 0}</div>
                  </div>
                  {bugDashboard.bySeverity && Object.entries(bugDashboard.bySeverity).map(([s, c]) => (
                    <div key={s} style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                      <span style={{ fontSize: 11, color: theme.textMuted }}>{s}</span>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>{c}</div>
                    </div>
                  ))}
                </div>
                {bugDashboard.byAppVersion && Object.keys(bugDashboard.byAppVersion).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>By app version</span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      {Object.entries(bugDashboard.byAppVersion).map(([v, c]) => (
                        <span key={v} style={{ padding: "4px 8px", background: theme.backgroundPage, borderRadius: 4, fontSize: 12 }}>{v}: {c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {bugDashboard.topErrorCodes?.length ? (
                  <div>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>Top activation error codes</span>
                    <table style={{ width: "100%", marginTop: 8, fontSize: 12 }}>
                      <tbody>
                        {bugDashboard.topErrorCodes.map((e, i) => (
                          <tr key={i}><td style={tableCell}>{e.errorId}</td><td style={tableCell}>{e.count}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )}
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Submit bug report</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500, marginBottom: 12 }}>
                <input type="text" placeholder="Title *" value={bugForm.title} onChange={(e) => setBugForm((f) => ({ ...f, title: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <select value={bugForm.severity} onChange={(e) => setBugForm((f) => ({ ...f, severity: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <textarea placeholder="Steps to reproduce" value={bugForm.steps} onChange={(e) => setBugForm((f) => ({ ...f, steps: e.target.value }))} rows={2} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <textarea placeholder="Expected vs actual" value={bugForm.expected} onChange={(e) => setBugForm((f) => ({ ...f, expected: e.target.value }))} rows={2} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={bugForm.customerImpacted} onChange={(e) => setBugForm((f) => ({ ...f, customerImpacted: e.target.checked }))} />
                  <span>Customer impacted</span>
                </label>
                <input type="text" placeholder="App version" value={bugForm.appVersion} onChange={(e) => setBugForm((f) => ({ ...f, appVersion: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <input type="text" placeholder="OS (Windows, macOS, Linux)" value={bugForm.os} onChange={(e) => setBugForm((f) => ({ ...f, os: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <textarea placeholder="Logs (paste or link)" value={bugForm.logs} onChange={(e) => setBugForm((f) => ({ ...f, logs: e.target.value }))} rows={2} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <button type="button" onClick={submitBugReport} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Submit</button>
                {bugStatus && <span style={{ fontSize: 13 }}>{bugStatus}</span>}
              </div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Bug reports</h3>
              <button type="button" onClick={loadBugReports} style={{ marginBottom: 12, padding: "8px 16px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer" }}>Refresh</button>
              {bugReports.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><th style={tableHeader}>Title</th><th style={tableHeader}>Severity</th><th style={tableHeader}>Status</th><th style={tableHeader}>Created</th></tr></thead>
                  <tbody>
                    {bugReports.map((b) => (
                      <tr key={b.id}>
                        <td style={tableCell}>{b.title}</td>
                        <td style={tableCell}>{b.severity}</td>
                        <td style={tableCell}>
                          <select value={b.status} onChange={(e) => b.id && updateBugStatus(b.id, e.target.value)} style={{ padding: "4px 8px", fontSize: 12, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                            <option value="open">Open</option>
                            <option value="in_progress">In progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="wont_fix">Won&apos;t fix</option>
                          </select>
                        </td>
                        <td style={tableCell}>{b.created_at ? formatDateTimeUSA(new Date(b.created_at)) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: theme.textMuted }}>No bug reports</p>}
            </div>
          </>
        )}
        {tab === "audit" && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Audit log</h3>
            <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>Every admin action logged.</p>
            <button type="button" onClick={loadAuditLog} style={{ marginBottom: 12, padding: "8px 16px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer" }}>Refresh</button>
            {auditEntries.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr><th style={tableHeader}>When</th><th style={tableHeader}>Who</th><th style={tableHeader}>Action</th><th style={tableHeader}>Entity</th><th style={tableHeader}>Reason</th><th style={tableHeader}>Details</th></tr></thead>
                <tbody>
                  {auditEntries.map((e, i) => (
                    <tr key={i}>
                      <td style={tableCell}>{e.acted_at ? formatDateTimeUSA(new Date(e.acted_at)) : ""}</td>
                      <td style={tableCell}>{e.actor_identifier}</td>
                      <td style={tableCell}>{e.action}</td>
                      <td style={tableCell}>{e.entity_type} {e.entity_id ? `#${String(e.entity_id).slice(0, 8)}` : ""}</td>
                      <td style={tableCell}>{e.reason}</td>
                      <td style={tableCell}>{e.details && Object.keys(e.details as object).length ? (
                        <details style={{ fontSize: 11 }}>
                          <summary>before/after</summary>
                          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", maxWidth: 200 }}>{JSON.stringify(e.details)}</pre>
                        </details>
                      ) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p style={{ color: theme.textMuted }}>No audit entries</p>}
          </div>
        )}
        {tab === "policy" && (
          <>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Add policy version</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500, marginBottom: 12 }}>
                <select value={policyForm.policy_type} onChange={(e) => setPolicyForm((f) => ({ ...f, policy_type: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                  <option value="eula">EULA</option>
                  <option value="privacy">Privacy policy</option>
                  <option value="security">Security statement</option>
                </select>
                <input type="text" placeholder="Version (e.g. 1.0)" value={policyForm.version} onChange={(e) => setPolicyForm((f) => ({ ...f, version: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <textarea placeholder="Content (optional)" value={policyForm.content} onChange={(e) => setPolicyForm((f) => ({ ...f, content: e.target.value }))} rows={4} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <button type="button" onClick={addPolicyVersion} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Add version</button>
                {policyStatus && <span style={{ fontSize: 13 }}>{policyStatus}</span>}
              </div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Scheduled exports</h3>
              <p style={{ color: theme.textSecondary, fontSize: 12 }}>Configure a cron job to periodically call <code style={{ background: theme.backgroundPage, padding: "2px 6px", borderRadius: 4 }}>/admin-exports?type=trials|revenue|tickets</code> and email the CSV. Use your hosting provider&apos;s cron or a service like EasyCron.</p>
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Policy versions</h3>
              {["eula", "privacy", "security"].map((t) => (
                <div key={t} style={{ marginBottom: 16 }}>
                  <h4 style={{ color: theme.textPrimary, fontSize: 13, marginBottom: 8 }}>{t === "eula" ? "EULA" : t === "privacy" ? "Privacy policy" : "Security statement"}</h4>
                  {policyVersions[t]?.length ? (
                    <div style={{ fontSize: 12 }}>
                      {policyVersions[t].map((v) => (
                        <div key={v.id} style={{ padding: 8, background: theme.backgroundPage, borderRadius: theme.radiusInput, marginBottom: 6 }}>
                          <strong>v{v.version}</strong> — {v.published_at ? formatDateUSA(new Date(v.published_at)) : "—"}
                          {(v as { acceptance_count?: number }).acceptance_count != null && (
                            <span style={{ color: theme.textMuted, marginLeft: 8, fontSize: 11 }}>({((v as { acceptance_count?: number }).acceptance_count ?? 0)} accepted)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ color: theme.textMuted, fontSize: 12 }}>No versions</p>}
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "status" && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>System status</h3>
            <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>Everything working or something broken.</p>
            <button type="button" onClick={loadStatus} style={{ marginBottom: 16, padding: "8px 16px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer" }}>Refresh</button>
            {statusData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: statusData.all_healthy ? (theme.statusSuccess || "#22c55e") : theme.statusError, borderRadius: theme.radiusInput, color: statusData.all_healthy ? "#111" : "#fff" }}>
                  <strong>{statusData.all_healthy ? "All systems operational" : "Some systems degraded"}</strong>
                </div>
                {statusData.integrations && Object.entries(statusData.integrations).map(([key, val]) => (
                  <div key={key} style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{key.replace(/_/g, " ")}</div>
                    <div style={{ fontSize: 13, color: theme.textSecondary }}>
                      {val.healthy !== undefined && <span style={{ color: val.healthy ? (theme.statusSuccess || "#22c55e") : theme.statusError }}>{val.healthy ? "OK" : "Degraded"}</span>}
                      {val.last_delivered_at && <span> • Last delivered: {formatDateTimeUSA(new Date(val.last_delivered_at))}</span>}
                      {val.last_paid_at && <span> • Last paid: {formatDateTimeUSA(new Date(val.last_paid_at))}</span>}
                      {val.last_success_at && <span> • Last success: {formatDateTimeUSA(new Date(val.last_success_at))}</span>}
                      {val.last_fail_at && <span style={{ color: theme.statusError }}> • Last fail: {formatDateTimeUSA(new Date(val.last_fail_at))}</span>}
                      {(val as { fail_count_24h?: number }).fail_count_24h != null && (val as { fail_count_24h?: number }).fail_count_24h > 0 && (
                        <span style={{ color: theme.statusError }}> • Fails 24h: {(val as { fail_count_24h?: number }).fail_count_24h}</span>
                      )}
                      {val.probes?.length && (
                        <div style={{ marginTop: 8 }}>
                          {(val.probes as { platform?: string; url?: string; ok?: boolean; status?: number; responseTimeMs?: number }[]).map((p, i) => (
                            <div key={i} style={{ fontSize: 12 }}>{p.platform}: {p.ok ? "OK" : "Fail"} ({p.responseTimeMs}ms)</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {statusData.diagnostics?.activation_24h && (
                  <div style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Activation (24h)</div>
                    <div style={{ fontSize: 13, color: theme.textSecondary }}>
                      Success: {statusData.diagnostics.activation_24h.success} • Fail: {statusData.diagnostics.activation_24h.fail} • Total: {statusData.diagnostics.activation_24h.total}
                      {statusData.diagnostics.activation_24h.total > 0 && (
                        <span> • Fail rate: {statusData.diagnostics.activation_24h.fail_rate_pct}%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : <p style={{ color: theme.textMuted }}>Click Refresh to check status</p>}
          </div>
        )}
        {tab === "builds" && (
          <>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Add build artifact</h3>
              <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>Record installer URLs and metadata. No file upload—link to where the build is hosted.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500, marginBottom: 12 }}>
                <input type="text" placeholder="Version (e.g. 1.2.0)" value={buildForm.version} onChange={(e) => setBuildForm((f) => ({ ...f, version: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <select value={buildForm.platform} onChange={(e) => setBuildForm((f) => ({ ...f, platform: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                  <option value="windows">Windows</option>
                  <option value="macos">macOS</option>
                  <option value="linux">Linux</option>
                </select>
                <input type="text" placeholder="Download URL" value={buildForm.url} onChange={(e) => setBuildForm((f) => ({ ...f, url: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <input type="text" placeholder="File size (bytes, optional)" value={buildForm.fileSize} onChange={(e) => setBuildForm((f) => ({ ...f, fileSize: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <input type="text" placeholder="SHA256 checksum (optional)" value={buildForm.checksum} onChange={(e) => setBuildForm((f) => ({ ...f, checksum: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <button type="button" onClick={addBuildArtifact} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Add</button>
                {buildStatus && <span style={{ fontSize: 13 }}>{buildStatus}</span>}
              </div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Build artifacts</h3>
              <button type="button" onClick={loadBuilds} style={{ marginBottom: 12, padding: "8px 16px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer" }}>Refresh</button>
              {buildArtifacts.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><th style={tableHeader}>Version</th><th style={tableHeader}>Platform</th><th style={tableHeader}>URL</th><th style={tableHeader}>Rollout</th><th style={tableHeader}>Current</th><th style={tableHeader}>Created</th></tr></thead>
                  <tbody>
                    {buildArtifacts.map((a) => (
                      <tr key={a.id}>
                        <td style={tableCell}>{a.version}</td>
                        <td style={tableCell}>{a.platform}</td>
                        <td style={tableCell}><a href={a.url} target="_blank" rel="noreferrer" style={{ color: theme.accentGold }}>{a.url?.slice(0, 40)}…</a></td>
                        <td style={tableCell}>{(a as { rollout_pct?: number }).rollout_pct != null ? `${(a as { rollout_pct?: number }).rollout_pct}%` : "100%"}</td>
                        <td style={tableCell}>{a.is_current ? "✓" : <button type="button" onClick={() => a.id && setBuildAsCurrent(a.id)} style={{ padding: "4px 8px", fontSize: 11 }}>Set current</button>}</td>
                        <td style={tableCell}>{a.created_at ? formatDateUSA(new Date(a.created_at)) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: theme.textMuted }}>No build artifacts. Add installer URLs above.</p>}
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Staged rollout (10% → 100%)</h3>
              <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>Set rollout percentage per version. App checks when serving download; 10% = 10% of users get this build first.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
                <input type="text" placeholder="Version" value={rolloutForm.version} onChange={(e) => setRolloutForm((f) => ({ ...f, version: e.target.value }))} style={{ ...inputStyle, width: 100 }} />
                <select value={rolloutForm.platform} onChange={(e) => setRolloutForm((f) => ({ ...f, platform: e.target.value }))} style={inputStyle}>
                  <option value="">All platforms</option>
                  <option value="windows">Windows</option>
                  <option value="macos">macOS</option>
                  <option value="linux">Linux</option>
                </select>
                <select value={rolloutForm.rollout_pct} onChange={(e) => setRolloutForm((f) => ({ ...f, rollout_pct: Number(e.target.value) }))} style={inputStyle}>
                  <option value={10}>10%</option>
                  <option value={25}>25%</option>
                  <option value={50}>50%</option>
                  <option value={75}>75%</option>
                  <option value={100}>100%</option>
                </select>
                <button type="button" onClick={saveRollout} style={btnPrimary}>Set rollout</button>
                {rolloutStatus && <span style={{ fontSize: 13 }}>{rolloutStatus}</span>}
              </div>
              {rolloutRollouts.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {rolloutRollouts.map((r, i) => (
                    <span key={i} style={{ padding: "6px 10px", background: theme.backgroundPage, borderRadius: 6, fontSize: 12 }}>{r.version} / {(r as { platform?: string }).platform || "all"}: {(r as { rollout_pct?: number }).rollout_pct ?? 100}%</span>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        )}
        {tab === "extras" && (
          <>
            <div style={cardStyle}>
              <h3 style={sectionTitle}>In-app announcements</h3>
              <p style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 12 }}>App fetches active announcements from <code style={{ background: theme.backgroundPage, padding: "2px 6px", borderRadius: 4 }}>/announcements-fetch</code> when phoning home.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500, marginBottom: 16 }}>
                <textarea placeholder="Message" value={announcementForm.message} onChange={(e) => setAnnouncementForm((f) => ({ ...f, message: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select value={announcementForm.severity} onChange={(e) => setAnnouncementForm((f) => ({ ...f, severity: e.target.value }))} style={inputStyle}>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <input type="text" placeholder="Expires at (ISO date, optional)" value={announcementForm.expires_at} onChange={(e) => setAnnouncementForm((f) => ({ ...f, expires_at: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                  <button type="button" onClick={addAnnouncement} style={btnPrimary}>Add</button>
                </div>
                {announcementStatus && <span style={{ fontSize: 13 }}>{announcementStatus}</span>}
              </div>
              <button type="button" onClick={loadAnnouncements} style={{ marginBottom: 12, ...btnSecondary }}>Refresh</button>
              {announcements.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {announcements.map((a) => (
                    <div key={a.id} style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <span style={{ fontSize: 11, color: theme.textMuted, marginRight: 8 }}>{a.severity}</span>
                          {a.active === false && <span style={{ fontSize: 11, color: theme.statusError }}>Inactive</span>}
                          <div style={{ fontSize: 13, marginTop: 4 }}>{a.message}</div>
                          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>{a.created_at ? formatDateUSA(new Date(a.created_at)) : ""} {a.expires_at ? `• Expires ${formatDateUSA(new Date(a.expires_at))}` : ""}</div>
                        </div>
                        <button type="button" onClick={() => a.id && toggleAnnouncement(a.id, !a.active)} style={{ padding: "4px 8px", fontSize: 11 }}>{a.active ? "Deactivate" : "Activate"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color: theme.textMuted, fontSize: 12 }}>No announcements. Add one above.</p>}
            </div>
            <div style={cardStyle}>
              <h3 style={sectionTitle}>NPS survey responses</h3>
              <p style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 12 }}>App submits via POST <code style={{ background: theme.backgroundPage, padding: "2px 6px", borderRadius: 4 }}>/nps-submit</code> (score 0–10, optional feedback).</p>
              <button type="button" onClick={loadNps} style={{ marginBottom: 12, ...btnSecondary }}>Refresh</button>
              {npsData?.summary && (
                <div style={{ display: "flex", gap: 24, marginBottom: 16, padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, flexWrap: "wrap" }}>
                  <span><strong>Responses:</strong> {npsData.summary.count}</span>
                  <span><strong>Avg score:</strong> {npsData.summary.avg_score}</span>
                  <span><strong>NPS score:</strong> {npsData.summary.nps_score}</span>
                  <span><strong>Promoters (9–10):</strong> {npsData.summary.promoters}</span>
                  <span><strong>Passives (7–8):</strong> {npsData.summary.passives}</span>
                  <span><strong>Detractors (0–6):</strong> {npsData.summary.detractors}</span>
                </div>
              )}
              {npsData?.responses?.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr><th style={tableHeader}>Score</th><th style={tableHeader}>Last4</th><th style={tableHeader}>Feedback</th><th style={tableHeader}>Date</th></tr></thead>
                  <tbody>
                    {npsData.responses.slice(0, 50).map((r, i) => (
                      <tr key={r.id || i}>
                        <td style={tableCell}>{r.score}</td>
                        <td style={tableCell}>{r.license_key_last4 || "—"}</td>
                        <td style={tableCell}><div style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.feedback || "—"}</div></td>
                        <td style={tableCell}>{r.created_at ? formatDateUSA(new Date(r.created_at)) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: theme.textMuted, fontSize: 12 }}>No NPS responses yet.</p>}
            </div>
            <div style={cardStyle}>
              <h3 style={sectionTitle}>Feature requests</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500, marginBottom: 16 }}>
                <input type="text" placeholder="Title" value={featureRequestForm.title} onChange={(e) => setFeatureRequestForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
                <textarea placeholder="Description (optional)" value={featureRequestForm.description} onChange={(e) => setFeatureRequestForm((f) => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                <button type="button" onClick={addFeatureRequest} style={btnPrimary}>Add</button>
                {featureRequestStatus && <span style={{ fontSize: 13 }}>{featureRequestStatus}</span>}
              </div>
              <button type="button" onClick={loadFeatureRequests} style={{ marginBottom: 12, ...btnSecondary }}>Refresh</button>
              {featureRequests.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {featureRequests.map((fr) => (
                    <div key={fr.id} style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <strong>{fr.title}</strong>
                          {fr.description && <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>{fr.description}</div>}
                          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>{fr.created_at ? formatDateUSA(new Date(fr.created_at)) : ""}</div>
                        </div>
                        <select value={fr.status || "open"} onChange={(e) => fr.id && updateFeatureRequestStatus(fr.id, e.target.value)} style={{ padding: "4px 8px", fontSize: 11 }}>
                          <option value="open">Open</option>
                          <option value="planned">Planned</option>
                          <option value="done">Done</option>
                          <option value="declined">Declined</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color: theme.textMuted, fontSize: 12 }}>No feature requests. Add one above.</p>}
            </div>
            <div style={cardStyle}>
              <h3 style={sectionTitle}>Other</h3>
              <p style={{ fontSize: 12, color: theme.textSecondary }}><strong>Scheduled reports:</strong> Call <code style={{ background: theme.backgroundPage, padding: "2px 6px", borderRadius: 4 }}>/admin-scheduled-report?key=CRON_SECRET&days=7</code>. <strong>Partner codes:</strong> See Partner Codes tab. <strong>Product analytics:</strong> Table <code>app_events</code> ready when app sends events.</p>
            </div>
          </>
        )}
        {tab === "partners" && (
          <>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Add partner code</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <input type="text" placeholder="Code *" value={partnerForm.code} onChange={(e) => setPartnerForm((f) => ({ ...f, code: e.target.value }))} style={{ padding: "8px 12px", width: 140, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <input type="text" placeholder="Name (optional)" value={partnerForm.name} onChange={(e) => setPartnerForm((f) => ({ ...f, name: e.target.value }))} style={{ padding: "8px 12px", width: 180, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <select value={partnerForm.type} onChange={(e) => setPartnerForm((f) => ({ ...f, type: e.target.value }))} style={{ padding: "8px 12px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                  <option value="referral">Referral</option>
                  <option value="influencer">Influencer</option>
                  <option value="attorney">Attorney</option>
                  <option value="planner">Planner</option>
                  <option value="other">Other</option>
                </select>
                <button type="button" onClick={addPartnerCode} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Add</button>
                {partnerStatus && <span style={{ fontSize: 13 }}>{partnerStatus}</span>}
              </div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Partner codes</h3>
              <button type="button" onClick={loadPartnerCodes} style={{ marginBottom: 12, padding: "8px 16px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer" }}>Refresh</button>
              {partnerCodes.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><th style={tableHeader}>Code</th><th style={tableHeader}>Name</th><th style={tableHeader}>Type</th><th style={tableHeader}>Created</th></tr></thead>
                  <tbody>
                    {partnerCodes.map((p) => (
                      <tr key={p.id}><td style={tableCell}>{p.code}</td><td style={tableCell}>{p.name ?? "—"}</td><td style={tableCell}>{p.type ?? "referral"}</td><td style={tableCell}>{p.created_at ? formatDateUSA(new Date(p.created_at)) : ""}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: theme.textMuted }}>No partner codes. Add codes for planners, attorneys, referral partners.</p>}
            </div>
          </>
        )}
        {tab === "orders" && (
          <>
            {fraudSignals && (
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Fraud signals (30d)</h3>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
                  {fraudSignals.openDisputesCount != null && fraudSignals.openDisputesCount > 0 && (
                    <span style={{ color: theme.statusError }}>Open disputes: {fraudSignals.openDisputesCount}</span>
                  )}
                  {fraudSignals.duplicatePurchases?.length ? (
                    <span>Duplicate purchases: {fraudSignals.duplicatePurchases.map((x) => `${x.email} (${x.count})`).join(", ")}</span>
                  ) : null}
                  {fraudSignals.chargebacksByDomain?.length ? (
                    <span>Chargebacks by domain: {fraudSignals.chargebacksByDomain.map((x) => `${x.domain} (${x.count})`).join(", ")}</span>
                  ) : null}
                  {fraudSignals.manyTrialsByDomain?.length ? (
                    <span>Many trials/domain: {fraudSignals.manyTrialsByDomain.slice(0, 3).map((x) => `${x.domain} (${x.count})`).join(", ")}</span>
                  ) : null}
                  {fraudSignals.highBounceDomains?.length ? (
                    <span>High bounce: {fraudSignals.highBounceDomains.slice(0, 3).map((x) => `${x.domain} (${x.count})`).join(", ")}</span>
                  ) : null}
                  {(!fraudSignals.duplicatePurchases?.length && !fraudSignals.chargebacksByDomain?.length && !fraudSignals.openDisputesCount) && <span style={{ color: theme.textMuted }}>No notable fraud signals</span>}
                </div>
              </div>
            )}
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Orders</h3>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
                <label style={{ color: theme.textSecondary, fontSize: 13 }}>From <input type="date" value={ordersDateFrom} onChange={(e) => setOrdersDateFrom(e.target.value)} style={{ marginLeft: 6, padding: "8px 10px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary }} /></label>
                <label style={{ color: theme.textSecondary, fontSize: 13 }}>To <input type="date" value={ordersDateTo} onChange={(e) => setOrdersDateTo(e.target.value)} style={{ marginLeft: 6, padding: "8px 10px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary }} /></label>
                <select value={ordersStatus} onChange={(e) => setOrdersStatus(e.target.value)} style={{ padding: "8px 10px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary }}>
                  <option value="">All statuses</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <input type="text" placeholder="State" value={ordersState} onChange={(e) => setOrdersState(e.target.value)} style={{ padding: "8px 10px", width: 80, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary }} />
                <label style={{ color: theme.textSecondary, fontSize: 13 }}>Refunded <select value={ordersRefunded === null ? "" : ordersRefunded ? "true" : "false"} onChange={(e) => { const v = e.target.value; setOrdersRefunded(v === "" ? null : v === "true"); }} style={{ marginLeft: 6, padding: "8px 10px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary }}><option value="">Any</option><option value="true">Yes</option><option value="false">No</option></select></label>
                <button type="button" onClick={loadOrders} disabled={loading === "orders"} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Load</button>
                {ordersData?.orders?.length ? (
                  <button type="button" onClick={exportOrdersCsv} style={{ padding: "8px 16px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer" }}>Export CSV</button>
                ) : null}
              </div>
              {ordersData?.orders?.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={tableHeader}>Date</th>
                      <th style={tableHeader}>Session</th>
                      <th style={tableHeader}>Email</th>
                      <th style={tableHeader}>Product</th>
                      <th style={tableHeader}>Total</th>
                      <th style={tableHeader}>Refunded</th>
                      <th style={tableHeader}>State</th>
                      <th style={tableHeader}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ordersData.orders as { id?: string; created_at?: string; session_id?: string; customer_email?: string; product?: string; amount_cents?: number; amount_refunded_cents?: number; refunded_at?: string; customer_state?: string; status?: string }[]).map((o, i) => (
                      <React.Fragment key={i}>
                        <tr style={{ cursor: "pointer", background: selectedOrderId === o.id ? "rgba(255,255,255,0.05)" : undefined }} onClick={() => { setSelectedOrderId(o.id || null); if (o.id) loadRefundRequests(o.id); }}>
                          <td style={tableCell}>{o.created_at ? formatDateUSA(new Date(o.created_at)) : ""}</td>
                          <td style={tableCell}>{o.session_id ?? ""}</td>
                          <td style={tableCell}>{o.customer_email ?? ""}</td>
                          <td style={tableCell}>{o.product ?? ""}</td>
                          <td style={tableCell}>${((o.amount_cents ?? 0) / 100).toFixed(2)}</td>
                          <td style={tableCell}>{o.refunded_at ? `$${((o.amount_refunded_cents ?? 0) / 100).toFixed(2)}` : "—"}</td>
                          <td style={tableCell}>{o.customer_state ?? ""}</td>
                          <td style={tableCell}>{o.status ?? ""}</td>
                        </tr>
                        {selectedOrderId === o.id && (
                          <tr><td colSpan={8} style={{ ...tableCell, padding: 16, background: theme.backgroundPage }}>
                            <div style={{ marginBottom: 12 }}>
                              <strong>Refund workflow</strong>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                                <select value={refundReason} onChange={(e) => setRefundReason(e.target.value)} style={{ padding: "6px 10px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                                  <option value="">Reason</option>
                                  <option value="did_not_work">Did not work</option>
                                  <option value="expected_cloud_sync">Expected cloud sync</option>
                                  <option value="confused_by_activation">Confused by activation</option>
                                  <option value="duplicate_purchase">Duplicate purchase</option>
                                  <option value="other">Other</option>
                                </select>
                                <select value={refundResolution} onChange={(e) => setRefundResolution(e.target.value)} style={{ padding: "6px 10px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }}>
                                  <option value="">Resolution</option>
                                  <option value="refund_approved">Refund approved</option>
                                  <option value="refund_denied">Refund denied</option>
                                  <option value="replacement_license_issued">Replacement license issued</option>
                                </select>
                                <input type="text" placeholder="Notes" value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)} style={{ padding: "6px 10px", minWidth: 160, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                                <button type="button" onClick={submitRefundRequest} style={{ padding: "6px 12px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12 }}>Save</button>
                                {refundSubmitStatus && <span style={{ fontSize: 12 }}>{refundSubmitStatus}</span>}
                              </div>
                              {refundRequests.length ? <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 8 }}>Previous: {refundRequests.map((r) => `${r.reason_category} → ${r.resolution}`).join("; ")}</div> : null}
                            </div>
                            <div>
                              <button type="button" onClick={() => o.id && downloadChargebackPacket(o.id, o.session_id)} style={{ padding: "6px 12px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12 }}>Export chargeback packet</button>
                            </div>
                          </td></tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              ) : ordersData ? <p style={{ color: theme.textSecondary }}>No orders in range</p> : null}
            {!ordersData && !loading && <p style={{ color: theme.textMuted }}>Set date range and click Load</p>}
            </div>
          </>
        )}
        {tab === "webhooks" && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Failed webhooks</h3>
            {webhooks?.webhooks?.length ? <pre style={{ fontSize: 12, color: theme.textSecondary }}>{JSON.stringify(webhooks.webhooks, null, 2)}</pre> : <p style={{ color: theme.statusSuccess }}>No failed webhooks</p>}
          </div>
        )}
        {tab === "texas" && (
          <>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Texas sales tax – filter by period</h3>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
                <label style={{ color: theme.textSecondary, fontSize: 13 }}>
                  Start <input type="date" value={txPeriodStart} onChange={(e) => setTxPeriodStart(e.target.value)} style={{ marginLeft: 6, padding: "8px 10px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary }} />
                </label>
                <label style={{ color: theme.textSecondary, fontSize: 13 }}>
                  End <input type="date" value={txPeriodEnd} onChange={(e) => setTxPeriodEnd(e.target.value)} style={{ marginLeft: 6, padding: "8px 10px", background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary }} />
                </label>
                <button type="button" onClick={loadTexasFiling} disabled={loading === "texas"} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Load TX orders</button>
                {txData?.transactions?.length ? (
                  <button type="button" onClick={exportTexasCsv} style={{ padding: "8px 16px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer" }}>Export CSV</button>
                ) : null}
              </div>
              {txData?.summary && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                  <div style={{ padding: "12px 16px", background: theme.background, borderRadius: theme.radiusButton }}>
                    <div style={{ color: theme.textMuted, fontSize: 12 }}>Gross sales</div>
                    <div style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 600 }}>${((txData.summary.gross_sales_cents ?? 0) / 100).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: "12px 16px", background: theme.background, borderRadius: theme.radiusButton }}>
                    <div style={{ color: theme.textMuted, fontSize: 12 }}>Tax collected</div>
                    <div style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 600 }}>${((txData.summary.tax_collected_cents ?? 0) / 100).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: "12px 16px", background: theme.background, borderRadius: theme.radiusButton }}>
                    <div style={{ color: theme.textMuted, fontSize: 12 }}>Tax refunded</div>
                    <div style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 600 }}>${((txData.summary.tax_refunded_cents ?? 0) / 100).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: "12px 16px", background: theme.background, borderRadius: theme.radiusButton }}>
                    <div style={{ color: theme.textMuted, fontSize: 12 }}>Net tax due</div>
                    <div style={{ color: theme.accentGold, fontSize: 18, fontWeight: 600 }}>${((txData.summary.net_tax_due_cents ?? 0) / 100).toFixed(2)}</div>
                  </div>
                </div>
              )}
              {txData?.transactions?.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={tableHeader}>Date</th>
                      <th style={tableHeader}>Session</th>
                      <th style={tableHeader}>Email</th>
                      <th style={tableHeader}>State</th>
                      <th style={tableHeader}>ZIP</th>
                      <th style={tableHeader}>Subtotal</th>
                      <th style={tableHeader}>Tax</th>
                      <th style={tableHeader}>Total</th>
                      <th style={tableHeader}>Refunded</th>
                      <th style={tableHeader}>Tax refunded</th>
                      <th style={tableHeader}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(txData.transactions as { created_at?: string; session_id?: string; customer_email?: string; customer_state?: string; customer_postal_code?: string; amount_subtotal_cents?: number; amount_tax_cents?: number; amount_cents?: number; amount_refunded_cents?: number; tax_refunded_cents?: number; status?: string }[]).map((t, i) => (
                      <tr key={i}>
                        <td style={tableCell}>{t.created_at ? formatDateUSA(new Date(t.created_at)) : ""}</td>
                        <td style={tableCell}>{t.session_id ?? ""}</td>
                        <td style={tableCell}>{t.customer_email ?? ""}</td>
                        <td style={tableCell}>{t.customer_state ?? ""}</td>
                        <td style={tableCell}>{t.customer_postal_code ?? ""}</td>
                        <td style={tableCell}>${((t.amount_subtotal_cents ?? 0) / 100).toFixed(2)}</td>
                        <td style={tableCell}>${((t.amount_tax_cents ?? 0) / 100).toFixed(2)}</td>
                        <td style={tableCell}>${((t.amount_cents ?? 0) / 100).toFixed(2)}</td>
                        <td style={tableCell}>${((t.amount_refunded_cents ?? 0) / 100).toFixed(2)}</td>
                        <td style={tableCell}>${((t.tax_refunded_cents ?? 0) / 100).toFixed(2)}</td>
                        <td style={tableCell}>{t.status ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : txData && <p style={{ color: theme.textSecondary }}>No TX orders in this period</p>}
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Record filing (save confirmation)</h3>
              <p style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>Use the same period as above. Saves gross sales, tax collected/refunded, net tax due, and your confirmation number.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <input type="text" placeholder="Confirmation number" value={txConfirmation} onChange={(e) => setTxConfirmation(e.target.value)} style={{ padding: "8px 12px", width: 200, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary }} />
                <input type="text" placeholder="Notes (optional)" value={txNotes} onChange={(e) => setTxNotes(e.target.value)} style={{ padding: "8px 12px", flex: 1, minWidth: 160, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.textPrimary }} />
                <button type="button" onClick={recordTexasFiling} disabled={loading === "texas-record" || !txPeriodStart || !txPeriodEnd} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>{loading === "texas-record" ? "Saving…" : "Save filing"}</button>
              </div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Filing log</h3>
              {txLog.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={tableHeader}>Period</th>
                      <th style={tableHeader}>Filed at</th>
                      <th style={tableHeader}>Gross sales</th>
                      <th style={tableHeader}>Tax collected</th>
                      <th style={tableHeader}>Tax refunded</th>
                      <th style={tableHeader}>Net tax due</th>
                      <th style={tableHeader}>Confirmation</th>
                      <th style={tableHeader}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(txLog as { period_start?: string; period_end?: string; filed_at?: string; gross_sales_cents?: number; tax_collected_cents?: number; tax_refunded_cents?: number; net_tax_due_cents?: number; confirmation_number?: string; notes?: string }[]).map((f, i) => (
                      <tr key={i}>
                        <td style={tableCell}>{f.period_start} – {f.period_end}</td>
                        <td style={tableCell}>{f.filed_at ? formatDateTimeUSA(new Date(f.filed_at)) : ""}</td>
                        <td style={tableCell}>${((f.gross_sales_cents ?? 0) / 100).toFixed(2)}</td>
                        <td style={tableCell}>${((f.tax_collected_cents ?? 0) / 100).toFixed(2)}</td>
                        <td style={tableCell}>${((f.tax_refunded_cents ?? 0) / 100).toFixed(2)}</td>
                        <td style={tableCell}>${((f.net_tax_due_cents ?? 0) / 100).toFixed(2)}</td>
                        <td style={tableCell}>{f.confirmation_number ?? ""}</td>
                        <td style={tableCell}>{f.notes ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : loading === "texas-log" ? <p style={{ color: theme.textSecondary }}>Loading…</p> : <p style={{ color: theme.textSecondary }}>No filings recorded yet</p>}
            </div>
          </>
        )}
        {tab === "release" && (
          <ReleaseDistributionForm />
        )}
        {tab === "releaseNotes" && (
          <>
            <div style={cardStyle}>
              <h3 style={sectionTitle}>Add release note</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 500, marginBottom: 16 }}>
                <input type="text" placeholder="Version (e.g. 1.2.0)" value={releaseNoteForm.version} onChange={(e) => setReleaseNoteForm((f) => ({ ...f, version: e.target.value }))} style={inputStyle} />
                <textarea placeholder="What changed (for support)" value={releaseNoteForm.notes} onChange={(e) => setReleaseNoteForm((f) => ({ ...f, notes: e.target.value }))} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                <button type="button" onClick={addReleaseNote} style={btnPrimary}>Add</button>
                {releaseNoteStatus && <span style={{ fontSize: 13 }}>{releaseNoteStatus}</span>}
              </div>
            </div>
            <div style={cardStyle}>
              <h3 style={sectionTitle}>Release notes</h3>
              <button type="button" onClick={loadReleaseNotes} style={{ marginBottom: 12, ...btnSecondary }}>Refresh</button>
              {releaseNotesList.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><th style={tableHeader}>Version</th><th style={tableHeader}>Notes</th><th style={tableHeader}>Current</th><th style={tableHeader}>Created</th></tr></thead>
                  <tbody>
                    {releaseNotesList.map((n) => (
                      <tr key={n.id}>
                        <td style={tableCell}>{n.version}</td>
                        <td style={tableCell}><div style={{ maxWidth: 400, whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.notes || "—"}</div></td>
                        <td style={tableCell}>{n.is_current ? "✓" : <button type="button" onClick={() => n.id && setReleaseNoteCurrent(n.id)} style={{ padding: "4px 8px", fontSize: 12 }}>Set current</button>}</td>
                        <td style={tableCell}>{n.created_at ? formatDateUSA(new Date(n.created_at)) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: theme.textMuted }}>No release notes. Add a version above.</p>}
            </div>
          </>
        )}
        {tab === "downloads" && (
          <>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Download health</h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button type="button" onClick={loadDownloadHealth} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, fontWeight: 600, cursor: "pointer" }}>Probe URLs</button>
              </div>
              {downloadHealth?.probes?.length ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><th style={tableHeader}>Platform</th><th style={tableHeader}>URL</th><th style={tableHeader}>Status</th><th style={tableHeader}>Response time</th><th style={tableHeader}>Size</th></tr></thead>
                  <tbody>
                    {downloadHealth.probes.map((p, i) => (
                      <tr key={i}>
                        <td style={tableCell}>{p.platform}</td>
                        <td style={{ ...tableCell, fontSize: 11 }}>{p.url}</td>
                        <td style={{ ...tableCell, color: p.ok ? theme.statusSuccess : theme.statusError }}>{p.status || "—"}</td>
                        <td style={tableCell}>{p.responseTimeMs != null ? `${p.responseTimeMs}ms` : "—"}</td>
                        <td style={tableCell}>{p.contentLength != null ? `${(p.contentLength / 1024 / 1024).toFixed(2)} MB` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: theme.textMuted }}>Click Probe URLs to check</p>}
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Email deliverability</h3>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ padding: "12px 16px", background: theme.backgroundPage, borderRadius: theme.radiusInput, minWidth: 100 }}>
                  <div style={{ color: theme.textMuted, fontSize: 12 }}>Bounce rate</div>
                  <div style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 600 }}>{emailDeliverability?.bounceRate ?? "—"}%</div>
                </div>
                <div style={{ padding: "12px 16px", background: theme.backgroundPage, borderRadius: theme.radiusInput, minWidth: 100 }}>
                  <div style={{ color: theme.textMuted, fontSize: 12 }}>Delivered</div>
                  <div style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 600 }}>{emailDeliverability?.delivered ?? "—"}</div>
                </div>
                <div style={{ padding: "12px 16px", background: theme.backgroundPage, borderRadius: theme.radiusInput, minWidth: 100 }}>
                  <div style={{ color: theme.textMuted, fontSize: 12 }}>Bounces</div>
                  <div style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 600 }}>{emailDeliverability?.bounces ?? "—"}</div>
                </div>
              </div>
              {emailDeliverability?.topBounceDomains?.length ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>Top bounce domains</div>
                  <div style={{ fontSize: 13 }}>{emailDeliverability.topBounceDomains.map((d) => `${d.domain} (${d.count})`).join(", ")}</div>
                </div>
              ) : null}
              {emailDeliverability?.topFailingProviders?.length ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>Top failing providers (Gmail, Outlook, etc.)</div>
                  <div style={{ fontSize: 13 }}>{emailDeliverability.topFailingProviders.map((p) => `${p.provider} (${p.count})`).join(", ")}</div>
                </div>
              ) : null}
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Email send logs</h3>
              <button type="button" onClick={loadEmailLogs} style={{ marginBottom: 12, padding: "8px 16px", background: theme.backgroundCard, color: theme.accentGold, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusButton, cursor: "pointer" }}>Refresh</button>
              {emailLogs.length ? (
                <div style={{ maxHeight: 240, overflowY: "auto", fontSize: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={tableHeader}>Type</th><th style={tableHeader}>Recipient</th><th style={tableHeader}>Template / Event</th><th style={tableHeader}>Status</th><th style={tableHeader}>At</th></tr></thead>
                    <tbody>
                      {emailLogs.slice(0, 50).map((l, i) => (
                        <tr key={i}>
                          <td style={tableCell}>{l.type}</td>
                          <td style={tableCell}>{l.recipient || l.email}</td>
                          <td style={tableCell}>{l.template || l.event_type}</td>
                          <td style={tableCell}>{l.status ?? "—"}</td>
                          <td style={tableCell}>{l.at ? formatDateTimeUSA(new Date(l.at)) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p style={{ color: theme.textMuted }}>No logs</p>}
            </div>
            <div style={cardStyle}>
              <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Suppression list</h3>
              <p style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>Manually block emails from receiving messages. Local override to Brevo.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <input type="email" placeholder="email@example.com" value={suppressionAdd} onChange={(e) => { setSuppressionAdd(e.target.value); setSuppressionStatus(null); }} style={{ padding: "8px 12px", minWidth: 200, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <input type="text" placeholder="Reason (optional)" value={suppressionReason} onChange={(e) => setSuppressionReason(e.target.value)} style={{ padding: "8px 12px", minWidth: 120, background: theme.inputBackground, border: `1px solid ${theme.inputBorder}`, borderRadius: theme.radiusInput, color: theme.inputText }} />
                <button type="button" onClick={addSuppressionEmail} style={{ padding: "8px 16px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, cursor: "pointer", fontWeight: 600 }}>Add</button>
                {suppressionStatus && <span style={{ fontSize: 13 }}>{suppressionStatus}</span>}
              </div>
              {suppressionEmails.length ? (
                <div style={{ fontSize: 13 }}>
                  {suppressionEmails.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span>{s.email}</span>
                      {s.reason && <span style={{ color: theme.textMuted, fontSize: 12 }}>({s.reason})</span>}
                      <button type="button" onClick={() => s.email && removeSuppressionEmail(s.email)} style={{ padding: "4px 8px", fontSize: 11, background: theme.backgroundCard, color: theme.statusError, border: "none", borderRadius: 4, cursor: "pointer" }}>Remove</button>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color: theme.textMuted }}>No suppressed emails</p>}
            </div>
          </>
        )}
        {tab === "emails" && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.accentGold, marginBottom: 12 }}>Update email HTML templates</h3>
            <p style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 16 }}>How templates are loaded: if <code style={{ background: theme.backgroundPage, padding: "2px 6px", borderRadius: 4 }}>EMAIL_TEMPLATES_BASE_URL</code> is set in Supabase, the function fetches from that URL. Otherwise it uses bundled templates in the function.</p>
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ color: theme.textPrimary, fontSize: 14, marginBottom: 8 }}>Option A: URL-based (no function deploy for template changes)</h4>
              <ol style={{ margin: 0, paddingLeft: 20, color: theme.textSecondary, fontSize: 13, lineHeight: 1.8 }}>
                <li>Edit the HTML files on the site at the path your base URL points to (e.g. <code style={{ background: theme.backgroundPage, padding: "2px 4px" }}>public_html/emails/trial-welcome.html</code>).</li>
                <li>Upload the updated files to the server (FTP, Git deploy, etc.).</li>
                <li>No function deploy needed—the next email send fetches the new templates from the URL.</li>
              </ol>
            </div>
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ color: theme.textPrimary, fontSize: 14, marginBottom: 8 }}>Option B: Bundled (default)</h4>
              <ol style={{ margin: 0, paddingLeft: 20, color: theme.textSecondary, fontSize: 13, lineHeight: 1.8 }}>
                <li>Edit files in <code style={{ background: theme.backgroundPage, padding: "2px 4px" }}>supabase/functions/send-email/templates/</code> (e.g. <code style={{ background: theme.backgroundPage, padding: "2px 4px" }}>trial-welcome.html</code>).</li>
                <li>Deploy: <code style={{ background: theme.backgroundPage, padding: "4px 8px", borderRadius: 4 }}>supabase functions deploy send-email</code></li>
                <li>Commit and push the repo.</li>
              </ol>
            </div>
            <div style={{ padding: 12, background: theme.backgroundPage, borderRadius: theme.radiusInput, border: `1px solid ${theme.borderSubtle}` }}>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>Deploy command (copy)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <code style={{ flex: 1, minWidth: 200, padding: "8px 10px", background: theme.background, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusInput, fontSize: 13, color: theme.textPrimary }}>supabase functions deploy send-email</code>
                <button type="button" onClick={() => navigator.clipboard.writeText("supabase functions deploy send-email")} style={{ padding: "6px 12px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Copy</button>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: theme.textMuted }}>
              Templates: trial-welcome, purchase-confirmation, trial-expiring-24h, trial-expiring-1h, trial-expired, password-reset, license-transfer, executor-access, support-response, app-update, inactivity-warning. Use <code style={{ background: theme.backgroundPage, padding: "1px 4px" }}>{"{{variable}}"}</code> for placeholders.
            </div>
          </div>
        )}
        {tab === "scripts" && (
          <>
            <div style={cardStyle}>
              <h3 style={{ ...sectionTitle, marginBottom: 12 }}>Quick commands</h3>
              <p style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 16 }}>Copy and run in your terminal (PowerShell or CMD). Run from project root unless noted.</p>
              {[
                { label: "Go to home (from anywhere)", cmd: "cd C:\\Users\\kelly", note: "CMD from another drive: cd /d C:\\Users\\kelly" },
                { label: "Go to project from home", cmd: "cd OneDrive\\Desktop\\Vault-Main\\LocalLegacyVault", note: "Full: cd C:\\Users\\kelly\\OneDrive\\Desktop\\Vault-Main\\LocalLegacyVault" },
                { label: "Build", cmd: "npm run build", note: "" },
                { label: "Vite dev (app + Electron)", cmd: "npm run dev", note: "" },
                { label: "Vite only", cmd: "npm run dev:vite", note: "" },
                { label: "Restore last good commit", cmd: "git reset --hard HEAD~1", note: "Danger: discards last commit and uncommitted changes. Use only when sure." },
                { label: "See last commit (before reset)", cmd: "git log -1 --oneline", note: "" },
                { label: "Pull latest", cmd: "git pull", note: "" },
                { label: "Status", cmd: "git status", note: "" },
              ].map(({ label, cmd, note }, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 4 }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <code style={{ flex: 1, minWidth: 200, padding: "8px 10px", background: theme.backgroundPage, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusInput, fontSize: 13, color: theme.textPrimary }}>{cmd}</code>
                    <button type="button" onClick={() => navigator.clipboard.writeText(cmd)} style={{ padding: "6px 12px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Copy</button>
                  </div>
                  {note ? <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{note}</div> : null}
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <h3 style={{ ...sectionTitle, marginBottom: 12 }}>Supabase SQL</h3>
              <p style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 16 }}>Copy and run in Supabase → SQL Editor. Edit placeholders (e.g. email, last4) before running.</p>
              {[
                { label: "Find licenses by email", sql: "SELECT license_key_last4, status, product, plan_type, customer_email, activated_at, created_at\nFROM licenses\nWHERE customer_email ILIKE '%you@example.com%'\nORDER BY created_at DESC\nLIMIT 100;" },
                { label: "Find licenses by last 4 of key", sql: "SELECT license_key_last4, status, product, plan_type, customer_email, activated_at, created_at\nFROM licenses\nWHERE license_key_last4 = 'ABCD'\nORDER BY created_at DESC;" },
                { label: "Recent licenses (all, sorted)", sql: "SELECT license_key_last4, status, product, plan_type, customer_email, activated_at, created_at\nFROM licenses\nORDER BY created_at DESC\nLIMIT 100;" },
                { label: "Count licenses by product / plan", sql: "SELECT product, plan_type, COUNT(*) AS cnt\nFROM licenses\nWHERE status = 'active'\nGROUP BY product, plan_type\nORDER BY cnt DESC;" },
                { label: "Activation rate (active licenses)", sql: "SELECT\n  COUNT(*) FILTER (WHERE device_binding IS NOT NULL) AS activated,\n  COUNT(*) FILTER (WHERE device_binding IS NULL) AS unactivated,\n  COUNT(*) AS total\nFROM licenses\nWHERE status = 'active';" },
                { label: "Recent trials (sorted)", sql: "SELECT trial_key_last4, email, is_active, end_date, expires_at, activated_at, created_at\nFROM trials\nORDER BY created_at DESC\nLIMIT 50;" },
                { label: "Trials expiring in 7 days", sql: "SELECT trial_key_last4, email, end_date, activated_at\nFROM trials\nWHERE is_active = true\n  AND end_date > NOW()\n  AND end_date < NOW() + INTERVAL '7 days'\nORDER BY end_date;" },
                { label: "Find trials by email", sql: "SELECT trial_key_last4, email, is_active, end_date, activated_at, created_at\nFROM trials\nWHERE email ILIKE '%you@example.com%'\nORDER BY created_at DESC;" },
                { label: "Recent purchases (paid, sorted)", sql: "SELECT session_id, product, plan_type, customer_email, amount_cents, currency, status, created_at\nFROM purchases\nWHERE status = 'paid'\nORDER BY created_at DESC\nLIMIT 50;" },
                { label: "Failed activations today", sql: "SELECT key_type, event_type, error_id, error_message, created_at\nFROM activation_events\nWHERE success = false\n  AND created_at >= CURRENT_DATE\nORDER BY created_at DESC\nLIMIT 50;" },
                { label: "Recent admin audit log", sql: "SELECT acted_at, actor_identifier, action, entity_type, entity_id, reason\nFROM admin_audit_log\nORDER BY acted_at DESC\nLIMIT 50;" },
                { label: "Top customers by spend", sql: "SELECT customer_email, customer_name,\n  COUNT(*) AS orders,\n  SUM(amount_cents) AS total_cents\nFROM purchases\nWHERE status = 'paid'\nGROUP BY customer_email, customer_name\nORDER BY total_cents DESC\nLIMIT 20;" },
              ].map(({ label, sql }, i) => (
                <div key={`sql-${i}`} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 4 }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <pre style={{ flex: 1, minWidth: 280, margin: 0, padding: "8px 10px", background: theme.backgroundPage, border: `1px solid ${theme.borderSubtle}`, borderRadius: theme.radiusInput, fontSize: 12, color: theme.textPrimary, whiteSpace: "pre-wrap", overflow: "auto" }}>{sql}</pre>
                    <button type="button" onClick={() => navigator.clipboard.writeText(sql)} style={{ padding: "6px 12px", background: theme.buttonPrimaryBg, color: theme.buttonPrimaryText, border: "none", borderRadius: theme.radiusButton, cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Copy</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
