import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import ReportGeneratorModal from './ReportGeneratorModal';
import { useReportGenerator } from '@/hooks/useReportGenerator';

export default function GenerateReportButton({ type = 'species', itemId, itemName, variant = 'outline', className = '' }) {
  const { isOpen, openReport, closeReport, reportType, itemId: modalItemId, itemName: modalItemName } = useReportGenerator();

  const handleClick = () => {
    openReport(type, itemId, itemName);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        className={`gap-2 ${className}`}
      >
        <FileText className="w-4 h-4" />
        Generate Report
      </Button>

      <ReportGeneratorModal
        isOpen={isOpen}
        onClose={closeReport}
        type={reportType}
        itemId={modalItemId}
        itemName={modalItemName}
      />
    </>
  );
}