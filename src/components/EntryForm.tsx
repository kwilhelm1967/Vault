import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Eye,
  EyeOff,
  Trash2,
  Save,
  ChevronDown,
  Check,
  Wand2,
  Globe,
  FileText,
  Plus,
  Lock,
  HelpCircle,
  Shield,
  User,
  Key,
  Settings2,
  LockKeyhole,
  StickyNote,
} from "lucide-react";
import { PasswordEntry, Category, CustomField } from "../types";
import { storageService } from "../utils/storage";
import { PasswordGenerator } from "./PasswordGenerator";
import { playSuccessSound } from "../utils/soundEffects";

// Tooltip component
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute left-full ml-2 z-50 px-2.5 py-1.5 text-xs text-white bg-slate-900 border border-slate-700 rounded-lg shadow-xl whitespace-nowrap animate-in fade-in duration-150">
          {text}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-45" />
        </div>
      )}
    </div>
  );
};

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  if (score <= 2) return { score: 1, label: "Weak", color: "#ef4444" };
  if (score <= 4) return { score: 2, label: "Fair", color: "#f97316" };
  if (score <= 5) return { score: 3, label: "Good", color: "#eab308" };
  return { score: 4, label: "Strong", color: "#22c55e" };
};

// Section Header component
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/30">
    <span className="text-slate-400">{icon}</span>
    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
  </div>
);

// Entry templates for common sites
interface EntryTemplate {
  name: string;
  icon: string;
  accountName: string;
  website: string;
  category: string;
  usernameHint: string;
}

// Categories must match FIXED_CATEGORIES: banking, shopping, entertainment, email, work, business, other
const ENTRY_TEMPLATES: EntryTemplate[] = [
  { name: "Google", icon: "🔍", accountName: "Google", website: "google.com", category: "email", usernameHint: "your@gmail.com" },
  { name: "Amazon", icon: "📦", accountName: "Amazon", website: "amazon.com", category: "shopping", usernameHint: "your@email.com" },
  { name: "Netflix", icon: "🎬", accountName: "Netflix", website: "netflix.com", category: "entertainment", usernameHint: "your@email.com" },
  { name: "Facebook", icon: "👥", accountName: "Facebook", website: "facebook.com", category: "other", usernameHint: "your@email.com" },
  { name: "Twitter/X", icon: "🐦", accountName: "Twitter", website: "x.com", category: "other", usernameHint: "@username" },
  { name: "LinkedIn", icon: "💼", accountName: "LinkedIn", website: "linkedin.com", category: "work", usernameHint: "your@email.com" },
  { name: "GitHub", icon: "💻", accountName: "GitHub", website: "github.com", category: "work", usernameHint: "username" },
  { name: "Apple ID", icon: "🍎", accountName: "Apple ID", website: "apple.com", category: "other", usernameHint: "your@icloud.com" },
  { name: "Microsoft", icon: "🪟", accountName: "Microsoft", website: "microsoft.com", category: "work", usernameHint: "your@outlook.com" },
  { name: "PayPal", icon: "💳", accountName: "PayPal", website: "paypal.com", category: "banking", usernameHint: "your@email.com" },
  { name: "Bank Account", icon: "🏦", accountName: "Bank", website: "", category: "banking", usernameHint: "account number" },
  { name: "Spotify", icon: "🎵", accountName: "Spotify", website: "spotify.com", category: "entertainment", usernameHint: "your@email.com" },
  { name: "Discord", icon: "🎮", accountName: "Discord", website: "discord.com", category: "entertainment", usernameHint: "username#0000" },
  { name: "Instagram", icon: "📷", accountName: "Instagram", website: "instagram.com", category: "other", usernameHint: "@username" },
  { name: "Reddit", icon: "🤖", accountName: "Reddit", website: "reddit.com", category: "other", usernameHint: "u/username" },
];

interface EntryFormProps {
  entry?: PasswordEntry | null;
  categories: Category[];
  allEntries?: PasswordEntry[];
  onSubmit: (
    data: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({
  entry,
  categories,
  allEntries = [],
  onSubmit,
  onCancel,
  onDelete,
}) => {
  const [entryType, setEntryType] = useState<"password" | "secure_note">(entry?.entryType || "password");
  const [formData, setFormData] = useState({
    accountName: entry?.accountName || "",
    username: entry?.username || "",
    password: entry?.password || "",
    website: entry?.website || "",
    notes: entry?.notes || "",
    balance: entry?.balance || "",
    category: entry?.category || "",
    totpSecret: entry?.totpSecret || "",
  });
  const [customFields, setCustomFields] = useState<CustomField[]>(entry?.customFields || []);
  const [visibleSecretFields, setVisibleSecretFields] = useState<Set<string>>(new Set());
  
  const isSecureNote = entryType === "secure_note";
  
  // Password strength
  const passwordStrength = useMemo(() => calculatePasswordStrength(formData.password), [formData.password]);
  
  // Custom field handlers
  const addCustomField = () => {
    const newField: CustomField = {
      id: crypto.randomUUID(),
      label: "",
      value: "",
      isSecret: false,
    };
    setCustomFields([...customFields, newField]);
  };
  
  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };
  
  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };
  
