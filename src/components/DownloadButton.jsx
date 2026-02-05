import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DownloadButton({ fileUri, fileName, label, bgColor, textColor }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!fileUri) return;

    setDownloading(true);
    try {
      // Get signed URL for the private file
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: fileUri,
        expires_in: 300
      });

      // Download the file
      const a = document.createElement('a');
      a.href = signed_url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!fileUri) {
    return (
      <div className={cn("text-xs px-3 py-2 bg-slate-100 text-slate-400 rounded-lg font-medium flex items-center gap-1 opacity-50 cursor-not-allowed")}>
        <FileText className="w-3 h-3" />
        {label} - UNAVAILABLE
      </div>
    );
  }

  return (
    <button
      className={cn("text-xs px-3 py-2 rounded-lg font-medium flex items-center gap-1 transition-opacity", bgColor, textColor, downloading && "opacity-50 cursor-wait")}
      onClick={handleDownload}
      disabled={downloading}
    >
      {downloading ? <Download className="w-3 h-3 animate-bounce" /> : <FileText className="w-3 h-3" />}
      {label}
    </button>
  );
}