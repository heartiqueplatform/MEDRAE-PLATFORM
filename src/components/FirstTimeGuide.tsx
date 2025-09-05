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
  styles={{
    options: {
      beaconSize: 40,
      primaryColor: "transparent", // removes default red
      overlayColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 1000,
    },
    beacon: {
      width: 40,
      height: 40,
      borderRadius: "50%",
      backgroundColor: "transparent",
      boxShadow: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
    },
  }}
  locale={{
    last: "Done",
    skip: "Skip",
    next: "Next",
    back: "Back",
  }}
  beaconComponent={() => <span style={{ fontSize: "32px" }}>👆</span>} // hand pointing up
/>

  );
}
