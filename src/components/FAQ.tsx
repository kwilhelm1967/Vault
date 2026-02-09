import { useState } from "react";
import { ChevronDown, ChevronRight, Search, HelpCircle, Shield, Key, Lock, Database, Smartphone, AlertTriangle, CreditCard, FileText, RefreshCw } from "lucide-react";

// Design System Colors - Consistent with app
const COLORS = {
  bgPrimary: 'transparent',
  bgCard: 'rgba(48, 58, 72, 0.5)',
  bgCardHover: 'rgba(58, 69, 82, 0.7)',
  bgInput: 'rgba(42, 51, 64, 0.8)',
  textPrimary: '#E8EDF2',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accentBlue: '#5B82B8',
  accentGold: '#C9AE66',
  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.15)',
};

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ style?: React.CSSProperties; strokeWidth?: number }>;
  questions: FAQItem[];
}

const FAQ_DATA: FAQSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: HelpCircle,
    questions: [
      { 
        question: "What is Local Password Vault?", 
        answer: "Local Password Vault is a secure desktop application for storing and managing all your passwords, logins, and sensitive notes. Everything is encrypted using military-grade AES-256 encryption and stored locally on your computer—nothing is ever sent to the cloud or stored on external servers." 
      },
      { 
        question: "How do I create my vault?", 
        answer: "When you first open the app, you'll be prompted to create a master password. This is the only password you'll need to remember—it encrypts all your other passwords. Choose a strong password with at least 12 characters, including uppercase, lowercase, and numbers. Special characters are recommended for extra security." 
      },
      { 
        question: "What can I store in the vault?", 
        answer: "You can store website logins, app passwords, credit card details, secure notes, software licenses, Wi-Fi passwords, and any other sensitive information. Each entry can include username, password, URL, notes, and can be organized into categories." 
      },
      { 
        question: "How do I add a new password?", 
        answer: "Click the '+ New Entry' button in the main vault view. Fill in the site name, username, password (or use the password generator), select a category, and add any notes. Click 'Save' to securely store it." 
      },
      { 
        question: "What are the categories for?", 
        answer: "Categories help you organize your passwords. Default categories include Banking, Shopping, Entertainment, Email, Work, Business, and Other. Use the sidebar to quickly filter and find passwords in specific categories." 
      },
    ]
  },
  {
    id: 'security',
    title: 'Security and Privacy',
    icon: Shield,
    questions: [
      { 
        question: "How secure is my data?", 
        answer: "Your data is protected with AES-256-GCM encryption—the same standard used by governments and banks. Your master password is never stored; instead, it's used to derive an encryption key using PBKDF2 with 100,000 iterations. Even if someone copies your vault file, they cannot read it without your master password." 
      },
      { 
        question: "Can anyone at Local Password Vault see my passwords?", 
        answer: "No. We use zero-knowledge architecture, meaning your data is encrypted before it's stored and only you have the key (your master password). We cannot see, access, or recover your passwords." 
      },
      { 
        question: "Is my data stored in the cloud?", 
        answer: "No. All your data is stored locally on your computer in an encrypted database. Nothing is sent to external servers. This is the most secure approach—your passwords never leave your device." 
      },
      { 
        question: "What is auto-lock?", 
        answer: "Auto-lock automatically locks your vault after a period of inactivity (default is 5 minutes). Go to Settings > Security to change the timeout. When locked, you'll need to re-enter your master password to access your passwords." 
      },
      { 
        question: "What is clipboard auto-clear?", 
        answer: "When you copy a password, it's automatically cleared from your clipboard after a set time (default 30 seconds). This prevents someone from accessing a password you copied earlier. Adjust this in Settings > Security." 
      },
      { 
        question: "What are recovery words?", 
        answer: "Recovery words are 12 random words generated when you create your vault. They can restore access if you forget your master password. Write them down and store them safely offline—never on your computer. Without these words or your password, your data cannot be recovered." 
      },
    ]
  },
  {
    id: 'passwords',
    title: 'Password Management',
    icon: Key,
    questions: [
      { 
        question: "How does the password generator work?", 
        answer: "The password generator creates strong, random passwords. You can customize length (8-128 characters) and include/exclude uppercase, lowercase, numbers, and symbols. Use the 'Memorable' option for pronounceable passwords, or 'Passphrase' for word-based passwords." 
      },
      { 
        question: "What makes a strong password?", 
        answer: "A strong password has: 12+ characters, mix of uppercase and lowercase letters, numbers, and symbols. Avoid dictionary words, personal information, and patterns. The password strength meter shows you how secure your password is." 
      },
      { 
        question: "What is Password Health?", 
        answer: "The Dashboard shows your Password Health—weak passwords that need strengthening, reused passwords that should be unique, and old passwords that haven't been updated in 90+ days. Click on any issue to see affected entries." 
      },
      { 
        question: "How do I find a specific password?", 
        answer: "Use the search bar at the top of the vault to find passwords by name, username, URL, or notes. You can also filter by category using the sidebar, or use keyboard shortcut Ctrl/Cmd+F to focus the search." 
      },
      { 
        question: "Can I see my password history?", 
        answer: "Yes. When viewing an entry, click the history icon to see previous passwords for that account. This is useful if you need to revert to an old password or check what password you were using before." 
      },
      { 
        question: "What is TOTP/2FA support?", 
        answer: "You can store Time-based One-Time Password (TOTP) secrets for accounts with two-factor authentication. The vault will generate the 6-digit codes automatically, so you don't need a separate authenticator app." 
      },
    ]
  },
  {
    id: 'backup',
    title: 'Backup and Export',
    icon: Database,
    questions: [
      { 
        question: "How do I backup my passwords?", 
        answer: "Go to Settings > Quick Actions > Secure Backup. This creates an encrypted backup file (.lpvbackup) that can only be opened with the password you set. Store backups on an external drive or secure location." 
      },
      { 
        question: "What's the difference between Export and Secure Backup?", 
        answer: "Export to Excel creates a readable spreadsheet (CSV) for use in other apps or printing—but it's not encrypted. Secure Backup creates an encrypted file that can restore your full vault securely." 
      },
      { 
        question: "How do I restore from a backup?", 
        answer: "Go to Settings > Quick Actions > Restore Secure Backup. Select your backup file and enter the password you used when creating it. You can merge with existing entries or replace everything." 
      },
      { 
        question: "How do I import passwords from another app?", 
        answer: "Go to Settings > Quick Actions > Import from File. We support imports from most password managers (CSV format). Export from your old app first, then import the file here." 
      },
      { 
        question: "How often should I backup?", 
        answer: "We recommend backing up monthly, or whenever you add important passwords. Store multiple backups in different secure locations (external drive, USB in a safe, etc.)." 
      },
    ]
  },
  {
    id: 'minivault',
    title: 'Mini Vault',
    icon: Lock,
    questions: [
      { 
        question: "What is Mini Vault?", 
        answer: "Mini Vault is a floating, compact version of your vault that stays on top of other windows. It's perfect for quickly copying passwords while logging into websites without switching back and forth between apps." 
      },
      { 
        question: "How do I open Mini Vault?", 
        answer: "Click 'Mini Vault' in the sidebar, or use the floating vault button that appears on your screen. You can drag the Mini Vault window anywhere on your screen." 
      },
      { 
        question: "Does Mini Vault have its own auto-lock?", 
        answer: "Yes. Mini Vault has a separate auto-lock timer shown in its header. When it expires, Mini Vault closes and you'll need to unlock from the main vault again." 
      },
    ]
  },
  {
    id: 'mobile',
    title: 'Mobile Access',
    icon: Smartphone,
    questions: [
      { 
        question: "Can I access my passwords on my phone?", 
        answer: "Yes! Go to Settings > Quick Actions > Mobile Access. This creates a secure QR code you can scan with your phone to view your passwords temporarily from any mobile browser." 
      },
      { 
        question: "How secure is mobile access?", 
        answer: "Mobile access tokens are temporary and expire after the time you set (1 hour to 24 hours). They can be view-only or allow edits. You can revoke access at any time from the Settings." 
      },
      { 
        question: "Do I need an app for mobile?", 
        answer: "No. Mobile access works in any web browser on your phone. Just scan the QR code and your passwords appear securely. No app installation required." 
      },
    ]
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    icon: FileText,
    questions: [
      { 
        question: "What keyboard shortcuts are available?", 
        answer: "Press '?' or go to Settings > Help to see all shortcuts. Common ones: Ctrl/Cmd+N (new entry), Ctrl/Cmd+F (search), Ctrl/Cmd+L (lock vault), Ctrl/Cmd+, (settings)." 
      },
    ]
  },
  {
    id: 'license',
    title: 'Trial and License',
    icon: CreditCard,
    questions: [
      { 
        question: "How long is the free trial?", 
        answer: "The free trial is 7 days with full access to all features. After the trial, you'll need to purchase a license to continue adding and editing passwords. Good news: when you upgrade to a paid license, all your passwords and data stay exactly where they are—no import needed! Just import your new license file and keep going." 
      },
      { 
        question: "What happens when the trial ends?", 
        answer: "Your passwords are NOT deleted. You can still view and export them. However, you won't be able to add new entries or edit existing ones until you purchase a license." 
      },
      { 
        question: "How do I purchase a license?", 
        answer: "Click 'Purchase' in the trial banner or visit our website. After payment, you'll receive a license file by email. Import it into the app to activate your full license." 
      },
      { 
        question: "Can I use my license on multiple computers?", 
        answer: "Each license works on one device at a time. You can transfer your license to a new computer when needed (e.g., when upgrading). The old computer will be deactivated automatically." 
      },
      { 
        question: "How do I transfer my license to a new computer?", 
        answer: "On your new computer, install the app and import your license file from email. The app will bind to your new device automatically. Remember to export and import your vault data!" 
      },
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: AlertTriangle,
    questions: [
      { 
        question: "I forgot my master password.", 
        answer: "Use your recovery words to reset your password. Go to the login screen and click 'Forgot Password'. Without recovery words, your vault cannot be accessed—this is the security tradeoff for true encryption." 
      },
      { 
        question: "My backup won't restore.", 
        answer: "Ensure you're using the correct password for the backup. The file must be a valid .lpvbackup file created by Local Password Vault. Try an older backup if available." 
      },
      { 
        question: "How do I report a bug?", 
        answer: "Email support@localpasswordvault.com with details about the issue, your operating system, and steps to reproduce the problem. Screenshots are helpful!" 
      },
      { 
        question: "My license isn't working.", 
        answer: "Ensure you're entering the key exactly as received (check for extra spaces). If it says the key is already in use, you may need to transfer it from another device. Contact support if issues persist." 
      },
    ]
  },
  {
    id: 'updates',
    title: 'Updates and Sync',
    icon: RefreshCw,
    questions: [
      { 
        question: "How do I update the app?", 
        answer: "The app checks for updates automatically on launch. When an update is available, you'll be notified and can download it directly. You can also check manually in Settings." 
      },
      { 
        question: "Will I lose my passwords when updating?", 
        answer: "No. Updates preserve your encrypted vault data. Your passwords are stored separately from the application files. However, we always recommend keeping a recent backup just in case." 
      },
      { 
        question: "Does the vault sync between devices?", 
        answer: "No—and this is intentional for security. Your vault is stored only on your device. To use passwords on another device, use Mobile Access for temporary viewing, or export/import your vault." 
      },
    ]
  },
];

