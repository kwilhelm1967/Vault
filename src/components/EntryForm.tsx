import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ArrowLeft,
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
  LockKeyhole,
  StickyNote,
  Loader2,
} from "lucide-react";
import { PasswordEntry, Category, CustomField } from "../types";
import { devError } from "../utils/devLog";
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
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <h3 className="form-section-title">{title}</h3>
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
  defaultCategory?: string;
  onSubmit: (
    data: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
}

export const EntryForm: React.FC<EntryFormProps> = ({
  entry,
  categories,
  allEntries = [],
  defaultCategory,
  onSubmit,
  onCancel,
  onDelete,
  isLoading = false,
}) => {
  const [entryType, setEntryType] = useState<"password" | "secure_note">(entry?.entryType || "password");
  const [formData, setFormData] = useState({
    accountName: entry?.accountName || "",
    username: entry?.username || "",
    password: entry?.password || "",
    website: entry?.website || "",
    notes: entry?.notes || "",
    balance: entry?.balance || "",
    category: entry?.category || defaultCategory || "",
    totpSecret: entry?.totpSecret || "",
  });
  const [customFields, setCustomFields] = useState<CustomField[]>(entry?.customFields || []);
  const [visibleSecretFields, setVisibleSecretFields] = useState<Set<string>>(new Set());
  
  // Reset form when entry changes to null (e.g., closing and reopening add form)
  useEffect(() => {
    if (!entry) {
      // Reset to initial state for new entry
      setEntryType("password");
      setFormData({
        accountName: "",
        username: "",
        password: "",
        website: "",
        notes: "",
        balance: "",
        category: defaultCategory || "",
        totpSecret: "",
      });
      setCustomFields([]);
      setVisibleSecretFields(new Set());
      setFieldErrors({});
      setShowPassword(false);
      setShowCategoryDropdown(false);
      setShowDeleteConfirm(false);
      setShowPasswordGenerator(false);
      setShowTemplates(false);
    } else {
      // Populate form with entry data for editing
      setEntryType(entry.entryType || "password");
      setFormData({
        accountName: entry.accountName || "",
        username: entry.username || "",
        password: entry.password || "",
        website: entry.website || "",
        notes: entry.notes || "",
        balance: entry.balance || "",
        category: entry.category || defaultCategory || "",
        totpSecret: entry.totpSecret || "",
      });
      setCustomFields(entry.customFields || []);
    }
  }, [entry, defaultCategory]);
  
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
  const [categorySearchString, setCategorySearchString] = useState("");
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState(-1);
  const categorySearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  
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

  // Keyboard navigation for category dropdown
  const filteredCategories = categories.filter((c) => c.id !== "all");
  
  useEffect(() => {
    if (!showCategoryDropdown) {
      setCategorySearchString("");
      setHighlightedCategoryIndex(-1);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle letter keys for type-ahead search
      if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
        event.preventDefault();
        
        // Clear previous timeout
        if (categorySearchTimeoutRef.current) {
          clearTimeout(categorySearchTimeoutRef.current);
        }
        
        // Append to search string
        const newSearchString = categorySearchString + event.key.toLowerCase();
        setCategorySearchString(newSearchString);
        
        // Find matching category
        const matchIndex = filteredCategories.findIndex(
          (cat) => cat.name.toLowerCase().startsWith(newSearchString)
        );
        
        if (matchIndex !== -1) {
          setHighlightedCategoryIndex(matchIndex);
          // Scroll to the highlighted item
          const buttons = categoryListRef.current?.querySelectorAll('button');
          if (buttons && buttons[matchIndex]) {
            buttons[matchIndex].scrollIntoView({ block: 'nearest' });
          }
        }
        
        // Clear search string after 1 second of no typing
        categorySearchTimeoutRef.current = setTimeout(() => {
          setCategorySearchString("");
        }, 1000);
      }
      
      // Handle arrow keys
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedCategoryIndex((prev) => 
          prev < filteredCategories.length - 1 ? prev + 1 : 0
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedCategoryIndex((prev) => 
          prev > 0 ? prev - 1 : filteredCategories.length - 1
        );
      } else if (event.key === "Enter" && highlightedCategoryIndex >= 0) {
        event.preventDefault();
        const selectedCategory = filteredCategories[highlightedCategoryIndex];
        if (selectedCategory) {
          setFormData((prev) => ({ ...prev, category: selectedCategory.id }));
          setShowCategoryDropdown(false);
          if (fieldErrors.category) {
            setFieldErrors(prev => ({ ...prev, category: undefined }));
          }
        }
      } else if (event.key === "Escape") {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (categorySearchTimeoutRef.current) {
        clearTimeout(categorySearchTimeoutRef.current);
      }
    };
  }, [showCategoryDropdown, categorySearchString, highlightedCategoryIndex, filteredCategories, fieldErrors.category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: {
      accountName?: string;
      username?: string;
      password?: string;
      category?: string;
      website?: string;
    } = {};

    // Validate account name using centralized validation
    const accountNameValidation = validateAccountName(formData.accountName);
    if (!accountNameValidation.valid) {
      errors.accountName = accountNameValidation.error || (isSecureNote ? "Title is required" : "Account name is required");
    }

    // Validate website if provided
    if (formData.website && formData.website.trim()) {
      const urlValidation = validateUrl(formData.website);
      if (!urlValidation.valid) {
        errors.website = urlValidation.error || "Invalid URL format";
      }
    }

    // Username and password only required for password entries
    if (!isSecureNote) {
      // Validate username using centralized validation
      const usernameValidation = validateUsername(formData.username);
      if (!formData.username.trim()) {
        errors.username = "Username/Email is required";
      } else if (!usernameValidation.valid) {
        errors.username = usernameValidation.error || "Invalid username format";
      }

      // Validate password using centralized validation
      const passwordValidation = validateEntryPassword(formData.password);
      if (!formData.password.trim()) {
        errors.password = "Password is required";
      } else if (!passwordValidation.valid) {
        errors.password = passwordValidation.error || "Invalid password";
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
      
      // Verify the entry was actually saved by checking storage
      try {
        const savedEntries = await storageService.loadEntries();
        const wasSaved = savedEntries.some(e => e.accountName === entryData.accountName);
        if (!wasSaved) {
          throw new Error("Entry was not found in storage after save");
        }
      } catch (verifyError) {
        devError("Save verification failed:", verifyError);
        throw new Error("Entry may not have been saved correctly");
      }
      
      playSuccessSound();

      // Sync to floating panel (Electron only)
      if (window.electronAPI) {
        try {
          const currentEntries = await storageService.loadEntries();
          await window.electronAPI.saveSharedEntries?.(currentEntries);
          await window.electronAPI.broadcastEntriesChanged?.();
          await window.electronAPI.syncVaultToFloating?.();
        } catch (error) {
          // Floating panel sync failed - non-critical
          devError("Floating panel sync failed:", error);
        }
      }
    } catch (error) {
      devError("Error submitting form:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save entry";
      setFieldErrors({ accountName: errorMessage + ". Please try again." });
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
          } catch (error) {
            // Floating panel sync failed - non-critical
            devError("Floating panel sync on delete failed:", error);
          }
        }
      } catch (error) {
        devError("Delete operation failed:", error);
        setShowDeleteConfirm(false);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-full" style={{ backgroundColor: 'transparent' }}>
      <div className="form-container">
        {/* Header */}
        <div className="form-header">
          <button
            type="button"
            onClick={onCancel}
            className="form-back-button"
            title="Back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="form-header-title">
            {entry ? "Edit Account" : (isSecureNote ? "Add Secure Note" : "Add New Account")}
          </h2>
        </div>

        {/* Form Content */}
        <div className="space-y-6">
          {/* Entry Type Selector - Only for new entries */}
          {!entry && (
            <div className="form-section">
              <SectionHeader title="Entry Type" />
              {/* Tab Selector */}
              <div className="flex rounded-lg p-1" style={{ backgroundColor: '#2A3340' }}>
                <button
                  type="button"
                  onClick={() => setEntryType("password")}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-all flex items-center justify-center gap-2 ${
                    entryType === "password"
                      ? "text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  style={entryType === "password" ? { background: 'linear-gradient(135deg, #5B82B8, #4A6FA5)' } : {}}
                >
                  <LockKeyhole className="w-4 h-4" strokeWidth={2} style={{ color: entryType === "password" ? '#FCD34D' : '#9CA3AF' }} />
                  <span>Password Entry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType("secure_note")}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-all flex items-center justify-center gap-2 ${
                    entryType === "secure_note"
                      ? "text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  style={entryType === "secure_note" ? { background: 'linear-gradient(135deg, #5B82B8, #4A6FA5)' } : {}}
                >
                  <StickyNote className="w-4 h-4" strokeWidth={2} style={{ color: entryType === "secure_note" ? '#FCD34D' : '#9CA3AF' }} />
                  <span>Secure Note</span>
                </button>
              </div>
              
              {/* Template Selector - Only for password entries */}
              {entryType === "password" && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#E8EDF2'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Use a template</span>
                    <Tooltip text="Pre-fill common account details">
                      <HelpCircle className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
                    </Tooltip>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showTemplates && (
                    <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: '#252D3B', border: '1px solid rgba(91, 130, 184, 0.2)' }}>
                      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                        {ENTRY_TEMPLATES.map((template) => (
                          <button
                            key={template.name}
                            type="button"
                            onClick={() => applyTemplate(template)}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-center"
                            style={{ backgroundColor: '#2A3340', border: '1px solid transparent' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(42, 51, 64, 0.9)'; e.currentTarget.style.borderColor = 'rgba(91, 130, 184, 0.5)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(42, 51, 64, 0.6)'; e.currentTarget.style.borderColor = 'transparent'; }}
                          >
                            <span className="text-lg">{template.icon}</span>
                            <span className="text-xs truncate w-full" style={{ color: '#9CA3AF' }}>{template.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        
          <form id="entry-form" onSubmit={handleSubmit}>
            {/* Account Details Section */}
            <div className="form-section">
              <SectionHeader title="Basic Information" />
              
              {/* Account Name / Title */}
              <div className="form-field">
                <label className="form-label form-label-required" htmlFor="account-name-input">
                  {isSecureNote ? "Title" : "Account Name"}
                </label>
                <input
                  id="account-name-input"
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
                  className={`form-input ${fieldErrors.accountName ? "border-red-500" : ""}`}
                  placeholder="e.g., Gmail, Bank of America"
                  aria-describedby={fieldErrors.accountName ? "account-name-error" : undefined}
                  aria-invalid={!!fieldErrors.accountName}
                />
                {fieldErrors.accountName && (
                  <p id="account-name-error" className="form-helper" style={{ color: '#EF4444' }} role="alert">{fieldErrors.accountName}</p>
                )}
              </div>

              {/* Category */}
              <div className="form-field">
                <label className="form-label form-label-required" htmlFor="category-selector">Category</label>
                <div ref={dropdownRef} className="relative">
                  <button
                    id="category-selector"
                    ref={categoryRef}
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className={`form-input flex items-center justify-between text-left cursor-pointer ${fieldErrors.category ? "border-red-500" : ""}`}
                    aria-describedby={fieldErrors.category ? "category-error" : undefined}
                    aria-invalid={!!fieldErrors.category}
                    aria-expanded={showCategoryDropdown}
                    aria-haspopup="listbox"
                  >
                    <span style={{ color: formData.category ? '#E8EDF2' : '#6B7280' }}>
                      {formData.category
                        ? categories.find((c) => c.id === formData.category)?.name || "Select a category"
                        : "Select a category"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${showCategoryDropdown ? "rotate-180" : ""}`}
                      style={{ color: '#6B7280' }}
                    />
                  </button>

                  {showCategoryDropdown && (
                    <div 
                      className="absolute z-[9999] top-full left-0 right-0 mt-1 rounded-xl max-h-52 overflow-y-auto"
                      style={{
                        background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
                        border: "1px solid rgba(91, 130, 184, 0.3)",
                        boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(91, 130, 184, 0.1)",
                      }}
                    >
                      <div ref={categoryListRef} className="p-2">
                        {filteredCategories.map((category, index) => {
                            const isSelected = formData.category === category.id;
                            const isHighlighted = highlightedCategoryIndex === index;
                            return (
                              <button
                                key={category.id}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, category: category.id }));
                                  setShowCategoryDropdown(false);
                                  if (fieldErrors.category) {
                                    setFieldErrors(prev => ({ ...prev, category: undefined }));
                                  }
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm rounded-lg transition-all flex items-center justify-between"
                                style={{
                                  backgroundColor: isHighlighted 
                                    ? "rgba(91, 130, 184, 0.2)" 
                                    : isSelected 
                                      ? "rgba(91, 130, 184, 0.15)" 
                                      : "transparent",
                                  color: isSelected ? "#C9AE66" : "#E8EDF2",
                                  borderLeft: isHighlighted 
                                    ? "2px solid #C9AE66" 
                                    : isSelected 
                                      ? "2px solid #C9AE66" 
                                      : "2px solid transparent",
                                }}
                                onMouseEnter={(e) => {
                                  setHighlightedCategoryIndex(index);
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = "rgba(91, 130, 184, 0.1)";
                                    e.currentTarget.style.borderLeftColor = "rgba(91, 130, 184, 0.5)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected && !isHighlighted) {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                    e.currentTarget.style.borderLeftColor = "transparent";
                                  }
                                }}
                              >
                                <span>{category.name}</span>
                                {isSelected && <Check className="w-4 h-4" style={{ color: '#C9AE66' }} />}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {fieldErrors.category && (
                    <p id="category-error" className="form-helper" style={{ color: '#EF4444' }} role="alert">{fieldErrors.category}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Login Credentials Section - Only for password entries */}
            {!isSecureNote && (
              <div className="form-section">
                <SectionHeader title="Login Credentials" />

                {/* Username */}
                <div className="form-field">
                  <label className="form-label form-label-required" htmlFor="username-input">Username/Email</label>
                  <input
                    id="username-input"
                    ref={usernameRef}
                    type="text"
                    value={formData.username}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, username: e.target.value }));
                      if (fieldErrors.username && e.target.value.trim()) {
                        setFieldErrors(prev => ({ ...prev, username: undefined }));
                      }
                    }}
                    className={`form-input ${fieldErrors.username ? "border-red-500" : ""}`}
                    placeholder="username@example.com"
                    aria-describedby={fieldErrors.username ? "username-error" : undefined}
                    aria-invalid={!!fieldErrors.username}
                  />
                  {fieldErrors.username && (
                    <p id="username-error" className="form-helper" style={{ color: '#EF4444' }} role="alert">{fieldErrors.username}</p>
                  )}
                </div>

                {/* Password */}
                <div className="form-field">
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label form-label-required" style={{ marginBottom: 0 }}>Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPasswordGenerator(!showPasswordGenerator)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                      style={{
                        backgroundColor: showPasswordGenerator ? 'rgba(91, 130, 184, 0.2)' : 'rgba(42, 51, 64, 0.8)',
                        color: showPasswordGenerator ? '#5B82B8' : '#9CA3AF',
                        border: `1px solid ${showPasswordGenerator ? 'rgba(91, 130, 184, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                      }}
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
                    <div>
                      <div className="relative">
                        <input
                          id="password-input"
                          ref={passwordRef}
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => {
                            setFormData((prev) => ({ ...prev, password: e.target.value }));
                            if (fieldErrors.password && e.target.value.trim()) {
                              setFieldErrors(prev => ({ ...prev, password: undefined }));
                            }
                          }}
                          className={`form-input pr-12 ${fieldErrors.password ? "border-red-500" : ""}`}
                          placeholder="Enter password or use generator"
                          aria-describedby={fieldErrors.password ? "password-error" : undefined}
                          aria-invalid={!!fieldErrors.password}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all"
                          style={{ color: '#6B7280' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#E8EDF2'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                          title={showPassword ? "Hide password" : "Show password"}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      {/* Password Strength Meter */}
                      {formData.password && (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-1">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className="h-1 flex-1 rounded-full transition-all duration-300"
                                style={{ backgroundColor: level <= passwordStrength.score ? passwordStrength.color : "rgba(255, 255, 255, 0.1)" }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                            <span className="text-xs" style={{ color: '#6B7280' }}>{formData.password.length} characters</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {fieldErrors.password && (
                    <p className="form-helper" style={{ color: '#EF4444' }}>{fieldErrors.password}</p>
                  )}
                  
                  {/* Duplicate Password Warning */}
                  {duplicateEntries.length > 0 && (
                    <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: '#F59E0B' }}>
                        <span>⚠️</span>
                        This password is already used by: {duplicateEntries.map(e => e.accountName).join(", ")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Website URL */}
                <div className="form-field">
                  <label className="form-label flex items-center gap-2" htmlFor="website-input">
                    <Globe className="w-4 h-4" strokeWidth={1.5} style={{ color: '#C9AE66' }} />
                    <span>Website URL</span>
                  </label>
                  <input
                    id="website-input"
                    type="url"
                    value={formData.website}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, website: e.target.value }));
                      if (fieldErrors.website && e.target.value.trim()) {
                        setFieldErrors(prev => ({ ...prev, website: undefined }));
                      }
                    }}
                    className={`form-input ${fieldErrors.website ? "border-red-500" : ""}`}
                    aria-describedby={fieldErrors.website ? "website-error" : undefined}
                    aria-invalid={!!fieldErrors.website}
                    placeholder="https://example.com"
                  />
                  {fieldErrors.website && (
                    <p id="website-error" className="form-helper" style={{ color: '#EF4444' }} role="alert">{fieldErrors.website}</p>
                  )}
                </div>
              </div>
            )}

            {/* Additional Details Section */}
            <div className="form-section">
              <SectionHeader title="Additional Details" />

              {/* Account Details */}
              <div className="form-field">
                <label className="form-label">Account Details</label>
                <textarea
                  value={formData.balance}
                  onChange={(e) => setFormData((prev) => ({ ...prev, balance: e.target.value }))}
                  className="form-input form-textarea"
                  rows={2}
                  placeholder="Additional account details..."
                />
              </div>

              {/* Notes */}
              <div className="form-field">
                <label className={`form-label ${isSecureNote ? 'form-label-required' : ''}`}>
                  {isSecureNote ? "Secure Note Content" : "Notes"}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="form-input form-textarea"
                  rows={isSecureNote ? 5 : 3}
                  placeholder={isSecureNote ? "Enter your secure note content here..." : "Additional notes..."}
                />
                {isSecureNote && (
                  <p className="form-helper">Your note will be encrypted with the same security as passwords</p>
                )}
              </div>

              {/* 2FA/TOTP Secret - Only for password entries */}
              {!isSecureNote && (
                <div className="form-field">
                  <label className="form-label flex items-center gap-2">
                    <Shield className="w-4 h-4" strokeWidth={1.5} style={{ color: '#C9AE66' }} />
                    <span>Two-Factor Authentication (2FA)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.totpSecret || ""}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z2-7]/g, '');
                      setFormData((prev) => ({ ...prev, totpSecret: value }));
                    }}
                    className="form-input"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                    placeholder="Paste your 2FA setup key here..."
                  />
                  <p className="form-helper" style={{ marginTop: '8px', lineHeight: '1.5' }}>
                    <strong style={{ color: '#9CA3AF' }}>How to find this:</strong> When setting up 2FA on a website, look for 
                    "Can't scan the QR code?" or "Manual entry" — copy that secret key and paste it here. 
                    We'll generate your 6-digit codes automatically!
                  </p>
                </div>
              )}

              {/* Custom Fields */}
              <div className="form-field">
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label" style={{ marginBottom: 0 }}>Custom Fields</label>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-colors"
                    style={{ backgroundColor: '#2A3340', color: '#9CA3AF', border: '1px solid rgba(91, 130, 184, 0.3)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#E8EDF2'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
                  >
                    <Plus className="w-3 h-3" strokeWidth={2} />
                    Add
                  </button>
                </div>
                
                {customFields.length === 0 ? (
                  <p className="form-helper">No custom fields added.</p>
                ) : (
                  <div className="space-y-3">
                    {customFields.map((field) => (
                      <div key={field.id} className="rounded-lg p-3" style={{ backgroundColor: '#252D3B', border: '1px solid rgba(91, 130, 184, 0.2)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                            placeholder="Field name"
                            className="form-input flex-1"
                            style={{ padding: '8px 12px' }}
                          />
                          <button
                            type="button"
                            onClick={() => updateCustomField(field.id, { isSecret: !field.isSecret })}
                            className="p-2 rounded-md transition-colors"
                            style={{
                              backgroundColor: field.isSecret ? 'rgba(91, 130, 184, 0.2)' : 'transparent',
                              color: field.isSecret ? '#5B82B8' : '#6B7280',
                            }}
                            title={field.isSecret ? "Secret field (hidden)" : "Make secret"}
                            aria-label={field.isSecret ? "Field is secret (hidden), click to make visible" : "Make field secret (hidden)"}
                          >
                            <Lock className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.id)}
                            className="p-2 rounded-md transition-colors"
                            style={{ color: '#6B7280' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#EF4444'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
                            title="Remove field"
                            aria-label={`Remove custom field ${field.label || 'field'}`}
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={field.isSecret && !visibleSecretFields.has(field.id) ? "password" : "text"}
                            value={field.value}
                            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                            placeholder="Field value"
                            className="form-input pr-10"
                            style={{ padding: '8px 12px' }}
                          />
                          {field.isSecret && (
                            <button
                              type="button"
                              onClick={() => toggleSecretFieldVisibility(field.id)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                              style={{ color: '#6B7280' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#E8EDF2'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                              aria-label={visibleSecretFields.has(field.id) ? `Hide ${field.label || 'field'} value` : `Show ${field.label || 'field'} value`}
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

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                type="button"
                onClick={onCancel}
                className="form-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="form-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" strokeWidth={2} />
                    <span>{entry ? "Save Changes" : (isSecureNote ? "Save Note" : "Add Account")}</span>
                  </>
                )}
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  aria-label={`Delete ${entry?.accountName || 'entry'}`}
                  className="form-btn-danger"
                  title="Delete"
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="form-modal-backdrop" style={{ zIndex: 9999 }}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ backgroundColor: '#1F2534', border: '1px solid rgba(91, 130, 184, 0.4)' }}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <Trash2 className="w-6 h-6" style={{ color: '#EF4444' }} strokeWidth={1.5} />
              </div>

              <h3 className="font-semibold text-lg mb-2" style={{ color: '#E8EDF2' }}>
                Delete Account
              </h3>

              <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
                Are you sure you want to delete "
                <span style={{ color: '#E8EDF2', fontWeight: 500 }}>
                  {entry?.accountName || "this account"}
                </span>
                "? This cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all"
                  style={{ backgroundColor: '#2A3340', color: '#9CA3AF', border: '1px solid rgba(91, 130, 184, 0.3)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(42, 51, 64, 1)'; e.currentTarget.style.color = '#E8EDF2'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(42, 51, 64, 0.8)'; e.currentTarget.style.color = '#9CA3AF'; }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all"
                  style={{ backgroundColor: '#DC2626', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
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
