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
} from "lucide-react";

// Distinctive color palette - deep, trustworthy, premium feel
const colors = {
  // Primary palette
  obsidian: "#0a0e17",
  midnight: "#111827",
  slate: "#1e293b",
  steel: "#334155",
  
  // Accent colors
  electric: "#3b82f6",
  electricLight: "#60a5fa",
  electricDark: "#1d4ed8",
  
  // Warm accents
  amber: "#f59e0b",
  amberLight: "#fbbf24",
  
  // Text
  ivory: "#f8fafc",
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
            backgroundColor: colors.electric,
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
        style={{ backgroundColor: colors.electric }}
      />
      <div 
        className="relative w-32 h-32 rounded-2xl flex items-center justify-center"
        style={{ 
          background: `linear-gradient(135deg, ${colors.electric}20 0%, ${colors.electricDark}20 100%)`,
          border: `2px solid ${colors.electric}40`,
          boxShadow: `0 0 60px ${colors.electric}30`,
        }}
      >
        <Shield 
          className="w-16 h-16 animate-pulse" 
          style={{ color: colors.electric }}
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
        backgroundColor: highlight ? `${colors.electric}10` : `${colors.slate}50`,
        border: `1px solid ${highlight ? colors.electric : colors.steel}40`,
      }}
    >
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${colors.electric}10 0%, transparent 70%)`,
        }}
      />
      <div className="relative">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
          style={{ 
            backgroundColor: highlight ? `${colors.electric}20` : `${colors.steel}50`,
            color: highlight ? colors.electric : colors.electricLight,
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
        border: `2px solid ${popular ? colors.electric : colors.steel}`,
        boxShadow: popular ? `0 0 60px ${colors.electric}20` : 'none',
      }}
    >
      {popular && (
        <div 
          className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          style={{ 
            backgroundColor: colors.electric,
            color: colors.ivory,
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
          style={{ color: popular ? colors.electric : colors.ivory }}
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
              style={{ color: colors.emerald }}
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
          backgroundColor: popular ? colors.electric : 'transparent',
          color: popular ? colors.ivory : colors.electric,
          border: popular ? 'none' : `2px solid ${colors.electric}`,
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
            style={{ color: colors.amber }}
          />
        ))}
      </div>
      <Quote 
        className="w-8 h-8 mb-3 opacity-30" 
        style={{ color: colors.electric }}
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
        style={{ color: colors.electric }}
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
            style={{ backgroundColor: `${colors.electric}20` }}
          >
            <Key className="w-4 h-4" style={{ color: colors.electric }} />
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
          style={{ color: colors.electricLight }}
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
    if (import.meta.env.DEV) {
      console.log("Trial signup - email:", email);
    }
  };
  
  const handleDownload = (platform: string) => {
    // Download links open in new tab
    if (import.meta.env.DEV) {
      console.log("Download initiated:", platform);
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: colors.obsidian,
        fontFamily: "'Outfit', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px ${colors.electric}40; }
          50% { box-shadow: 0 0 40px ${colors.electric}60; }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
        
        .animate-glow {
          animation: glow 3s ease-in-out infinite;
        }
        
        .text-gradient {
          background: linear-gradient(135deg, ${colors.electric} 0%, ${colors.electricLight} 50%, ${colors.amber} 100%);
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
                background: `linear-gradient(135deg, ${colors.electric} 0%, ${colors.electricDark} 100%)`,
              }}
            >
              <Shield className="w-5 h-5 text-white" strokeWidth={2} />
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
              backgroundColor: colors.electric,
              color: colors.ivory,
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
          style={{ backgroundColor: colors.electric }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: colors.amber }}
        />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left content */}
            <div>
              <div 
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-6"
                style={{ 
                  backgroundColor: `${colors.electric}15`,
                  border: `1px solid ${colors.electric}30`,
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: colors.amber }} />
                <span className="text-sm font-medium" style={{ color: colors.electricLight }}>
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
                Military-grade encryption. Complete privacy. No subscriptions.
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
                    background: `linear-gradient(135deg, ${colors.electric} 0%, ${colors.electricDark} 100%)`,
                    color: colors.ivory,
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
                style={{ backgroundColor: colors.electric }}
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
                        style={{ backgroundColor: `${colors.amber}20` }}
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
            <AnimatedCounter end={0} label="Cloud Servers" />
            <AnimatedCounter end={0} label="Data We Store" />
            <AnimatedCounter end={100} suffix="%" label="Offline Privacy" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-4xl lg:text-5xl font-bold mb-4"
              style={{ color: colors.ivory }}
            >
              Security without compromise
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: colors.silver }}
            >
              Every feature designed with one goal: keeping your passwords 
              secure and accessible only to you.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<WifiOff className="w-6 h-6" />}
              title="100% Offline"
              description="Your passwords never leave your device. No servers, no cloud, no risk of online breaches."
              highlight
            />
            <FeatureCard
              icon={<Lock className="w-6 h-6" />}
              title="AES-256 Encryption"
              description="Military-grade encryption protects your data. Even if someone gets your file, they can't read it."
            />
            <FeatureCard
              icon={<Fingerprint className="w-6 h-6" />}
              title="2FA Authenticator Built-in"
              description="Generate TOTP codes for two-factor authentication. No separate app needed."
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Auto-Lock & Undo"
              description="Auto-locks after inactivity. Accidentally delete something? 5-second undo to restore it."
            />
            <FeatureCard
              icon={<Database className="w-6 h-6" />}
              title="Password History"
              description="Track all previous passwords. Restore old passwords anytime with one click."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Password Generator"
              description="Create strong, unique passwords instantly. Visual strength meter shows security level."
            />
          </div>
          
          {/* Second row of features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <FeatureCard
              icon={<RefreshCw className="w-6 h-6" />}
              title="Secure Backup"
              description="Create encrypted backups. Restore on any device with your master password."
            />
            <FeatureCard
              icon={<CalendarClock className="w-6 h-6" />}
              title="Password Age Alerts"
              description="Dashboard warns when passwords are over 90 days old. Stay ahead of security risks."
            />
            <FeatureCard
              icon={<Key className="w-6 h-6" />}
              title="Custom Fields"
              description="Add any field to entries—PINs, security questions, notes. You control the data."
            />
          </div>
          
          {/* Third row of features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <FeatureCard
              icon={<Smartphone className="w-6 h-6" />}
              title="Mobile Access"
              description="View your vault on your phone with secure QR codes. Temporary tokens auto-expire for safety."
              highlight
            />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24 px-6 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, ${colors.electric} 1px, transparent 0)`,
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
                    style={{ backgroundColor: `${colors.electric}15` }}
                  >
                    <Shield className="w-4 h-4" style={{ color: colors.electric }} />
                    <span className="text-sm font-medium" style={{ color: colors.electric }}>
                      Your Security Stack
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    { label: 'AES-256 Encryption', icon: Lock, color: colors.electric },
                    { label: 'PBKDF2 Key Derivation', icon: Key, color: colors.amber },
                    { label: 'Secure Memory Handling', icon: Database, color: colors.emerald },
                    { label: 'Auto-Lock Protection', icon: Clock, color: colors.electricLight },
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
              quote="Finally, a password manager that doesn't require me to trust a third party with my most sensitive data. Pure genius."
              author="Marcus Chen"
              role="Security Engineer"
              rating={5}
            />
            <TestimonialCard
              quote="After the LastPass breach, I knew I needed something different. This is exactly what I was looking for—total control."
              author="Sarah Mitchell"
              role="Privacy Advocate"
              rating={5}
            />
            <TestimonialCard
              quote="The one-time purchase model is refreshing. No monthly fees, no upsells, just solid security that works."
              author="David Park"
              role="Small Business Owner"
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
                "Password generator",
                "Secure notes",
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
                "Lifetime license",
                "1 device activation",
                "All security features",
                "Free updates forever",
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
                "Perfect for families",
                "All security features",
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
              background: `linear-gradient(135deg, ${colors.electric}15 0%, ${colors.midnight} 50%, ${colors.electricDark}15 100%)`,
              border: `1px solid ${colors.electric}30`,
            }}
          >
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 blur-3xl opacity-30"
              style={{ backgroundColor: colors.electric }}
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
                    backgroundColor: colors.electric,
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
                    background: `linear-gradient(135deg, ${colors.electric} 0%, ${colors.electricDark} 100%)`,
                  }}
                >
                  <Shield className="w-5 h-5 text-white" strokeWidth={2} />
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

