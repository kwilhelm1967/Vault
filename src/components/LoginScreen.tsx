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

/** Password strength calculation and validation for first-time setup */
const calculateStrength = (pwd: string): { score: number; label: string; color: string; isValid: boolean } => {
  if (!pwd) return { score: 0, label: "", color: "bg-slate-600", isValid: false };

  let score = 0;
  const hasMinLength = pwd.length >= 12;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasNumbers = /[0-9]/.test(pwd);
  const hasSymbols = /[^A-Za-z0-9]/.test(pwd);

  // Score based on complexity
  if (hasMinLength) score++;
  if (hasUppercase) score++;
  if (hasLowercase) score++;
  if (hasNumbers) score++;
  if (hasSymbols) score++;
  if (pwd.length >= 16) score++; // Bonus for longer passwords

  // Minimum requirements for validity
  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumbers;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500", isValid };
  if (score <= 4) return { score: 2, label: "Fair", color: "bg-amber-500", isValid };
  if (score <= 5) return { score: 3, label: "Good", color: "bg-emerald-500", isValid };
  return { score: 4, label: "Strong", color: "bg-[#5B82B8]", isValid };
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  const [, setRemainingAttempts] = useState(5);
  
  // Password hint states
  const [passwordHint, setPasswordHint] = useState("");
  const [showHintInput, setShowHintInput] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [showSavedHint, setShowSavedHint] = useState(false);
  const [isLoadingHint, setIsLoadingHint] = useState(false);

  const strength = useMemo(() => calculateStrength(password), [password]);
  const passwordsMatch = password === confirmPassword;

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
    if (!password.trim()) return;

    // For first-time setup, enforce password complexity requirements
    if (isFirstTime && !strength.isValid) {
      setError("Password must be at least 12 characters and contain uppercase, lowercase, and numbers");
      return;
    }

    // Validate password meets minimum requirements
    if (isFirstTime && password.length < 12) {
      setError("Password must be at least 12 characters long");
      return;
    }

    // Validate passwords match for first-time setup
    if (isFirstTime && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
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
    
    // Mark onboarding as completed - user has set up their vault
    // This prevents the tutorial from showing on every login
    localStorage.setItem("onboarding_completed", "true");
    
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

  const isSubmitDisabled = isLoading || !password.trim() || (isFirstTime && !strength.isValid) || (isFirstTime && !passwordsMatch) || lockoutSeconds > 0;

  return (
    <div
      className="h-screen flex items-center justify-center p-4 overflow-hidden"
      role="main"
      aria-labelledby="login-title"
    >
      <div className="w-full max-w-md">

        {/* Logo & Title */}
        <header className="text-center mb-5">
          <div
            className="w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25"
            role="img"
            aria-label="Security lock icon"
          >
            <Lock className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <h1
            id="login-title"
            className="text-2xl font-bold text-white tracking-tight"
          >
            Local Password Vault
          </h1>
          <p
            className="text-slate-400 text-sm mt-1"
            id="login-subtitle"
          >
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
        <div
          className="bg-slate-800/60 backdrop-blur-xl border border-[#5B82B8]/40 rounded-xl p-6 shadow-2xl"
          role="region"
          aria-labelledby="login-form-title"
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            role="form"
            aria-labelledby="login-form-title"
            aria-describedby={error ? "login-error" : strength.isValid ? "password-strength" : undefined}
          >
            <h2 id="login-form-title" className="sr-only">
              {isFirstTime ? "Create Master Password" : "Enter Master Password"}
            </h2>
            
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
              <div
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
                <p id="login-error" className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label
                htmlFor="master-password"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                {isFirstTime ? "Create Master Password" : "Master Password"}
              </label>
              <div className="relative">
                <input
                  id="master-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/30 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-slate-500/50 focus:ring-1 focus:ring-slate-500/20 pr-10"
                  placeholder={isFirstTime ? "Min 12 chars with upper, lower, number, symbol" : "Enter your password"}
                  required
                  autoFocus
                  disabled={isLoading || lockoutSeconds > 0}
                  minLength={isFirstTime ? 12 : 1}
                  autoComplete={isFirstTime ? "new-password" : "current-password"}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded transition-all"
                  disabled={isLoading}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>

              {/* Password Strength (First Time Only) */}
              {isFirstTime && password && (
                <div className="mt-2 space-y-1">
                  <div
                    className="flex gap-1"
                    role="progressbar"
                    aria-valuenow={strength.score}
                    aria-valuemin={0}
                    aria-valuemax={4}
                    aria-label="Password strength meter"
                  >
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          level <= strength.score ? strength.color : "bg-slate-700"
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span
                      id="password-strength"
                      className="text-[10px] text-slate-400"
                      aria-live="polite"
                    >
                      {password.length < 12 ? `${12 - password.length} more characters needed` : strength.label}
                    </span>
                    <span
                      className="text-[10px] text-slate-500"
                      aria-label={`Password length: ${password.length} characters`}
                    >
                      {password.length}/12+ chars
                    </span>
                  </div>
                </div>
              )}

              {/* Password Requirements Helper */}
              {isFirstTime && (
                <div id="password-requirements" className="sr-only">
                  Password must be at least 12 characters long and contain uppercase letters, lowercase letters, and numbers.
                </div>
              )}
            </div>

            {/* Confirm Password Field (First Time Only) */}
            {isFirstTime && (
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Confirm Master Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-slate-900/50 border rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 pr-10 ${
                      confirmPassword && !passwordsMatch 
                        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" 
                        : confirmPassword && passwordsMatch 
                          ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20"
                          : "border-slate-600/50 focus:border-blue-500 focus:ring-blue-500/20"
                    }`}
                    placeholder="Re-enter your password"
                    required
                    disabled={isLoading || lockoutSeconds > 0}
                    autoComplete="new-password"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded transition-all"
                    disabled={isLoading}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
                {/* Password Match Status */}
                {confirmPassword && (
                  <p 
                    id="confirm-password-status"
                    className={`text-[10px] mt-1 ${passwordsMatch ? "text-emerald-400" : "text-red-400"}`}
                    aria-live="polite"
                  >
                    {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </div>
            )}

            <div>
              {/* Show Hint Button (Existing Vault Only) */}
              {!isFirstTime && savedHint && (
                <div className="mt-2">
                  {!showSavedHint ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (savedHint === null) {
                          setIsLoadingHint(true);
                          try {
                            const hint = await storageService.getPasswordHint();
                            setSavedHint(hint);
                          } catch (error) {
                            setError("Failed to load password hint");
                          } finally {
                            setIsLoadingHint(false);
                          }
                        }
                        setShowSavedHint(true);
                      }}
                      disabled={isLoadingHint}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingHint ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <HelpCircle className="w-3.5 h-3.5" />
                      )}
                      {isLoadingHint ? "Loading hint..." : "Show password hint"}
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
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-slate-400">AES-256 encrypted • Data Always Stays Local</p>
            </div>
            {/* Lockout policy info - only show for existing vaults */}
            {!isFirstTime && (
              <p className="text-[10px] text-slate-500 leading-relaxed">
                <Lock className="w-3 h-3 inline mr-1 opacity-60" />
                5 password attempts allowed. After 5 failed attempts, access is locked for 30 seconds.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-4">
          <p className="text-[10px] text-slate-500">
            <button
              onClick={() => {
                const url = "https://localpasswordvault.com";
                void (window.electronAPI?.openExternal?.(url) ?? window.open(url, "_blank"));
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
