"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function InstructionPage() {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [canStart, setCanStart] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [loudWarning, setLoudWarning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationIdRef = useRef<number | null>(null);

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
    if (secondsLeft !== null && secondsLeft <= 15) {
      setCanStart(true);
    }
  }, [secondsLeft]);

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

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-6">
      {/* Timer + Countdown + Start Button + Explanation */}
      <div className="flex flex-col items-center mb-6 space-y-2">
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        {/* Countdown + Button side by side */}
        <div className="flex items-center gap-4">
          <span
            className={`inline-block px-4 py-2 rounded-full font-bold text-white transition-colors duration-300 ${
              canStart ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {secondsLeft === null
              ? "Waiting for camera & mic..."
              : secondsLeft > 0
              ? `Preparing... ${secondsLeft}s`
              : "Ready!"}
          </span>

          <Button
            className={`text-white font-bold ${
              canStart
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 cursor-not-allowed"
            }`}
            onClick={handleStartQuiz}
            disabled={!canStart}
          >
            {canStart ? "Begin Simulation" : "Please wait..."}
          </Button>
        </div>
      </div>

      {/* Camera + Mic Preview */}
      <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
        {/* Camera */}
        <div className="border border-gray-300 rounded-lg overflow-hidden w-64 h-64 relative flex flex-col">
          <div className="flex-1">
            {cameraReady ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <p className="text-center text-sm text-gray-500 mt-20">
                Camera not enabled
              </p>
            )}
          </div>
       <Button
  onDoubleClick={async () => {
    if (!cameraReady) {
      // disable while waiting
      setCameraReady("loading"); 
      try {
        await enableCamera();
        setCameraReady(true);
      } catch (err) {
        console.error("Camera error:", err);
        setCameraReady(false);
      }
    }
  }}
  disabled={cameraReady === "loading"}
  className="w-full rounded-none"
  variant="secondary"
>
  {cameraReady === true
    ? "Camera Enabled"
    : cameraReady === "loading"
    ? "Enabling..."
    : "Double-click to Enable Camera"}
</Button>

        </div>

        {/* Audio visualizer */}
        <div className="border border-gray-300 rounded-lg overflow-hidden w-64 h-64 relative flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={256}
              height={192}
              className="w-full h-full"
            />
            {loudWarning && (
              <span className="absolute top-1 left-1 text-xs text-red-600 font-bold bg-white px-1 rounded">
                 Loud noise detected
              </span>
            )}
          </div>
          <Button
            onClick={enableMic}
            className="w-full rounded-none"
            variant="secondary"
          >
            {micReady ? "Mic Enabled" : "Enable Mic"}
          </Button>
        </div>
      </div>
      {/* Enriched Environment Warning */}
      <div className="mt-6 text-sm text-gray-600">
        You may see your face on the screen, notice your motor activity being monitored,
        and hear audio playback. This simulates a real NCK-like exam environment.  
        <br />
        Please remember to <strong>double-click</strong> the Camera & Mic buttons to enable them.  
        <br />
        These monitoring features are for simulation only and are not fully automated.
      </div>
      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-lg">
             NCK Simulation Instructions
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
            className={`w-full mt-6 text-white font-bold ${
              canStart
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
