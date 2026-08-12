import React from 'react';
import UsageChargesTab from './UsageChargesTab';

export default function TelecomDocumentTab(props) {
  return (
    <UsageChargesTab
      {...props}
      moduleId={61}
      pageTitle="Telecom Document"
      pageSubtitle="Manage telecom document contracts, warranties, handover forms, and provider agreements."
      addBtnText="Add Telecom Document"
      headerIcon="document-text-outline"
    />
  );
}
