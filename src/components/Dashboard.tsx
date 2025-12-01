/**
 * Dashboard Component
 * 
 * Overview page with stats, recent activity, and quick actions.
 */

import React, { useMemo } from "react";
import {
  Shield,
  Key,
  Lock,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  ChevronRight,
} from "lucide-react";
import { PasswordEntry, Category } from "../types";
import { CategoryIcon } from "./CategoryIcon";

// Refined color palette
const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  steelBlue400: "#7A9DC7",
  mutedSky: "#93B4D1",
  warmIvory: "#F3F4F6",
};

interface DashboardProps {
  entries: PasswordEntry[];
  categories: Category[];
  onAddEntry: () => void;
  onViewCategory: (categoryId: string) => void;
  onViewEntry: (entry: PasswordEntry) => void;
  onViewWeakPasswords?: () => void;
  onViewReusedPasswords?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  entries,
  categories,
  onAddEntry,
  onViewCategory,
  onViewEntry,
  onViewWeakPasswords,
  onViewReusedPasswords,
}) => {
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

    return {
      totalAccounts,
      categoryCounts,
      weakPasswords,
      strongPasswords,
      recentlyAdded,
      recentlyUpdated,
      reusedPasswords,
    };
  }, [entries]);

  // Get recent entries (last 5)
  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [entries]);

  // Security score (0-100)
  const securityScore = useMemo(() => {
    if (entries.length === 0) return 100;
    
    const strongRatio = stats.strongPasswords / entries.length;
    const weakPenalty = (stats.weakPasswords / entries.length) * 30;
    const reusedPenalty = (stats.reusedPasswords / entries.length) * 20;
    
    return Math.max(0, Math.min(100, Math.round(strongRatio * 100 - weakPenalty - reusedPenalty)));
  }, [entries.length, stats.strongPasswords, stats.weakPasswords, stats.reusedPasswords]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  return (
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Accounts</p>
              <p className="text-3xl font-bold mt-2" style={{ color: colors.warmIvory }}>{stats.totalAccounts}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${colors.steelBlue600}15` }}>
              <Key className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.steelBlue400 }} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
            <span className="text-emerald-400">{stats.recentlyAdded}</span>
            <span className="text-slate-500">added this week</span>
          </div>
        </div>

        {/* Security Score */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Security Score</p>
              <p className={`text-3xl font-bold mt-2 ${getScoreColor(securityScore)}`}>{securityScore}%</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <Lock className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
            <span className={getScoreColor(securityScore)}>{getScoreLabel(securityScore)}</span>
          </div>
        </div>

        {/* Strong Passwords */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Strong Passwords</p>
              <p className="text-3xl font-bold mt-2" style={{ color: colors.warmIvory }}>{stats.strongPasswords}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${colors.mutedSky}15` }}>
              <Lock className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.mutedSky }} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">
              {entries.length > 0 
                ? `${Math.round((stats.strongPasswords / entries.length) * 100)}% of total`
                : "No accounts yet"}
            </span>
          </div>
        </div>

        {/* Weak Passwords */}
        <div 
          className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 transition-all duration-200 ${
            stats.weakPasswords > 0 ? "cursor-pointer hover:border-amber-500/50 hover:bg-slate-800/70" : ""
          }`}
          onClick={stats.weakPasswords > 0 ? onViewWeakPasswords : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Weak Passwords</p>
              <p className={`text-3xl font-bold mt-2 ${stats.weakPasswords > 0 ? "text-amber-400" : ""}`} style={stats.weakPasswords === 0 ? { color: colors.warmIvory } : {}}>
                {stats.weakPasswords}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              stats.weakPasswords > 0 ? "bg-amber-500/10" : "bg-slate-700/50"
            }`}>
              <AlertTriangle className={`w-6 h-6 ${stats.weakPasswords > 0 ? "text-amber-400" : "text-slate-500"}`} strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {stats.weakPasswords > 0 ? (
              <span className="text-amber-400 flex items-center gap-1">
                Click to view & update
                <ChevronRight className="w-3 h-3" strokeWidth={2} />
              </span>
            ) : (
              <span className="text-emerald-400">All passwords are secure!</span>
            )}
          </div>
        </div>

        {/* Reused Passwords */}
        <div 
          className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 transition-all duration-200 ${
            stats.reusedPasswords > 0 ? "cursor-pointer hover:bg-slate-800/70" : ""
          }`}
          style={stats.reusedPasswords > 0 ? { borderColor: 'rgba(201, 174, 102, 0.3)' } : {}}
          onMouseEnter={(e) => stats.reusedPasswords > 0 && (e.currentTarget.style.borderColor = 'rgba(201, 174, 102, 0.5)')}
          onMouseLeave={(e) => stats.reusedPasswords > 0 && (e.currentTarget.style.borderColor = 'rgba(201, 174, 102, 0.3)')}
          onClick={stats.reusedPasswords > 0 ? onViewReusedPasswords : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Reused Passwords</p>
              <p 
                className="text-3xl font-bold mt-2"
                style={stats.reusedPasswords > 0 ? { color: '#C9AE66' } : { color: colors.warmIvory }}
              >
                {stats.reusedPasswords}
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={stats.reusedPasswords > 0 ? { backgroundColor: 'rgba(201, 174, 102, 0.15)' } : { backgroundColor: 'rgb(51 65 85 / 0.5)' }}
            >
              <AlertTriangle 
                className="w-6 h-6" 
                strokeWidth={1.5} 
                style={stats.reusedPasswords > 0 ? { color: '#C9AE66' } : { color: 'rgb(100 116 139)' }}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {stats.reusedPasswords > 0 ? (
              <span style={{ color: '#C9AE66' }} className="flex items-center gap-1">
                Click to view & update
                <ChevronRight className="w-3 h-3" strokeWidth={2} />
              </span>
            ) : (
              <span className="text-emerald-400">All passwords are unique!</span>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Breakdown */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: colors.warmIvory }} className="font-semibold">Categories</h2>
            <button
              onClick={() => onViewCategory("all")}
              className="text-xs transition-colors"
              style={{ color: colors.steelBlue400 }}
              onMouseEnter={(e) => e.currentTarget.style.color = colors.mutedSky}
              onMouseLeave={(e) => e.currentTarget.style.color = colors.steelBlue400}
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {categories.filter(c => c.id !== "all").map((category) => {
              const count = stats.categoryCounts[category.id] || 0;
              const percentage = entries.length > 0 
                ? Math.round((count / entries.length) * 100) 
                : 0;

              return (
                <button
                  key={category.id}
                  onClick={() => onViewCategory(category.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                      <CategoryIcon name={category.icon} size={16} className="text-slate-400" strokeWidth={1.5} />
                    </div>
                    <span style={{ color: colors.warmIvory }} className="text-sm">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: colors.steelBlue500 }}
                      />
                    </div>
                    <span className="text-slate-400 text-sm font-medium w-8 text-right">{count}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" strokeWidth={1.5} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: colors.warmIvory }} className="font-semibold">Recent Activity</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
              Last updated
            </div>
          </div>
          {recentEntries.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Key className="w-6 h-6 text-slate-600" strokeWidth={1.5} />
              </div>
              <p className="text-slate-500 text-sm">No recent activity</p>
              <button
                onClick={onAddEntry}
                className="mt-3 text-sm transition-colors"
                style={{ color: colors.steelBlue400 }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.mutedSky}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.steelBlue400}
              >
                Add your first account
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((entry) => {
                const category = categories.find((c) => c.id === entry.category);
                const timeAgo = getTimeAgo(new Date(entry.updatedAt));

                return (
                  <button
                    key={entry.id}
                    onClick={() => onViewEntry(entry)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                        {category && (
                          <CategoryIcon name={category.icon} size={16} className="text-slate-400" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="text-left">
                        <p style={{ color: colors.warmIvory }} className="text-sm">{entry.accountName}</p>
                        <p className="text-slate-500 text-xs">{entry.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs">{timeAgo}</span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" strokeWidth={1.5} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div 
        className="border rounded-xl p-5"
        style={{ 
          background: `linear-gradient(135deg, ${colors.steelBlue600}10, ${colors.mutedSky}10)`,
          borderColor: `${colors.steelBlue500}30`
        }}
      >
        <div className="flex items-start gap-4">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colors.steelBlue500}25` }}
          >
            <Shield className="w-5 h-5" strokeWidth={1.5} style={{ color: colors.steelBlue400 }} />
          </div>
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
    </div>
  );
};

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

