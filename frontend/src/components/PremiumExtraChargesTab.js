import React from 'react';
import UsageChargesTab from './UsageChargesTab';

export default function PremiumExtraChargesTab(props) {
  return (
    <UsageChargesTab
      {...props}
      moduleId={58}
      pageTitle="Premium / Extra Charges"
      pageSubtitle="Manage premium SMS, roaming passes, third-party content, VAS subscriptions, and extra charges."
      addBtnText="Add Extra Charge"
      headerIcon="receipt-outline"
    />
  );
}
