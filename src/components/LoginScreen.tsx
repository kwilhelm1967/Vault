import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Key, AlertCircle, Info } from 'lucide-react';
import { passwordService } from '../utils/passwordService';

interface LoginScreenProps {
  onLogin: (password: string) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    // Check if this is first time setup
    setIsFirstTime(!passwordService.hasMasterPassword());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await onLogin(password);
    } catch (error) {
      if (isFirstTime) {
        setError('Failed to set up master password. Please try again.');
      } else {
        setError('Invalid password. Please try again.');
      }
      setPassword(''); // Clear password field on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none', outline: 'none' }}>
            <Lock className="w-8 h-8 text-white" style={{ filter: 'none', backgroundColor: 'transparent', boxShadow: 'none', border: 'none', outline: 'none' }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Local Password Vault</h1>
          <p className="text-slate-400">
            {isFirstTime ? 'Create your master password' : 'Enter your master password'}
          </p>
        </div>

        {/* First Time Setup Info */}
        {isFirstTime && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-400 text-sm font-medium mb-1">First Time Setup</p>
              <p className="text-slate-300 text-sm">
                Create a strong master password to secure your vault. This password will be required each time you access your passwords.
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Master Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {isFirstTime ? 'Create Master Password' : 'Master Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all pr-12"
                  placeholder={isFirstTime ? 'Create a strong password' : 'Enter your password'}
                  required
                  autoFocus
                  disabled={isLoading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isFirstTime && (
                <p className="text-xs text-slate-400 mt-2">
                  Minimum 6 characters. Use a strong, unique password you'll remember.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password.trim() || (isFirstTime && password.length < 6)}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2"
            >
              <Key className="w-5 h-5" />
              <span>
                {isLoading 
                  ? (isFirstTime ? 'Setting up...' : 'Unlocking...') 
                  : (isFirstTime ? 'Create Vault' : 'Unlock Vault')
                }
              </span>
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Your Security Matters</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  All data is encrypted locally on your device. Your passwords never leave your computer.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Local Password Management by LocalPasswordVault.com
          </p>
        </div>
      </div>
    </div>
  );
};