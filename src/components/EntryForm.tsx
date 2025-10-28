import React, { useState, useRef, useEffect } from "react";
import { X, RefreshCw, Copy, Eye, EyeOff, Trash2, Save, ChevronDown, Check } from "lucide-react";
import { PasswordEntry, Category } from "../types";

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      formData.accountName.trim() &&
      formData.username.trim() &&
      formData.password.trim() &&
      formData.category
    ) {
      try {
        onSubmit({
          ...formData,
          accountName: formData.accountName.trim(),
          username: formData.username.trim(),
          password: formData.password.trim(),
          notes: formData.notes?.trim() || "",
          balance: formData.balance?.trim() || "",
        });
      } catch (error) {
        console.error("Error submitting form:", error);
        // Don't crash the app, just log the error
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
              Account Name
            </label>
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  accountName: e.target.value,
                }))
              }
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              placeholder="e.g., Gmail, Bank of America"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Username/Email
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, username: e.target.value }))
              }
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              placeholder="username@example.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                className="w-full px-4 py-3 pr-32 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                placeholder="Enter password"
                required
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
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Category
            </label>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm flex items-center justify-between text-left"
              >
                <span className={formData.category ? "text-white" : "text-slate-400"}>
                  {formData.category
                    ? categories.find(c => c.id === formData.category)?.name || "Select a category"
                    : "Select a category"
                  }
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`}
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
                            setFormData((prev) => ({ ...prev, category: category.id }));
                            setShowCategoryDropdown(false);
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
                onClick={onDelete}
                className="flex items-center justify-center p-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl font-medium transition-all border border-red-500/30 hover:border-red-500"
                title="Delete Account"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
