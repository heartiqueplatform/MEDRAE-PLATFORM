"use client";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ExamProctorProps {
    videoStream: MediaStream | null;
    sessionId: string | null;
    paperId: string; // ← new
}

export default function ExamProctor({ videoStream, sessionId, paperId }: ExamProctorProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const lastWarning = useRef(0);
    const warningCount = useRef(0); // counts warnings
    const [tutorCode, setTutorCode] = useState("");
    const [faceVisible, setFaceVisible] = useState(false);
    // state for overlay and paper settings
    const [maxWarnings, setMaxWarnings] = useState(25); // default max warnings
    const [strictMode, setStrictMode] = useState(true);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const faceDetectedOnce = useRef(false); // ← track if face toast already shown
    const WARNING_THROTTLE = 60000; // 15 seconds // 2 minutes for throttled warnings (No face / Looking away)

    const lastNoFaceWarning = useRef(0);      // for throttling NO FACE
    const lastMultiFaceWarning = useRef(0);   // for MULTIPLE FACE instant

    useEffect(() => {
        const fetchPaperSettings = async () => {
            if (!paperId) return;

            const { data, error } = await supabase
                .from("exam_papers")
                .select("max_violation_limit, strict_mode")
                .eq("id", paperId)
                .single();

            if (error) {
                console.error("Failed to fetch paper settings:", error);
                return;
            }

            if (data) {
                setMaxWarnings(data.max_violation_limit ?? 25); // ← Default to 25 warnings if not set in DB
                setStrictMode(data.strict_mode ?? true);
            }
        };

        fetchPaperSettings();
        start(); // start face detection after fetching settings
    }, [paperId]);
    const handleTutorReset = async () => {
        if (!sessionId || !paperId) return;

        try {
            // Call the secure RPC function on Supabase
            const { error } = await supabase.rpc('reset_exam_session', {
                p_session_id: sessionId,
                p_tutor_code: tutorCode
            });

            if (error) {
                toast.error(error.message || "Failed to reset session");
                console.error("RPC error:", error);
                return;
            }

            // Success: clear warnings and overlay
            resetWarnings();
            setTutorCode(""); // clear input
            toast.success("Tutor reset successful. You may continue the exam.");

        } catch (err) {
            console.error("Unexpected error during tutor reset:", err);
            toast.error("Unexpected error during tutor reset");
        }
    };
    const reportIrregularity = (type: string) => {
        if (!sessionId) return;

        // Increment warning count immediately
        warningCount.current = Math.min(warningCount.current + 1, maxWarnings);
        const remaining = maxWarnings - warningCount.current;

        // Log to console for debugging
        console.log(`[IRREGULARITY] Type: ${type}, WarningCount: ${warningCount.current}, Remaining: ${remaining}`);

        // Show toast immediately
        toast.warning(`Warning: ${type}. You have ${remaining} warning(s) left.`);

        // Async Supabase update (non-blocking)
        (async () => {
            try {
                // Fetch current irregularities
                const { data: sessionData, error: fetchError } = await supabase
                    .from("exam_sessions")
                    .select("irregularities")
                    .eq("id", sessionId)
                    .single();

                if (fetchError) {
                    console.error("[SUPABASE FETCH ERROR]", fetchError);
                    return;
                }
                console.log("[SUPABASE FETCH SUCCESS]", sessionData);

                const currentIrregularities = sessionData?.irregularities || [];
                const updatedIrregularities = [...currentIrregularities, type];

                // Update irregularities in DB
                const { error: updateError } = await supabase
                    .from("exam_sessions")
                    .update({
                        irregularities: updatedIrregularities,
                        irregularity_count: updatedIrregularities.length,
                    })
                    .eq("id", sessionId);

                if (updateError) {
                    console.error("[SUPABASE UPDATE ERROR]", updateError);
                } else {
                    console.log("[SUPABASE UPDATE SUCCESS]", updatedIrregularities);
                }
            } catch (err) {
                console.error("[SUPABASE UNEXPECTED ERROR]", err);
            }
        })();

        // Show overlay and final toast if max warnings reached
        if (warningCount.current >= maxWarnings && strictMode) {
            console.log("[MAX WARNINGS REACHED]");
            setOverlayVisible(true);
            toast.error("Maximum warnings reached. Exam is locked until tutor resets.");
        }
    };

    const start = async () => {
        // Load face-api models
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");

        const stream = videoStream || (await navigator.mediaDevices.getUserMedia({ video: true }));

        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
        }

        detect();
    };
    const detect = () => {
        setInterval(async () => {
            if (!videoRef.current || overlayVisible) return; // pause detection if overlay active

            const detections = await faceapi
                .detectAllFaces(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 512,      // higher resolution detection
                        scoreThreshold: 0.3  // lower threshold = easier detection
                    })
                )
                .withFaceLandmarks();
            console.log("Faces detected:", detections.length);
            const now = Date.now();

            // NO FACE
            if (detections.length === 0) {
                setFaceVisible(false);

                console.log("Time since last no-face warning:", now - lastNoFaceWarning.current);

                if (now - lastNoFaceWarning.current >= WARNING_THROTTLE) {
                    reportIrregularity("No face detected");
                    lastNoFaceWarning.current = now;
                }

                return;
            }

            // MULTIPLE FACES → INSTANT WARNING
            if (detections.length > 1) {
                setFaceVisible(false); // hide icon
                if (now - lastMultiFaceWarning.current >= 500) { // small 0.5s buffer to prevent spamming
                    await reportIrregularity("Multiple faces detected");
                    lastMultiFaceWarning.current = now;
                }
                return;
            }

            // ONE FACE
            if (detections.length === 1) {
                lastNoFaceWarning.current = Date.now(); // reset no-face timer
                const detection = detections[0];
                const landmarks = detection.landmarks;

                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();
                const nose = landmarks.getNose();

                const leftEyeX = leftEye[0].x;
                const rightEyeX = rightEye[3].x;
                const noseX = nose[3].x;

                const eyeCenter = (leftEyeX + rightEyeX) / 2;

                if (Math.abs(noseX - eyeCenter) > 20) {
                    setFaceVisible(false); // looking away → hide icon
                    if (now - lastWarning.current >= WARNING_THROTTLE) {
                        await reportIrregularity("Looking away from screen");
                        lastWarning.current = now;
                    }
                } else {
                    // Face detected and looking at screen → always show icon
                    setFaceVisible(true);

                    if (!faceDetectedOnce.current) {
                        toast.success("Face detected and looking at screen"); // show only once
                        faceDetectedOnce.current = true;
                    }
                }
            }
        }, 2000); // check every 2s
    };
    // tutor can call this to reset warnings and hide overlay
    const resetWarnings = () => {
        warningCount.current = 0;
        setOverlayVisible(false);
        toast.success("Tutor has reset the warnings. You may continue the exam.");
    };

    return (
        <>
            <video
                ref={videoRef}
                autoPlay
                muted
                className="w-40 h-32 rounded-lg border border-gray-300 object-cover"
            />
            {faceVisible && (
                <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center space-x-1 animate-pulse">
                    <span>😊</span>
                    <span>Face OK</span>
                </div>
            )}
            {/* Overlay when max warnings reached */}
            {overlayVisible && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center">
                        {/* Warning Icon / Title */}
                        <h2 className="text-3xl font-bold text-red-600 mb-4">Exam Locked</h2>

                        {/* Warning Message */}
                        <p className="text-gray-800 text-center mb-6">
                            You have reached the maximum violation limit. <br />
                            Please wait for the tutor to reset or enter the tutor reset code below.
                        </p>

                        {/* Tutor Reset Input */}
                        <div className="w-full flex space-x-2 mb-4">
                            <input
                                type="text"
                                placeholder="Tutor code"
                                value={tutorCode}
                                onChange={(e) => setTutorCode(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleTutorReset}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Reset
                            </button>
                        </div>

                        {/* Strong Exit Warning */}
                        <p className="text-red-600 text-center mb-2 font-semibold">
                            ⚠ Warning: Clicking "Exit Exam" will submit your current answers immediately!
                        </p>

                        {/* Exit Exam Button */}
                        {/* Exit Exam Button */}
                        <Button
                            size="lg"
                            variant="destructive"
                            className="w-full px-4 py-3 font-bold rounded-lg hover:bg-red-700 transition-colors"
                            onClick={() => {
                                const confirmExit = window.confirm(
                                    "⚠️ Warning: Exiting now will discard your progress and leave the exam. Continue?"
                                );
                                if (confirmExit) {
                                    // Redirect to dashboard (or any page)
                                    window.location.href = "/dashboard";
                                    // OR using react-router:
                                    // navigate("/dashboard");
                                }
                            }}
                        >
                            EXIT MEDRAE
                        </Button>
                    </div>
                </div>
            )}

        </>
    );
}