  const toggleSecretFieldVisibility = (id: string) => {
    setVisibleSecretFields(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    accountName?: string;
    username?: string;
    password?: string;
    category?: string;
  }>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Refs for scrolling to error fields
  const accountNameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLButtonElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  
  // Apply a template
  const applyTemplate = (template: EntryTemplate) => {
    setFormData(prev => ({
      ...prev,
      accountName: template.accountName,
      website: template.website,
      category: template.category,
      username: "", // Clear username so user fills in their own
    }));
    setShowTemplates(false);
    // Clear any errors
    setFieldErrors({});
  };
  
  // Track if password was changed (for passwordChangedAt)
  const originalPassword = entry?.password || "";
  const passwordChanged = formData.password !== originalPassword;
  
  // Check for duplicate passwords
  const duplicateEntries = allEntries.filter(
    e => e.id !== entry?.id && e.password === formData.password && formData.password.length > 0
  );

  const handlePasswordGenerated = (newPassword: string) => {
    setFormData((prev) => ({ ...prev, password: newPassword }));
    if (fieldErrors.password && newPassword.trim()) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: {
      accountName?: string;
      username?: string;
      password?: string;
      category?: string;
    } = {};

    if (!formData.accountName.trim()) {
      errors.accountName = isSecureNote ? "Title is required" : "Account name is required";
    }

    // Username and password only required for password entries
    if (!isSecureNote) {
      if (!formData.username.trim()) {
        errors.username = "Username/Email is required";
      }

      if (!formData.password.trim()) {
        errors.password = "Password is required";
      }
    }
    
    // Secure notes must have notes content
    if (isSecureNote && !formData.notes?.trim()) {
      errors.accountName = "Notes content is required for secure notes";
    }

    if (!formData.category) {
      errors.category = "Please select a category";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      
      // Scroll to the first error field
      setTimeout(() => {
        let targetRef: React.RefObject<HTMLElement> | null = null;
        
        if (errors.accountName) {
          targetRef = accountNameRef as React.RefObject<HTMLElement>;
        } else if (errors.category) {
          targetRef = categoryRef as React.RefObject<HTMLElement>;
        } else if (errors.username) {
          targetRef = usernameRef as React.RefObject<HTMLElement>;
        } else if (errors.password) {
          targetRef = passwordRef as React.RefObject<HTMLElement>;
        }
        
        if (targetRef?.current) {
          targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetRef.current.focus();
        }
      }, 100);
      
      return;
    }

    try {
      const entryData = {
        ...formData,
        entryType,
        accountName: formData.accountName.trim(),
        username: isSecureNote ? "" : formData.username.trim(),
        password: isSecureNote ? "" : formData.password.trim(),
        website: formData.website?.trim() || "",
        notes: formData.notes?.trim() || "",
        balance: formData.balance?.trim() || "",
        // Track password changes - set passwordChangedAt if password was modified (only for password entries)
        passwordChangedAt: isSecureNote ? undefined : (passwordChanged 
          ? new Date() 
          : (entry?.passwordChangedAt || entry?.createdAt)),
        isFavorite: entry?.isFavorite,
        // Password history - add old password to history if it changed
        passwordHistory: isSecureNote ? undefined : (passwordChanged && entry?.password
          ? [
              { password: entry.password, changedAt: entry.passwordChangedAt || entry.createdAt || new Date() },
              ...(entry.passwordHistory || [])
            ].slice(0, 10) // Keep only last 10 passwords
          : entry?.passwordHistory),
        // 2FA secret
        totpSecret: isSecureNote ? undefined : (formData.totpSecret?.trim() || undefined),
        // Custom fields - filter out empty ones
        customFields: customFields.filter(f => f.label.trim() && f.value.trim()).map(f => ({
          ...f,
          label: f.label.trim(),
          value: f.value.trim(),
        })),
      };

      // Submit to parent component (awaits storage save)
      await onSubmit(entryData);
      playSuccessSound();

      // Sync to floating panel (Electron only)
      // Parent's onSubmit already awaited storage save, so entries are ready
      if (window.electronAPI) {
        try {
          const currentEntries = await storageService.loadEntries();
          await window.electronAPI.saveSharedEntries?.(currentEntries);
          await window.electronAPI.broadcastEntriesChanged?.();
          await window.electronAPI.syncVaultToFloating?.();
        } catch {
          // Floating panel sync failed - non-critical
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setFieldErrors({ accountName: "Failed to save entry. Please try again." });
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      try {
        // Execute the delete operation
        await onDelete();
        setShowDeleteConfirm(false);

        // Sync to floating panel after delete (Electron only)
        if (window.electronAPI) {
          try {
            const currentEntries = await storageService.loadEntries();
            await window.electronAPI.saveSharedEntries?.(currentEntries);
            await window.electronAPI.broadcastEntriesChanged?.();
            await window.electronAPI.syncVaultToFloating?.();
          } catch {
            // Floating panel sync failed - non-critical
          }
        }
      } catch {
        setShowDeleteConfirm(false);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-slate-600/50 shadow-xl shadow-black/40 flex flex-col max-h-[85vh]">
      {/* Enhanced Header */}
      <div className="border-b border-slate-700/50 px-5 py-4 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #5B82B8, #4A6FA5)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-xl tracking-tight">
              {entry ? "Edit Account" : "Add New Account"}
            </h3>
            <p className="text-blue-100/70 text-xs mt-0.5">
              {entry
                ? "Update your account details"
                : "Secure your new credentials"}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Entry Type Selector - Only for new entries */}
        {!entry && (
          <div>
            {/* Enhanced Tab Selector */}
            <div className="flex rounded-xl bg-slate-900/60 p-1.5 mb-4 border border-slate-700/50">
              <button
                type="button"
                onClick={() => setEntryType("password")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                  entryType === "password"
                    ? "bg-gradient-to-r from-[#5B82B8] to-[#4A6FA5] text-white font-bold shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <LockKeyhole className="w-5 h-5 text-amber-400" strokeWidth={2} />
                <span>Password Entry</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryType("secure_note")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                  entryType === "secure_note"
                    ? "bg-gradient-to-r from-[#5B82B8] to-[#4A6FA5] text-white font-bold shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <StickyNote className="w-5 h-5 text-amber-300" strokeWidth={2} />
                <span>Secure Note</span>
              </button>
            </div>
            
            {/* Template Selector - Only for password entries */}
            {entryType === "password" && (
              <>
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
                >
                  <FileText className="w-4 h-4" />
                  <span>Use a template</span>
                  <Tooltip text="Pre-fill common account details">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400" />
                  </Tooltip>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                </button>
                
                {showTemplates && (
                  <div className="mt-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {ENTRY_TEMPLATES.map((template) => (
                        <button
                          key={template.name}
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-transparent hover:border-[#5B82B8]/50 transition-all text-center"
                        >
                          <span className="text-lg">{template.icon}</span>
                          <span className="text-xs text-slate-300 truncate w-full">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        <form id="entry-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Account Details Section */}
          <div className="space-y-3">
            <SectionHeader 
              icon={<User className="w-3.5 h-3.5" />} 
              title="Account Details" 
            />
            
            {/* Account Name / Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {isSecureNote ? "Title" : "Account Name"} <span className="text-red-400">*</span>
              </label>
              <input
                ref={accountNameRef}
                type="text"
                value={formData.accountName}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    accountName: e.target.value,
                  }));
                  if (fieldErrors.accountName && e.target.value.trim()) {
                    setFieldErrors(prev => ({ ...prev, accountName: undefined }));
                  }
                }}
                className={`w-full px-4 py-2.5 text-white focus:outline-none transition-all text-sm ${
                  fieldErrors.accountName
                    ? "input-error"
                    : "bg-slate-700/50 border border-slate-600/50 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                }`}
                placeholder="e.g., Gmail, Bank of America"
              />
              {fieldErrors.accountName && (
                <p className="error-text">{fieldErrors.accountName}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Category <span className="text-red-400">*</span>
              </label>
              <div ref={dropdownRef} className="relative">
                <button
                  ref={categoryRef}
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`w-full px-4 py-2.5 text-white focus:outline-none transition-all text-sm flex items-center justify-between text-left ${
                    fieldErrors.category
                      ? "input-error"
                      : "bg-slate-700/50 border border-slate-600/50 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                >
                  <span
                    className={
                      formData.category ? "text-white" : "text-slate-500"
                    }
                  >
                    {formData.category
                      ? categories.find((c) => c.id === formData.category)
                          ?.name || "Select a category"
                      : "Select a category"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showCategoryDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showCategoryDropdown && (
                  <div 
                    className="absolute z-[9999] top-full left-0 right-0 mt-1 rounded-xl max-h-48 overflow-y-auto isolate"
                    style={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <div className="p-1">
                      {categories
                        .filter((c) => c.id !== "all")
                        .map((category) => {
                          const isSelected = formData.category === category.id;
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  category: category.id,
                                }));
                                setShowCategoryDropdown(false);
                                if (fieldErrors.category) {
                                  setFieldErrors(prev => ({ ...prev, category: undefined }));
                                }
                              }}
                              className="w-full px-3 py-2 text-left text-sm rounded-lg transition-colors flex items-center justify-between"
                              style={{
                                backgroundColor: isSelected ? "#334155" : "#1e293b",
                                color: isSelected ? "#ffffff" : "#cbd5e1",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = "#334155";
                                  e.currentTarget.style.color = "#ffffff";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = "#1e293b";
                                  e.currentTarget.style.color = "#cbd5e1";
                                }
                              }}
                            >
                              <span>{category.name}</span>
                              {isSelected && (
                                <Check className="w-3 h-3 text-blue-400" />
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {fieldErrors.category && (
                  <p className="error-text">{fieldErrors.category}</p>
                )}
              </div>
            </div>
          </div>

          {/* Login Credentials Section - Only for password entries */}
          {!isSecureNote && (
            <div className="space-y-3">
              <SectionHeader 
                icon={<Key className="w-3.5 h-3.5" />} 
                title="Login Credentials" 
              />

              {/* Username */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                  <span>Username/Email</span>
                  <span className="text-red-400">*</span>
                  <Tooltip text="The email or username you use to log in">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-400" />
                  </Tooltip>
                </label>
                <input
                  ref={usernameRef}
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, username: e.target.value }));
                    if (fieldErrors.username && e.target.value.trim()) {
                      setFieldErrors(prev => ({ ...prev, username: undefined }));
                    }
                  }}
                  className={`w-full px-4 py-2.5 text-white focus:outline-none transition-all text-sm ${
                    fieldErrors.username
                      ? "input-error"
                      : "bg-slate-700/50 border border-slate-600/50 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                  placeholder="username@example.com"
                />
                {fieldErrors.username && (
                  <p className="error-text">{fieldErrors.username}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <span>Password</span>
                    <span className="text-red-400">*</span>
                    <Tooltip text="Your password for this account. Use the generator for a strong password.">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-400" />
                    </Tooltip>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPasswordGenerator(!showPasswordGenerator)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      showPasswordGenerator
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-600/50"
                    }`}
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>{showPasswordGenerator ? "Hide" : "Generate"}</span>
                  </button>
                </div>

                {/* Password Generator */}
                {showPasswordGenerator ? (
                  <div className="mb-3">
                    <PasswordGenerator
                      onPasswordGenerated={handlePasswordGenerated}
                      initialPassword={formData.password}
                    />
                  </div>
                ) : (
                  /* Manual Password Input */
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        ref={passwordRef}
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }));
                          if (fieldErrors.password && e.target.value.trim()) {
                            setFieldErrors(prev => ({ ...prev, password: undefined }));
                          }
                        }}
                        className={`w-full px-4 py-2.5 pr-12 text-white focus:outline-none transition-all text-sm ${
                          fieldErrors.password
                            ? "input-error"
                            : "bg-slate-700/50 border border-slate-600/50 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                        placeholder="Enter password or use generator"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white hover:bg-slate-600/50 rounded-lg transition-all"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    {/* Password Strength Meter */}
                    {formData.password && (
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className="h-1.5 flex-1 rounded-full transition-all duration-300"
                              style={{
                                backgroundColor: level <= passwordStrength.score ? passwordStrength.color : "#334155"
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: passwordStrength.color }}>
                            {passwordStrength.label}
                          </span>
                          <span className="text-xs text-slate-500">{formData.password.length} characters</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {fieldErrors.password && (
                  <p className="error-text">{fieldErrors.password}</p>
                )}
                
                {/* Duplicate Password Warning */}
                {duplicateEntries.length > 0 && (
                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
                      <span>⚠️</span>
                      This password is already used by: {duplicateEntries.map(e => e.accountName).join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {/* Website URL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Website URL</span>
                  <Tooltip text="The login page URL for quick access">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-400" />
                  </Tooltip>
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, website: e.target.value }));
                  }}
                  className="w-full px-4 py-2.5 rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all text-sm bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          )}

          {/* Optional Section */}
          <div className="space-y-3">
            <SectionHeader 
              icon={<Settings2 className="w-3.5 h-3.5" />} 
              title="Optional" 
            />

            {/* Account Details */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Account Details
              </label>
              <textarea
                value={formData.balance}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, balance: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-sm"
                rows={2}
                placeholder="Additional account details..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {isSecureNote ? (
                  <>Secure Note Content <span className="text-red-400">*</span></>
                ) : (
                  "Notes"
                )}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                className={`w-full px-4 py-2.5 rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all resize-none text-sm ${
                  isSecureNote 
                    ? "bg-slate-700/70 border-2 border-slate-600/70 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/30 min-h-[120px]"
                    : "bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                }`}
                rows={isSecureNote ? 5 : 2}
                placeholder={isSecureNote ? "Enter your secure note content here..." : "Additional notes..."}
              />
              {isSecureNote && (
                <p className="mt-1 text-xs text-slate-500">Your note will be encrypted with the same security as passwords</p>
              )}
            </div>

            {/* 2FA/TOTP Secret - Only for password entries */}
            {!isSecureNote && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    Two-Factor Authentication (2FA)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.totpSecret || ""}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z2-7]/g, '');
                    setFormData((prev) => ({ ...prev, totpSecret: value }));
                  }}
                  className="w-full px-4 py-2.5 rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all text-sm bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                  placeholder="Paste your 2FA setup key here..."
                />
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  <strong className="text-slate-400">How to find this:</strong> When setting up 2FA on a website, look for 
                  "Can't scan the QR code?" or "Manual entry" — copy that secret key and paste it here. 
                  We'll generate your 6-digit codes automatically!
                </p>
              </div>
            )}

            {/* Custom Fields */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  Custom Fields
                </label>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <Plus className="w-3 h-3" strokeWidth={2} />
                  Add
                </button>
              </div>
              
              {customFields.length === 0 ? (
                <p className="text-xs text-slate-500 py-1">No custom fields added.</p>
              ) : (
                <div className="space-y-2">
                  {customFields.map((field) => (
                    <div key={field.id} className="bg-slate-700/30 rounded-xl p-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                          placeholder="Field name"
                          className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500 bg-slate-700/50 border border-slate-600/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => updateCustomField(field.id, { isSecret: !field.isSecret })}
                          className={`p-1.5 rounded-lg transition-colors ${
                            field.isSecret 
                              ? "bg-blue-500/20 text-blue-400" 
                              : "bg-slate-700/50 text-slate-500 hover:text-slate-300"
                          }`}
                          title={field.isSecret ? "Secret field (hidden)" : "Make secret"}
                        >
                          <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCustomField(field.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove field"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={field.isSecret && !visibleSecretFields.has(field.id) ? "password" : "text"}
                          value={field.value}
                          onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                          placeholder="Field value"
                          className="w-full px-3 py-2 pr-10 rounded-lg text-sm text-white placeholder-slate-500 bg-slate-700/50 border border-slate-600/50 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                        />
                        {field.isSecret && (
                          <button
                            type="button"
                            onClick={() => toggleSecretFieldVisibility(field.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
                          >
                            {visibleSecretFields.has(field.id) 
                              ? <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                              : <Eye className="w-4 h-4" strokeWidth={1.5} />
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Sticky Footer with Actions */}
      <div className="flex-shrink-0 px-5 py-4 bg-slate-900/80 border-t border-slate-700/50 backdrop-blur-sm">
        <div className="flex gap-3">
          <button
            type="submit"
            form="entry-form"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#5B82B8] to-[#4A6FA5] hover:from-[#6B92C8] hover:to-[#5A7FB5] text-white py-2.5 px-5 rounded-xl font-semibold transition-all text-sm shadow-lg shadow-blue-500/20"
          >
            <Save className="w-4 h-4" strokeWidth={2} />
            <span>{entry ? "Save Changes" : (isSecureNote ? "Save Note" : "Add Account")}</span>
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="flex items-center justify-center px-3 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
              title="Delete Account"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-start justify-center pt-[30vh] p-4 z-[9999]">
          <div className="bg-slate-800/95 rounded-xl p-6 w-full max-w-sm border border-slate-700/50 shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" strokeWidth={1.5} />
              </div>

              <h3 className="text-white font-semibold text-lg mb-2">
                Delete Account
              </h3>

              <p className="text-slate-400 text-sm mb-6">
                Are you sure you want to delete "
                <span className="text-white font-medium">
                  {entry?.accountName || "this account"}
                </span>
                "? This cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-medium transition-all text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
