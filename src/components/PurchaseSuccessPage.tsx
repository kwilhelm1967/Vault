import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Download,
  Copy,
  Check,
  Shield,
  Key,
  Monitor,
  Apple,
  Terminal,
  ExternalLink,
  Mail,
} from "lucide-react";
import environment from "../config/environment";
import { LoadingSpinner } from "./LoadingSpinner";
import { getDownloadUrl } from "../config/downloadUrls";

// CSS for checkmark animation
const checkmarkStyles = `
  @keyframes checkmarkAppear {
    0% {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    60% {
      transform: scale(1.05) rotate(5deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }
`;

// Color palette matching trial success page design
const colors = {
  bgDark: "#0a0f1a",
  bgDarker: "#060912",
  bgCard: "#111827", // Card background matching trial page
  bgContainer: "transparent", // Transparent container background
  cyan: "#06b6d4",
  cyanLight: "#22d3ee",
  cyanDark: "#0891b2",
  cyanGlow: "rgba(6, 182, 212, 0.3)",
  green: "#10b981",
  greenDark: "#059669",
  textPrimary: "#f9fafb",
  textSecondary: "#9ca3af",
  textMuted: "#6b7280",
  borderSubtle: "rgba(255, 255, 255, 0.08)",
  gradientCyan: "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
};

interface PlatformDownload {
  id: string;
  name: string;
  icon: React.ReactNode;
  fileType: string;
  fileSize: string;
  requirements: string;
  downloadUrl: string;
}

interface ProductLicense {
  licenseKey: string;
  planType: string;
  productType: string;
  maxDevices: number;
}

interface ProductGroup {
  productType: string;
  productName: string;
  licenses: ProductLicense[];
  downloadBaseUrl: string;
}

const getPlatforms = (baseUrl: string, productType: string = 'lpv'): PlatformDownload[] => {
  // Determine product type for download URLs
  const downloadProductType = productType === 'llv' ? 'llv' : 'lpv';
  
  return [
    {
      id: "windows",
      name: "Windows",
      icon: <Monitor className="w-6 h-6" />,
      fileType: ".exe installer",
      fileSize: "~85 MB",
      requirements: "Windows 10 or later (64-bit)",
      downloadUrl: getDownloadUrl('windows', downloadProductType),
    },
    {
      id: "macos",
      name: "macOS",
      icon: <Apple className="w-6 h-6" />,
      fileType: ".dmg installer",
      fileSize: "~95 MB",
      requirements: "macOS 10.15 (Catalina) or later",
      downloadUrl: getDownloadUrl('macos', downloadProductType),
    },
    {
      id: "linux",
      name: "Linux",
      icon: <Terminal className="w-6 h-6" />,
      fileType: ".AppImage",
      fileSize: "~90 MB",
      requirements: "Ubuntu 18.04+ or equivalent",
      downloadUrl: getDownloadUrl('linux', downloadProductType),
    },
  ];
};

// Detect user's operating system
const getOS = (): string => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes("win")) return "windows";
  if (userAgent.includes("mac")) return "macos";
  if (userAgent.includes("linux")) return "linux";
  return "windows";
};

