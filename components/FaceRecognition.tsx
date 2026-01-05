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

  // Face detection loop with stability tracking
  useEffect(() => {
    if (status !== 'ready' || !modelsReady) return;

    let isRunning = true;
    let consecutiveDetections = 0;
    const STABLE_THRESHOLD = 5; // Need 5 consecutive detections for stable

    const detectLoop = async () => {
      if (!isRunning || !videoRef.current || !canvasRef.current) return;

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
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'processing':
        return 'bg-yellow-500';
      default:
        return faceDetected ? 'bg-green-500' : 'bg-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'processing':
        return <Loader className="w-6 h-6 text-yellow-500 animate-spin" />;
      case 'loading':
        return <Loader className="w-6 h-6 text-blue-500 animate-spin" />;
      default:
        return faceDetected 
          ? <ScanFace className="w-6 h-6 text-green-500" />
          : <Camera className="w-6 h-6 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Fingerprint className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">
                {mode === 'enroll'
                  ? t('fr_title_enroll')
                  : mode === 'verify'
                    ? t('fr_title_verify')
                    : t('fr_title_attendance')}
              </h2>
              <p className="text-indigo-200 text-sm">{employeeName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/10 rounded-full p-1">
              <button
                type="button"
                onClick={() => {
                  if (language !== 'hi') toggleLanguage();
                }}
                className={`px-3 py-1 text-sm rounded-full transition ${language === 'hi' ? 'bg-white text-indigo-700 font-bold' : 'text-white/90 hover:text-white'}`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => {
                  if (language !== 'en') toggleLanguage();
                }}
                className={`px-3 py-1 text-sm rounded-full transition ${language === 'en' ? 'bg-white text-indigo-700 font-bold' : 'text-white/90 hover:text-white'}`}
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
              className="text-white/80 hover:text-white p-2"
            >
              <XCircle className="w-6 h-6" />
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative bg-black aspect-video">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white p-6">
              <CameraOff className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <p className="text-lg font-medium">{t('fr_camera_access_error')}</p>
              <p className="text-gray-400 text-sm mt-2">{cameraError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700"
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-9xl font-bold text-white animate-pulse">
                  {countdown}
                </div>
              </div>
            )}

            {/* Face Guide Overlay */}
            {status === 'ready' && !countdown && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-48 h-60 border-4 rounded-[50%] transition-colors duration-300 ${
                  faceDetected ? 'border-green-500' : 'border-white/50'
                }`} />
              </div>
            )}

            {/* Status Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
              <span className="text-white text-sm font-medium">
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
              <div className="absolute top-4 right-4 bg-black/50 rounded-lg px-3 py-1.5">
                <span className={`text-sm font-bold ${
                  matchResult.matched ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatTemplate(t('fr_confidence_pct'), { pct: matchResult.confidence.toFixed(0) })}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Simple guidance + quality */}
      <div className="px-6 py-3 bg-white border-t">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-800">
            {t('fr_quality')}: <span className="font-bold">{t(qualityLabelKey)}</span>
          </div>
          <div className="text-xs text-gray-500">
            {faceStable ? t('fr_hold_still_ok') : t('fr_hold_still')}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              qualityScore >= 0.72 ? 'bg-green-600' : qualityScore >= 0.55 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.round(qualityScore * 100)}%` }}
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-gray-600">
          <div className="flex items-center gap-1">
            <span className="text-base">💡</span> {t('fr_tip_light')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">📷</span> {t('fr_tip_face_center')}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">🙂</span> {t('fr_tip_remove_mask')}
          </div>
        </div>
      </div>

      {/* Enrollment Progress */}
      {mode === 'enroll' && (
        <div className="px-6 py-3 bg-gray-50 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {t('fr_enrollment_progress')}
            </span>
            <span className="text-sm text-gray-500">
              {enrollmentProgress.current}/{enrollmentProgress.required} {t('fr_samples')}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(enrollmentProgress.current / enrollmentProgress.required) * 100}%`,
              }}
            />
          </div>
          {/* Tips for better enrollment */}
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <p>💡 {t('fr_enroll_tip_line1')}</p>
            {enrollmentProgress.current > 0 && enrollmentProgress.current < 3 && (
              <p>🔄 {t('fr_enroll_tip_move_head')}</p>
            )}
          </div>
        </div>
      )}

      {/* Message */}
      <div className="px-6 py-4 bg-gray-50 border-t">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <p className="text-gray-700 font-medium">{message}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 flex gap-3">
        {mode === 'enroll' && status !== 'success' && (
          <button
            onClick={handleEnrollCapture}
            disabled={!canProceed || status === 'processing' || status === 'loading'}
            className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              faceStable && faceDetected && status === 'ready'
                ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {status === 'processing' ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {t('fr_analyzing')}
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
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
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'processing' ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {t('fr_verifying')}
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                {t('fr_btn_verify_identity')}
              </>
            )}
          </button>
        )}

        {mode === 'attendance' && status !== 'success' && (
          <>
            {!hasEnrolledFace(employeeId) ? (
              <div className="flex-1 text-center">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-yellow-700 font-medium">{t('fr_not_enrolled_title')}</p>
                  <p className="text-yellow-600 text-sm mt-1">
                    {t('fr_not_enrolled_help')}
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleMarkAttendance}
                disabled={!canProceed || status === 'processing' || status === 'loading' || countdown !== null}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'processing' ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {t('fr_verifying')}
                  </>
                ) : countdown !== null ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {t('fr_get_ready')} {countdown}
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
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
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {t('fr_done')}
          </button>
        )}
      </div>

      {/* Security Notice */}
      <div className="px-6 py-3 bg-gray-100 border-t text-center">
        <p className="text-xs text-gray-500">
          🔒 {t('fr_security_notice')}
        </p>
      </div>
    </div>
  );
}
