import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  Loader,
  User,
  UserCheck,
  RefreshCw,
  Shield,
  AlertTriangle,
  ScanFace,
  Fingerprint,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  loadModels,
  areModelsLoaded,
  detectFaceWithBox,
  enrollFace,
  verifyFace,
  matchFace,
  getEnrollmentStatus,
  hasEnrolledFace,
  captureFrame,
  drawFaceOverlay,
  type FaceMatchResult,
} from '../services/face-recognition';

interface FaceRecognitionProps {
  employeeId: number;
  employeeName: string;
  mode: 'enroll' | 'verify' | 'attendance';
  onSuccess?: (result: FaceMatchResult) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export default function FaceRecognition({
  employeeId,
  employeeName,
  mode,
  onSuccess,
  onError,
  onClose,
}: FaceRecognitionProps) {
  const { language, toggleLanguage, t } = useApp();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const stableFaceCountRef = useRef<number>(0);
  const lastCaptureTimeRef = useRef<number>(0);
  const lastDetectionTimeRef = useRef<number>(0);

  // State
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
  const [messageKey, setMessageKey] = useState<string>('fr_initializing_camera');
  const [messageParams, setMessageParams] = useState<Record<string, string | number> | undefined>(undefined);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceStable, setFaceStable] = useState(false);
  const [matchResult, setMatchResult] = useState<FaceMatchResult | null>(null);
  const [enrollmentProgress, setEnrollmentProgress] = useState({ current: 0, required: 3 });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [faceAreaRatio, setFaceAreaRatio] = useState<number>(0);

  const formatTemplate = useCallback((template: string, params?: Record<string, string | number>) => {
    if (!params) return template;
    return Object.entries(params).reduce((acc, [key, value]) => {
      return acc.replaceAll(`{${key}}`, String(value));
    }, template);
  }, []);

  const message = useMemo(() => {
    return formatTemplate(t(messageKey), messageParams);
  }, [t, messageKey, messageParams, formatTemplate]);

  const qualityScore = useMemo(() => {
    // Weighted quality score to encourage good lighting + closer framing + stable face
    const confidenceScore = Math.max(0, Math.min(1, detectionConfidence || 0));
    // Face area: 0.06 (~small face) -> 1, 0.20 (~good close) -> 1
    const areaScore = Math.max(0, Math.min(1, (faceAreaRatio - 0.04) / 0.14));
    const stableScore = faceStable ? 1 : 0.4;
    return 0.55 * confidenceScore + 0.30 * areaScore + 0.15 * stableScore;
  }, [detectionConfidence, faceAreaRatio, faceStable]);

  const qualityLabelKey = useMemo(() => {
    if (!faceDetected) return 'fr_quality_need_face';
    if (qualityScore >= 0.72) return 'fr_quality_good';
    if (qualityScore >= 0.55) return 'fr_quality_ok';
    return 'fr_quality_bad';
  }, [qualityScore, faceDetected]);

  const canProceed = useMemo(() => {
    if (!faceDetected) return false;
    if (status === 'processing' || status === 'loading') return false;
    // Require a minimum quality for accurate recognition
    return qualityScore >= 0.55;
  }, [faceDetected, status, qualityScore]);

  // Initialize camera and models
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Load face recognition models
        setMessageKey('fr_loading_models');
        setMessageParams(undefined);
        const modelsLoaded = await loadModels();

        if (!mounted) return;

        if (!modelsLoaded) {
          throw new Error('Failed to load face recognition models');
        }

        setModelsReady(true);
        setMessageKey('fr_starting_camera');
        setMessageParams(undefined);

        // Get camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Check enrollment status
        const enrollStatus = getEnrollmentStatus(employeeId);
        setEnrollmentProgress({
          current: enrollStatus.samplesCount,
          required: enrollStatus.required,
        });

