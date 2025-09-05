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
          content: "This is your main menu. Tap here to access pages, profile, and settings.",
          placement: "right",
        },
        {
          target: ".mobile-menu-toggle",
          content: "Swipe or tap to explore the menu options!",
          placement: "right",
        },
      ]}
      run={runGuide}
      continuous
      scrollToFirstStep
      showSkipButton
      callback={handleJoyrideCallback}
    />
  );
}
