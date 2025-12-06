/**
 * DeleteConfirmModal Component
 * 
 * Confirmation dialog for deleting entries with smooth animations.
 */

import React from "react";
import { Trash2 } from "lucide-react";
import { PasswordEntry } from "../../types";
import { colors } from "./vaultColors";

interface DeleteConfirmModalProps {
  entry: PasswordEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  entry,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !entry) return null;

  return (
    <div 
      className="form-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Trash2 className="w-6 h-6 text-red-400" strokeWidth={1.5} />
          </div>
          <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-2">
            Delete Account
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            Delete "<span style={{ color: colors.warmIvory }}>{entry.accountName}</span>"? 
            This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface BulkDeleteConfirmModalProps {
  count: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const BulkDeleteConfirmModal: React.FC<BulkDeleteConfirmModalProps> = ({
  count,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || count === 0) return null;

  return (
    <div 
      className="form-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Trash2 className="w-6 h-6 text-red-400" strokeWidth={1.5} />
          </div>
          <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-2">
            Delete {count} Account{count > 1 ? 's' : ''}
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            This will permanently delete {count} selected account{count > 1 ? 's' : ''}. 
            This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
            >
              Delete All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