        setStatus('ready');
        setMessageKey(getInstructions());
        setMessageParams(undefined);
      } catch (error: any) {
        console.error('Initialization error:', error);
        if (mounted) {
          setCameraError(error.message);
          setStatus('error');
          setMessageKey('fr_camera_init_failed');
          setMessageParams({ reason: error.message || '' });
          onError?.(error.message);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [employeeId]);

  // Face detection loop with throttling
  useEffect(() => {
    if (status !== 'ready' || !modelsReady) return;

    let isRunning = true;
    let consecutiveDetections = 0;
    const STABLE_THRESHOLD = 5; // Need 5 consecutive detections for stable

    const detectLoop = async () => {
      if (!isRunning || !videoRef.current || !canvasRef.current) return;

      const now = Date.now();
      // Throttle detection to ~30fps (33ms) to prevent UI blocking
      if (now - lastDetectionTimeRef.current < 50) {
        animationRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      lastDetectionTimeRef.current = now;

      try {
        const result = await detectFaceWithBox(videoRef.current);

        // Track stability
        if (result.detected) {
          consecutiveDetections++;
          if (consecutiveDetections >= STABLE_THRESHOLD) {
            stableFaceCountRef.current = consecutiveDetections;
            setFaceStable(true);
          }
        } else {
          consecutiveDetections = 0;
          stableFaceCountRef.current = 0;
          setFaceStable(false);
        }

        setFaceDetected(result.detected);
        setDetectionConfidence(result.confidence ?? 0);

        if (result.detected && result.box && videoRef.current.videoWidth && videoRef.current.videoHeight) {
          const area = result.box.width * result.box.height;
          const full = videoRef.current.videoWidth * videoRef.current.videoHeight;
          setFaceAreaRatio(full ? area / full : 0);
        } else {
          setFaceAreaRatio(0);
        }

        // Draw overlay
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (result.detected && result.box) {
            const isMatch = matchResult?.matched ?? false;
            const label = result.confidence
              ? formatTemplate(t('fr_face_detected_with_confidence'), { pct: (result.confidence * 100).toFixed(0) })
              : t('fr_face_detected');
            drawFaceOverlay(canvas, result.box, isMatch, label);
          }
        }
      } catch (error) {
        console.error('Detection error:', error);
      }

      if (isRunning) {
        animationRef.current = requestAnimationFrame(detectLoop);
      }
    };

    detectLoop();

    return () => {
      isRunning = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status, modelsReady, matchResult, t, formatTemplate]);

  // Get instructions based on mode
  const getInstructions = useCallback(() => {
    switch (mode) {
      case 'enroll':
        return 'fr_instructions_enroll';
      case 'verify':
        return 'fr_instructions_verify';
      case 'attendance':
        const hasEnrolled = hasEnrolledFace(employeeId);
        if (!hasEnrolled) {
          return 'fr_instructions_attendance_not_enrolled';
        }
        return 'fr_instructions_attendance';
      default:
        return 'fr_instructions_default';
    }
  }, [mode, employeeId]);

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  // Handle enrollment capture with retry logic
  const handleEnrollCapture = async () => {
    if (!videoRef.current || status === 'processing') return;

    // Prevent rapid captures (min 1 second between)
    const now = Date.now();
    if (now - lastCaptureTimeRef.current < 1000) {
      setMessageKey('fr_wait_before_capture');
      setMessageParams(undefined);
      return;
    }
    lastCaptureTimeRef.current = now;

    if (!canProceed) {
      setMessageKey('fr_improve_quality');
      setMessageParams(undefined);
      return;
    }

    setStatus('processing');
    setMessageKey('fr_analyzing_hold_still');
    setMessageParams(undefined);
    setCaptureAttempts(prev => prev + 1);

    // Try multiple times for better detection
    let result: { success: boolean; message: string; samplesCount?: number } = {
      success: false,
      message: 'No face detected',
      samplesCount: 0
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const canvas = captureFrame(videoRef.current!);
        result = await enrollFace(employeeId, employeeName, canvas);

        if (result.success) {
          break; // Success, no need to retry
        }

        // Wait a bit before retry
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 300));
          setMessageKey('fr_retrying_capture');
          setMessageParams({ current: attempt + 2, total: 3 });
        }
      } catch (error: any) {
        console.error(`Capture attempt ${attempt + 1} failed:`, error);
        if (attempt === 2) {
          result = { success: false, message: error.message || 'Capture failed', samplesCount: 0 };
        }
      }
    }

    if (result.success) {
      setEnrollmentProgress({
        current: result.samplesCount || 0,
        required: 3,
      });

      if (result.samplesCount && result.samplesCount >= 3) {
        setStatus('success');
        setMessageKey('fr_enrollment_complete');
        setMessageParams(undefined);
        onSuccess?.({
          matched: true,
          employeeId,
          employeeName,
          confidence: 100,
          distance: 0,
          threshold: 0.5,
        });
      } else {
        setStatus('ready');
        setMessageKey('fr_sample_captured');
        setMessageParams({ current: result.samplesCount || 0, total: 3 });
      }
    } else {
      setStatus('ready');
      setMessageKey('fr_capture_failed');
      setMessageParams({ reason: result.message });
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const multiShot = async <T,>(shots: number, fn: () => Promise<T>): Promise<T[]> => {
    const results: T[] = [];
    for (let i = 0; i < shots; i++) {
      results.push(await fn());
      if (i < shots - 1) await sleep(250);
    }
    return results;
  };

  const pickBestMatch = (results: FaceMatchResult[]): FaceMatchResult => {
    // Prefer a matched result with the lowest distance; else lowest distance anyway
    const sorted = [...results].sort((a, b) => a.distance - b.distance);
    const bestMatched = sorted.find(r => r.matched);
    return bestMatched ?? sorted[0] ?? { matched: false, confidence: 0, distance: 1, threshold: 0.5 };
  };

  // Handle verification (multi-shot)
  const handleVerify = async () => {
    if (!videoRef.current || status === 'processing') return;

    setStatus('processing');
    setMessageKey('fr_verifying_face');
    setMessageParams(undefined);

    if (!canProceed) {
      setStatus('ready');
      setMessageKey('fr_improve_quality');
      setMessageParams(undefined);
      return;
    }

    try {
      const results = await multiShot(3, async () => {
        const canvas = captureFrame(videoRef.current!);
        return verifyFace(employeeId, canvas);
      });

      const matchedCount = results.filter(r => r.matched).length;
      const best = pickBestMatch(results);
      setMatchResult(best);

      if (matchedCount >= 2 && best.matched) {
        setStatus('success');
        setMessageKey('fr_identity_verified_welcome');
        setMessageParams({ name: best.employeeName || employeeName });
        onSuccess?.(best);
      } else {
        setStatus('error');
        setMessageKey('fr_face_not_recognized');
        setMessageParams(undefined);
        setTimeout(() => {
          setStatus('ready');
          setMessageKey(getInstructions());
          setMessageParams(undefined);
          setMatchResult(null);
        }, 2000);
      }
    } catch (error: any) {
      setStatus('ready');
      setMessageKey('fr_verification_failed');
      setMessageParams({ reason: error.message || '' });
    }
  };

  // Handle attendance marking
  const handleMarkAttendance = async () => {
    if (!videoRef.current || status === 'processing') return;

    // Check if enrolled
    if (!hasEnrolledFace(employeeId)) {
      setMessageKey('fr_enroll_first');
      setMessageParams(undefined);
      return;
    }

    if (!canProceed) {
      setMessageKey('fr_improve_quality');
      setMessageParams(undefined);
      return;
    }

    // Start countdown
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          performAttendanceVerification();
          return null;
        }
        return (prev || 0) - 1;
      });
    }, 1000);
  };

  const performAttendanceVerification = async () => {
    if (!videoRef.current) return;

    setStatus('processing');
    setMessageKey('fr_verifying_identity');
    setMessageParams(undefined);

    try {
      const results = await multiShot(3, async () => {
        const canvas = captureFrame(videoRef.current!);
        return matchFace(canvas);
      });

      const best = pickBestMatch(results);
      setMatchResult(best);

      const matchedThisEmployeeCount = results.filter(r => r.matched && r.employeeId === employeeId).length;

      if (matchedThisEmployeeCount >= 2 && best.matched && best.employeeId === employeeId) {
        setStatus('success');
        setMessageKey('fr_attendance_marked_welcome');
        setMessageParams({ name: best.employeeName || employeeName });
        onSuccess?.(best);
      } else if (best.matched) {
        // Matched but wrong person
        setStatus('error');
        setMessageKey('fr_identity_mismatch');
        setMessageParams({ matchedName: best.employeeName || '', loggedInAs: employeeName });
        onError?.('Identity mismatch');
        setTimeout(() => {
          setStatus('ready');
          setMessageKey(getInstructions());
          setMessageParams(undefined);
          setMatchResult(null);
        }, 3000);
      } else {
        setStatus('error');
        setMessageKey('fr_face_not_recognized');
        setMessageParams(undefined);
        setTimeout(() => {
          setStatus('ready');
          setMessageKey(getInstructions());
          setMessageParams(undefined);
          setMatchResult(null);
        }, 2000);
      }
    } catch (error: any) {
      setStatus('ready');
      setMessageKey('fr_attendance_failed');
      setMessageParams({ reason: error.message || '' });
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-emerald-500';
      case 'error':
        return 'text-rose-500';
      case 'processing':
        return 'text-amber-500';
      default:
        return faceDetected ? 'text-emerald-500' : 'text-slate-400';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-rose-500" />;
      case 'processing':
        return <Loader className="w-6 h-6 text-amber-500 animate-spin" />;
      case 'loading':
        return <Loader className="w-6 h-6 text-blue-500 animate-spin" />;
      default:
        return faceDetected
          ? <ScanFace className="w-6 h-6 text-emerald-500" />
          : <Camera className="w-6 h-6 text-slate-400" />;
    }
  };

  return (
    <div className="glass-card bg-white/95 rounded-2xl shadow-2xl overflow-hidden max-w-lg mx-auto border border-white/20">
      {/* Header */}
      <div className="glass-header px-6 py-4 flex items-center justify-between border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-xl">
            <Fingerprint className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === 'enroll'
                ? t('fr_title_enroll')
                : mode === 'verify'
                  ? t('fr_title_verify')
                  : t('fr_title_attendance')}
            </h2>
            <p className="text-slate-500 text-xs font-medium">{employeeName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                if (language !== 'hi') toggleLanguage();
              }}
              className={`px-2 py-1 text-xs rounded-md transition font-semibold ${language === 'hi' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => {
                if (language !== 'en') toggleLanguage();
              }}
              className={`px-2 py-1 text-xs rounded-md transition font-semibold ${language === 'en' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ENG
            </button>
          </div>

          {onClose && (
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Camera View */}
      <div className="relative bg-slate-900 aspect-[4/3] overflow-hidden group">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50">
            <div className="text-center text-white p-6 max-w-xs">
              <div className="bg-rose-500/10 p-4 rounded-full inline-block mb-4">
                <CameraOff className="w-12 h-12 text-rose-500" />
              </div>
              <p className="text-lg font-bold text-slate-200">{t('fr_camera_access_error')}</p>
              <p className="text-slate-400 text-sm mt-2 mb-6">{cameraError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 text-white font-medium transition-all shadow-lg shadow-indigo-500/25"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                {t('retry')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full transform scale-x-[-1]"
            />

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-30">
                <div className="text-9xl font-bold text-white animate-pulse drop-shadow-2xl">
                  {countdown}
                </div>
              </div>
            )}

            {/* Face Guide Overlay */}
            {status === 'ready' && !countdown && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-56 h-72 border-[3px] rounded-[45%] transition-all duration-300 ${faceDetected ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-white/30 border-dashed'
                  }`} />
              </div>
            )}

            {/* Status Pill */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 shadow-lg">
              <div className={`w-2.5 h-2.5 rounded-full ${status === 'processing' ? 'bg-amber-500 animate-pulse' : faceDetected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-white text-xs font-semibold tracking-wide">
                {status === 'loading'
                  ? t('loading')
                  : status === 'processing'
                    ? t('processing')
                    : faceDetected
                      ? t('fr_face_detected')
                      : t('fr_no_face')}
              </span>
            </div>

            {/* Confidence Display */}
            {matchResult && status !== 'loading' && (
              <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 shadow-lg">
                <span className={`text-sm font-bold ${matchResult.matched ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                  {formatTemplate(t('fr_confidence_pct'), { pct: matchResult.confidence.toFixed(0) })}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quality & Tips */}
      <div className="px-6 py-4 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-sm font-semibold text-slate-700">
            {t('fr_quality')}:
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase ${qualityScore >= 0.72 ? 'bg-emerald-100 text-emerald-700' :
                qualityScore >= 0.55 ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
              }`}>
              {t(qualityLabelKey)}
            </span>
          </div>
          <div className="text-xs font-medium text-slate-500">
            {faceStable ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle size={12} /> {t('fr_hold_still_ok')}
              </span>
            ) : (
              t('fr_hold_still')
            )}
          </div>
        </div>

        {/* Quality Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-500 ${qualityScore >= 0.72 ? 'bg-emerald-500' : qualityScore >= 0.55 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
            style={{ width: `${Math.round(qualityScore * 100)}%` }}
          />
        </div>

        {/* Tips Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <span className="text-lg mb-1">💡</span>
            <span className="text-[10px] text-slate-600 font-medium leading-tight">{t('fr_tip_light')}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <span className="text-lg mb-1">📷</span>
            <span className="text-[10px] text-slate-600 font-medium leading-tight">{t('fr_tip_face_center')}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <span className="text-lg mb-1">🙂</span>
            <span className="text-[10px] text-slate-600 font-medium leading-tight">{t('fr_tip_remove_mask')}</span>
          </div>
        </div>
      </div>

      {/* Enrollment Progress */}
      {mode === 'enroll' && (
        <div className="px-6 py-3 bg-indigo-50/50 border-t border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              {t('fr_enrollment_progress')}
            </span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
              {enrollmentProgress.current}/{enrollmentProgress.required}
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-2 border border-indigo-100 p-0.5">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{
                width: `${(enrollmentProgress.current / enrollmentProgress.required) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Message & Action Area */}
      <div className="p-6 bg-slate-50 rounded-b-2xl border-t border-slate-200">
        <div className="flex items-center gap-3 mb-4 min-h-[2.5rem]">
          <div className={`p-2 rounded-full bg-white shadow-sm border border-slate-100`}>
            {getStatusIcon()}
          </div>
          <p className="text-slate-800 font-medium leading-snug">{message}</p>
        </div>

        <div className="flex gap-3">
          {mode === 'enroll' && status !== 'success' && (
            <button
              onClick={handleEnrollCapture}
              disabled={!canProceed || status === 'processing' || status === 'loading'}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 ${faceStable && faceDetected && status === 'ready'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-indigo-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
            >
              {status === 'processing' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {t('fr_analyzing')}
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  {faceStable
                    ? t('fr_ready_click_capture')
                    : formatTemplate(t('fr_capture_sample'), { current: enrollmentProgress.current + 1, total: enrollmentProgress.required })}
                </>
              )}
            </button>
          )}

          {mode === 'verify' && status !== 'success' && (
            <button
              onClick={handleVerify}
              disabled={!canProceed || status === 'processing' || status === 'loading'}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 ${canProceed
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
            >
              {status === 'processing' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {t('fr_verifying')}
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  {t('fr_btn_verify_identity')}
                </>
              )}
            </button>
          )}

          {mode === 'attendance' && status !== 'success' && (
            <>
              {!hasEnrolledFace(employeeId) ? (
                <div className="flex-1">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-800 font-bold text-sm mb-1">{t('fr_not_enrolled_title')}</p>
                      <p className="text-amber-700 text-xs leading-relaxed">
                        {t('fr_not_enrolled_help')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleMarkAttendance}
                  disabled={!canProceed || status === 'processing' || status === 'loading' || countdown !== null}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 ${canProceed && countdown === null
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-200'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                >
                  {status === 'processing' ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      {t('fr_verifying')}
                    </>
                  ) : countdown !== null ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      {t('fr_get_ready')} {countdown}
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      {t('mark_attendance')}
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {status === 'success' && (
            <button
              onClick={() => {
                stopCamera();
                onClose?.();
              }}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm tracking-wide bg-slate-900 text-white shadow-lg hover:bg-slate-800 hover:shadow-xl flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {t('fr_done')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
