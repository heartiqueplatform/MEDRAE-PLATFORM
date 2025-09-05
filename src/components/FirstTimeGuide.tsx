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
      zIndex: 10000,
      // Make the step indicator dots bigger
      dotSize: 16, // default is 12, increase as needed
      primaryColor: "#FF0000", // optional, your highlight color
    },
  }}
/>

  );
}
