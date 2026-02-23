"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";

export default function InstructionPage() {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [canStart, setCanStart] = useState(false);
  const [setupSkipped, setSetupSkipped] = useState(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [loudWarning, setLoudWarning] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true); // show spinner before page
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0); // 0-100%
  const [scanningMic, setScanningMic] = useState(false);
  const [scanProgressMic, setScanProgressMic] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingPage(false);
    }, 300); // 0.3 second delay

    return () => clearTimeout(timer);
  }, []);

  // countdown logic
  useEffect(() => {
    if (secondsLeft === null) return; // not started yet
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (
      setupSkipped ||
      (secondsLeft !== null && secondsLeft <= 15)
    ) {
      setCanStart(true);
    }
  }, [secondsLeft, setupSkipped]);


  // Start quiz
  const handleStartQuiz = () => {
    if (canStart) navigate("/simulation/take");
  };

  // Enable Camera
  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
      }
      setCameraReady(true);
      if (micReady && secondsLeft === null) setSecondsLeft(30); // start countdown once both ready
    } catch (err) {
      console.error("Camera access denied/unavailable", err);
    }
  };

  // Enable Microphone
  const enableMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx) return;
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      const draw = () => {
        animationIdRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = "#f3f4f6";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        let maxVolume = 0;
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 2;
          maxVolume = Math.max(maxVolume, dataArray[i]);

          let color = "green";
          if (barHeight > 40 && barHeight <= 80) color = "blue";
          if (barHeight > 80) color = "red";

          canvasCtx.fillStyle = color;
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }

        setLoudWarning(maxVolume > 150);
      };

      draw();

      setMicReady(true);
      if (cameraReady && secondsLeft === null) setSecondsLeft(30); // start countdown once both ready
    } catch (err) {
      console.error("Microphone access denied/unavailable", err);
    }
  };

  // cleanup
  useEffect(() => {
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, []);
  if (loadingPage) {
    return <GlobalLoader message="Setting simulation page..." />;
  }
  return (
    <div className="space-y-2 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">


      {/* Setup Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold bg-gradient-to-r from-green-500 via-teal-400 to-blue-500 bg-clip-text text-transparent">
            Proctorium Setup & Instructions
          </CardTitle>

          <CardDescription className="text-center text-sm text-muted-foreground">
            Please read the instructions  below carefully before starting.
          </CardDescription>

        </CardHeader>

        <CardContent className="space-y-3">

          {/* Timer + Countdown + Start Button + Explanation */}
          <div className="flex flex-col items-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            {/* Countdown + Button + Skip */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <span
                  className={`inline-block px-4 py-2 rounded-xl font-bold text-white transition-colors duration-300 ${canStart ? "bg-green-600" : "bg-red-600"
                    }`}
                >
                  {setupSkipped
                    ? "Setup skipped"
                    : secondsLeft === null
                      ? "Waiting for camera & mic..."
                      : secondsLeft > 0
                        ? `Preparing... ${secondsLeft}s`
                        : "Ready!"}
                </span>

                <Button
                  className={`text-white font-bold ${canStart
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 cursor-not-allowed"
                    }`}
                  onClick={handleStartQuiz}
                  disabled={!canStart}
                >
                  {canStart ? "Proceed to Simulation" : "Please wait..."}
                </Button>
              </div>

              {!canStart && !setupSkipped && (
                <Button
                  variant="outline"
                  className="text-xs border-orange-500 text-orange-600 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.6)] hover:shadow-[0_0_18px_rgba(249,115,22,0.9)] transition"
                  onClick={() => {
                    setSetupSkipped(true);
                    setCanStart(true);
                  }}
                >
                  Skip setup & continue
                </Button>

              )}

              {setupSkipped && (
                <p className="text-xs text-orange-600 text-center max-w-sm">
                  You skipped the camera and microphone setup for now. The simulation will
                  continue normally, but camera and audio monitoring are turned off.
                  You can enable them later if needed.
                </p>
              )}
            </div>

          </div>


          {/* Camera + Mic Preview */}
          <div className="flex flex-col md:flex-row gap-5 justify-center items-center">
            {/* Camera */}
            <div className="border border-gray-300 rounded-lg overflow-hidden w-48 h-48 relative flex flex-col">
              <div className="flex-1 relative">
                {/* Video feed always visible */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />

                {/* Scanning overlay */}
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="#e5e7eb"
                          strokeWidth="10"
                          fill="none"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="#10b981"
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray={2 * Math.PI * 45}
                          strokeDashoffset={2 * Math.PI * 45 * (1 - scanProgress / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-sm font-bold text-white">Scanning...</span>
                    </div>
                  </div>
                )}

                {/* Message when camera not enabled */}
                {!scanning && !cameraReady && (
                  <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-gray-500">
                    Camera not enabled
                  </p>
                )}
              </div>

              {/* Camera button */}
              <Button
                onDoubleClick={async () => {
                  if (!cameraReady && !scanning) {
                    // start overlay only
                    setScanning(true);
                    setScanProgress(0);
                    let progress = 0;
                    const interval = setInterval(() => {
                      progress += 1;
                      setScanProgress(progress);
                      if (progress >= 100) {
                        clearInterval(interval);
                        setScanning(false); // just hide overlay
                      }
                    }, 150);

                    // call original camera enable function (starts countdown as before)
                    await enableCamera();
                  }
                }}
                disabled={cameraReady === "loading" || scanning}
                className="w-full rounded-none mt-2"
                variant="secondary"
              >
                {cameraReady
                  ? "Camera Enabled"
                  : scanning
                    ? "Scanning..."
                    : "Double-click"}
              </Button>
            </div>


            {/* Audio visualizer */}
            {/* Audio visualizer */}
            <div className="border border-gray-300 rounded-lg overflow-hidden w-48 h-48 relative flex flex-col">
              <div className="flex-1 relative flex items-center justify-center">
                {/* Canvas always visible */}
                <canvas
                  ref={canvasRef}
                  width={256}
                  height={192}
                  className="w-full h-full"
                />

                {/* Loud warning */}
                {loudWarning && (
                  <span className="absolute top-1 left-1 text-xs text-red-600 font-bold bg-white px-1 rounded">
                    Loud noise detected
                  </span>
                )}

                {/* Audio scanning overlay (visual-only) */}
                {scanningMic && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="#e5e7eb"
                          strokeWidth="10"
                          fill="none"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="#3b82f6"
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray={2 * Math.PI * 45}
                          strokeDashoffset={2 * Math.PI * 45 * (1 - scanProgressMic / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-sm font-bold text-white">Calibrating Mic...</span>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={async () => {
                  if (!micReady && !scanningMic) {
                    // Start visual-only mic overlay
                    setScanningMic(true);
                    setScanProgressMic(0);
                    let progress = 0;
                    const interval = setInterval(() => {
                      progress += 1;
                      setScanProgressMic(progress);
                      if (progress >= 100) {
                        clearInterval(interval);
                        setScanningMic(false); // hide overlay after done
                      }
                    }, 150);

                    // Call original mic enable function
                    await enableMic();
                  }
                }}
                className="w-full rounded-none"
                variant="secondary"
                disabled={micReady || scanningMic}
              >
                {micReady ? "Mic Enabled" : scanningMic ? "Calibrating..." : "Enable Mic"}
              </Button>
            </div>
          </div>
          {/* Enriched Environment Warning */}
          <div className="mt-3 rounded-xl text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
            <strong>Note: This will work only on desktop.</strong>
            <br /><br />
            Please read the instructions and the manual below carefully before starting.
            You can enable your camera and microphone now, or later in the next step.
            <br /><br />
            You may see your face on the screen, notice your motor activity being monitored,
            and hear audio playback. This simulates a real NCK-like exam environment.
            <br /><br />

            <strong>If this setup feels confusing or takes too long:</strong>
            <br />
            You can safely <strong>skip the setup</strong> and start the simulation immediately.
            Camera and microphone can be enabled later during the session if needed.
            <br /><br />

            Please remember to <strong>double-click</strong> the Camera button if you choose to enable it.
            <br />

            These monitoring features are for simulation only and are not fully automated.
          </div>

        </CardContent>
      </Card>



      {/* Instructions Card */}

      <Card className=" border-0">

        <CardHeader>
          <CardTitle className="text-center text-lg">
            NCK Exam Practice Simulation Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm text-muted-foreground leading-relaxed">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
            <span>
              You will answer <strong>one question at a time</strong>. Avoid
              distractions and treat this like a real exam room.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
            <span>
              Each question has <strong>four choices</strong> but only one is
              correct. Read carefully before selecting.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
            <span>
              You may use <strong>Flag</strong> to mark questions you'd like to
              review later before submission.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
            <span>
              If you're unsure, use the <strong>Skip</strong> option. All skipped
              or flagged questions will be visible before final submission.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
            <span>
              A <strong>timer will begin</strong> immediately after you start.
              Time management is key—track your pace and don’t get stuck.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
            <span>
              The simulation requires a <strong>stable internet connection</strong>{" "}
              to save your progress. Avoid refreshing the page during the quiz.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
            <span>
              Once you finish, click <strong>Submit</strong> to end the session.
              You’ll see your score, the correct answers, and explanations (if
              provided).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
            <span>
              This is a simulated environment—treat it seriously, as it reflects
              how the real NCK test behaves in structure and time pressure.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
            <span>
              Use a quiet place, disable notifications, and avoid switching tabs.
              The system may auto-submit if the tab is inactive too long.
            </span>
          </div>

          <Button
            className={`w-full mt-6 text-white font-bold ${canStart
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 cursor-not-allowed"
              }`}
            onClick={handleStartQuiz}
            disabled={!canStart}
          >
            {canStart ? "Begin Simulation" : "Please wait..."}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
