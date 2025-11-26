"use strict";

import ContactStep from "./ContactStep";
import ShipmentStep from "./ShipmentStep";
import PreferencesStep from "./PreferencesStep";
import SummaryStep from "./SummaryStep";

const Steps = {
  Contact: ContactStep,
  Shipment: ShipmentStep,
  Preferences: PreferencesStep,
  Summary: SummaryStep,
};

export default Steps;
