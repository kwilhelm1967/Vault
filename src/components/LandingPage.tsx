import React, { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Key,
  Fingerprint,
  WifiOff,
  Eye,
  EyeOff,
  Zap,
  Clock,
  Check,
  Star,
  ArrowRight,
  Sparkles,
  Database,
  RefreshCw,
  CalendarClock,
  Monitor,
  Apple,
  Terminal,
  Quote,
  Mail,
  Smartphone,
  Import,
  Undo2,
  Keyboard,
  Globe,
  History,
  FolderKey,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { devLog } from "../utils/devLog";

// Color palette matching LocalPasswordVault.com - premium gold accents
const colors = {
  // Primary palette - deep navy blues
  obsidian: "#0a0e17",
  midnight: "#0f172a",
  slate: "#1e293b",
  steel: "#334155",
  
  // Brand gold accents (primary)
  brandGold: "#C9AE66",
  goldLight: "#D4BC7D",
  goldDark: "#B89B4D",
  
  // Steel blue accents (secondary)
  steelBlue: "#5B82B8",
  steelBlueLight: "#7A9DC7",
  steelBlueDark: "#4A6FA5",
  
  // Text
  ivory: "#F3F4F6",
  warmIvory: "#E8EDF2",
  silver: "#94a3b8",
  muted: "#64748b",
  
  // Success/security
  emerald: "#10b981",
  emeraldDark: "#059669",
};

// Animated background particles
const ParticleField: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full opacity-20"
          style={{
            backgroundColor: colors.brandGold,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.1; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

// Animated shield icon
const AnimatedShield: React.FC = () => {
  return (
    <div className="relative">
      <div 
        className="absolute inset-0 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: colors.brandGold }}
      />
      <div 
        className="relative w-32 h-32 rounded-2xl flex items-center justify-center"
        style={{ 
          background: `linear-gradient(135deg, ${colors.brandGold}20 0%, ${colors.goldDark}20 100%)`,
          border: `2px solid ${colors.brandGold}40`,
          boxShadow: `0 0 60px ${colors.brandGold}30`,
        }}
      >
        <Shield 
          className="w-16 h-16 animate-pulse" 
          style={{ color: colors.brandGold }}
          strokeWidth={1.5}
        />
        <div 
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ 
            backgroundColor: colors.emerald,
            boxShadow: `0 0 20px ${colors.emerald}60`,
          }}
        >
          <Check className="w-5 h-5 text-white" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
};

// Feature card component
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}> = ({ icon, title, description, highlight }) => {
  return (
    <div
      className="group relative p-6 rounded-2xl transition-all duration-500 hover:scale-[1.02]"
      style={{
        backgroundColor: highlight ? `${colors.brandGold}10` : `${colors.slate}50`,
        border: `1px solid ${highlight ? colors.brandGold : colors.steel}40`,
      }}
    >
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${colors.brandGold}10 0%, transparent 70%)`,
        }}
      />
      <div className="relative">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
          style={{ 
            backgroundColor: highlight ? `${colors.brandGold}20` : `${colors.steelBlue}20`,
            color: highlight ? colors.brandGold : colors.steelBlue,
          }}
        >
          {icon}
        </div>
        <h3 
          className="text-lg font-semibold mb-2"
          style={{ color: colors.ivory }}
        >
          {title}
        </h3>
        <p 
          className="text-sm leading-relaxed"
          style={{ color: colors.silver }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};

// Pricing card component
const PricingCard: React.FC<{
  title: string;
  price: string;
  period?: string;
  features: string[];
  popular?: boolean;
  ctaText: string;
  onCta: () => void;
}> = ({ title, price, period, features, popular, ctaText, onCta }) => {
  return (
    <div
      className="relative p-8 rounded-3xl transition-all duration-500 hover:scale-[1.02]"
      style={{
        backgroundColor: popular ? colors.slate : `${colors.midnight}`,
        border: `2px solid ${popular ? colors.brandGold : colors.steel}`,
        boxShadow: popular ? `0 0 60px ${colors.brandGold}20` : 'none',
      }}
    >
      {popular && (
        <div 
          className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          style={{ 
            backgroundColor: colors.brandGold,
            color: colors.midnight,
          }}
        >
          Most Popular
        </div>
      )}
      
      <h3 
        className="text-xl font-bold mb-2"
        style={{ color: colors.ivory }}
      >
        {title}
      </h3>
      
      <div className="flex items-baseline mb-6">
        <span 
          className="text-5xl font-black"
          style={{ color: popular ? colors.brandGold : colors.ivory }}
        >
          {price}
        </span>
        {period && (
          <span 
            className="ml-2 text-sm"
            style={{ color: colors.muted }}
          >
            {period}
          </span>
        )}
      </div>
      
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start space-x-3">
            <Check 
              className="w-5 h-5 mt-0.5 flex-shrink-0" 
              style={{ color: colors.brandGold }}
            />
            <span 
              className="text-sm"
              style={{ color: colors.silver }}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>
      
      <button
        onClick={onCta}
        className="w-full py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] flex items-center justify-center space-x-2"
        style={{
          backgroundColor: popular ? colors.brandGold : 'transparent',
          color: popular ? colors.midnight : colors.brandGold,
          border: popular ? 'none' : `2px solid ${colors.brandGold}`,
        }}
      >
        <span>{ctaText}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

// Testimonial card
const TestimonialCard: React.FC<{
  quote: string;
  author: string;
  role: string;
  rating: number;
}> = ({ quote, author, role, rating }) => {
  return (
    <div
      className="p-6 rounded-2xl"
      style={{
        backgroundColor: `${colors.slate}50`,
        border: `1px solid ${colors.steel}40`,
      }}
    >
      <div className="flex space-x-1 mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star 
            key={i} 
            className="w-4 h-4 fill-current" 
            style={{ color: colors.brandGold }}
          />
        ))}
      </div>
      <Quote 
        className="w-8 h-8 mb-3 opacity-30" 
        style={{ color: colors.brandGold }}
      />
      <p 
        className="text-sm leading-relaxed mb-4"
        style={{ color: colors.silver }}
      >
        "{quote}"
      </p>
      <div>
        <p 
          className="font-semibold text-sm"
          style={{ color: colors.ivory }}
        >
          {author}
        </p>
        <p 
          className="text-xs"
          style={{ color: colors.muted }}
        >
          {role}
        </p>
      </div>
    </div>
  );
};

// Animated counter
const AnimatedCounter: React.FC<{ end: number; suffix?: string; label: string }> = ({ 
  end, 
  suffix = "", 
  label 
}) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = end / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [end]);
  
  return (
    <div className="text-center">
      <div 
        className="text-4xl font-black mb-1"
        style={{ color: colors.brandGold }}
      >
        {count.toLocaleString()}{suffix}
      </div>
      <div 
        className="text-sm"
        style={{ color: colors.muted }}
      >
        {label}
      </div>
    </div>
  );
};

// Password demo animation
const PasswordDemo: React.FC = () => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        backgroundColor: colors.obsidian,
        border: `1px solid ${colors.steel}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${colors.brandGold}20` }}
          >
            <Key className="w-4 h-4" style={{ color: colors.brandGold }} />
          </div>
          <span className="text-sm font-medium" style={{ color: colors.ivory }}>
            bank.example.com
          </span>
        </div>
        <span 
          className="text-xs px-2 py-1 rounded"
          style={{ backgroundColor: `${colors.emerald}20`, color: colors.emerald }}
        >
          Strong
        </span>
      </div>
      
      <div 
        className="flex items-center justify-between p-3 rounded-lg mb-3"
        style={{ backgroundColor: `${colors.midnight}` }}
      >
        <code 
          className="font-mono text-sm tracking-wider"
          style={{ color: colors.goldLight }}
        >
          {revealed ? "xK9#mP2$vL7@nQ4" : "••••••••••••••••"}
        </code>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setRevealed(!revealed)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          >
            {revealed ? (
              <EyeOff className="w-4 h-4" style={{ color: colors.silver }} />
            ) : (
              <Eye className="w-4 h-4" style={{ color: colors.silver }} />
            )}
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          >
            {copied ? (
              <Check className="w-4 h-4" style={{ color: colors.emerald }} />
            ) : (
              <RefreshCw className="w-4 h-4" style={{ color: colors.silver }} />
            )}
          </button>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 text-xs" style={{ color: colors.muted }}>
        <span>Last updated: 2 days ago</span>
        <span>•</span>
        <span>Auto-fill enabled</span>
      </div>
    </div>
  );
};

// Main Landing Page Component
export const LandingPage: React.FC = () => {
  const [email, setEmail] = useState("");
  
  const handleStartTrial = () => {
    // Trial signup handled by backend API
    devLog("Trial signup - email:", email);
  };

  const handleDownload = (platform: string) => {
    // Download links open in new tab
    devLog("Download initiated:", platform);
  };

  return (
    <div 
      className="min-h-screen"
      style={{ 
        fontFamily: "'Outfit', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        
        .font-mono {
          font-family: Arial, Helvetica, sans-serif;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px ${colors.brandGold}40; }
          50% { box-shadow: 0 0 40px ${colors.brandGold}60; }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
        
        .animate-glow {
          animation: glow 3s ease-in-out infinite;
        }
        
        .text-gradient {
          background: linear-gradient(135deg, ${colors.brandGold} 0%, ${colors.goldLight} 50%, ${colors.steelBlue} 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Navigation */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl"
        style={{ 
          backgroundColor: `${colors.obsidian}95`,
          borderColor: `${colors.steel}30`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${colors.brandGold} 0%, ${colors.goldDark} 100%)`,
              }}
            >
              <Shield className="w-5 h-5" style={{ color: colors.midnight }} strokeWidth={2} />
            </div>
            <span 
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.ivory }}
            >
              Local Password Vault
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium transition-colors hover:text-white" style={{ color: colors.silver }}>
              Features
            </a>
            <a href="#security" className="text-sm font-medium transition-colors hover:text-white" style={{ color: colors.silver }}>
              Security
            </a>
            <a href="#pricing" className="text-sm font-medium transition-colors hover:text-white" style={{ color: colors.silver }}>
              Pricing
            </a>
            <a href="#download" className="text-sm font-medium transition-colors hover:text-white" style={{ color: colors.silver }}>
              Download
            </a>
          </div>
          
          <button
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: colors.brandGold,
              color: colors.midnight,
            }}
          >
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <ParticleField />
        
        {/* Gradient orbs */}
        <div 
          className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.brandGold }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: colors.steelBlue }}
        />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left content */}
            <div>
              <div 
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-6"
                style={{ 
                  backgroundColor: `${colors.brandGold}15`,
                  border: `1px solid ${colors.brandGold}30`,
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: colors.brandGold }} />
                <span className="text-sm font-medium" style={{ color: colors.goldLight }}>
                  100% Offline • Zero Cloud Storage
                </span>
              </div>
              
              <h1 
                className="text-5xl lg:text-7xl font-black leading-tight mb-6"
                style={{ color: colors.ivory }}
              >
                Your passwords.
                <br />
                <span className="text-gradient">Your device.</span>
                <br />
                Your control.
              </h1>
              
              <p 
                className="text-xl leading-relaxed mb-8 max-w-lg"
                style={{ color: colors.silver }}
              >
                The password manager that never sends your data anywhere. 
                AES-256 encryption. Built-in 2FA. Import from any manager.
                One price, forever yours.
              </p>
              
              {/* CTA Form */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                  <Mail 
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                    style={{ color: colors.muted }}
                  />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2"
                    style={{
                      backgroundColor: colors.slate,
                      border: `1px solid ${colors.steel}`,
                      color: colors.ivory,
                    }}
                  />
                </div>
                <button
                  onClick={handleStartTrial}
                  className="px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 animate-glow"
                  style={{
                    background: `linear-gradient(135deg, ${colors.brandGold} 0%, ${colors.goldDark} 100%)`,
                    color: colors.midnight,
                  }}
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              {/* Trust badges */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <WifiOff className="w-5 h-5" style={{ color: colors.emerald }} />
                  <span className="text-sm" style={{ color: colors.muted }}>100% Offline</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Lock className="w-5 h-5" style={{ color: colors.emerald }} />
                  <span className="text-sm" style={{ color: colors.muted }}>AES-256 Encrypted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" style={{ color: colors.emerald }} />
                  <span className="text-sm" style={{ color: colors.muted }}>One-time Purchase</span>
                </div>
              </div>
            </div>
            
            {/* Right content - App preview */}
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-3xl blur-2xl opacity-30"
                style={{ backgroundColor: colors.brandGold }}
              />
              <div
                className="relative rounded-3xl p-8 backdrop-blur-sm"
                style={{
                  backgroundColor: `${colors.midnight}90`,
                  border: `1px solid ${colors.steel}`,
                }}
              >
                {/* Mock app header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <AnimatedShield />
                  </div>
                </div>
                
                {/* Password entries demo */}
                <div className="space-y-4">
                  <PasswordDemo />
                  
                  <div
                    className="p-4 rounded-xl opacity-60"
                    style={{
                      backgroundColor: colors.obsidian,
                      border: `1px solid ${colors.steel}`,
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: `${colors.steelBlue}20` }}
                      />
                      <div className="flex-1">
                        <div 
                          className="h-3 rounded w-32 mb-2"
                          style={{ backgroundColor: colors.steel }}
                        />
                        <div 
                          className="h-2 rounded w-24"
                          style={{ backgroundColor: `${colors.steel}60` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div
                    className="p-4 rounded-xl opacity-40"
                    style={{
                      backgroundColor: colors.obsidian,
                      border: `1px solid ${colors.steel}`,
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: `${colors.emerald}20` }}
                      />
                      <div className="flex-1">
                        <div 
                          className="h-3 rounded w-28 mb-2"
                          style={{ backgroundColor: colors.steel }}
                        />
                        <div 
                          className="h-2 rounded w-20"
                          style={{ backgroundColor: `${colors.steel}60` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 border-y" style={{ borderColor: `${colors.steel}30` }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <AnimatedCounter end={256} suffix="-bit" label="AES Encryption" />
            <AnimatedCounter end={100000} suffix="" label="PBKDF2 Iterations" />
            <AnimatedCounter end={0} label="Data Sent to Cloud" />
            <AnimatedCounter end={6} suffix="+" label="Import Sources" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div 
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-6"
              style={{ 
                backgroundColor: `${colors.emerald}15`,
                border: `1px solid ${colors.emerald}30`,
              }}
            >
              <ShieldCheck className="w-4 h-4" style={{ color: colors.emerald }} />
              <span className="text-sm font-medium" style={{ color: colors.emerald }}>
                Professional-Grade Security
              </span>
            </div>
            <h2 
              className="text-4xl lg:text-5xl font-bold mb-4"
              style={{ color: colors.ivory }}
            >
              Everything you need.
              <br />
              <span className="text-gradient">Nothing you don't.</span>
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: colors.silver }}
            >
              Every feature designed with one goal: keeping your passwords 
              secure and accessible only to you. No bloat, no tracking, no compromises.
            </p>
          </div>
          
          {/* Core Security Features */}
          <div className="mb-12">
            <h3 
              className="text-sm font-semibold uppercase tracking-wider mb-6 flex items-center space-x-2"
              style={{ color: colors.brandGold }}
            >
              <Lock className="w-4 h-4" />
              <span>Core Security</span>
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<WifiOff className="w-6 h-6" />}
                title="100% Offline Architecture"
                description="Your passwords never leave your device. No servers, no cloud sync, no risk of mass data breaches. Period."
                highlight
              />
              <FeatureCard
                icon={<Lock className="w-6 h-6" />}
                title="AES-256-GCM Encryption"
                description="Military-grade encryption with PBKDF2 key derivation (100,000 iterations). The same standard used by governments."
              />
              <FeatureCard
                icon={<Fingerprint className="w-6 h-6" />}
                title="Built-in 2FA Authenticator"
                description="Generate TOTP codes for any account. Replace Google Authenticator—keep everything in one secure vault."
              />
            </div>
          </div>
          
          {/* Password Management Features */}
          <div className="mb-12">
            <h3 
              className="text-sm font-semibold uppercase tracking-wider mb-6 flex items-center space-x-2"
              style={{ color: colors.goldLight }}
            >
              <Key className="w-4 h-4" />
              <span>Smart Password Management</span>
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Zap className="w-6 h-6" />}
                title="Intelligent Password Generator"
                description="Create cryptographically secure passwords with customizable length, characters, and exclusions. Real-time strength analysis."
              />
              <FeatureCard
                icon={<History className="w-6 h-6" />}
                title="Complete Password History"
                description="Track every password change. Accidentally overwrote a password? Restore any previous version with one click."
              />
              <FeatureCard
                icon={<CalendarClock className="w-6 h-6" />}
                title="Password Age Monitoring"
                description="Dashboard alerts when passwords are over 90 days old. Visual indicators help you stay ahead of security risks."
              />
              <FeatureCard
                icon={<FolderKey className="w-6 h-6" />}
                title="Custom Fields"
                description="Add unlimited custom fields—PINs, security questions, recovery codes, notes. Your data, your structure."
              />
              <FeatureCard
                icon={<Undo2 className="w-6 h-6" />}
                title="5-Second Undo Delete"
                description="Accidentally deleted an entry? Quick undo toast gives you 5 seconds to restore it. No data loss stress."
              />
              <FeatureCard
                icon={<Clock className="w-6 h-6" />}
                title="Configurable Auto-Lock"
                description="Set your preferred inactivity timeout (1-60 minutes). Vault locks automatically to protect your data."
              />
            </div>
          </div>
          
          {/* Convenience Features */}
          <div className="mb-12">
            <h3 
              className="text-sm font-semibold uppercase tracking-wider mb-6 flex items-center space-x-2"
              style={{ color: colors.brandGoldLight }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Convenience and Accessibility</span>
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<QrCode className="w-6 h-6" />}
                title="Secure Mobile Access"
                description="View your vault on any phone via encrypted QR codes. Temporary tokens auto-expire. No app installation needed."
                highlight
              />
              <FeatureCard
                icon={<Import className="w-6 h-6" />}
                title="Import from Anywhere"
                description="Seamlessly import from LastPass, 1Password, Bitwarden, Dashlane, Keeper, or Chrome. Switch in minutes."
              />
              <FeatureCard
                icon={<RefreshCw className="w-6 h-6" />}
                title="Encrypted Backups"
                description="Create password-protected backup files. Restore on any device with your encryption password."
              />
              <FeatureCard
                icon={<Keyboard className="w-6 h-6" />}
                title="Keyboard Shortcuts"
                description="Power-user friendly with full keyboard navigation. Ctrl+N for new entry, Ctrl+F to search, and more."
              />
              <FeatureCard
                icon={<Globe className="w-6 h-6" />}
                title="Multi-Language Support"
                description="Available in English, German, Spanish, and French. More languages coming based on community requests."
              />
              <FeatureCard
                icon={<Database className="w-6 h-6" />}
                title="12-Word Recovery Phrase"
                description="BIP39 recovery phrase lets you recover your vault even if you forget your master password. Write it down, store it safely."
              />
            </div>
          </div>
          
          {/* Desktop Features */}
          <div>
            <h3 
              className="text-sm font-semibold uppercase tracking-wider mb-6 flex items-center space-x-2"
              style={{ color: colors.emerald }}
            >
              <Monitor className="w-4 h-4" />
              <span>Desktop Application</span>
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Smartphone className="w-6 h-6" />}
                title="Floating Mini-Vault"
                description="Quick-access floating panel stays on top of other windows. Copy passwords without switching apps."
                highlight
              />
              <FeatureCard
                icon={<Shield className="w-6 h-6" />}
                title="Secure Memory Handling"
                description="Sensitive data is wiped from memory after use. Clipboard auto-clears after copying passwords."
              />
              <FeatureCard
                icon={<RefreshCw className="w-6 h-6" />}
                title="License Transfer"
                description="Moving to a new computer? Transfer your license seamlessly. One device at a time, your choice which one."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24 px-6 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, ${colors.brandGold} 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 
                className="text-4xl lg:text-5xl font-bold mb-6"
                style={{ color: colors.ivory }}
              >
                Why offline is
                <br />
                <span className="text-gradient">the only way</span>
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.emerald}20` }}
                  >
                    <Check className="w-5 h-5" style={{ color: colors.emerald }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: colors.ivory }}>
                      No server = No breach target
                    </h3>
                    <p className="text-sm" style={{ color: colors.silver }}>
                      Cloud password managers are honeypots for hackers. We eliminate that risk entirely.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.emerald}20` }}
                  >
                    <Check className="w-5 h-5" style={{ color: colors.emerald }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: colors.ivory }}>
                      Zero-knowledge by design
                    </h3>
                    <p className="text-sm" style={{ color: colors.silver }}>
                      We don't just promise zero-knowledge—we literally can't access your data because we never have it.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.emerald}20` }}
                  >
                    <Check className="w-5 h-5" style={{ color: colors.emerald }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: colors.ivory }}>
                      Works without internet
                    </h3>
                    <p className="text-sm" style={{ color: colors.silver }}>
                      Access your passwords anytime, anywhere—even without connectivity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Security visualization */}
            <div className="relative">
              <div 
                className="rounded-3xl p-8"
                style={{
                  backgroundColor: colors.midnight,
                  border: `1px solid ${colors.steel}`,
                }}
              >
                <div className="text-center mb-8">
                  <div 
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-4"
                    style={{ backgroundColor: `${colors.brandGold}15` }}
                  >
                    <Shield className="w-4 h-4" style={{ color: colors.brandGold }} />
                    <span className="text-sm font-medium" style={{ color: colors.brandGold }}>
                      Your Security Stack
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    { label: 'AES-256 Encryption', icon: Lock, color: colors.brandGold },
                    { label: 'PBKDF2 Key Derivation', icon: Key, color: colors.goldLight },
                    { label: 'Secure Memory Handling', icon: Database, color: colors.emerald },
                    { label: 'Auto-Lock Protection', icon: Clock, color: colors.brandGoldLight },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-4 p-4 rounded-xl"
                      style={{ backgroundColor: `${colors.slate}50` }}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <item.icon className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      <span className="font-medium" style={{ color: colors.ivory }}>
                        {item.label}
                      </span>
                      <div className="flex-1" />
                      <Check className="w-5 h-5" style={{ color: colors.emerald }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Switch Section */}
      <section className="py-24 px-6" style={{ backgroundColor: `${colors.obsidian}` }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div 
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-6"
                style={{ 
                  backgroundColor: `${colors.goldLight}15`,
                  border: `1px solid ${colors.goldLight}30`,
                }}
              >
                <Import className="w-4 h-4" style={{ color: colors.goldLight }} />
                <span className="text-sm font-medium" style={{ color: colors.goldLight }}>
                  Easy Migration
                </span>
              </div>
              <h2 
                className="text-4xl lg:text-5xl font-bold mb-6"
                style={{ color: colors.ivory }}
              >
                Switching is
                <br />
                <span className="text-gradient">effortless</span>
              </h2>
              <p 
                className="text-lg mb-8"
                style={{ color: colors.silver }}
              >
                Import your existing passwords in minutes. We support all major 
                password managers so you can make the switch without the hassle.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  'LastPass',
                  '1Password', 
                  'Bitwarden',
                  'Dashlane',
                  'Keeper',
                  'Chrome'
                ].map((manager) => (
                  <div 
                    key={manager}
                    className="flex items-center space-x-3 p-3 rounded-lg"
                    style={{ backgroundColor: `${colors.slate}50` }}
                  >
                    <Check className="w-5 h-5" style={{ color: colors.emerald }} />
                    <span className="font-medium" style={{ color: colors.ivory }}>
                      {manager}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div 
              className="rounded-3xl p-8"
              style={{
                backgroundColor: colors.midnight,
                border: `1px solid ${colors.steel}`,
              }}
            >
              <h3 
                className="text-xl font-bold mb-6"
                style={{ color: colors.ivory }}
              >
                Why users are switching:
              </h3>
              
              <div className="space-y-4">
                {[
                  { title: 'LastPass breach concerns', desc: 'No cloud means no mass data exposure' },
                  { title: 'Rising subscription costs', desc: 'Pay once, own forever—no monthly fees' },
                  { title: 'Privacy first', desc: 'Your data stays on your device, always' },
                  { title: 'No vendor lock-in', desc: 'Export your data anytime in standard formats' },
                ].map((reason, i) => (
                  <div 
                    key={i}
                    className="flex items-start space-x-4 p-4 rounded-xl"
                    style={{ backgroundColor: `${colors.slate}30` }}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${colors.emerald}20` }}
                    >
                      <Check className="w-4 h-4" style={{ color: colors.emerald }} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1" style={{ color: colors.ivory }}>
                        {reason.title}
                      </h4>
                      <p className="text-sm" style={{ color: colors.silver }}>
                        {reason.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-4xl lg:text-5xl font-bold mb-4"
              style={{ color: colors.ivory }}
            >
              Trusted by security-conscious users
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="Finally, a password manager that doesn't require me to trust a third party with my most sensitive data. The built-in 2FA is a game-changer."
              author="Marcus Chen"
              role="Security Engineer"
              rating={5}
            />
            <TestimonialCard
              quote="After the LastPass breach, I imported everything in 5 minutes. Now my passwords never leave my laptop. This is what security should be."
              author="Sarah Mitchell"
              role="IT Consultant"
              rating={5}
            />
            <TestimonialCard
              quote="The one-time purchase sold me. No more $36/year subscriptions. Plus the password age alerts keep my team's credentials fresh."
              author="David Park"
              role="Small Business Owner"
              rating={5}
            />
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <TestimonialCard
              quote="The mobile QR access is brilliant. I can check a password on my phone without installing another app or syncing to the cloud."
              author="Jennifer Lopez"
              role="Remote Worker"
              rating={5}
            />
            <TestimonialCard
              quote="Imported 300+ passwords from 1Password seamlessly. The password history feature has already saved me twice when I accidentally overwrote credentials."
              author="Robert Kim"
              role="Software Developer"
              rating={5}
            />
            <TestimonialCard
              quote="My whole family uses the Family Vault. Everyone has their own secure storage, and I don't worry about data breaches anymore."
              author="Amanda Foster"
              role="Parent and Teacher"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-4xl lg:text-5xl font-bold mb-4"
              style={{ color: colors.ivory }}
            >
              One price. Forever yours.
            </h2>
            <p 
              className="text-lg"
              style={{ color: colors.silver }}
            >
              No subscriptions. No recurring fees. Pay once, use forever.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              title="Free Trial"
              price="$0"
              period="7 days"
              features={[
                "Full feature access",
                "Unlimited passwords",
                "Built-in 2FA authenticator",
                "Password generator",
                "Import from any manager",
                "No credit card required",
              ]}
              ctaText="Start Free Trial"
              onCta={() => {}}
            />
            <PricingCard
              title="Personal Vault"
              price="$49"
              period="one-time"
              features={[
                "Lifetime license—pay once",
                "1 device activation",
                "All security features",
                "Built-in 2FA authenticator",
                "Mobile access via QR",
                "Free updates forever",
                "License transfer included",
                "Email support",
              ]}
              popular
              ctaText="Buy Now"
              onCta={() => {}}
            />
            <PricingCard
              title="Family Vault"
              price="$79"
              period="one-time"
              features={[
                "5 device activations",
                "Share with family members",
                "All Personal Vault features",
                "Built-in 2FA for everyone",
                "License transfer per device",
                "Free updates forever",
                "Priority support",
              ]}
              ctaText="Buy Family Pack"
              onCta={() => {}}
            />
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div 
            className="rounded-3xl p-12 text-center relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${colors.brandGold}15 0%, ${colors.midnight} 50%, ${colors.goldDark}15 100%)`,
              border: `1px solid ${colors.brandGold}30`,
            }}
          >
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 blur-3xl opacity-30"
              style={{ backgroundColor: colors.brandGold }}
            />
            
            <div className="relative">
              <h2 
                className="text-4xl lg:text-5xl font-bold mb-4"
                style={{ color: colors.ivory }}
              >
                Ready to take control?
              </h2>
              <p 
                className="text-lg mb-10 max-w-xl mx-auto"
                style={{ color: colors.silver }}
              >
                Download Local Password Vault and experience true password security. 
                Available for Windows, macOS, and Linux.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => handleDownload('windows')}
                  className="flex items-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: colors.brandGold,
                    color: colors.ivory,
                  }}
                >
                  <Monitor className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Download for</div>
                    <div className="font-semibold">Windows</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleDownload('macos')}
                  className="flex items-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: colors.slate,
                    border: `1px solid ${colors.steel}`,
                    color: colors.ivory,
                  }}
                >
                  <Apple className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Download for</div>
                    <div className="font-semibold">macOS</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleDownload('linux')}
                  className="flex items-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: colors.slate,
                    border: `1px solid ${colors.steel}`,
                    color: colors.ivory,
                  }}
                >
                  <Terminal className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Download for</div>
                    <div className="font-semibold">Linux</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t" style={{ borderColor: `${colors.steel}30` }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.brandGold} 0%, ${colors.goldDark} 100%)`,
                  }}
                >
                  <Shield className="w-5 h-5" style={{ color: colors.midnight }} strokeWidth={2} />
                </div>
                <span 
                  className="text-lg font-bold"
                  style={{ color: colors.ivory }}
                >
                  Local Password Vault
                </span>
              </div>
              <p className="text-sm" style={{ color: colors.muted }}>
                Your passwords. Your device. Your control.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4" style={{ color: colors.ivory }}>Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm hover:text-white transition-colors" style={{ color: colors.muted }}>Features</a></li>
                <li><a href="#security" className="text-sm hover:text-white transition-colors" style={{ color: colors.muted }}>Security</a></li>
                <li><a href="#pricing" className="text-sm hover:text-white transition-colors" style={{ color: colors.muted }}>Pricing</a></li>
                <li><a href="#download" className="text-sm hover:text-white transition-colors" style={{ color: colors.muted }}>Download</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4" style={{ color: colors.ivory }}>Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm hover:text-white transition-colors" style={{ color: colors.muted }}>Help Center</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors" style={{ color: colors.muted }}>Contact Us</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors" style={{ color: colors.muted }}>FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4" style={{ color: colors.ivory }}>Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm hover:text-white transition-colors" style={{ color: colors.muted }}>Privacy Policy</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors" style={{ color: colors.muted }}>Terms of Service</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors" style={{ color: colors.muted }}>EULA</a></li>
              </ul>
            </div>
          </div>
          
          <div 
            className="pt-8 border-t flex flex-col md:flex-row items-center justify-between"
            style={{ borderColor: `${colors.steel}30` }}
          >
            <p className="text-sm" style={{ color: colors.muted }}>
              © 2025 Local Password Vault. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <a 
                href="mailto:support@localpasswordvault.com"
                className="text-sm flex items-center space-x-1 hover:text-white transition-colors"
                style={{ color: colors.muted }}
              >
                <Mail className="w-4 h-4" />
                <span>support@localpasswordvault.com</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

