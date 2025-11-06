import React, { useState, useRef, useEffect } from "react";
import {
  X,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Save,
  ChevronDown,
  Check,
} from "lucide-react";
import { PasswordEntry, Category } from "../types";
import { storageService } from "../utils/storage";

interface EntryFormProps {
  entry?: PasswordEntry | null;
  categories: Category[];
  onSubmit: (
    data: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({
  entry,
  categories,
  onSubmit,
  onCancel,
  onDelete,
}) => {
  const [formData, setFormData] = useState({
    accountName: entry?.accountName || "",
    username: entry?.username || "",
    password: entry?.password || "",
    notes: entry?.notes || "",
    balance: entry?.balance || "",
    category: entry?.category || "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    accountName?: string;
    username?: string;
    password?: string;
    category?: string;
  }>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
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
      errors.accountName = "Account name is required";
    }

    if (!formData.username.trim()) {
      errors.username = "Username/Email is required";
    }

    if (!formData.password.trim()) {
      errors.password = "Password is required";
    }

    if (!formData.category) {
      errors.category = "Please select a category";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      const entryData = {
        ...formData,
        accountName: formData.accountName.trim(),
        username: formData.username.trim(),
        password: formData.password.trim(),
        notes: formData.notes?.trim() || "",
        balance: formData.balance?.trim() || "",
      };

      // Submit to parent component
      await onSubmit(entryData);

      // Enhanced synchronization - ensure floating panel gets updates
      try {
        // Small delay to ensure storage has processed the changes
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Save current entries to temporary shared storage for floating panel
        const currentEntries = await storageService.loadEntries();
        if (window.electronAPI?.saveSharedEntries) {
          await window.electronAPI.saveSharedEntries(currentEntries);
          console.log(
            "EntryForm: Saved entries to shared storage for floating panel"
          );
        }

        // Force immediate cross-window sync after saving
        if (window.electronAPI?.broadcastEntriesChanged) {
          await window.electronAPI.broadcastEntriesChanged();
          console.log("EntryForm: Broadcasted entries changed event");
        }

        // Also trigger sync to floating panel if available
        if (window.electronAPI?.syncVaultToFloating) {
          await window.electronAPI.syncVaultToFloating();
          console.log("EntryForm: Synced vault to floating panel");
        }
      } catch (error) {
        console.error("EntryForm: Failed to synchronize entries:", error);
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

        // Enhanced synchronization - ensure floating panel gets updates after delete
        try {
          // Small delay to ensure storage has processed the changes
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Save current entries to temporary shared storage for floating panel
          const currentEntries = await storageService.loadEntries();
          if (window.electronAPI?.saveSharedEntries) {
            await window.electronAPI.saveSharedEntries(currentEntries);
            console.log(
              "EntryForm: Saved entries to shared storage for floating panel after delete"
            );
          }

          // Force immediate cross-window sync after saving
          if (window.electronAPI?.broadcastEntriesChanged) {
            await window.electronAPI.broadcastEntriesChanged();
            console.log(
              "EntryForm: Broadcasted entries changed event after delete"
            );
          }

          // Also trigger sync to floating panel if available
          if (window.electronAPI?.syncVaultToFloating) {
            await window.electronAPI.syncVaultToFloating();
            console.log(
              "EntryForm: Synced vault to floating panel after delete"
            );
          }
        } catch (error) {
          console.error(
            "EntryForm: Failed to synchronize entries after delete:",
            error
          );
        }
      } catch (error) {
        console.error("Error deleting entry:", error);
        setShowDeleteConfirm(false);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-slate-600/50 shadow-2xl">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-slate-700/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">
              {entry ? "Edit Account" : "Add New Account"}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {entry
                ? "Update your account details"
                : "Secure your new credentials"}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Account Name <span className="text-red-400">*</span>
            </label>
            <input
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
              className={`w-full px-4 py-3 rounded-xl text-white placeholder-slate-400 focus:outline-none transition-all text-sm ${
                fieldErrors.accountName
                  ? "bg-red-900/20 border-2 border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20"
                  : "bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              }`}
              placeholder="e.g., Gmail, Bank of America"
            />
            {fieldErrors.accountName && (
              <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.accountName}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Username/Email <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, username: e.target.value }));
                if (fieldErrors.username && e.target.value.trim()) {
                  setFieldErrors(prev => ({ ...prev, username: undefined }));
                }
              }}
              className={`w-full px-4 py-3 rounded-xl text-white placeholder-slate-400 focus:outline-none transition-all text-sm ${
                fieldErrors.username
                  ? "bg-red-900/20 border-2 border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20"
                  : "bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              }`}
              placeholder="username@example.com"
            />
            {fieldErrors.username && (
              <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.username}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
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
                className={`w-full px-4 py-3 pr-32 rounded-xl text-white placeholder-slate-400 focus:outline-none transition-all text-sm ${
                  fieldErrors.password
                    ? "bg-red-900/20 border-2 border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20"
                    : "bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                }`}
                placeholder="Enter password"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600/50 rounded-md transition-all"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(formData.password)}
                  className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-600/50 rounded-md transition-all"
                  title={copySuccess ? "Copied!" : "Copy password"}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Password Actions */}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={generatePassword}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg transition-all text-sm font-medium flex-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Generate Password</span>
              </button>
            </div>

            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.password}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className={`w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all text-sm flex items-center justify-between text-left ${
                  fieldErrors.category
                    ? "bg-red-900/20 border-2 border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20"
                    : "bg-slate-700/50 border border-slate-600/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                }`}
              >
                <span
                  className={
                    formData.category ? "text-white" : "text-slate-400"
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
                <div className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600/50 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  <div className="p-1">
                    {categories
                      .filter((c) => c.id !== "all")
                      .map((category) => (
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
                          className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-all flex items-center justify-between ${
                            formData.category === category.id
                              ? "bg-blue-600/30 text-white"
                              : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                          }`}
                        >
                          <span>{category.name}</span>
                          {formData.category === category.id && (
                            <Check className="w-3 h-3 text-blue-400" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {fieldErrors.category && (
                <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.category}</p>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Account Details
            </label>
            <textarea
              value={formData.balance}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, balance: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-sm"
              rows={3}
              placeholder="Additional account details..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-sm"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-all text-sm shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>{entry ? "Update Account" : "Add Account"}</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 bg-slate-600/50 hover:bg-slate-600 text-white rounded-xl font-medium transition-all text-sm border border-slate-500/50"
            >
              Cancel
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex items-center justify-center p-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl font-medium transition-all border border-red-500/30 hover:border-red-500"
                title="Delete Account"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-600/50 shadow-2xl">
            <div className="text-center">
              <div className="p-3 bg-red-500/20 rounded-full w-fit mx-auto mb-4 border border-red-500/30">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>

              <h3 className="text-white font-bold text-lg mb-2">
                Delete Account
              </h3>

              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Are you sure you want to delete "
                <span className="text-white font-medium">
                  {entry?.accountName || "this account"}
                </span>
                "? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-600/50 hover:bg-slate-600 text-white rounded-xl font-medium transition-all text-sm border border-slate-500/50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium transition-all text-sm shadow-lg"
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
