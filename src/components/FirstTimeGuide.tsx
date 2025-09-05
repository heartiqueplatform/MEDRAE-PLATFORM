"use client";

import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS } from "react-joyride";

export default function FirstTimeGuide() {
  const [runGuide, setRunGuide] = useState(false);

  // Check if first-time user
  useEffect(() => {
    const isFirstTime = true; // force guide to always show
    if (isFirstTime) setRunGuide(true);
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      localStorage.setItem("firstTimeGuideDone", "true");
      setRunGuide(false);
    }
  };

  // Custom beacon: preserve default glow but add text below
  const CustomBeacon = () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* default glowing beacon */}
      <div className="joyride-beacon" /> 
      {/* text below */}
      <span style={{ fontSize: 10, marginTop: 4, color: "#fff", textAlign: "center" }}>
        Click here for guide
      </span>
    </div>
  );

  return (
    <Joyride
      steps={[
        {
          target: ".mobile-menu-toggle",
          content: "Press this button to open the main menu where you can access pages, profile, and settings.",
          placement: "right",
        },
        {
          target: ".mobile-reload-button",
          content: "Tap here to refresh the app and clear cached data.",
          placement: "right",
        },
        {
          target: ".mobile-profile-avatar",
          content: "This is your profile avatar. Tap here to view or edit your profile.",
          placement: "left",
        },
      ]}
      run={runGuide}
      continuous
      scrollToFirstStep
      showSkipButton
      callback={handleJoyrideCallback}
      beaconComponent={CustomBeacon}
    />
  );
}
