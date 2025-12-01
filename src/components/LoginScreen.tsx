/**
 * LoginScreen Component
 * 
 * Handles vault authentication, first-time setup, and recovery phrase generation.
 * Features AES-256 encryption indicator and secure password entry.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Lock, Eye, EyeOff, Key, AlertCircle, Info, Shield, Loader2, HelpCircle } from "lucide-react";
import { storageService } from "../utils/storage";
import { generateRecoveryPhrase, storeRecoveryPhrase } from "../utils/recoveryPhrase";
import { RecoveryPhraseSetup } from "./RecoveryPhraseSetup";
import { ForgotPassword } from "./ForgotPassword";

interface LoginScreenProps {
  onLogin: (password: string) => Promise<void>;
}

/** Password strength calculation for first-time setup (minimum 12 characters) */
const calculateStrength = (pwd: string): { score: number; label: string; color: string } => {
  if (!pwd) return { score: 0, label: "", color: "bg-slate-600" };
  
  let score = 0;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 10) score++;
  if (pwd.length >= 14) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  
  if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 4) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score <= 5) return { score: 3, label: "Good", color: "bg-emerald-500" };
  return { score: 4, label: "Strong", color: "bg-cyan-500" };
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  // Recovery phrase states
  const [showRecoverySetup, setShowRecoverySetup] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Rate limiting states
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  
  // Password hint states
  const [passwordHint, setPasswordHint] = useState("");
  const [showHintInput, setShowHintInput] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [showSavedHint, setShowSavedHint] = useState(false);
  const [isLoadingHint, setIsLoadingHint] = useState(false);

  const strength = useMemo(() => calculateStrength(password), [password]);

  useEffect(() => {
    const vaultExists = storageService.vaultExists();
    setIsFirstTime(!vaultExists);
    
    // Load saved hint for existing vaults
    if (vaultExists) {
      storageService.getPasswordHint().then(hint => {
        setSavedHint(hint);
      });
    }
    
    // Check initial lockout status
    const checkLockout = () => {
      const status = storageService.isLockedOut();
      setLockoutSeconds(status.remainingSeconds);
      setRemainingAttempts(storageService.getRemainingAttempts());
    };
    
    checkLockout();
    
    // Update lockout countdown
    const interval = setInterval(() => {
      const status = storageService.isLockedOut();
      setLockoutSeconds(status.remainingSeconds);
      if (!status.locked) {
        setRemainingAttempts(storageService.getRemainingAttempts());
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || (isFirstTime && password.length < 12)) return;
    
    if (isFirstTime) {
      // Generate recovery phrase and show setup screen
      const phrase = generateRecoveryPhrase();
      setRecoveryPhrase(phrase);
      setPendingPassword(password);
      setShowRecoverySetup(true);
    } else {
      // Normal login
      await performLogin(password);
    }
  };

  const performLogin = async (pwd: string) => {
    // Check lockout before attempting
    const lockoutStatus = storageService.isLockedOut();
    if (lockoutStatus.locked) {
      setLockoutSeconds(lockoutStatus.remainingSeconds);
      setError(`Too many failed attempts. Try again in ${lockoutStatus.remainingSeconds} seconds.`);
      return;
    }
    
    setIsLoading(true);
    setError("");

    try {
      await onLogin(pwd);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      
      // Check if it's a lockout error
      if (errorMessage.includes("Too many failed attempts")) {
        setError(errorMessage);
        const status = storageService.isLockedOut();
        setLockoutSeconds(status.remainingSeconds);
      } else {
        // Update remaining attempts
        setRemainingAttempts(storageService.getRemainingAttempts());
        const attemptsLeft = storageService.getRemainingAttempts();
        
        setError(isFirstTime 
          ? "Failed to create vault. Please try again." 
          : attemptsLeft > 0 
            ? `Invalid password. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`
            : "Invalid password."
        );
      }
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryConfirm = async () => {
    // Store the recovery phrase hash
    await storeRecoveryPhrase(recoveryPhrase);
    
    // Store password hint if provided (before vault is created, so don't require unlock)
    if (passwordHint.trim()) {
      await storageService.setPasswordHint(passwordHint.trim(), false);
    }
    
    // Now create the vault with the password
    await performLogin(pendingPassword);
    
    // Clean up
    setShowRecoverySetup(false);
    setRecoveryPhrase("");
    setPendingPassword("");
    setPasswordHint("");
  };

  const handleRecoveryBack = () => {
    setShowRecoverySetup(false);
    setRecoveryPhrase("");
    setPendingPassword("");
  };

  const handleForgotPasswordSuccess = () => {
    // User successfully verified recovery phrase
    // Vault password has been cleared, so they'll see first-time setup
    setShowForgotPassword(false);
    setIsFirstTime(true);
    setPassword("");
    setError("");
  };

  // Show recovery phrase setup screen
  if (showRecoverySetup) {
    return (
      <RecoveryPhraseSetup
        phrase={recoveryPhrase}
        onConfirm={handleRecoveryConfirm}
        onBack={handleRecoveryBack}
      />
    );
  }

  // Show forgot password screen
  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={() => setShowForgotPassword(false)}
        onRecoverySuccess={handleForgotPasswordSuccess}
      />
    );
  }

  const isSubmitDisabled = isLoading || !password.trim() || (isFirstTime && password.length < 12) || lockoutSeconds > 0;

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-md">
        
        {/* Logo & Title */}
        <header className="text-center mb-5">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Local Password Vault
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isFirstTime ? "Create your master password" : "Welcome back"}
          </p>
        </header>

        {/* First Time Setup Notice */}
        {isFirstTime && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 text-xs leading-relaxed">
                Create a strong master password. You'll receive a recovery phrase to restore access if you forget it.
              </p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Lockout Warning */}
            {lockoutSeconds > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-amber-400 text-xs font-medium">
                  Account locked. Try again in {lockoutSeconds} second{lockoutSeconds !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
            
            {/* Error Alert */}
            {error && !lockoutSeconds && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {isFirstTime ? "Create Master Password" : "Master Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all pr-10"
                  placeholder={isFirstTime ? "Min 12 chars with upper, lower, number, symbol" : "Enter your password"}
                  required
                  autoFocus
                  disabled={isLoading || lockoutSeconds > 0}
                  minLength={isFirstTime ? 12 : 1}
                  autoComplete={isFirstTime ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded transition-all"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength (First Time Only) */}
              {isFirstTime && password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          level <= strength.score ? strength.color : "bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">
                      {password.length < 12 ? `${12 - password.length} more needed` : strength.label}
                    </span>
                    <span className="text-[10px] text-slate-500">{password.length}/12+ chars</span>
                  </div>
                </div>
              )}

              {/* Show Hint Button (Existing Vault Only) */}
              {!isFirstTime && savedHint && (
                <div className="mt-2">
                  {!showSavedHint ? (
                    <button
                      type="button"
                      onClick={() => setShowSavedHint(true)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Show password hint
                    </button>
                  ) : (
                    <div className="bg-slate-700/30 rounded-lg p-2.5 border border-slate-600/30">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Password Hint</p>
                      <p className="text-slate-300 text-xs">{savedHint}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Password Hint Input (First Time Only) */}
            {isFirstTime && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="hint" className="text-xs font-medium text-slate-300">
                    Password Hint (Optional)
                  </label>
                  {!showHintInput && (
                    <button
                      type="button"
                      onClick={() => setShowHintInput(true)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      + Add hint
                    </button>
                  )}
                </div>
                {showHintInput && (
                  <>
                    <input
                      id="hint"
                      type="text"
                      value={passwordHint}
                      onChange={(e) => setPasswordHint(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all text-sm"
                      placeholder="A hint to help you remember"
                      maxLength={100}
                      disabled={isLoading}
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      This hint will be visible without your password
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white text-sm rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isFirstTime ? "Creating..." : "Unlocking..."}</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>{isFirstTime ? "Create Vault" : "Unlock Vault"}</span>
                </>
              )}
            </button>
          </form>

          {/* Forgot Password Link (only for existing vaults) */}
          {!isFirstTime && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Security Badge */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-slate-400">AES-256 encrypted • Data stays local</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-4">
          <p className="text-[10px] text-slate-500">
            <button
              onClick={() => {
                const url = "https://localpasswordvault.com";
                window.electronAPI?.openExternal?.(url) ?? window.open(url, "_blank");
              }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              LocalPasswordVault.com
            </button>
          </p>
        </footer>
      </div>
    </div>
  );
};
