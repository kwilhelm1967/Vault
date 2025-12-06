import React, { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Ctrl", "F"], description: "Focus search bar" },
      { keys: ["Esc"], description: "Clear search / Close modal" },
      { keys: ["↑", "↓"], description: "Navigate entries" },
      { keys: ["Enter"], description: "Open selected entry" },
      { keys: ["Tab"], description: "Move to next element" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: ["Ctrl", "N"], description: "Add new entry" },
      { keys: ["Ctrl", "E"], description: "Edit selected entry" },
      { keys: ["Ctrl", "C"], description: "Copy password" },
      { keys: ["Ctrl", "Shift", "C"], description: "Copy username" },
      { keys: ["Del"], description: "Delete selected entry" },
      { keys: ["Ctrl", "Z"], description: "Undo last action" },
    ],
  },
  {
    title: "Vault",
    shortcuts: [
      { keys: ["Ctrl", "L"], description: "Lock vault" },
      { keys: ["Ctrl", "S"], description: "Save changes" },
      { keys: ["Ctrl", "Shift", "E"], description: "Export vault" },
      { keys: ["Ctrl", "Shift", "I"], description: "Import data" },
    ],
  },
  {
    title: "View",
    shortcuts: [
      { keys: ["Ctrl", "1"], description: "All entries" },
      { keys: ["Ctrl", "2"], description: "Favorites" },
      { keys: ["Ctrl", ","], description: "Open settings" },
      { keys: ["?"], description: "Show this help" },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="form-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-700/50 rounded-xl">
                <Keyboard className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-slate-400">
                  Quick actions to boost your productivity
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close keyboard shortcuts"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shortcutGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {group.title}
                  </h3>
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors group"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <span className="text-slate-300 text-sm">
                          {shortcut.description}
                        </span>
                        <div className="flex gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              <kbd className="px-2 py-1 text-xs font-mono bg-slate-700 text-slate-200 rounded border border-slate-600 shadow-sm group-hover:bg-slate-600 group-hover:border-slate-500 transition-colors">
                                {key}
                              </kbd>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="text-slate-500 text-xs flex items-center">
                                  +
                                </span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-sm text-blue-300 text-center">
                <span className="font-semibold">💡 Pro Tip:</span> On Mac, use{" "}
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-700 text-slate-200 rounded border border-slate-600">
                  ⌘
                </kbd>{" "}
                instead of{" "}
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-700 text-slate-200 rounded border border-slate-600">
                  Ctrl
                </kbd>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/50 text-center">
            <p className="text-xs text-slate-500">
              Press{" "}
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-700 text-slate-300 rounded border border-slate-600">
                ?
              </kbd>{" "}
              anytime to show this guide
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to manage keyboard shortcuts modal and global ? key listener
export const useKeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isShortcutsOpen: isOpen,
    openShortcuts: () => setIsOpen(true),
    closeShortcuts: () => setIsOpen(false),
  };
};

