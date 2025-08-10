import React, { useState } from 'react';
import { Download, FileDown, HardDrive, Code, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export const DownloadPage: React.FC = () => {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownload = async (type: 'project' | 'windows' | 'macos' | 'linux' | 'docs') => {
    setDownloadStatus('downloading');
    setErrorMessage(null);
    
    try {
      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create appropriate download based on type
      if (type === 'project') {
        // Download the project files
        const link = document.createElement('a');
        link.href = '/download-project.js';
        link.download = 'download-project.js';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (type === 'docs') {
        // Download documentation
        const link = document.createElement('a');
        link.href = '/BUSINESS_PLAN.txt';
        link.download = 'BUSINESS_PLAN.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For platform-specific downloads, redirect to the appropriate URL
        window.open(`https://LocalPasswordVault.com/download/${type}`, '_blank');
      }
      
      setDownloadStatus('complete');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadStatus('error');
      setErrorMessage('Download failed. Please try again or contact support.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center p-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="max-w-4xl w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Local Password Vault</h1>
          <p className="text-slate-400">Download the complete password management solution</p>
        </div>
        
        {/* Download Panel */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 max-w-2xl mx-auto">
          <div className="flex items-center space-x-3 mb-6">
            <Download className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Download Local Password Vault</h2>
          </div>
          
          <p className="text-slate-400 text-sm mb-6">
            Download the complete Local Password Vault project, including source code, documentation, and business resources.
          </p>
          
          <div className="space-y-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-start space-x-3 mb-3">
                <Code className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-white font-medium">Complete Project</h3>
                  <p className="text-slate-400 text-sm">
                    Includes all source code, documentation, and business resources.
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => handleDownload('project')}
                disabled={downloadStatus === 'downloading'}
                className={`mt-3 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  downloadStatus === 'complete'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : downloadStatus === 'downloading'
                    ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {downloadStatus === 'downloading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                    <span>Creating Download...</span>
                  </>
                ) : downloadStatus === 'complete' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Download Complete</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Project</span>
                  </>
                )}
              </button>
              
              {errorMessage && (
                <div className="mt-2 text-red-500 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-start space-x-3 mb-3">
                  <HardDrive className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <h3 className="text-white font-medium">Desktop Applications</h3>
                    <p className="text-slate-400 text-sm">
                      Download pre-built desktop applications.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 mt-3">
                  <button 
                    onClick={() => handleDownload('windows')}
                    className="flex items-center space-x-2 w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Windows (.exe)</span>
                  </button>
                  
                  <button 
                    onClick={() => handleDownload('macos')}
                    className="flex items-center space-x-2 w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>macOS (.dmg)</span>
                  </button>
                  
                  <button 
                    onClick={() => handleDownload('linux')}
                    className="flex items-center space-x-2 w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Linux (.AppImage)</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-start space-x-3 mb-3">
                  <FileText className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <h3 className="text-white font-medium">Documentation</h3>
                    <p className="text-slate-400 text-sm">
                      Download business and technical documentation.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 mt-3">
                  <button 
                    onClick={() => handleDownload('docs')}
                    className="flex items-center space-x-2 w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Business Documentation</span>
                  </button>
                  
                  <a 
                    href="/CUSTOMER_DISTRIBUTION_GUIDE.txt" 
                    download
                    className="flex items-center space-x-2 w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Distribution Guide</span>
                  </a>
                  
                  <a 
                    href="/LICENSE_KEY_MANAGEMENT_GUIDE.txt" 
                    download
                    className="flex items-center space-x-2 w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>License Management Guide</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-slate-400 text-sm">
              Need help? Check the <a href="/DOWNLOAD_INSTRUCTIONS.txt" download className="text-blue-400 hover:text-blue-300">download instructions</a> or contact <a href="mailto:support@LocalPasswordVault.com" className="text-blue-400 hover:text-blue-300">support@LocalPasswordVault.com</a>.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 pt-8 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            Secure • Private • Offline • Professional Password Management
          </p>
          <p className="text-xs text-slate-600 mt-2">
            © 2025 Local Password Vault | <a href="https://LocalPasswordVault.com" className="text-blue-400 hover:text-blue-300">LocalPasswordVault.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};