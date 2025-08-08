import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { PasswordEntry, Category } from '../types';

interface EntryFormProps {
  entry?: PasswordEntry | null;
  categories: Category[];
  onSubmit: (data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({ 
  entry, 
  categories, 
  onSubmit, 
  onCancel, 
  onDelete 
}) => {
  const [formData, setFormData] = useState({
    accountName: entry?.accountName || '',
    username: entry?.username || '',
    password: entry?.password || '',
    notes: entry?.notes || '',
    balance: entry?.balance || '',
    category: entry?.category || ''
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.accountName.trim() && formData.username.trim() && formData.password.trim() && formData.category) {
      try {
        onSubmit({
          ...formData,
          accountName: formData.accountName.trim(),
          username: formData.username.trim(),
          password: formData.password.trim(),
          notes: formData.notes?.trim() || '',
          balance: formData.balance?.trim() || ''
        });
      } catch (error) {
        console.error('Error submitting form:', error);
        // Don't crash the app, just log the error
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-white font-semibold text-base sm:text-lg">
          {entry ? 'Edit Account' : 'Add New Account'}
        </h3>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Account Name</label>
          <input
            type="text"
            value={formData.accountName}
            onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm sm:text-base"
            placeholder="e.g., Gmail, Bank of America"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Username/Email</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm sm:text-base"
            placeholder="username@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
          <div className="flex space-x-1 sm:space-x-2">
            <input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm sm:text-base"
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              onClick={generatePassword}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Generate</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm sm:text-base"
            required
          >
            <option value="" disabled>Select a category</option>
            {categories.filter(c => c.id !== 'all').map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Account Details</label>
          <input
            type="text"
            value={formData.balance}
            onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm sm:text-base"
            placeholder="e.g., Account details, credentials, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-sm sm:text-base"
            rows={3}
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex space-x-2 sm:space-x-3 pt-4 sm:pt-6">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium transition-all text-sm sm:text-base"
          >
            {entry ? 'Update Account' : 'Add Account'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-all text-sm sm:text-base"
          >
            Cancel
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all text-sm sm:text-base"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
};