export const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleQuestion = (questionKey: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionKey)) {
        next.delete(questionKey);
      } else {
        next.add(questionKey);
      }
      return next;
    });
  };

  const filteredSections = searchQuery.trim()
    ? FAQ_DATA.map(section => ({
        ...section,
        questions: section.questions.filter(
          q => q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
               q.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.questions.length > 0)
    : FAQ_DATA;

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold" style={{ color: COLORS.textPrimary }}>
          Frequently Asked Questions
        </h1>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search 
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: COLORS.textMuted }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search questions..."
          className="w-full rounded-lg px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
          style={{
            backgroundColor: COLORS.bgInput,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.textPrimary,
          }}
        />
      </div>

      {/* FAQ Sections */}
      <div className="flex flex-col gap-2.5">
        {filteredSections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.has(section.id) || searchQuery.trim() !== "";
          
          return (
            <div 
              key={section.id}
              className="rounded-xl overflow-hidden backdrop-blur-sm"
              style={{ 
                backgroundColor: COLORS.bgCard, 
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.bgCardHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" style={{ color: COLORS.accentGold }} strokeWidth={1.75} />
                  <span className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
                    {section.title}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" style={{ color: COLORS.accentGold }} />
                ) : (
                  <ChevronRight className="w-4 h-4" style={{ color: COLORS.textMuted }} />
                )}
              </button>

              {/* Questions */}
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  {section.questions.map((item, idx) => {
                    const questionKey = `${section.id}-${idx}`;
                    const isOpen = expandedQuestions.has(questionKey);
                    
                    return (
                      <div 
                        key={idx}
                        style={{ 
                          borderBottom: idx < section.questions.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                        }}
                      >
                        <button
                          onClick={() => toggleQuestion(questionKey)}
                          className="w-full flex items-center justify-between p-3.5 text-left transition-colors"
                          style={{ backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(58, 69, 82, 0.4)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span 
                            className="text-sm pr-4 leading-relaxed"
                            style={{ 
                              color: isOpen ? COLORS.accentBlue : COLORS.textPrimary,
                              fontWeight: isOpen ? 500 : 400,
                            }}
                          >
                            {item.question}
                          </span>
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.accentGold }} />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.textMuted }} />
                          )}
                        </button>
                        
                        {isOpen && (
                          <div 
                            className="px-4 pb-4"
                            style={{ backgroundColor: 'rgba(31, 37, 52, 0.4)' }}
                          >
                            <p 
                              className="text-sm leading-relaxed"
                              style={{ color: COLORS.textSecondary }}
                            >
                              {item.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredSections.length === 0 && (
        <div 
          className="text-center py-10 rounded-xl"
          style={{ 
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <HelpCircle className="w-8 h-8 mx-auto mb-3" style={{ color: COLORS.textMuted }} />
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            No questions match "{searchQuery}"
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: `${COLORS.accentBlue}20`,
              color: COLORS.accentBlue,
            }}
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Footer */}
      <div 
        className="mt-5 p-4 rounded-xl flex items-center gap-3"
        style={{
          backgroundColor: `${COLORS.accentBlue}10`,
          border: `1px solid ${COLORS.accentBlue}30`,
        }}
      >
        <HelpCircle className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.accentGold }} />
        <p className="text-sm" style={{ color: COLORS.textSecondary }}>
          Need more help? Email{' '}
          <span style={{ color: COLORS.accentBlue }}>support@localpasswordvault.com</span>
        </p>
      </div>
    </div>
  );
};

