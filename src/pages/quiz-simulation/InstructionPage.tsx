"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, ArrowRight, Badge, Camera, Stethoscope, Activity, Zap, Scan, CheckCircle2, Clock, FastForward, FileCheck, Flag, Mic, Monitor, ShieldAlert, ShieldCheck, Timer, VolumeX, Wifi, } from "lucide-react";
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
    <div className="space-y-2 md:max-w-full md:px-4 lg:px-6 mx-auto px-4 sm:px-6 lg:px-8  ">


      {/* Setup Card */}
      <Card className="border-none shadow-2xl bg-white dark:bg-muted/30 overflow-hidden rounded-2xl">
        {/* Top Status Ribbon */}
        <div className={`h-2 w-full transition-colors duration-500 ${canStart ? "bg-green-500" : "bg-blue-600"}`} />

        <CardHeader className="space-y-1 pb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-[0.2em]">
              <ShieldCheck className="w-4 h-4" /> Secure Environment Setup
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {new Date().toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>

          <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Proctorium <span className="text-blue-600">Verification</span>
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-300 font-medium">
            Establish your secure connection by calibrating your peripherals below.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* System Status Control Bar */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border-0 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 ${canStart ? "border-green-100 bg-green-50 text-green-600" : "border-blue-100 bg-blue-50 text-blue-600 animate-pulse"}`}>
                {canStart ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">
                  {setupSkipped ? "Verification Bypassed" : canStart ? "System Ready" : "Initializing Hardware"}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                  {setupSkipped
                    ? "Monitoring is currently disabled"
                    : secondsLeft === null
                      ? "Awaiting camera and microphone sync..."
                      : secondsLeft > 0
                        ? `Automated check completes in ${secondsLeft}s`
                        : "All systems operational"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {!canStart && !setupSkipped && (
                <Button
                  variant="ghost"
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 underline underline-offset-4"
                  onClick={() => {
                    setSetupSkipped(true);
                    setCanStart(true);
                  }}
                >
                  Skip & Proceed anyway
                </Button>
              )}
              <Button
                size="lg"
                className={`font-extrabold px-8 rounded-xl shadow-lg transition-all ${canStart
                  ? "bg-green-600 hover:bg-green-700 hover:shadow-green-200"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  }`}
                onClick={handleStartQuiz}
                disabled={!canStart}
              >
                {canStart ? "Start Simulation" : "System Locked"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Setup Skipped Warning Message */}
          {setupSkipped && (
            <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-950/30 border-0 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <p className="text-xs text-orange-800 font-medium leading-relaxed">
                <strong>Security Notice:</strong> You have opted to skip hardware verification.
                The simulation will proceed, but proctoring logs will show "No Feed Available."
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-w-4xl mx-auto">

            {/* --- VISUAL DIAGNOSTIC (CAMERA) --- */}
            <div className="flex flex-col items-center group">
              <div className="w-full flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${cameraReady ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                    <Camera className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Visual Telemetry
                  </span>
                </div>
                {cameraReady && (
                  <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 animate-pulse">
                    LIVE FEED
                  </Badge>
                )}
              </div>

              {/* Camera Window */}
              <div className="relative w-60 h-60 rounded-xl overflow-hidden bg-slate-950 border-[6px] border-white dark:border-slate-900 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
                {/* Viewfinder Brackets */}
                <div className="absolute inset-6 border-l-2 border-t-2 border-white/20 w-8 h-8 rounded-tl-md z-20" />
                <div className="absolute inset-6 right-6 left-auto border-r-2 border-t-2 border-white/20 w-8 h-8 rounded-tr-md z-20" />
                <div className="absolute inset-6 top-auto border-l-2 border-b-2 border-white/20 w-8 h-8 rounded-bl-md z-20" />
                <div className="absolute inset-6 top-auto left-auto border-r-2 border-b-2 border-white/20 w-8 h-8 rounded-br-md z-20" />

                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover transition-opacity duration-1000 ${scanning ? 'opacity-40' : 'opacity-90'}`}
                  autoPlay
                  muted
                  playsInline
                />

                {/* Modern Scanning Overlay */}
                {scanning && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-indigo-950/40 backdrop-blur-[1px]">
                    <div className="relative">
                      <Scan className="w-16 h-16 text-white/50 animate-pulse" />
                      <div className="absolute inset-0 border-2 border-indigo-400 rounded-full animate-ping opacity-50" />
                    </div>
                    <div className="mt-6 flex flex-col items-center gap-1">
                      <span className="text-white font-mono text-xl font-black">{scanProgress}%</span>
                      <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-[0.3em]">Identity Sync...</span>
                    </div>
                  </div>
                )}

                {!scanning && !cameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-muted/30 text-slate-400">
                    <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <ShieldCheck className="w-8 h-8 opacity-20" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Awaiting Link</span>
                  </div>
                )}

                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.01),rgba(0,0,255,0.01))] bg-[length:100%_4px,4px_100%] opacity-50" />
              </div>

              <Button
                onDoubleClick={async () => {
                  // --- RESTORED CAMERA LOGIC ---
                  if (!cameraReady && !scanning) {
                    setScanning(true);
                    setScanProgress(0);
                    let progress = 0;
                    const interval = setInterval(() => {
                      progress += 1;
                      setScanProgress(progress);
                      if (progress >= 100) {
                        clearInterval(interval);
                        setScanning(false);
                      }
                    }, 150);
                    await enableCamera();
                  }
                }}
                disabled={cameraReady === "loading" || scanning}
                className={`mt-3 w-full max-w-[240px] h-12 rounded-xl font-bold uppercase tracking-tighter transition-all shadow-lg
        ${cameraReady
                    ? "bg-slate-100 text-slate-500 cursor-default"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5"}`}
              >
                {cameraReady ? "Optical Link Active" : scanning ? "Analyzing..." : "Initialize Optical Scan"}
              </Button>
            </div>

            {/* --- SONIC DIAGNOSTIC (MIC) --- */}
            <div className="flex flex-col items-center group">
              <div className="w-full flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${micReady ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Auscultation Feed
                  </span>
                </div>
                {micReady && (
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-blue-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Syncronized</span>
                  </div>
                )}
              </div>

              <div className="relative w-60 h-60 rounded-xl overflow-hidden bg-slate-950 border-[6px] border-white dark:border-slate-900 shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(#444_1px,transparent_1px),linear-gradient(90deg,#444_1px,transparent_1px)] bg-[size:20px_20px]" />

                <canvas ref={canvasRef} width={288} height={288} className="w-full h-full relative z-10 opacity-80" />

                {loudWarning && (
                  <div className="absolute inset-x-4 top-4 z-40 bg-red-600/90 backdrop-blur-md text-white py-2 px-4 rounded-xl flex items-center justify-center gap-2 animate-pulse shadow-xl border border-red-400/50">
                    <VolumeX className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center">
                      High Ambient Noise Detected
                    </span>
                  </div>
                )}

                {scanningMic && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-blue-950/60 backdrop-blur-md">
                    <Stethoscope className="w-12 h-12 text-blue-400 mb-4 animate-pulse" />
                    <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 transition-all duration-300"
                        style={{ width: `${scanProgressMic}%` }}
                      />
                    </div>
                    <span className="mt-4 text-[10px] font-mono text-blue-200 uppercase tracking-[0.2em]">Sonic Calibration...</span>
                  </div>
                )}

                {!scanningMic && !micReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-muted/30 text-slate-400">
                    <Zap className="w-8 h-8 opacity-10 mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Auscultation Idle</span>
                  </div>
                )}
              </div>

              <Button
                onClick={async () => {
                  // --- RESTORED MIC LOGIC ---
                  if (!micReady && !scanningMic) {
                    setScanningMic(true);
                    setScanProgressMic(0);
                    let progress = 0;
                    const interval = setInterval(() => {
                      progress += 1;
                      setScanProgressMic(progress);
                      if (progress >= 100) {
                        clearInterval(interval);
                        setScanningMic(false);
                      }
                    }, 150);
                    await enableMic();
                  }
                }}
                disabled={micReady || scanningMic}
                className={`mt-3 w-full max-w-[240px] h-12 rounded-xl font-bold uppercase tracking-tighter transition-all shadow-lg
        ${micReady
                    ? "bg-slate-100 text-slate-500 border-none"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none hover:-translate-y-0.5"}`}
              >
                {micReady ? "Sonic Stream Synced" : scanningMic ? "Calibrating..." : "Initiate Audio Link"}
              </Button>
            </div>

          </div>
          {/* Enriched Environment Warning (The Bottom Note) */}
          <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border-0">

            <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
              <Monitor className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-300">
                Environmental Requirements
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                <strong className="text-slate-900 dark:text-white">
                  Desktop Authorization:
                </strong>{" "}
                This simulation environment is optimized for desktop hardware. Motor activity and facial recognition are monitored via the browser secure layer.
              </p>

              <p>
                <strong className="text-slate-900 dark:text-white">
                  Live Feedback:
                </strong>{" "}
                You will notice your motor activity being tracked and hear periodic audio feedback. This reflects the real-world NCK proctoring experience.
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">

              <span className="text-[10px] text-slate-500 dark:text-slate-500 font-medium italic">
                Double-click triggers the secure handshake for visual sensors.
              </span>

              <div className="flex gap-2">
                <div className="h-1 w-4 bg-blue-600 rounded-full" />
                <div className="h-1 w-4 bg-slate-300 dark:bg-slate-700 rounded-full" />
                <div className="h-1 w-4 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      {/* Instructions Card */}
      <Card className="border-none shadow-xl bg-white dark:bg-muted/30 overflow-hidden rounded-2xl">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="h-8 w-1 bg-blue-600 rounded-full" />
            <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              NCK Simulation Protocol & Guide
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8 text-slate-700 dark:text-slate-200">
          {/* Grid layout for better scannability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <InstructionBox
              icon={<Monitor className="w-5 h-5 text-blue-500" />}
              title="Exam Environment"
              desc="Answer one question at a time. Maintain a quiet, distraction-free environment."
            />

            <InstructionBox
              icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
              title="Question Format"
              desc="Four choices per question. Only one is correct. Review carefully before selecting."
            />

            <InstructionBox
              icon={<Flag className="w-5 h-5 text-orange-500" />}
              title="Review System"
              desc="Use the 'Flag' feature to mark difficult questions for later review."
            />

            <InstructionBox
              icon={<FastForward className="w-5 h-5 text-slate-500" />}
              title="Navigation"
              desc="Unsure? Use 'Skip'. All skipped or flagged items appear before final submission."
            />

            <InstructionBox
              icon={<Timer className="w-5 h-5 text-red-500" />}
              title="Time Management"
              desc="The timer starts immediately. Track your pace; the system auto-submits on expiry."
            />

            <InstructionBox
              icon={<Wifi className="w-5 h-5 text-cyan-500" />}
              title="Connectivity"
              desc="Stable internet is required. Avoid refreshing or navigating away from the tab."
            />

            <InstructionBox
              icon={<ShieldAlert className="w-5 h-5 text-amber-600" />}
              title="Proctoring Rules"
              desc="Switching tabs or prolonged inactivity may trigger an automatic session termination."
            />

            <InstructionBox
              icon={<FileCheck className="w-5 h-5 text-indigo-500" />}
              title="Final Submission"
              desc="Click 'Submit' to end. Results, explanations, and scores are generated instantly."
            />
          </div>

          {/* Final Action Zone */}
          <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-6">
              <div className={`h-2 w-2 rounded-full ${canStart ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {canStart ? "Security Handshake Complete" : "Pending Hardware Authorization"}
              </span>
            </div>

            <Button
              className={`w-full max-w-md h-16 text-lg font-black transition-all duration-300 rounded-2xl shadow-2xl group ${canStart
                ? "bg-green-600 hover:bg-green-700 hover:scale-[1.02] text-white"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              onClick={handleStartQuiz}
              disabled={!canStart}
            >
              {canStart ? (
                <span className="flex items-center gap-2">
                  START EXAMINATION NOW
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              ) : (
                "INITIALIZING SECURE LAYER..."
              )}
            </Button>

            <p className="mt-4 text-[10px] text-slate-400 font-medium max-w-xs text-center leading-relaxed">
              By clicking start, you agree to the simulation terms and proctoring monitoring protocols.
            </p>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
function InstructionBox({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4 p-4 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all group">

      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {title}
        </h4>

        <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed font-medium">
          {desc}
        </p>
      </div>
    </div>
  );
}