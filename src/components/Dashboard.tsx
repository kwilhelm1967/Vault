/**
 * Dashboard Component
 * 
 * Overview page with stats, recent activity, and quick actions.
 */

import React, { useMemo, useState } from "react";
import { useRenderTracking } from "../hooks/usePerformance";
import { PerformanceProfiler } from "./PerformanceProfiler";
import {
  Shield,
  Key,
  Lock,
  AlertTriangle,
  TrendingUp,
  Plus,
  ChevronRight,
  CalendarClock,
  Upload,
  X,
} from "lucide-react";
import { PasswordEntry, Category } from "../types";

// Refined color palette
const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  steelBlue400: "#7A9DC7",
  mutedSky: "#93B4D1",
  warmIvory: "#F3F4F6",
  brandGold: "#C9AE66",
};

interface DashboardProps {
  entries: PasswordEntry[];
  categories: Category[];
  onAddEntry: () => void;
  onViewCategory: (categoryId: string) => void;
  onViewEntry: (entry: PasswordEntry) => void;
  onEditEntry: (entry: PasswordEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onViewWeakPasswords?: () => void;
  onViewReusedPasswords?: () => void;
  onImport?: () => void;
}

const DashboardComponent: React.FC<DashboardProps> = ({
  entries,
  categories: _categories,
  onAddEntry,
  onViewCategory,
  onViewEntry: _onViewEntry,
}) => {
  // Track render performance in development
  useRenderTracking('Dashboard');

  // Calculate statistics
  onEditEntry: _onEditEntry,
  onDeleteEntry: _onDeleteEntry,
  onViewWeakPasswords,
  onViewReusedPasswords,
  onImport,
}) => {
  // Suppress unused prop warnings - these are kept for API compatibility
  void _categories; void _onViewEntry; void _onEditEntry; void _onDeleteEntry;
  
  // State for import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Password manager import instructions
  const importProviders = [
    {
      id: 'lastpass',
      name: 'LastPass',
      icon: '🔐',
      steps: [
        'Log in to LastPass web vault at lastpass.com',
        'Click "Advanced Options" in the left sidebar',
        'Select "Export" → "LastPass CSV File"',
        'Enter your master password when prompted',
        'Save the CSV file to your computer',
      ],
    },
    {
      id: '1password',
      name: '1Password',
      icon: '🔑',
      steps: [
        'Open 1Password desktop app',
        'Go to File → Export → All Items',
        'Choose "CSV" as the format',
        'Enter your password to confirm',
        'Save the CSV file to your computer',
      ],
    },
    {
      id: 'chrome',
      name: 'Google Chrome',
      icon: '🌐',
      steps: [
        'Open Chrome and go to Settings',
        'Click "Passwords" (or "Autofill" → "Password Manager")',
        'Click the ⋮ menu next to "Saved Passwords"',
        'Select "Export passwords"',
        'Confirm and save the CSV file',
      ],
    },
    {
      id: 'bitwarden',
      name: 'Bitwarden',
      icon: '🛡️',
      steps: [
        'Log in to Bitwarden web vault',
        'Go to Tools → Export Vault',
        'Select ".csv" as the format',
        'Enter your master password',
        'Download the export file',
      ],
    },
    {
      id: 'dashlane',
      name: 'Dashlane',
      icon: '📱',
      steps: [
        'Open Dashlane desktop app',
        'Go to File → Export → Unsecured archive (CSV)',
        'Enter your master password',
        'Choose a location and save',
        'The CSV will be ready to import',
      ],
    },
    {
      id: 'keeper',
      name: 'Keeper',
      icon: '🏰',
      steps: [
        'Log in to Keeper Web Vault',
        'Click your email → Settings',
        'Go to "Export" section',
        'Select "Export to CSV"',
        'Download and save the file',
      ],
    },
    {
      id: 'other',
      name: 'Other CSV',
      icon: '📄',
      steps: [
        'Open your current password manager',
        'Look for "Export" or "Backup" in Settings',
        'Choose CSV format (not encrypted/proprietary)',
        'Save the file to your computer',
        'The CSV should have columns like: name, username, password, url',
      ],
    },
  ];

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAccounts = entries.length;
    
    // Count by category
    const categoryCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
    });

    // Password strength analysis (simplified)
    let weakPasswords = 0;
    let strongPasswords = 0;
    
    entries.forEach((entry) => {
      const pwd = entry.password;
      const hasUpper = /[A-Z]/.test(pwd);
      const hasLower = /[a-z]/.test(pwd);
      const hasNumber = /[0-9]/.test(pwd);
      const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
      const isLong = pwd.length >= 12;
      
      const strength = [hasUpper, hasLower, hasNumber, hasSymbol, isLong].filter(Boolean).length;
      
      if (strength <= 2) weakPasswords++;
      else if (strength >= 4) strongPasswords++;
    });

    // Recently added (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentlyAdded = entries.filter(
      (e) => new Date(e.createdAt) > weekAgo
    ).length;

    // Recently updated (last 30 days)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const recentlyUpdated = entries.filter(
      (e) => new Date(e.updatedAt) > monthAgo
    ).length;

    // Count reused passwords
    const passwordCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      if (entry.password && entry.entryType !== "secure_note") {
        passwordCounts[entry.password] = (passwordCounts[entry.password] || 0) + 1;
      }
    });
    const reusedPasswords = Object.values(passwordCounts).filter(count => count > 1).reduce((sum, count) => sum + count, 0);

    // Count old passwords (>90 days)
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oldPasswords = entries.filter((entry) => {
      if (entry.entryType === "secure_note") return false;
      const changeDate = entry.passwordChangedAt || entry.createdAt;
      return new Date(changeDate) < ninetyDaysAgo;
    }).length;

    return {
      totalAccounts,
      categoryCounts,
      weakPasswords,
      strongPasswords,
      recentlyAdded,
      recentlyUpdated,
      reusedPasswords,
      oldPasswords,
    };
  }, [entries]);

  // Security score (0-100)
  const securityScore = useMemo(() => {
    if (entries.length === 0) return 100;
    
    const strongRatio = stats.strongPasswords / entries.length;
    const weakPenalty = (stats.weakPasswords / entries.length) * 30;
    const reusedPenalty = (stats.reusedPasswords / entries.length) * 20;
    const oldPenalty = (stats.oldPasswords / entries.length) * 10;
    
    return Math.max(0, Math.min(100, Math.round(strongRatio * 100 - weakPenalty - reusedPenalty - oldPenalty)));
  }, [entries.length, stats.strongPasswords, stats.weakPasswords, stats.reusedPasswords, stats.oldPasswords]);

  // Burnt orange color for warnings
  const burntOrange = "#D97706";
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return ""; // Use inline style with burntOrange
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  return (
    <PerformanceProfiler id="Dashboard">
      <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.warmIvory }}>Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Your password vault overview
          </p>
        </div>
        <button
          onClick={onAddEntry}
          className="px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          style={{ backgroundColor: colors.steelBlue600 }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Add Account
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Accounts */}
        <div className="bouncy-card py-3.5 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Accounts</p>
              <p className="text-[1.625rem] font-bold mt-1" style={{ color: colors.warmIvory }}>{stats.totalAccounts}</p>
            </div>
            <Key className="w-7 h-7" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
            <span className="text-emerald-400">{stats.recentlyAdded}</span>
            <span className="text-slate-500">added this week</span>
          </div>
        </div>

        {/* Security Score */}
        <div className="bouncy-card py-3.5 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Security Score</p>
              <p 
                className={`text-[1.625rem] font-bold mt-1 ${getScoreColor(securityScore)}`}
                style={securityScore < 60 ? { color: burntOrange } : {}}
              >{securityScore}%</p>
            </div>
            <Shield className="w-7 h-7" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <Lock className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
            <span 
              className={getScoreColor(securityScore)}
              style={securityScore < 60 ? { color: burntOrange } : {}}
            >{getScoreLabel(securityScore)}</span>
          </div>
        </div>

        {/* Strong Passwords */}
        <div className="bouncy-card py-3.5 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Strong Passwords</p>
              <p className="text-[1.625rem] font-bold mt-1" style={{ color: colors.warmIvory }}>{stats.strongPasswords}</p>
            </div>
            <Lock className="w-7 h-7" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">
              {entries.length > 0 
                ? `${Math.round((stats.strongPasswords / entries.length) * 100)}% of total`
                : "No accounts yet"}
            </span>
          </div>
        </div>

        {/* Weak Passwords */}
        <div 
          className={`bouncy-card py-3.5 px-4 ${stats.weakPasswords > 0 ? "bouncy-card-clickable" : ""}`}
          style={stats.weakPasswords > 0 ? { borderColor: `${colors.brandGold}60` } : {}}
          onClick={stats.weakPasswords > 0 ? onViewWeakPasswords : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Weak Passwords</p>
              <p className="text-[1.625rem] font-bold mt-1" style={{ color: stats.weakPasswords > 0 ? colors.brandGold : colors.warmIvory }}>
                {stats.weakPasswords}
              </p>
            </div>
            <AlertTriangle className="w-7 h-7" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {stats.weakPasswords > 0 ? (
              <span className="flex items-center gap-1" style={{ color: colors.brandGold }}>
                Click to view & update
                <ChevronRight className="w-3 h-3" strokeWidth={2} />
              </span>
            ) : stats.totalAccounts === 0 ? (
              <span className="text-slate-500">No passwords yet</span>
            ) : (
              <span className="text-emerald-400">All passwords are secure!</span>
            )}
          </div>
        </div>

        {/* Reused Passwords */}
        <div 
          className={`bouncy-card py-3.5 px-4 ${stats.reusedPasswords > 0 ? "bouncy-card-clickable" : ""}`}
          style={stats.reusedPasswords > 0 ? { borderColor: 'rgba(201, 174, 102, 0.4)' } : {}}
          onClick={stats.reusedPasswords > 0 ? onViewReusedPasswords : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Reused Passwords</p>
              <p 
                className="text-[1.625rem] font-bold mt-1"
                style={stats.reusedPasswords > 0 ? { color: '#C9AE66' } : { color: colors.warmIvory }}
              >
                {stats.reusedPasswords}
              </p>
            </div>
            <AlertTriangle className="w-7 h-7" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {stats.reusedPasswords > 0 ? (
              <span style={{ color: '#C9AE66' }} className="flex items-center gap-1">
                Click to view & update
                <ChevronRight className="w-3 h-3" strokeWidth={2} />
              </span>
            ) : stats.totalAccounts === 0 ? (
              <span className="text-slate-500">No passwords yet</span>
            ) : (
              <span className="text-emerald-400">All passwords are unique!</span>
            )}
          </div>
        </div>

        {/* Old Passwords (>90 days) */}
        <div className="bouncy-card py-3.5 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Old Passwords</p>
              <p className={`text-[1.625rem] font-bold mt-1 ${stats.oldPasswords > 0 ? "text-orange-400" : ""}`} style={stats.oldPasswords === 0 ? { color: colors.warmIvory } : {}}>
                {stats.oldPasswords}
              </p>
            </div>
            <CalendarClock className="w-7 h-7" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {stats.oldPasswords > 0 ? (
              <span className="text-orange-400">{stats.oldPasswords} over 90 days old</span>
            ) : stats.totalAccounts === 0 ? (
              <span className="text-slate-500">No passwords yet</span>
            ) : (
              <span className="text-emerald-400">All passwords are fresh!</span>
            )}
          </div>
        </div>

      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={onAddEntry}
          className="bg-slate-800/30 border border-[#5B82B8]/40 rounded-xl p-5 hover:bg-slate-800/50 hover:border-[#5B82B8]/60 transition-all group text-left hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <Plus className="w-7 h-7" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            <div>
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5">Add Account</h3>
              <p className="text-slate-500 text-xs">Store a new password</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onViewCategory("all")}
          className="bg-slate-800/30 border border-[#5B82B8]/40 rounded-xl p-5 hover:bg-slate-800/50 hover:border-[#5B82B8]/60 transition-all group text-left hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <Key className="w-7 h-7" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            <div>
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5">View All Accounts</h3>
              <p className="text-slate-500 text-xs">{entries.length} {entries.length === 1 ? 'account' : 'accounts'} stored</p>
            </div>
          </div>
        </button>

        <button
          onClick={onViewWeakPasswords}
          className="bg-slate-800/30 border border-[#5B82B8]/40 rounded-xl p-5 hover:bg-slate-800/50 hover:border-[#5B82B8]/60 transition-all group text-left hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <Shield className="w-7 h-7" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            <div>
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5">Security Check</h3>
              <p className="text-xs" style={{ color: stats.weakPasswords > 0 ? burntOrange : '#64748B' }}>
                {stats.weakPasswords > 0 ? `${stats.weakPasswords} weak passwords` : 'All passwords secure'}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Security Alerts */}
      {(stats.weakPasswords > 0 || stats.reusedPasswords > 0 || stats.oldPasswords > 0) && (
        <div className="bg-slate-800/30 border border-[#5B82B8]/40 rounded-xl p-5">
          <h2 style={{ color: colors.warmIvory }} className="font-semibold mb-4">Security Alerts</h2>
          <div className="space-y-3">
            {stats.weakPasswords > 0 && (
              <button
                onClick={onViewWeakPasswords}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/30 transition-all group"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5" style={{ color: burntOrange }} strokeWidth={1.5} />
                  <div className="text-left">
                    <p className="text-sm font-medium" style={{ color: burntOrange }}>{stats.weakPasswords} Weak Password{stats.weakPasswords > 1 ? 's' : ''}</p>
                    <p className="text-xs text-slate-500">These passwords are easy to guess</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 transition-colors" style={{ color: burntOrange }} strokeWidth={1.5} />
              </button>
            )}
            
            {stats.reusedPasswords > 0 && (
              <button
                onClick={onViewReusedPasswords}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/30 transition-all group"
                style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                  <div className="text-left">
                    <p className="text-sm text-amber-400 font-medium">{stats.reusedPasswords} Reused Password{stats.reusedPasswords > 1 ? 's' : ''}</p>
                    <p className="text-xs text-slate-500">Using same password on multiple sites</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400/60 group-hover:text-amber-400 transition-colors" strokeWidth={1.5} />
              </button>
            )}
            
            {stats.oldPasswords > 0 && (
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(251, 146, 60, 0.08)', border: '1px solid rgba(251, 146, 60, 0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <CalendarClock className="w-5 h-5 text-orange-400" strokeWidth={1.5} />
                  <div className="text-left">
                    <p className="text-sm text-orange-400 font-medium">{stats.oldPasswords} Old Password{stats.oldPasswords > 1 ? 's' : ''}</p>
                    <p className="text-xs text-slate-500">Haven't been changed in 90+ days</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Getting Started - Only show when no entries */}
      {entries.length === 0 && (
        <div className="bg-slate-800/30 border border-[#5B82B8]/40 rounded-xl p-6 text-center">
          <Key className="w-12 h-12 mx-auto mb-4" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          <h2 style={{ color: colors.warmIvory }} className="font-semibold mb-2">Welcome to Local Password Vault</h2>
          <p className="text-slate-500 text-sm mb-4 max-w-md mx-auto">
            Your passwords are stored locally and encrypted. Start by adding your first account or importing from another password manager.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onAddEntry}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: colors.steelBlue500 }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
            >
              Add First Account
            </button>
            {onImport && (
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
                style={{ 
                  borderColor: colors.steelBlue500,
                  color: colors.steelBlue400
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.steelBlue500}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Import Passwords
              </button>
            )}
          </div>
          {onImport && (
            <p className="text-slate-600 text-xs mt-3">
              Export from LastPass, 1Password, Chrome, etc. as CSV → Import here
            </p>
          )}
        </div>
      )}

      {/* Quick Tips */}
      <div 
        className="border rounded-xl p-5"
        style={{ 
          background: `linear-gradient(135deg, ${colors.steelBlue600}10, ${colors.mutedSky}10)`,
          borderColor: `${colors.steelBlue500}30`
        }}
      >
        <div className="flex items-start gap-4">
          <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          <div>
            <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">Security Tip</h3>
            <p className="text-slate-400 text-sm">
              {stats.weakPasswords > 0 
                ? `You have ${stats.weakPasswords} weak password${stats.weakPasswords > 1 ? 's' : ''}. Consider using the password generator to create stronger, unique passwords for each account.`
                : entries.length === 0
                ? "Start by adding your most important accounts. Use unique, strong passwords for each one."
                : "Great job! Your passwords are strong. Remember to update them periodically for maximum security."}
            </p>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div 
          className="form-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowImportModal(false);
              setSelectedProvider(null);
            }
          }}
        >
          <div 
            className="rounded-xl w-full max-w-md"
            style={{
              backgroundColor: '#1e293b',
              border: `1px solid ${colors.steelBlue500}40`,
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: `1px solid ${colors.steelBlue500}30` }}
            >
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5" strokeWidth={1.5} style={{ color: colors.brandGold }} />
                <h2 style={{ color: colors.warmIvory }} className="font-semibold text-base">Import Passwords</h2>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedProvider(null);
                }}
                aria-label="Close import modal"
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {!selectedProvider ? (
                <>
                  <p className="text-slate-400 text-sm mb-4">
                    Select your password manager:
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {importProviders.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider.id)}
                        className="px-4 py-3 rounded-lg text-left transition-all flex items-center gap-3"
                        style={{
                          backgroundColor: 'rgba(48, 58, 72, 0.6)',
                          border: `1px solid ${colors.steelBlue500}30`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = `${colors.steelBlue500}60`;
                          e.currentTarget.style.backgroundColor = 'rgba(58, 69, 82, 0.8)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = `${colors.steelBlue500}30`;
                          e.currentTarget.style.backgroundColor = 'rgba(48, 58, 72, 0.6)';
                        }}
                      >
                        <span className="text-lg">{provider.icon}</span>
                        <span style={{ color: colors.warmIvory }} className="font-medium text-sm">{provider.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Back button and provider name */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setSelectedProvider(null)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors text-xs"
                    >
                      ←
                    </button>
                    <span>{importProviders.find(p => p.id === selectedProvider)?.icon}</span>
                    <span style={{ color: colors.warmIvory }} className="font-medium text-xs">
                      {importProviders.find(p => p.id === selectedProvider)?.name}
                    </span>
                  </div>

                  {/* Steps - compact */}
                  <div className="space-y-1 mb-3">
                    {importProviders.find(p => p.id === selectedProvider)?.steps.map((step, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                        style={{ backgroundColor: 'rgba(48, 58, 72, 0.4)' }}
                      >
                        <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                          style={{ backgroundColor: colors.steelBlue500, color: 'white' }}
                        >{index + 1}</span>
                        <span className="text-slate-300">{step}</span>
                      </div>
                    ))}
                  </div>

                  {/* Import button */}
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setSelectedProvider(null);
                      onImport?.();
                    }}
                    className="w-full px-3 py-2 rounded text-white text-xs font-medium transition-all"
                    style={{ 
                      background: `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})`,
                    }}
                  >
                    <Upload className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={1.5} />
                    Select CSV File
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </PerformanceProfiler>
  );
};

// Memoize Dashboard to prevent unnecessary re-renders
export const Dashboard = React.memo(DashboardComponent, (prevProps, nextProps) => {
  // Only re-render if entries or categories change
  return (
    prevProps.entries.length === nextProps.entries.length &&
    prevProps.categories.length === nextProps.categories.length &&
    JSON.stringify(prevProps.entries.map(e => e.id).sort()) === 
    JSON.stringify(nextProps.entries.map(e => e.id).sort())
  );
});
