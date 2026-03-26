import { useState } from 'react';

export const useReportGenerator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState('species');
  const [itemId, setItemId] = useState(null);
  const [itemName, setItemName] = useState('');

  const openReport = (type, id, name) => {
    setReportType(type);
    setItemId(id);
    setItemName(name);
    setIsOpen(true);
  };

  const closeReport = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    openReport,
    closeReport,
    reportType,
    itemId,
    itemName,
  };
};