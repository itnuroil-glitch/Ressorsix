import React from 'react';
import TeleChargeTypeTab from './TeleChargeTypeTab';

export default function PremiumExtraChargeTypeTab(props) {
  return (
    <TeleChargeTypeTab
      {...props}
      pageTitle="Premium / Extra Charge Type"
      pageSubtitle="Manage premium SMS, roaming passes, VAS subscriptions, and extra charge types."
      addBtnText="Add Premium / Extra Charge Type"
      modalTitle="Premium / Extra Charge Type"
      headerIcon="receipt-outline"
    />
  );
}
