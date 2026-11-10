"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Stethoscope,
  Activity,
  Zap,
  Scan,
  CheckCircle2,
  Clock,
  FastForward,
  FileCheck,
  Flag,
  Monitor,
  ShieldAlert,
  ShieldCheck,
  Timer,
  VolumeX,
  Wifi,
  ChevronLeft,
} from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (p: number | number[] = 15) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

const tap = (type: "light" | "success" | "warning" = "light") => {
  playSound("ui-tap");
  if (type === "success") vibrate([15, 30, 15]);
  else if (type === "warning") vibrate(60);
  else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function InstructionPage() {
  const navigate = useNavigate();

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [canStart, setCanStart] = useState(false);
  const [setupSkipped, setSetupSkipped] = useState(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [loudWarning, setLoudWarning] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationIdRef = useRef<number | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanningMic, setScanningMic] = useState(false);
  const [scanProgressMic, setScanProgressMic] = useState(0);

  /* Mount delay */
  useEffect(() => {
    const timer = setTimeout(() => setLoadingPage(false), 300);
    return () => clearTimeout(timer);
  }, []);

  /* Countdown */
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  /* Enable start when ready or skipped */
  useEffect(() => {
    if (setupSkipped || (secondsLeft !== null && secondsLeft <= 15)) {
      setCanStart(true);
    }
  }, [secondsLeft, setupSkipped]);

  /* Cleanup audio animation */
  useEffect(() => {
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, []);

  const handleStartQuiz = () => {
    if (!canStart) return;
    tap("success");
    navigate("/simulation/take");
  };

  const handleBack = () => {
    tap();
    navigate(-1);
  };

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
      if (micReady && secondsLeft === null) setSecondsLeft(30);
    } catch (err) {
      console.error("Camera access denied/unavailable", err);
    }
  };

  const enableMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
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
        canvasCtx.fillStyle = "#0d1117";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        let maxVolume = 0;
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 2;
          maxVolume = Math.max(maxVolume, dataArray[i]);
          let color = "#10b981";
          if (barHeight > 40 && barHeight <= 80) color = "#3b82f6";
          if (barHeight > 80) color = "#f43f5e";
          canvasCtx.fillStyle = color;
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
        setLoudWarning(maxVolume > 150);
      };
      draw();

      setMicReady(true);
      if (cameraReady && secondsLeft === null) setSecondsLeft(30);
    } catch (err) {
      console.error("Microphone access denied/unavailable", err);
    }
  };

  const handleInitCamera = async () => {
    if (cameraReady || scanning) return;
    tap();
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
  };

  const handleInitMic = async () => {
    if (micReady || scanningMic) return;
    tap();
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
  };

  const handleSkip = () => {
    tap("warning");
    setSetupSkipped(true);
    setCanStart(true);
  };

  if (loadingPage) {
    return <GlobalLoader message="Preparing simulation…" />;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-2 px-2 h-14
                         bg-white dark:bg-[#0d1117]
                         border-b border-slate-200/70 dark:border-white/[0.06]
                         z-30 safe-top">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="h-10 w-10 rounded-full flex items-center justify-center
                     text-slate-700 dark:text-slate-200
                     active:bg-slate-100 dark:active:bg-white/5"
          style={{ touchAction: "manipulation" }}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold leading-tight truncate
                         text-slate-900 dark:text-white">
            System check
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
            Step 2 of 3 · Verify your peripherals
          </p>
        </div>
        {canStart && (
          <span className="shrink-0 inline-flex items-center gap-1
                           bg-emerald-50 dark:bg-emerald-400/10
                           text-emerald-700 dark:text-emerald-400
                           text-[10px] font-bold uppercase tracking-wider
                           px-2 py-1 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        )}
      </header>

      {/* ── Body ────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-32 space-y-3 safe-bottom">

          {/* Status bar */}
          <StatusBar
            canStart={canStart}
            setupSkipped={setupSkipped}
            secondsLeft={secondsLeft}
            onSkip={handleSkip}
          />

          {/* Skipped warning */}
          {setupSkipped && (
            <div className="flex items-start gap-2 p-3 rounded-xl
                            bg-amber-50 dark:bg-amber-400/10">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                <strong>Security notice:</strong> You skipped hardware
                verification. Proctoring logs will show "No feed available."
              </p>
            </div>
          )}

          {/* Camera + Mic grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Camera */}
            {/* Camera — compact row */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
              <div className="flex items-center gap-3">
                {/* Small media preview */}
                <div className="relative h-16 w-28 rounded-xl overflow-hidden bg-black shrink-0">
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-cover transition-opacity duration-700 ${scanning ? "opacity-40" : "opacity-90"
                      }`}
                    autoPlay
                    muted
                    playsInline
                  />

                  {scanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                      <Scan className="h-5 w-5 text-white/70 animate-pulse" />
                      <p className="text-white text-[9px] font-bold tabular-nums mt-0.5">
                        {scanProgress}%
                      </p>
                    </div>
                  )}

                  {!scanning && !cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center
                        bg-slate-100 dark:bg-white/[0.03]">
                      <ShieldCheck className="h-6 w-6 text-slate-400 dark:text-slate-500 opacity-60" />
                    </div>
                  )}

                  {cameraReady && (
                    <span className="absolute top-1 left-1
                         bg-emerald-500 text-white
                         text-[8px] font-bold uppercase tracking-wider
                         px-1 py-0.5 rounded">
                      Live
                    </span>
                  )}
                </div>

                {/* Text + action */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Camera className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                    <p className="text-[10px] font-bold uppercase tracking-wider
                      text-slate-500 dark:text-slate-400 leading-none">
                      Camera
                    </p>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1.5">
                    {cameraReady ? "Visual feed active" : scanning ? "Scanning…" : "Visual feed"}
                  </h3>
                  <button
                    onClick={handleInitCamera}
                    disabled={scanning || cameraReady}
                    className={`h-8 px-3 rounded-lg
                    text-[11px] font-bold
                    flex items-center justify-center gap-1
                    transition-transform
                    ${cameraReady
                        ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 cursor-default"
                        : scanning
                          ? "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 cursor-wait"
                          : "bg-blue-600 text-white active:scale-[0.97]"
                      }`}
                    style={{ touchAction: "manipulation" }}
                  >
                    {cameraReady ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Enabled
                      </>
                    ) : scanning ? (
                      "Scanning…"
                    ) : (
                      "Enable"
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Mic */}
            {/* Microphone — compact row */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
              <div className="flex items-center gap-3">
                {/* Small media preview */}
                <div className="relative h-16 w-28 rounded-xl overflow-hidden bg-[#0d1117] shrink-0">
                  <canvas
                    ref={canvasRef}
                    width={128}
                    height={128}
                    className="w-full h-full relative z-10 opacity-90"
                  />

                  {loudWarning && (
                    <div className="absolute inset-0 flex items-center justify-center
                        bg-rose-600/90 z-30">
                      <VolumeX className="h-5 w-5 text-white" />
                    </div>
                  )}

                  {scanningMic && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center
                        bg-black/60 z-30">
                      <Stethoscope className="h-5 w-5 text-blue-400 animate-pulse" />
                      <p className="text-blue-200 text-[9px] font-bold tabular-nums mt-0.5">
                        {scanProgressMic}%
                      </p>
                    </div>
                  )}

                  {!scanningMic && !micReady && (
                    <div className="absolute inset-0 flex items-center justify-center
                        bg-slate-100 dark:bg-white/[0.03]">
                      <Zap className="h-5 w-5 text-slate-400 dark:text-slate-500 opacity-40" />
                    </div>
                  )}

                  {micReady && (
                    <span className="absolute top-1 left-1
                         bg-blue-500 text-white
                         text-[8px] font-bold uppercase tracking-wider
                         px-1 py-0.5 rounded z-20">
                      On
                    </span>
                  )}
                </div>

                {/* Text + action */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Stethoscope className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                    <p className="text-[10px] font-bold uppercase tracking-wider
                      text-slate-500 dark:text-slate-400 leading-none">
                      Microphone
                    </p>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1.5">
                    {micReady ? "Audio feed active" : scanningMic ? "Calibrating…" : "Audio feed"}
                  </h3>
                  <button
                    onClick={handleInitMic}
                    disabled={micReady || scanningMic}
                    className={`h-8 px-3 rounded-lg
                    text-[11px] font-bold
                    flex items-center justify-center gap-1
                    transition-transform
                    ${micReady
                        ? "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400 cursor-default"
                        : scanningMic
                          ? "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 cursor-wait"
                          : "bg-blue-600 text-white active:scale-[0.97]"
                      }`}
                    style={{ touchAction: "manipulation" }}
                  >
                    {micReady ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Enabled
                      </>
                    ) : scanningMic ? (
                      "Calibrating…"
                    ) : (
                      "Enable"
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Environmental requirements */}
          <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg
                              bg-blue-400/10
                              flex items-center justify-center shrink-0">
                <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider
                              text-blue-600 dark:text-blue-400 leading-none mb-1">
                  Environment
                </p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Requirements
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3
                            text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
              <p>
                <strong className="text-slate-900 dark:text-white">
                  Desktop recommended:
                </strong>{" "}
                The simulation is optimised for desktop. Motor activity and
                facial recognition are monitored via the browser secure layer.
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">
                  Live feedback:
                </strong>{" "}
                You will see your motor activity tracked and hear periodic
                audio feedback — reflecting the real NCK proctoring experience.
              </p>
            </div>
          </section>

          {/* Exam protocol */}
          <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg
                              bg-violet-400/10
                              flex items-center justify-center shrink-0">
                <FileCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider
                              text-violet-600 dark:text-violet-400 leading-none mb-1">
                  Protocol
                </p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  NCK simulation guide
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              <ProtocolItem
                icon={<Monitor className="h-3.5 w-3.5" />}
                tone="blue"
                title="Environment"
                desc="Answer one question at a time. Keep a quiet space."
              />
              <ProtocolItem
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                tone="emerald"
                title="Question format"
                desc="Four choices, one correct. Review carefully before selecting."
              />
              <ProtocolItem
                icon={<Flag className="h-3.5 w-3.5" />}
                tone="amber"
                title="Review system"
                desc="Flag difficult questions for later review."
              />
              <ProtocolItem
                icon={<FastForward className="h-3.5 w-3.5" />}
                tone="neutral"
                title="Navigation"
                desc="Skip and revisit — flagged or skipped items appear before submission."
              />
              <ProtocolItem
                icon={<Timer className="h-3.5 w-3.5" />}
                tone="rose"
                title="Time"
                desc="Timer starts immediately. Auto-submits on expiry."
              />
              <ProtocolItem
                icon={<Wifi className="h-3.5 w-3.5" />}
                tone="sky"
                title="Connectivity"
                desc="Stable internet required. Do not refresh or leave the tab."
              />
              <ProtocolItem
                icon={<ShieldAlert className="h-3.5 w-3.5" />}
                tone="amber"
                title="Proctoring"
                desc="Tab switching or prolonged inactivity may terminate the session."
              />
              <ProtocolItem
                icon={<FileCheck className="h-3.5 w-3.5" />}
                tone="violet"
                title="Submission"
                desc="Submit to end. Results and explanations generate instantly."
              />
            </div>
          </section>
        </div>
      </main>

      {/* ── Pinned footer ────────────────────────────────── */}
      <footer className="shrink-0 px-4 py-3
                   bg-white dark:bg-[#0d1117]
                   border-t border-slate-200/70 dark:border-white/[0.06]
                   safe-bottom">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${canStart ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-white/[0.15]"
                }`}
            />
            <span className="text-[9px] font-bold uppercase tracking-wider
                       text-slate-500 dark:text-slate-400">
              {canStart ? "Security handshake complete" : "Pending hardware authorisation"}
            </span>
          </div>

          <button
            onClick={handleStartQuiz}
            disabled={!canStart}
            className={`w-full h-11 rounded-xl text-white
                  text-sm font-bold
                  flex items-center justify-center gap-2
                  transition-transform
                  ${canStart
                ? "bg-emerald-600 active:scale-[0.97]"
                : "bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            style={{ touchAction: "manipulation" }}
          >
            {canStart ? (
              <>
                Start examination
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              "Initializing secure layer…"
            )}
          </button>

          <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400
                  text-center leading-snug">
            By clicking start you agree to simulation terms and proctoring protocols.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function StatusBar({
  canStart,
  setupSkipped,
  secondsLeft,
  onSkip,
}: {
  canStart: boolean;
  setupSkipped: boolean;
  secondsLeft: number | null;
  onSkip: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${canStart
            ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
            : "bg-blue-400/10 text-blue-600 dark:text-blue-400"
            }`}
        >
          {canStart ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Clock className="h-5 w-5 animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
            {setupSkipped
              ? "Verification bypassed"
              : canStart
                ? "System ready"
                : "Initialising hardware"}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug truncate">
            {setupSkipped
              ? "Monitoring disabled"
              : secondsLeft === null
                ? "Awaiting camera and microphone…"
                : secondsLeft > 0
                  ? `Automated check in ${secondsLeft}s`
                  : "All systems operational"}
          </p>
        </div>

        {!canStart && !setupSkipped && (
          <button
            onClick={onSkip}
            className="shrink-0 h-9 px-2.5 rounded-lg
                       bg-amber-50 dark:bg-amber-400/10
                       text-amber-700 dark:text-amber-400
                       text-[11px] font-bold
                       active:scale-[0.97] transition-transform"
            style={{ touchAction: "manipulation" }}
          >
            Skip
          </button>
        )}
      </div>
    </section>
  );
}

function ProtocolItem({
  icon,
  tone,
  title,
  desc,
}: {
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "amber" | "rose" | "sky" | "violet" | "neutral";
  title: string;
  desc: string;
}) {
  const toneClass = {
    blue: "bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400",
    emerald:
      "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    amber:
      "bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400",
    sky: "bg-sky-50 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400",
    violet:
      "bg-violet-50 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400",
    neutral:
      "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300",
  }[tone];

  return (
    <div className="flex items-start gap-2 p-2 rounded-xl
                    bg-slate-50 dark:bg-[#0d1117]">
      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">
          {title}
        </p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
          {desc}
        </p>
      </div>
    </div>
  );
}