export const PurchaseSuccessPage: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null); // Track by key string for bundles
  const [licenseKeys, setLicenseKeys] = useState<string[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [isBundle, setIsBundle] = useState<boolean>(false);
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [planName, setPlanName] = useState<string>("Lifetime License");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const detectedOS = getOS();
  
  // Local Password Vault - no LLV domain detection needed
  const defaultProductType = 'lpv';
  const defaultProductName = 'Local Password Vault';
  const defaultWebsiteUrl = 'https://localpasswordvault.com';

  // Hide textured background pattern on purchase success page
  useEffect(() => {
    document.body.classList.add('purchase-success-page');
    return () => {
      document.body.classList.remove('purchase-success-page');
    };
  }, []);

  // Fetch session data or extract keys from URL
  useEffect(() => {
    const loadLicenseKeys = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get("session_id");
        
        // If session_id is present, try to fetch license keys from backend
        if (sessionId && sessionId.startsWith("cs_")) {
          try {
            const data = await fetchSessionData(sessionId);
            if (data) {
              // Data processing happens inside fetchSessionData
              return;
            }
          } catch (fetchError) {
            // If backend fetch fails (e.g., backend not running), fall back to test data
            // This allows testing the page without a backend
            if (sessionId.includes("test") || sessionId.includes("demo")) {
              // Use test/demo data for development
              const isBundle = urlParams.get("bundle") === "true" || sessionId.includes("bundle");
              const isFamily = urlParams.get("family") === "true" || sessionId.includes("family");
              
              if (isBundle) {
                // Mock bundle data
                setProductGroups([
                  {
                    productType: 'lpv',
                    productName: 'Local Password Vault',
                    licenses: [
                      { licenseKey: 'PERS-TEST-1234-5678', planType: 'personal', productType: 'lpv', maxDevices: 1 },
                      { licenseKey: 'FAMI-TEST-ABCD-EFGH', planType: 'family', productType: 'lpv', maxDevices: 1 },
                    ],
                    downloadBaseUrl: 'https://localpasswordvault.com',
                  },
                  {
                    productType: 'lpv',
                    productName: 'Local Password Vault',
                    licenses: [
                      { licenseKey: 'PERS-TEST-1234-5678', planType: 'personal', productType: 'lpv', maxDevices: 1 },
                    ],
                    downloadBaseUrl: 'https://localpasswordvault.com',
                  },
                ]);
                setLicenseKeys(['PERS-TEST-1234-5678', 'FAMI-TEST-ABCD-EFGH']);
                setIsBundle(true);
                setPlanName("Bundle Purchase");
                setCustomerEmail("test@example.com");
              } else if (isFamily) {
                // Mock family plan (5 keys)
                const familyKeys = [
                  'FAMI-TEST-KEY1-ABCD-EFGH',
                  'FAMI-TEST-KEY2-IJKL-MNOP',
                  'FAMI-TEST-KEY3-QRST-UVWX',
                  'FAMI-TEST-KEY4-YZ12-3456',
                  'FAMI-TEST-KEY5-7890-ABCD',
                ];
                setLicenseKeys(familyKeys);
                setProductGroups([{
                  productType: 'lpv',
                  productName: 'Local Password Vault',
                  licenses: familyKeys.map(key => ({
                    licenseKey: key,
                    planType: 'family',
                    productType: 'lpv',
                    maxDevices: 1,
                  })),
                  downloadBaseUrl: 'https://localpasswordvault.com',
                }]);
                setIsBundle(false);
                setPlanName("Family Vault");
                setCustomerEmail("test@example.com");
              } else {
                // Mock single purchase
                setLicenseKeys(['PERS-TEST-1234-5678-9012']);
                setProductGroups([{
                  productType: 'lpv',
                  productName: 'Local Password Vault',
                  licenses: [{
                    licenseKey: 'PERS-TEST-1234-5678-9012',
                    planType: 'personal',
                    productType: 'lpv',
                    maxDevices: 1,
                  }],
                  downloadBaseUrl: 'https://localpasswordvault.com',
                }]);
                setIsBundle(false);
                setPlanName("Personal Vault");
                setCustomerEmail("test@example.com");
              }
              return;
            }
            // Re-throw if not a test session
            throw fetchError;
          }
        }
        
        // Otherwise, extract keys from URL params (legacy support)
        extractKeysFromURL(urlParams);
      } catch (err: any) {
        // Error handled via setError - no console output needed
        const supportEmail = 'support@localpasswordvault.com';
        const errorMessage = err?.message || `Failed to load license keys. Please check your email or contact ${supportEmail}`;
        setError(errorMessage);
      } finally {
        // CRITICAL FIX: Always set loading to false, even on error
        // This prevents infinite spinner
        setIsLoading(false);
      }
    };
    
    loadLicenseKeys();
  }, []);

  const fetchSessionData = async (sessionId: string) => {
    try {
      // Use apiClient for better error handling and retry logic
      const { apiClient } = await import("../utils/apiClient");
      
      // CRITICAL FIX: Add timeout and better error handling to prevent infinite spinner
      const response = await Promise.race([
        apiClient.get<{
          success: boolean;
          pending?: boolean;
          isBundle?: boolean;
          data?: any;
          error?: string;
        }>(
          `/api/checkout/session/${sessionId}`,
          {
            retries: 2, // Reduced from 5 to fail faster
            timeout: 10000, // Reduced from 60s to 10s to prevent long waits
          }
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
      ]) as Awaited<ReturnType<typeof apiClient.get>>;
      
      const data = response.data;
      
      if (!data.success) {
        if (data.pending) {
          setError("Your purchase is being processed. This may take a few moments. Please check your email for your license keys, or refresh this page in a minute.");
          return null;
        }
        throw new Error(data.error || "Failed to retrieve license keys");
      }
      
      // Handle bundle purchase (multiple licenses from different products)
      if (data.isBundle && data.data?.licenses) {
        setIsBundle(true);
        const allKeys: string[] = [];
        const groups: { [key: string]: ProductLicense[] } = {};
        
        // Group licenses by product type
        data.data.licenses.forEach((license: ProductLicense) => {
          allKeys.push(license.licenseKey);
          const productType = license.productType || 'lpv';
          if (!groups[productType]) {
            groups[productType] = [];
          }
          groups[productType].push(license);
        });
        
        setLicenseKeys(allKeys);
        
        // Create product groups with download URLs
        // NOTE: Always show direct download links - never redirect to websites
        // Both LPV and LLV purchases get direct application download links from GitHub releases
        const productGroupsList: ProductGroup[] = [];
        if (groups['lpv']) {
          productGroupsList.push({
            productType: 'lpv',
            productName: 'Local Password Vault',
            licenses: groups['lpv'],
            downloadBaseUrl: 'https://localpasswordvault.com',
          });
        }
        // LLV purchases get direct download links to LLV application from GitHub releases
        if (groups['llv']) {
          productGroupsList.push({
            productType: 'llv',
            productName: 'Local Legacy Vault',
            licenses: groups['llv'],
            downloadBaseUrl: 'https://locallegacyvault.com',
          });
        }
        
        setProductGroups(productGroupsList);
        
        // Set plan name for bundle
        if (allKeys.length >= 5) {
          setPlanName("Family Protection Bundle");
        } else {
          setPlanName("Bundle Purchase");
        }
      } 
      // Handle family plan (multiple licenses for same product - 5 keys)
      else if (data.data?.licenses && Array.isArray(data.data.licenses) && data.data.licenses.length > 1) {
        setIsBundle(false);
        const allKeys = data.data.licenses.map((license: any) => license.licenseKey || license.license_key);
        setLicenseKeys(allKeys);
        
        // Determine product type (all licenses should be same product type)
        const productType = data.data.licenses[0]?.productType || 'lpv';
        const planType = data.data.licenses[0]?.planType || 'family';
        
        setPlanName(planType === "family" ? "Family Vault" : "Multi-Device License");
        
        setProductGroups([{
          productType: productType,
          productName: 'Local Password Vault',
          licenses: data.data.licenses.map((license: any) => ({
            licenseKey: license.licenseKey || license.license_key,
            planType: license.planType || planType,
            productType: license.productType || productType,
            maxDevices: license.maxDevices || license.max_devices || 1,
          })),
          downloadBaseUrl: 'https://localpasswordvault.com',
        }]);
      }
      // Handle single purchase
      else if (data.data?.licenseKey) {
        setIsBundle(false);
        setLicenseKeys([data.data.licenseKey]);
        setPlanName(data.data.planType === "family" ? "Family Vault" : "Personal Vault");
        
        // Determine product type for single purchase (default to LPV)
        const productType = data.data.productType || 'lpv';
        const productName = productType === 'llv' ? 'Local Legacy Vault' : 'Local Password Vault';
        const downloadBaseUrl = productType === 'llv' ? 'https://locallegacyvault.com' : 'https://localpasswordvault.com';
        
        setProductGroups([{
          productType: productType,
          productName: productName,
          licenses: [{
            licenseKey: data.data.licenseKey,
            planType: data.data.planType,
            productType: productType,
            maxDevices: data.data.maxDevices || 1,
          }],
          downloadBaseUrl: downloadBaseUrl,
        }]);
      }
      
      // Set email if available
      if (data.data?.email) {
        setCustomerEmail(data.data.email);
      }
      
      return data;
    } catch (err: any) {
      // Handle API errors with better messages
      if (err && typeof err === 'object' && 'code' in err) {
        const apiError = err as { code: string; message: string };
        if (apiError.code === 'NETWORK_ERROR' || apiError.code === 'REQUEST_TIMEOUT') {
          setError("Unable to connect to the server. Please check your internet connection and try again, or check your email for your license keys.");
          return null;
        }
      }
      throw err;
    }
  };

  const extractKeysFromURL = (urlParams: URLSearchParams) => {
    // Support multiple keys: ?keys=KEY1,KEY2,KEY3 or ?key=KEY1&key2=KEY2&key3=KEY3
    const keysParam = urlParams.get("keys");
    const singleKey = urlParams.get("key") || urlParams.get("license") || urlParams.get("licenseKey");
    
    const keys: string[] = [];
    
    if (keysParam) {
      // Comma-separated keys
      keys.push(...keysParam.split(",").map(k => k.trim()).filter(k => k));
    } else if (singleKey) {
      keys.push(singleKey);
      // Check for additional numbered keys (key2, key3, etc.)
      for (let i = 2; i <= 10; i++) {
        const additionalKey = urlParams.get(`key${i}`);
        if (additionalKey) {
          keys.push(additionalKey);
        }
      }
    }
    
    setLicenseKeys(keys);
    
    const email = urlParams.get("email");
    const plan = urlParams.get("plan");

    if (email) {
      setCustomerEmail(decodeURIComponent(email));
    }
    if (plan) {
      setPlanName(decodeURIComponent(plan));
    }
    if (!plan) {
      // Set plan name based on key count if not provided
      if (keys.length >= 5) {
        setPlanName("Family Vault");
      } else if (keys.length > 1) {
        setPlanName("Bundle Purchase");
      } else {
        setPlanName("Personal Vault");
      }
    }
    
    // CRITICAL FIX: Set product groups based on license key prefix
    // LLV keys start with 'LLVP' or 'LLVF', LPV keys start with 'PERS' or 'FMLY'
    if (keys.length > 0) {
      // Detect product type from first key prefix
      // LLV keys: LLVP, LLVF, LLVT (trial)
      // LPV keys: PERS, FMLY, TRIA (trial)
      const firstKey = keys[0].toUpperCase();
      const isLLV = firstKey.startsWith('LLVP') || firstKey.startsWith('LLVF') || firstKey.startsWith('LLVT');
      const productType = isLLV ? 'llv' : 'lpv';
      const productName = isLLV ? 'Local Legacy Vault' : 'Local Password Vault';
      const downloadBaseUrl = isLLV ? 'https://locallegacyvault.com' : 'https://localpasswordvault.com';
      
      setProductGroups([{
        productType: productType,
        productName: productName,
        licenses: keys.map(key => {
          const upperKey = key.toUpperCase();
          let planType = 'personal';
          let detectedProductType = 'lpv';
          
          if (upperKey.startsWith('FMLY')) {
            planType = 'family';
            detectedProductType = 'lpv';
          } else if (upperKey.startsWith('PERS')) {
            planType = 'personal';
            detectedProductType = 'lpv';
          } else if (upperKey.startsWith('LLVF')) {
            planType = 'llv_family';
            detectedProductType = 'llv';
          } else if (upperKey.startsWith('LLVP')) {
            planType = 'llv_personal';
            detectedProductType = 'llv';
          } else if (upperKey.startsWith('LLVT')) {
            // LLV trial key
            planType = 'trial';
            detectedProductType = 'llv';
          } else if (upperKey.startsWith('TRIA')) {
            // LPV trial key
            planType = 'trial';
            detectedProductType = 'lpv';
          }
          
          return {
            licenseKey: key,
            planType: planType,
            productType: detectedProductType,
            maxDevices: 1,
          };
        }),
        downloadBaseUrl: downloadBaseUrl,
      }]);
    }
  };

  const handleCopyKey = async (key: string, index: number) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedIndex(index);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedIndex(null);
        setCopiedKey(null);
      }, 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = key;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedIndex(index);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedIndex(null);
        setCopiedKey(null);
      }, 2000);
    }
  };

  const handleCopyAllKeys = async () => {
    if (licenseKeys.length === 0) return;
    
    const allKeys = licenseKeys.join("\n");
    try {
      await navigator.clipboard.writeText(allKeys);
      setCopiedIndex(-1); // -1 indicates "all copied"
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = allKeys;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleDownload = (platform: PlatformDownload) => {
    window.open(platform.downloadUrl, "_blank");
  };

  const handleCopyProductKeys = async (keys: string[]) => {
    const allKeys = keys.join("\n");
    try {
      await navigator.clipboard.writeText(allKeys);
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = allKeys;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Sort platforms to show detected OS first
  const getSortedPlatforms = (baseUrl: string, productType: string = 'lpv') => {
    const platforms = getPlatforms(baseUrl, productType);
    return [...platforms].sort((a, b) => {
      if (a.id === detectedOS) return -1;
      if (b.id === detectedOS) return 1;
      return 0;
    });
  };

  return (
    <>
      <style>{`
        ${checkmarkStyles}
        /* Hide textured background pattern on purchase success page */
        body.purchase-success-page::before {
          display: none !important;
        }
      `}</style>
      <div
        className="min-h-screen flex flex-col purchase-success-page"
        style={{ 
          background: colors.bgDarker,
          fontFamily: "'Inter', sans-serif"
        }}
      >
      {/* Header */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 py-4 px-6"
        style={{ 
          background: "rgba(6, 9, 18, 0.95)", 
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${colors.borderSubtle}`
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-11 h-11 rounded-[10px] flex items-center justify-center"
              style={{ 
                backgroundColor: colors.bgDark, 
                boxShadow: `0 4px 12px ${colors.cyanGlow}, inset 0 0 0 1px ${colors.cyanDark}` 
              }}
            >
              <Shield className="w-6 h-6" style={{ color: colors.cyan }} />
            </div>
            <span className="text-lg font-semibold" style={{ color: colors.textPrimary, fontFamily: "'Space Grotesk', sans-serif" }}>
              {defaultProductName}
            </span>
          </div>
          <a
            href={defaultWebsiteUrl}
            className="text-sm flex items-center space-x-1 transition-colors px-3 py-2 rounded-lg font-semibold"
            style={{ 
              background: colors.gradientCyan,
              color: colors.bgDarker
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Visit Website</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main 
        className="flex-1 flex items-center justify-center pt-[120px] pb-10 px-6"
        style={{
          background: `linear-gradient(180deg, ${colors.bgDark} 0%, ${colors.bgDarker} 100%)`,
        }}
      >
        <div className="max-w-[650px] w-full">
          {/* Success Card Container */}
          <div
            className="rounded-[20px] p-6 md:p-7 text-center"
            style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.borderSubtle}`,
            }}
          >
            {/* Success Icon */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ 
                background: colors.gradientCyan,
                boxShadow: `0 8px 32px ${colors.cyanGlow}, 0 0 0 1px rgba(6, 182, 212, 0.2)`,
              }}
            >
              <svg 
                className="w-7 h-7" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* Title */}
            <h1 
              className="text-2xl md:text-[1.75rem] font-bold mb-1.5 md:mb-2"
              style={{ 
                color: colors.textPrimary,
                fontFamily: "'Space Grotesk', sans-serif"
              }}
            >
              {isBundle ? "You're All Set!" : "Thank You for Your Purchase!"}
            </h1>
            <p 
              className="text-[0.95rem] mb-5"
              style={{ color: colors.textSecondary }}
            >
              {isBundle 
                ? `Your ${planName} is ready. Download your applications below.`
                : `Your ${planName} is ready. Download the application below.`}
            </p>

          {/* Loading State */}
          {isLoading && (
            <div
              className="rounded-[20px] p-8 mb-8"
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${colors.borderSubtle}`,
                backdropFilter: 'blur(10px)',
              }}
            >
              <LoadingSpinner size="lg" text="Loading your license keys..." />
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div
              className="rounded-[20px] p-6 mb-8"
              style={{
                backgroundColor: colors.bgCard,
                border: `1px solid #EF444440`,
                backdropFilter: 'blur(10px)',
              }}
            >
              <p style={{ color: "#EF4444", marginBottom: "8px", fontWeight: 600 }}>Error</p>
              <p style={{ color: colors.textSecondary, fontSize: "14px" }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: colors.gradientCyan,
                  color: colors.bgDarker,
                }}
              >
                Refresh Page
              </button>
            </div>
          )}

            {/* Bundle: Product Groups */}
            {!isLoading && !error && isBundle && productGroups.length > 0 && (
              <div className="mb-5">
                <div 
                  className="mb-5 p-4 rounded-[12px]" 
                  style={{ 
                    background: `linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)`,
                    border: `1px solid ${colors.cyanDark}`
                  }}
                >
                  <h2 
                    className="text-xl font-bold mb-2"
                    style={{ 
                      color: colors.textPrimary,
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}
                  >
                    {planName}
                  </h2>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    You've purchased {productGroups.length} {productGroups.length === 1 ? 'product' : 'products'} with {licenseKeys.length} total license {licenseKeys.length === 1 ? 'key' : 'keys'}
                  </p>
                </div>
              </div>
            )}

            {!isLoading && !error && isBundle && productGroups.length > 0 && productGroups.map((group, groupIndex) => {
            const groupKeys = group.licenses.map(l => l.licenseKey);
            const sortedPlatforms = getSortedPlatforms(group.downloadBaseUrl, group.productType);
            const isFamilyPlan = groupKeys.length >= 5;
            
            return (
              <div 
                key={group.productType} 
                className={`mb-5 ${groupIndex > 0 ? 'pt-5' : ''}`}
                style={groupIndex > 0 ? { borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: '20px' } : {}}
              >
                {/* Product Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ 
                        backgroundColor: colors.bgDark, 
                        boxShadow: `0 4px 12px ${colors.cyanGlow}, inset 0 0 0 1px ${colors.cyanDark}` 
                      }}
                    >
                      <Shield className="w-5 h-5" style={{ color: colors.cyan }} />
                    </div>
                    <div>
                      <h2 
                        className="text-xl font-semibold"
                        style={{ 
                          color: colors.textPrimary,
                          fontFamily: "'Space Grotesk', sans-serif"
                        }}
                      >
                        {group.productName}
                      </h2>
                      <p className="text-sm" style={{ color: colors.textMuted }}>
                        {group.licenses.length === 1 
                          ? "1 license key" 
                          : `${group.licenses.length} license keys`}
                        {isFamilyPlan && " • Family Plan"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* License Keys for this Product */}
                <div
                  className="rounded-[12px] p-4 mb-5"
                  style={{
                    backgroundColor: colors.bgDarker,
                    border: `1px solid ${colors.cyanDark}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ 
                          background: colors.gradientCyan,
                          boxShadow: `0 4px 12px ${colors.cyanGlow}`
                        }}
                      >
                        <Key className="w-4 h-4" style={{ color: colors.bgDarker }} />
                      </div>
                      <div>
                        <h3 
                          className="text-base font-semibold"
                          style={{ 
                            color: colors.textPrimary,
                            fontFamily: "'Space Grotesk', sans-serif"
                          }}
                        >
                          {groupKeys.length === 1 ? "Your License Key" : `Your ${groupKeys.length} License Keys`}
                        </h3>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          {groupKeys.length === 1 
                            ? "Save this key — you'll need it to activate the app"
                            : isFamilyPlan
                            ? "5 license keys for your family • Click any key to copy • One key per device"
                            : "Click any key to copy • One key per device"}
                        </p>
                      </div>
                    </div>
                    
                    {groupKeys.length > 1 && (
                      <button
                        onClick={() => handleCopyProductKeys(groupKeys)}
                        className="px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all text-xs font-semibold hover:scale-105"
                        style={{
                          background: copiedIndex === -1 ? colors.green : colors.gradientCyan,
                          color: colors.bgDarker,
                          boxShadow: copiedIndex === -1 ? `0 4px 12px rgba(16, 185, 129, 0.3)` : `0 4px 12px ${colors.cyanGlow}`,
                        }}
                      >
                        {copiedIndex === -1 ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span className="font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="font-medium">Copy All</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Keys Display */}
                  {groupKeys.length === 1 ? (
                    <>
                      <p 
                        className="text-[0.8rem] uppercase tracking-wider mb-2"
                        style={{ color: colors.textMuted }}
                      >
                        Your License Key
                      </p>
                      <div className="flex items-center gap-3 justify-center">
                        <code
                          className="text-xl md:text-[1.35rem] font-mono tracking-[2px] select-all px-4 py-2.5 rounded-lg"
                          style={{ 
                            color: colors.cyan,
                            fontFamily: "'Space Grotesk', monospace",
                            fontWeight: 700,
                            background: 'rgba(6, 182, 212, 0.1)',
                            border: `1px dashed ${colors.cyanDark}`,
                          }}
                        >
                          {groupKeys[0]}
                        </code>
                        <button
                          onClick={() => handleCopyKey(groupKeys[0], 0)}
                          className="px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 transition-all hover:scale-105 font-semibold text-sm"
                          style={{
                            background: copiedIndex === 0 ? colors.green : colors.gradientCyan,
                            color: colors.bgDarker,
                            boxShadow: copiedIndex === 0 ? `0 4px 12px rgba(16, 185, 129, 0.3)` : `0 8px 24px ${colors.cyanGlow}`,
                          }}
                        >
                          {copiedIndex === 0 ? (
                            <>
                              <Check className="w-4.5 h-4.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4.5 h-4.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      {customerEmail && (
                        <p className="text-xs mt-2.5 flex items-center justify-center gap-1" style={{ color: colors.textMuted }}>
                          <Mail className="w-3.5 h-3.5" style={{ color: colors.cyan }} />
                          An email has been sent to {customerEmail}
                        </p>
                      )}
                    </>
                  ) : isFamilyPlan ? (
                    /* Family plan - grid layout for 5 keys */
                    <div
                      className="rounded-[12px] p-4"
                      style={{ 
                        backgroundColor: 'transparent', 
                        border: `1px solid ${colors.cyanDark}`,
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {groupKeys.map((key, index) => {
                          const isCopied = copiedKey === key;
                          return (
                            <button
                              key={index}
                              onClick={() => handleCopyKey(key, index)}
                              className="rounded-[12px] px-4 py-3 flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-lg group"
                          style={{ 
                            backgroundColor: isCopied ? `rgba(16, 185, 129, 0.15)` : 'transparent', 
                            border: `1px solid ${isCopied ? colors.green : colors.cyanDark}`,
                            backdropFilter: 'blur(10px)',
                          }}
                          title={`Click to copy Key ${index + 1} for Family Member ${index + 1}`}
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <span 
                              className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ 
                                background: isCopied ? colors.green : colors.gradientCyan,
                                color: colors.bgDark
                              }}
                            >
                                  {index + 1}
                                </span>
                                <code
                                  className="text-sm font-mono tracking-wide truncate flex-1"
                                  style={{ 
                                    color: isCopied ? colors.green : colors.cyan,
                                    fontFamily: "'Space Grotesk', monospace",
                                    fontWeight: 700
                                  }}
                                >
                                  {key}
                                </code>
                              </div>
                              {isCopied ? (
                                <Check className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: colors.green }} />
                              ) : (
                                <Copy className="w-4 h-4 flex-shrink-0 ml-2 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: colors.cyan }} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div 
                        className="mt-4 p-3 rounded-[12px]" 
                        style={{ 
                          background: `linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)`,
                          border: `1px solid ${colors.cyanDark}` 
                        }}
                      >
                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                          <strong>Family Plan:</strong> Each key is for one device. Share one key with each family member. Keys cannot be shared between devices.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Multiple keys (2-4) - compact inline list */
                    <div
                      className="rounded-[12px] p-3"
                      style={{ 
                        backgroundColor: 'transparent', 
                        border: `1px solid ${colors.cyanDark}`,
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <div className="flex flex-wrap gap-2">
                        {groupKeys.map((key, index) => {
                          const isCopied = copiedKey === key;
                          return (
                            <button
                              key={index}
                              onClick={() => handleCopyKey(key, index)}
                              className="rounded-[12px] px-3 py-2 flex items-center space-x-2 transition-all hover:scale-[1.02] hover:shadow-md group"
                          style={{ 
                            backgroundColor: isCopied ? `rgba(16, 185, 129, 0.15)` : 'transparent', 
                            border: `1px solid ${isCopied ? colors.green : colors.cyanDark}`,
                            backdropFilter: 'blur(10px)',
                          }}
                          title={`Click to copy Key ${index + 1}`}
                        >
                          <span 
                            className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ 
                              background: isCopied ? colors.green : colors.gradientCyan,
                              color: colors.bgDark
                            }}
                          >
                                {index + 1}
                              </span>
                              <code
                                className="text-xs font-mono tracking-wide"
                                style={{ 
                                  color: isCopied ? colors.green : colors.cyan,
                                  fontFamily: "'Space Grotesk', monospace",
                                  fontWeight: 700
                                }}
                              >
                                {key}
                              </code>
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.green }} />
                              ) : (
                                <Copy className="w-3.5 h-3.5 flex-shrink-0 opacity-30 group-hover:opacity-80" style={{ color: colors.cyan }} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Download Section for this Product */}
                <div className="mb-5">
                  <h3 
                    className="text-lg md:text-xl font-semibold mb-3 md:mb-3.5"
                    style={{ 
                      color: colors.textPrimary,
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}
                  >
                    Step {groupIndex + 1}: Download {group.productName}
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    {sortedPlatforms.map((platform) => {
                      return (
                        <button
                          key={platform.id}
                          onClick={() => handleDownload(platform)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
                          style={{
                            backgroundColor: colors.bgDarker,
                            border: `1px solid ${colors.borderSubtle}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = colors.cyanDark;
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = colors.borderSubtle;
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ color: colors.cyan, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {platform.icon}
                          </div>
                          <span className="font-semibold text-sm" style={{ color: colors.textPrimary }}>
                            {platform.name}
                          </span>
                          <span className="text-xs" style={{ color: colors.textMuted }}>
                            {platform.fileType}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

            {/* Single Purchase: License Keys Card */}
            {!isLoading && !error && !isBundle && licenseKeys.length > 0 && (
              <div
                className="rounded-[12px] p-4 mb-5"
                style={{
                  backgroundColor: colors.bgDarker,
                  border: `1px solid ${colors.cyanDark}`,
                }}
              >
                <p 
                  className="text-[0.8rem] uppercase tracking-wider mb-2"
                  style={{ color: colors.textMuted }}
                >
                  Your License Key
                </p>
                {licenseKeys.length === 1 ? (
                  <div className="flex items-center gap-3 justify-center">
                    <code
                      className="text-xl md:text-[1.35rem] font-mono tracking-[2px] select-all px-4 py-2.5 rounded-lg"
                      style={{ 
                        color: colors.cyan,
                        fontFamily: "'Space Grotesk', monospace",
                        fontWeight: 700,
                        background: 'rgba(6, 182, 212, 0.1)',
                        border: `1px dashed ${colors.cyanDark}`,
                      }}
                    >
                      {licenseKeys[0]}
                    </code>
                    <button
                      onClick={() => handleCopyKey(licenseKeys[0], 0)}
                      className="px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 transition-all hover:scale-105 font-semibold text-sm"
                      style={{
                        background: copiedIndex === 0 ? colors.green : colors.gradientCyan,
                        color: colors.bgDarker,
                        boxShadow: copiedIndex === 0 ? `0 4px 12px rgba(16, 185, 129, 0.3)` : `0 8px 24px ${colors.cyanGlow}`,
                      }}
                    >
                      {copiedIndex === 0 ? (
                        <>
                          <Check className="w-4.5 h-4.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4.5 h-4.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
              ) : licenseKeys.length >= 5 ? (
                /* Family plan - grid layout for 5 keys */
                <div
                  className="rounded-[12px] p-4"
                  style={{ 
                    backgroundColor: colors.bgContainer, 
                    border: `1px solid ${colors.cyanDark}` 
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {licenseKeys.map((key, index) => {
                      const isCopied = copiedKey === key;
                      return (
                        <button
                          key={index}
                          onClick={() => handleCopyKey(key, index)}
                          className="rounded-[12px] px-4 py-3 flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-lg group"
                          style={{ 
                            backgroundColor: isCopied ? `rgba(16, 185, 129, 0.15)` : 'transparent', 
                            border: `1px solid ${isCopied ? colors.green : colors.cyanDark}`,
                            backdropFilter: 'blur(10px)',
                          }}
                          title={`Click to copy Key ${index + 1} for Family Member ${index + 1}`}
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <span 
                              className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ 
                                background: isCopied ? colors.green : colors.gradientCyan,
                                color: colors.bgDark
                              }}
                            >
                              {index + 1}
                            </span>
                            <code
                              className="text-sm font-mono tracking-wide truncate flex-1"
                              style={{ 
                                color: isCopied ? colors.green : colors.cyan,
                                fontFamily: "'Space Grotesk', monospace",
                                fontWeight: 700
                              }}
                            >
                              {key}
                            </code>
                          </div>
                          {isCopied ? (
                            <Check className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: colors.green }} />
                          ) : (
                            <Copy className="w-4 h-4 flex-shrink-0 ml-2 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: colors.cyan }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div 
                    className="mt-4 p-3 rounded-[12px]" 
                    style={{ 
                      background: `linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)`,
                      border: `1px solid ${colors.cyanDark}` 
                    }}
                  >
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      <strong>Family Plan:</strong> Each key is for one device. Share one key with each family member. Keys cannot be shared between devices.
                    </p>
                  </div>
                </div>
              ) : (
                /* Multiple keys (2-4) - compact inline list */
                <div
                  className="rounded-[12px] p-3"
                  style={{ 
                    backgroundColor: colors.bgContainer, 
                    border: `1px solid ${colors.cyanDark}` 
                  }}
                >
                  <div className="flex flex-wrap gap-2">
                    {licenseKeys.map((key, index) => {
                      const isCopied = copiedKey === key;
                      return (
                        <button
                          key={index}
                          onClick={() => handleCopyKey(key, index)}
                          className="rounded-[12px] px-3 py-2 flex items-center space-x-2 transition-all hover:scale-[1.02] hover:shadow-md group"
                          style={{ 
                            backgroundColor: isCopied ? `rgba(16, 185, 129, 0.15)` : 'transparent', 
                            border: `1px solid ${isCopied ? colors.green : colors.cyanDark}`,
                            backdropFilter: 'blur(10px)',
                          }}
                          title={`Click to copy Key ${index + 1}`}
                        >
                          <span 
                            className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ 
                              background: isCopied ? colors.green : colors.gradientCyan,
                              color: colors.bgDark
                            }}
                          >
                            {index + 1}
                          </span>
                          <code
                            className="text-xs font-mono tracking-wide"
                            style={{ 
                              color: isCopied ? colors.green : colors.cyan,
                              fontFamily: "'Space Grotesk', monospace",
                              fontWeight: 700
                            }}
                          >
                            {key}
                          </code>
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.green }} />
                          ) : (
                            <Copy className="w-3.5 h-3.5 flex-shrink-0 opacity-30 group-hover:opacity-80" style={{ color: colors.cyan }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

                {customerEmail && (
                  <p className="text-xs mt-2.5 flex items-center justify-center gap-1" style={{ color: colors.textMuted }}>
                    <Mail className="w-3.5 h-3.5" style={{ color: colors.cyan }} />
                    An email has been sent to {customerEmail}
                  </p>
                )}
            </div>
          )}

            {/* Single Purchase: Download Section */}
            {!isLoading && !error && !isBundle && productGroups.length > 0 && (
              <div className="mb-5">
                <h2 
                  className="text-lg md:text-xl font-semibold mb-3 md:mb-3.5"
                  style={{ 
                    color: colors.textPrimary,
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}
                >
                  Step 1: Download the App
                </h2>

                <div className="grid grid-cols-3 gap-3">
                  {getSortedPlatforms(productGroups[0].downloadBaseUrl, productGroups[0].productType).map((platform) => {
                  return (
                    <button
                      key={platform.id}
                      onClick={() => handleDownload(platform)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
                      style={{
                        backgroundColor: colors.bgDarker,
                        border: `1px solid ${colors.borderSubtle}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = colors.cyanDark;
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = colors.borderSubtle;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ color: colors.cyan, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {platform.icon}
                      </div>
                      <span className="font-semibold text-sm" style={{ color: colors.textPrimary }}>
                        {platform.name}
                      </span>
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        {platform.fileType}
                      </span>
                    </button>
                  );
                  })}
                </div>
              </div>
            )}

            {/* Quick Start Guide */}
            <div
              className="rounded-[12px] p-4 mb-5 text-left"
              style={{
                backgroundColor: colors.bgDarker,
                border: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <h3 
                className="text-[0.9rem] font-semibold mb-2.5 uppercase tracking-wider"
                style={{ 
                  color: colors.textMuted,
                  fontFamily: "'Space Grotesk', sans-serif"
                }}
              >
                Quick Start
              </h3>
              <ol className="space-y-2.5">
                <li className="flex items-start gap-3">
                  <span
                    className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ 
                      background: colors.gradientCyan,
                      color: colors.bgDarker
                    }}
                  >
                    1
                  </span>
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    Download and install {defaultProductName} for your platform
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ 
                      background: colors.gradientCyan,
                      color: colors.bgDarker
                    }}
                  >
                    2
                  </span>
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    Launch the app and enter your license key when prompted
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ 
                      background: colors.gradientCyan,
                      color: colors.bgDarker
                    }}
                  >
                    3
                  </span>
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    Create your master password and start securing your accounts
                  </span>
                </li>
              </ol>
            </div>

            {/* Support Link */}
            <div className="text-center">
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Need help? Contact{" "}
                <a
                  href={`mailto:support@localpasswordvault.com`}
                  style={{ color: colors.cyan }}
                  className="hover:underline font-semibold"
                >
                  support@localpasswordvault.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer 
        className="border-t py-4 px-6"
        style={{ borderColor: colors.borderSubtle }}
      >
        <div className="max-w-4xl mx-auto text-center text-sm" style={{ color: colors.textMuted }}>
          © 2025 {defaultProductName}. All rights reserved.
        </div>
      </footer>
    </div>
    </>
  );
};

