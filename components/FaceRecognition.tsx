import { useEffect, useRef, useState, useCallback } from 'react';
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
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const stableFaceCountRef = useRef<number>(0);
  const lastCaptureTimeRef = useRef<number>(0);

  // State
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Initializing camera...');
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceStable, setFaceStable] = useState(false);
  const [matchResult, setMatchResult] = useState<FaceMatchResult | null>(null);
  const [enrollmentProgress, setEnrollmentProgress] = useState({ current: 0, required: 3 });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize camera and models
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Load face recognition models
        setMessage('Loading AI models...');
        const modelsLoaded = await loadModels();
        
        if (!mounted) return;
        
        if (!modelsLoaded) {
          throw new Error('Failed to load face recognition models');
        }
        
        setModelsReady(true);
        setMessage('Starting camera...');

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
        setMessage(getInstructions());
      } catch (error: any) {
        console.error('Initialization error:', error);
        if (mounted) {
          setCameraError(error.message);
          setStatus('error');
          setMessage(error.message || 'Failed to initialize');
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
              ? `${(result.confidence * 100).toFixed(0)}% detected`
              : 'Face detected';
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
  }, [status, modelsReady, matchResult]);

  // Get instructions based on mode
  const getInstructions = useCallback(() => {
    switch (mode) {
      case 'enroll':
        return 'Position your face in the frame and click "Capture" to enroll';
      case 'verify':
        return 'Look at the camera to verify your identity';
      case 'attendance':
        const hasEnrolled = hasEnrolledFace(employeeId);
        if (!hasEnrolled) {
          return 'Please enroll your face first before marking attendance';
        }
        return 'Look at the camera to mark attendance';
      default:
        return 'Position your face in the camera frame';
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
      setMessage('Please wait a moment before capturing again...');
      return;
    }
    lastCaptureTimeRef.current = now;

    setStatus('processing');
    setMessage('Analyzing face... Please hold still');
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
          setMessage(`Retrying capture... (${attempt + 2}/3)`);
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
        setMessage('✅ Face enrollment complete!');
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
        setMessage(`✅ Sample ${result.samplesCount}/3 captured! Move your head slightly and capture again.`);
      }
    } else {
      setStatus('ready');
      setMessage(`⚠️ ${result.message}. Please ensure good lighting and face the camera directly.`);
    }
  };

  // Handle verification
  const handleVerify = async () => {
    if (!videoRef.current || status === 'processing') return;

    setStatus('processing');
    setMessage('Verifying face...');

    try {
      const canvas = captureFrame(videoRef.current);
      const result = await verifyFace(employeeId, canvas);
      setMatchResult(result);

      if (result.matched) {
        setStatus('success');
        setMessage(`✅ Identity verified! Welcome, ${result.employeeName}`);
        onSuccess?.(result);
      } else {
        setStatus('error');
        setMessage('❌ Face not recognized. Please try again.');
        setTimeout(() => {
          setStatus('ready');
          setMessage(getInstructions());
          setMatchResult(null);
        }, 2000);
      }
    } catch (error: any) {
      setStatus('ready');
      setMessage(error.message || 'Verification failed');
    }
  };

  // Handle attendance marking
  const handleMarkAttendance = async () => {
    if (!videoRef.current || status === 'processing') return;

    // Check if enrolled
    if (!hasEnrolledFace(employeeId)) {
      setMessage('Please enroll your face first');
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
    setMessage('Verifying your identity...');

    try {
      const canvas = captureFrame(videoRef.current);
      const result = await matchFace(canvas);
      setMatchResult(result);

      if (result.matched && result.employeeId === employeeId) {
        setStatus('success');
        setMessage(`✅ Attendance marked! Welcome, ${result.employeeName}`);
        onSuccess?.(result);
      } else if (result.matched) {
        // Matched but wrong person
        setStatus('error');
        setMessage(`❌ Face matched ${result.employeeName}, but you logged in as ${employeeName}`);
        onError?.('Identity mismatch');
        setTimeout(() => {
          setStatus('ready');
          setMessage(getInstructions());
          setMatchResult(null);
        }, 3000);
      } else {
        setStatus('error');
        setMessage('❌ Face not recognized. Please try again.');
        setTimeout(() => {
          setStatus('ready');
          setMessage(getInstructions());
          setMatchResult(null);
        }, 2000);
      }
    } catch (error: any) {
      setStatus('ready');
      setMessage(error.message || 'Attendance marking failed');
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
                {mode === 'enroll' ? 'Face Enrollment' : 
                 mode === 'verify' ? 'Identity Verification' : 
                 'Facial Attendance'}
              </h2>
              <p className="text-indigo-200 text-sm">{employeeName}</p>
            </div>
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

      {/* Camera View */}
      <div className="relative bg-black aspect-video">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white p-6">
              <CameraOff className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <p className="text-lg font-medium">Camera Access Error</p>
              <p className="text-gray-400 text-sm mt-2">{cameraError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Retry
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
                {status === 'loading' ? 'Loading...' :
                 status === 'processing' ? 'Processing...' :
                 faceDetected ? 'Face Detected' : 'No Face'}
              </span>
            </div>

            {/* Confidence Display */}
            {matchResult && status !== 'loading' && (
              <div className="absolute top-4 right-4 bg-black/50 rounded-lg px-3 py-1.5">
                <span className={`text-sm font-bold ${
                  matchResult.matched ? 'text-green-400' : 'text-red-400'
                }`}>
                  {matchResult.confidence.toFixed(0)}% confidence
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enrollment Progress */}
      {mode === 'enroll' && (
        <div className="px-6 py-3 bg-gray-50 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Enrollment Progress
            </span>
            <span className="text-sm text-gray-500">
              {enrollmentProgress.current}/{enrollmentProgress.required} samples
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
            <p>💡 Tips: Good lighting, face camera directly, remove glasses/hat</p>
            {enrollmentProgress.current > 0 && enrollmentProgress.current < 3 && (
              <p>🔄 Move your head slightly for the next capture</p>
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
            disabled={!faceDetected || status === 'processing' || status === 'loading'}
            className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              faceStable && faceDetected && status === 'ready'
                ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {status === 'processing' ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Analyzing Face...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                {faceStable ? '✓ Ready - Click to Capture!' : `Capture Sample (${enrollmentProgress.current + 1}/${enrollmentProgress.required})`}
              </>
            )}
          </button>
        )}

        {mode === 'verify' && status !== 'success' && (
          <button
            onClick={handleVerify}
            disabled={!faceDetected || status === 'processing' || status === 'loading'}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'processing' ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Verify Identity
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
                  <p className="text-yellow-700 font-medium">Face Not Enrolled</p>
                  <p className="text-yellow-600 text-sm mt-1">
                    Please ask admin to enroll your face first
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleMarkAttendance}
                disabled={!faceDetected || status === 'processing' || status === 'loading' || countdown !== null}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'processing' ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : countdown !== null ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Get Ready... {countdown}
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    Mark Attendance
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
            Done
          </button>
        )}
      </div>

      {/* Security Notice */}
      <div className="px-6 py-3 bg-gray-100 border-t text-center">
        <p className="text-xs text-gray-500">
          🔒 Your face data is processed locally and stored securely.
          AI-powered recognition using industry-standard algorithms.
        </p>
      </div>
    </div>
  );
}
