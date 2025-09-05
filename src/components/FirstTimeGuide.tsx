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

  // Custom beacon: grows and shows text
  const CustomBeacon = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: 50,
        height: 50,
        borderRadius: "50%",
        backgroundColor: "#FF4D4F", // red dot
        color: "white",
        fontWeight: "bold",
        cursor: "pointer",
        animation: "pulse 1s infinite",
      }}
    >
      👆
      <span style={{ fontSize: 10, marginTop: 2 }}>Click here</span>
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
      styles={{
        options: {
          primaryColor: "#FF4D4F",
          zIndex: 1000,
        },
      }}
    />
  );
}
