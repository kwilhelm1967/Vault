import React from 'react';
import { FileText, Download, Check } from 'lucide-react';

interface DownloadInstructionsProps {
  licenseKey: string;
  licenseType: 'single' | 'pro' | 'family' | 'business';
  onClose: () => void;
}

export const DownloadInstructions: React.FC<DownloadInstructionsProps> = ({ 
  licenseKey, 
  licenseType,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col my-8">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Download Instructions</h2>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <h3 className="text-blue-300 font-medium mb-2">Your License Information</h3>
              <p className="text-slate-300 text-sm mb-2">
                <strong>License Type:</strong> {licenseType === 'single' ? 'Single User' : licenseType === 'pro' ? 'Pro' : licenseType === 'family' ? 'Family Plan' : 'Business Plan'}
              </p>
              <p className="text-slate-300 text-sm mb-2">
                <strong>License Key:</strong>
              </p>
              <div className="bg-slate-800 p-3 rounded font-mono text-blue-400 text-sm select-all">
                {licenseKey}
              </div>
              <p className="text-slate-400 text-xs mt-2">
                Please save this key. It will also be emailed to you.
              </p>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Option 1: Direct Download</h3>
              <p className="text-slate-400 text-sm mb-4">
                Download the complete project as a ZIP file.
              </p>
              
              <div className="flex items-center space-x-2 text-sm text-green-400 mb-4">
                <Check className="w-4 h-4" />
                <span>Includes all source code and documentation</span>
              </div>
              
              <a 
                href="/download-project.js"
                download
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Project</span>
              </a>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Option 2: Manual Download</h3>
              <p className="text-slate-400 text-sm mb-4">
                If the direct download doesn't work, follow these steps:
              </p>
              
              <ol className="space-y-2 text-slate-300 text-sm">
                <li>1. Create a folder on your computer called <code className="bg-slate-800 px-1 py-0.5 rounded">LocalPasswordVault</code></li>
                <li>2. Download each file individually by right-clicking and selecting "Save As"</li>
                <li>3. Maintain the folder structure as shown in the project</li>
                <li>4. Follow the setup instructions in README.txt</li>
              </ol>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Option 3: For Developers</h3>
              <p className="text-slate-400 text-sm mb-4">
                If you're familiar with Git and Node.js:
              </p>
              
              <div className="bg-slate-800 p-3 rounded font-mono text-sm text-slate-300 overflow-x-auto">
                <pre>
{`# Clone the repository
git clone https://github.com/username/local-password-vault.git

# Enter the directory
cd local-password-vault

# Install dependencies
npm install

# Start development server
npm run dev`}
                </pre>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-700 bg-slate-800/80">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
            >
              Continue to Password Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};