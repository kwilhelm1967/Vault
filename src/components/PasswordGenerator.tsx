/**
 * PasswordGenerator Component
 * 
 * A secure password generator with customizable options and strength analysis.
 * 
 * Features:
 * - Cryptographically secure random generation (Web Crypto API)
 * - Configurable length (8-64 characters)
 * - Character type selection (uppercase, lowercase, numbers, symbols)
 * - Ambiguous character exclusion (l, 1, I, 0, O)
 * - Real-time password strength analysis
 * - Copy to clipboard functionality
 * 
 * @example
 * <PasswordGenerator
 *   onPasswordGenerated={(pwd) => setPassword(pwd)}
 *   initialPassword=""
 * />
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  RefreshCw,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Settings2,
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
} from "lucide-react";

// Password history storage key
const HISTORY_KEY = "password_generator_history";
const MAX_HISTORY = 10;

// Helper functions for history
const getPasswordHistory = (): { password: string; timestamp: number }[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveToHistory = (password: string) => {
  const history = getPasswordHistory();
  // Don't add duplicates
  if (history.some(h => h.password === password)) return;
  
  const newEntry = { password, timestamp: Date.now() };
  const updated = [newEntry, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};

interface PasswordGeneratorProps {
  onPasswordGenerated: (password: string) => void;
  initialPassword?: string;
}

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

type StrengthLevel = "weak" | "fair" | "good" | "strong" | "excellent";

interface StrengthInfo {
  level: StrengthLevel;
  score: number;
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  uppercaseNoAmbiguous: "ABCDEFGHJKLMNPQRSTUVWXYZ", // No I, O
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  lowercaseNoAmbiguous: "abcdefghjkmnpqrstuvwxyz", // No i, l, o
  numbers: "0123456789",
  numbersNoAmbiguous: "23456789", // No 0, 1
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  onPasswordGenerated,
  initialPassword = "",
}) => {
  const [password, setPassword] = useState(initialPassword);
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ password: string; timestamp: number }[]>([]);
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  });
  
  // Load history on mount
  useEffect(() => {
    setHistory(getPasswordHistory());
  }, []);

  // Generate password based on options
  const generatePassword = useCallback(() => {
    let charset = "";

    if (options.uppercase) {
      charset += options.excludeAmbiguous
        ? CHAR_SETS.uppercaseNoAmbiguous
        : CHAR_SETS.uppercase;
    }
    if (options.lowercase) {
      charset += options.excludeAmbiguous
        ? CHAR_SETS.lowercaseNoAmbiguous
        : CHAR_SETS.lowercase;
    }
    if (options.numbers) {
      charset += options.excludeAmbiguous
        ? CHAR_SETS.numbersNoAmbiguous
        : CHAR_SETS.numbers;
    }
    if (options.symbols) {
      charset += CHAR_SETS.symbols;
    }

    // Fallback if nothing selected
    if (!charset) {
      charset = CHAR_SETS.lowercase;
    }

    // Use crypto API for secure random generation
    const array = new Uint32Array(options.length);
    crypto.getRandomValues(array);

    let newPassword = "";
    for (let i = 0; i < options.length; i++) {
      newPassword += charset[array[i] % charset.length];
    }

    // Ensure at least one character from each selected type
    const ensureCharFromSet = (set: string, pwd: string): string => {
      const hasChar = [...pwd].some((c) => set.includes(c));
      if (!hasChar && set.length > 0) {
        const randomIndex = Math.floor(Math.random() * pwd.length);
        const randomChar = set[Math.floor(Math.random() * set.length)];
        return pwd.substring(0, randomIndex) + randomChar + pwd.substring(randomIndex + 1);
      }
      return pwd;
    };

    if (options.uppercase) {
      newPassword = ensureCharFromSet(
        options.excludeAmbiguous ? CHAR_SETS.uppercaseNoAmbiguous : CHAR_SETS.uppercase,
        newPassword
      );
    }
    if (options.lowercase) {
      newPassword = ensureCharFromSet(
        options.excludeAmbiguous ? CHAR_SETS.lowercaseNoAmbiguous : CHAR_SETS.lowercase,
        newPassword
      );
    }
    if (options.numbers) {
      newPassword = ensureCharFromSet(
        options.excludeAmbiguous ? CHAR_SETS.numbersNoAmbiguous : CHAR_SETS.numbers,
        newPassword
      );
    }
    if (options.symbols) {
      newPassword = ensureCharFromSet(CHAR_SETS.symbols, newPassword);
    }

    setPassword(newPassword);
    onPasswordGenerated(newPassword);
    
    // Save to history
    saveToHistory(newPassword);
    setHistory(getPasswordHistory());
  }, [options, onPasswordGenerated]);

  // Calculate password strength
  const calculateStrength = useCallback((pwd: string): StrengthInfo => {
    if (!pwd) {
      return {
        level: "weak",
        score: 0,
        label: "No password",
        color: "text-slate-400",
        bgColor: "bg-slate-600",
        icon: <ShieldAlert className="w-4 h-4" />,
      };
    }

    let score = 0;

    // Length scoring
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    if (pwd.length >= 20) score += 1;

    // Character variety scoring
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    // Complexity bonus
    const uniqueChars = new Set(pwd).size;
    if (uniqueChars >= pwd.length * 0.7) score += 1;

    // Sequential/repeated penalty
    if (/(.)\1{2,}/.test(pwd)) score -= 1;
    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(pwd)) {
      score -= 1;
    }

    score = Math.max(0, Math.min(score, 9));

    if (score <= 2) {
      return {
        level: "weak",
        score,
        label: "Weak",
        color: "text-red-500",
        bgColor: "bg-red-500",
        icon: <ShieldAlert className="w-4 h-4" />,
      };
    } else if (score <= 4) {
      return {
        level: "fair",
        score,
        label: "Fair",
        color: "text-orange-500",
        bgColor: "bg-orange-500",
        icon: <Shield className="w-4 h-4" />,
      };
    } else if (score <= 6) {
      return {
        level: "good",
        score,
        label: "Good",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500",
        icon: <Shield className="w-4 h-4" />,
      };
    } else if (score <= 7) {
      return {
        level: "strong",
        score,
        label: "Strong",
        color: "text-emerald-500",
        bgColor: "bg-emerald-500",
        icon: <ShieldCheck className="w-4 h-4" />,
      };
    } else {
      return {
        level: "excellent",
        score,
        label: "Excellent",
        color: "text-cyan-500",
        bgColor: "bg-cyan-500",
        icon: <Sparkles className="w-4 h-4" />,
      };
    }
  }, []);

  const strength = calculateStrength(password);

  // Copy to clipboard
  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Generate on mount if no initial password
  useEffect(() => {
    if (!initialPassword) {
      generatePassword();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update password when options change
  useEffect(() => {
    if (password) {
      generatePassword();
    }
  }, [options.length, options.uppercase, options.lowercase, options.numbers, options.symbols, options.excludeAmbiguous]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleOption = (key: keyof PasswordOptions) => {
    if (key === "length" || key === "excludeAmbiguous") return;
    
    // Don't allow disabling all character types
    const newValue = !options[key];
    const otherOptions = ["uppercase", "lowercase", "numbers", "symbols"].filter(
      (k) => k !== key
    ) as (keyof PasswordOptions)[];
    const hasOtherEnabled = otherOptions.some((k) => options[k]);
    
    if (!newValue && !hasOtherEnabled) {
      return; // Can't disable the last option
    }
    
    setOptions((prev) => ({ ...prev, [key]: newValue }));
  };

  return (
    <div className="space-y-3">
      {/* Password Display */}
      <div className="relative">
        <div className="flex items-center bg-slate-900/50 border border-slate-600/50 rounded-xl overflow-hidden">
          <input
            type="text"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              onPasswordGenerated(e.target.value);
            }}
            className="flex-1 px-4 py-3 bg-transparent text-white font-mono text-sm focus:outline-none"
            placeholder="Generated password"
          />
          <div className="flex items-center pr-2 space-x-1">
            <button
              type="button"
              onClick={copyToClipboard}
              className={`p-2 rounded-lg transition-all ${
                copied
                  ? "text-emerald-400 bg-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
              title={copied ? "Copied!" : "Copy password"}
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={generatePassword}
              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
              title="Generate new password"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Strength Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2 ${strength.color}`}>
            {strength.icon}
            <span className="text-xs font-medium">{strength.label}</span>
          </div>
          <span className="text-xs text-slate-400">{password.length} characters</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${strength.bgColor} transition-all duration-300`}
            style={{ width: `${(strength.score / 9) * 100}%` }}
          />
        </div>
      </div>

      {/* Options & History Toggles */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => { setShowOptions(!showOptions); setShowHistory(false); }}
          className={`flex items-center space-x-2 text-xs transition-colors ${showOptions ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Customize</span>
          {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        
        <button
          type="button"
          onClick={() => { setShowHistory(!showHistory); setShowOptions(false); }}
          className={`flex items-center space-x-2 text-xs transition-colors ${showHistory ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History ({history.length})</span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Options Panel */}
      {showOptions && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Length Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300">
                Password Length
              </label>
              <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                {options.length}
              </span>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              value={options.length}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  length: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>8</span>
              <span>64</span>
            </div>
          </div>

          {/* Character Type Toggles */}
          <div className="grid grid-cols-2 gap-2">
            <ToggleButton
              label="ABC"
              description="Uppercase"
              active={options.uppercase}
              onClick={() => toggleOption("uppercase")}
            />
            <ToggleButton
              label="abc"
              description="Lowercase"
              active={options.lowercase}
              onClick={() => toggleOption("lowercase")}
            />
            <ToggleButton
              label="123"
              description="Numbers"
              active={options.numbers}
              onClick={() => toggleOption("numbers")}
            />
            <ToggleButton
              label="#$%"
              description="Symbols"
              active={options.symbols}
              onClick={() => toggleOption("symbols")}
            />
          </div>

          {/* Exclude Ambiguous */}
          <label className="flex items-center space-x-3 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                options.excludeAmbiguous
                  ? "bg-blue-500 border-blue-500"
                  : "border-slate-600 group-hover:border-slate-500"
              }`}
              onClick={() =>
                setOptions((prev) => ({
                  ...prev,
                  excludeAmbiguous: !prev.excludeAmbiguous,
                }))
              }
            >
              {options.excludeAmbiguous && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <div>
              <span className="text-xs font-medium text-slate-300">
                Exclude ambiguous characters
              </span>
              <p className="text-xs text-slate-500">
                Remove l, 1, I, 0, O that look similar
              </p>
            </div>
          </label>
        </div>
      )}
      
      {/* History Panel */}
      {showHistory && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Recent Passwords</span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => { clearHistory(); setHistory([]); }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
          
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">No passwords generated yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2 group hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <code className="text-xs text-slate-300 font-mono truncate block">{item.password}</code>
                    <span className="text-[10px] text-slate-500">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPassword(item.password);
                      onPasswordGenerated(item.password);
                    }}
                    className="ml-2 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Toggle Button Component
interface ToggleButtonProps {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  label,
  description,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-3 rounded-xl border text-left transition-all ${
      active
        ? "bg-blue-500/20 border-blue-500/50 text-white"
        : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600"
    }`}
  >
    <span className="font-mono text-sm font-bold">{label}</span>
    <p className="text-xs mt-0.5 opacity-70">{description}</p>
  </button>
);

export default PasswordGenerator;

