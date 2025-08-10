import React, { useState } from 'react';
import { Download, Check, AlertCircle } from 'lucide-react';

interface DownloadButtonProps {
  className?: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ className = '' }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    
    try {
      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a download link for DOWNLOAD_INSTRUCTIONS.txt
      const link = document.createElement('a');
      link.href = '/DOWNLOAD_INSTRUCTIONS.txt';
      link.download = 'DOWNLOAD_INSTRUCTIONS.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsComplete(true);
      setTimeout(() => setIsComplete(false), 3000);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Download failed. Please try again or contact support.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
          isComplete
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } disabled:bg-gray-400 disabled:cursor-not-allowed`}
      >
        {isDownloading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Creating Download...</span>
          </>
        ) : isComplete ? (
          <>
            <Check className="w-5 h-5" />
            <span>Download Complete</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>Download Project</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="mt-2 text-red-500 text-sm flex items-center space-x-1">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};