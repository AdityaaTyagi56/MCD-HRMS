/**
 * Face Recognition Service for MCD HRMS Employee Attendance
 * Uses TensorFlow.js based face-api.js for accurate facial detection and recognition
 */

// Face descriptor type - 128-dimensional vector representing unique facial features
export type FaceDescriptor = Float32Array;

export interface FaceEnrollment {
  employeeId: number;
  employeeName: string;
  descriptors: number[][]; // Multiple face samples for better accuracy
  enrolledAt: string;
  photoUrl?: string;
}

export interface FaceMatchResult {
  matched: boolean;
  employeeId?: number;
  employeeName?: string;
  confidence: number;
  distance: number;
  threshold: number;
}

export interface FaceDetectionResult {
  detected: boolean;
  faceCount: number;
  descriptor?: number[];
  landmarks?: number[][];
  expressions?: Record<string, number>;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Face matching threshold - lower means stricter matching
  matchThreshold: 0.45,
  // Minimum confidence for detection
  minConfidence: 0.7,
  // Minimum samples required for reliable enrollment
  minEnrollmentSamples: 3,
  // Maximum samples to store per employee
  maxEnrollmentSamples: 5,
  // Model weights URL (using CDN for face-api.js models)
  modelUrl: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model',
};

// ============================================================================
// In-Memory Storage (Replace with backend API in production)
// ============================================================================

let enrolledFaces: Map<number, FaceEnrollment> = new Map();
let modelsLoaded = false;
let faceApiInstance: any = null;

// ============================================================================
// Model Loading
// ============================================================================

/**
 * Dynamically load face-api.js
 */
async function loadFaceApi(): Promise<any> {
  if (faceApiInstance) {
    return faceApiInstance;
  }

  // Load face-api.js from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js';
    script.async = true;
    script.onload = () => {
      faceApiInstance = (window as any).faceapi;
      resolve(faceApiInstance);
    };
    script.onerror = () => reject(new Error('Failed to load face-api.js'));
    document.head.appendChild(script);
  });
}

/**
 * Load required face recognition models
 */
export async function loadModels(): Promise<boolean> {
  if (modelsLoaded) {
    return true;
  }

  try {
    const faceapi = await loadFaceApi();
    
    console.log('📦 Loading face recognition models...');
    
    // Load all required models in parallel
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(CONFIG.modelUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.modelUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.modelUrl),
      faceapi.nets.faceExpressionNet.loadFromUri(CONFIG.modelUrl),
    ]);

    modelsLoaded = true;
    console.log('✅ Face recognition models loaded successfully');
    
    // Load enrolled faces from localStorage
    loadEnrolledFaces();
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load face recognition models:', error);
    return false;
  }
}

/**
 * Check if models are loaded
 */
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

// ============================================================================
// Face Detection
// ============================================================================

/**
 * Detect faces in an image/video element
 */
export async function detectFaces(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceDetectionResult> {
  if (!modelsLoaded) {
    return { detected: false, faceCount: 0, error: 'Models not loaded' };
  }

  try {
    const faceapi = await loadFaceApi();
    
    // Detect all faces with landmarks and descriptors
    const detections = await faceapi
      .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: CONFIG.minConfidence }))
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions();

    if (!detections || detections.length === 0) {
      return { detected: false, faceCount: 0 };
    }

    // Get the largest face (assuming it's the main subject)
    const mainDetection = detections.reduce((prev, curr) => {
      const prevBox = prev.detection.box;
      const currBox = curr.detection.box;
      return (prevBox.width * prevBox.height) > (currBox.width * currBox.height) ? prev : curr;
    });

    // Convert Float32Array to regular array for serialization
    const descriptor: number[] = Array.from(mainDetection.descriptor) as number[];
    
    // Extract landmark points
    const landmarks = mainDetection.landmarks.positions.map((p: { x: number; y: number }) => [p.x, p.y]);

    // Get expressions
    const expressions: Record<string, number> = {};
    Object.entries(mainDetection.expressions).forEach(([key, value]) => {
      expressions[key] = value as number;
    });

    return {
      detected: true,
      faceCount: detections.length,
      descriptor,
      landmarks,
      expressions,
    };
  } catch (error: any) {
    console.error('Face detection error:', error);
    return { detected: false, faceCount: 0, error: error.message };
  }
}

/**
 * Detect a single face with bounding box for UI overlay
 */
export async function detectFaceWithBox(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<{
  detected: boolean;
  box?: { x: number; y: number; width: number; height: number };
  confidence?: number;
}> {
  if (!modelsLoaded) {
    return { detected: false };
  }

  try {
    const faceapi = await loadFaceApi();
    
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: CONFIG.minConfidence }));

    if (!detection) {
      return { detected: false };
    }

    return {
      detected: true,
      box: {
        x: detection.box.x,
        y: detection.box.y,
        width: detection.box.width,
        height: detection.box.height,
      },
      confidence: detection.score,
    };
  } catch (error) {
    return { detected: false };
  }
}

// ============================================================================
// Face Enrollment
// ============================================================================

/**
 * Enroll a new face for an employee
 */
export async function enrollFace(
  employeeId: number,
  employeeName: string,
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  photoUrl?: string
): Promise<{ success: boolean; message: string; samplesCount?: number }> {
  const detection = await detectFaces(input);

  if (!detection.detected || !detection.descriptor) {
    return { success: false, message: 'No face detected. Please position your face clearly in the camera.' };
  }

  if (detection.faceCount > 1) {
    return { success: false, message: 'Multiple faces detected. Please ensure only one person is in frame.' };
  }

  // Get existing enrollment or create new
  let enrollment = enrolledFaces.get(employeeId);

  if (!enrollment) {
    enrollment = {
      employeeId,
      employeeName,
      descriptors: [],
      enrolledAt: new Date().toISOString(),
      photoUrl,
    };
  }

  // Check if we already have max samples
  if (enrollment.descriptors.length >= CONFIG.maxEnrollmentSamples) {
    // Replace oldest sample
    enrollment.descriptors.shift();
  }

  // Add new descriptor
  enrollment.descriptors.push(detection.descriptor);
  enrollment.photoUrl = photoUrl || enrollment.photoUrl;
  
  enrolledFaces.set(employeeId, enrollment);
  
  // Save to localStorage
  saveEnrolledFaces();

  const samplesCount = enrollment.descriptors.length;
  const isComplete = samplesCount >= CONFIG.minEnrollmentSamples;

  return {
    success: true,
    message: isComplete 
      ? `✅ Face enrollment complete with ${samplesCount} samples!` 
      : `📸 Sample ${samplesCount}/${CONFIG.minEnrollmentSamples} captured. Please capture more samples for better accuracy.`,
    samplesCount,
  };
}

/**
 * Check if an employee has enrolled face
 */
export function hasEnrolledFace(employeeId: number): boolean {
  const enrollment = enrolledFaces.get(employeeId);
  return !!(enrollment && enrollment.descriptors.length >= CONFIG.minEnrollmentSamples);
}

/**
 * Get enrollment status for an employee
 */
export function getEnrollmentStatus(employeeId: number): {
  enrolled: boolean;
  samplesCount: number;
  required: number;
  enrolledAt?: string;
} {
  const enrollment = enrolledFaces.get(employeeId);
  if (!enrollment) {
    return { enrolled: false, samplesCount: 0, required: CONFIG.minEnrollmentSamples };
  }

  return {
    enrolled: enrollment.descriptors.length >= CONFIG.minEnrollmentSamples,
    samplesCount: enrollment.descriptors.length,
    required: CONFIG.minEnrollmentSamples,
    enrolledAt: enrollment.enrolledAt,
  };
}

/**
 * Remove face enrollment for an employee
 */
export function removeEnrollment(employeeId: number): boolean {
  const deleted = enrolledFaces.delete(employeeId);
  if (deleted) {
    saveEnrolledFaces();
  }
  return deleted;
}

// ============================================================================
// Face Matching
// ============================================================================

/**
 * Match a face against enrolled faces
 */
export async function matchFace(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceMatchResult> {
  const detection = await detectFaces(input);

  if (!detection.detected || !detection.descriptor) {
    return {
      matched: false,
      confidence: 0,
      distance: 1,
      threshold: CONFIG.matchThreshold,
    };
  }

  if (enrolledFaces.size === 0) {
    return {
      matched: false,
      confidence: 0,
      distance: 1,
      threshold: CONFIG.matchThreshold,
    };
  }

  let bestMatch: { employeeId: number; employeeName: string; distance: number } | null = null;

  // Compare against all enrolled faces
  for (const [employeeId, enrollment] of enrolledFaces) {
    for (const storedDescriptor of enrollment.descriptors) {
      const distance = euclideanDistance(detection.descriptor, storedDescriptor);
      
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = {
          employeeId,
          employeeName: enrollment.employeeName,
          distance,
        };
      }
    }
  }

  if (!bestMatch) {
    return {
      matched: false,
      confidence: 0,
      distance: 1,
      threshold: CONFIG.matchThreshold,
    };
  }

  // Calculate confidence (inverse of distance, normalized)
  const confidence = Math.max(0, Math.min(100, (1 - bestMatch.distance / CONFIG.matchThreshold) * 100));
  const matched = bestMatch.distance < CONFIG.matchThreshold;

  return {
    matched,
    employeeId: matched ? bestMatch.employeeId : undefined,
    employeeName: matched ? bestMatch.employeeName : undefined,
    confidence,
    distance: bestMatch.distance,
    threshold: CONFIG.matchThreshold,
  };
}

/**
 * Verify a specific employee's face
 */
export async function verifyFace(
  employeeId: number,
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceMatchResult> {
  const enrollment = enrolledFaces.get(employeeId);

  if (!enrollment || enrollment.descriptors.length === 0) {
    return {
      matched: false,
      confidence: 0,
      distance: 1,
      threshold: CONFIG.matchThreshold,
    };
  }

  const detection = await detectFaces(input);

  if (!detection.detected || !detection.descriptor) {
    return {
      matched: false,
      confidence: 0,
      distance: 1,
      threshold: CONFIG.matchThreshold,
    };
  }

  // Find minimum distance across all stored samples
  let minDistance = Infinity;
  for (const storedDescriptor of enrollment.descriptors) {
    const distance = euclideanDistance(detection.descriptor, storedDescriptor);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  const confidence = Math.max(0, Math.min(100, (1 - minDistance / CONFIG.matchThreshold) * 100));
  const matched = minDistance < CONFIG.matchThreshold;

  return {
    matched,
    employeeId: matched ? employeeId : undefined,
    employeeName: matched ? enrollment.employeeName : undefined,
    confidence,
    distance: minDistance,
    threshold: CONFIG.matchThreshold,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate Euclidean distance between two face descriptors
 */
function euclideanDistance(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    sum += Math.pow(arr1[i] - arr2[i], 2);
  }
  return Math.sqrt(sum);
}

/**
 * Save enrolled faces to localStorage
 */
function saveEnrolledFaces(): void {
  try {
    const data: Record<number, FaceEnrollment> = {};
    enrolledFaces.forEach((value, key) => {
      data[key] = value;
    });
    localStorage.setItem('mcd_enrolled_faces', JSON.stringify(data));
    console.log('💾 Enrolled faces saved to localStorage');
  } catch (error) {
    console.error('Failed to save enrolled faces:', error);
  }
}

/**
 * Load enrolled faces from localStorage
 */
function loadEnrolledFaces(): void {
  try {
    const data = localStorage.getItem('mcd_enrolled_faces');
    if (data) {
      const parsed = JSON.parse(data) as Record<number, FaceEnrollment>;
      enrolledFaces = new Map(Object.entries(parsed).map(([key, value]) => [parseInt(key), value]));
      console.log(`📂 Loaded ${enrolledFaces.size} enrolled faces from localStorage`);
    }
  } catch (error) {
    console.error('Failed to load enrolled faces:', error);
    enrolledFaces = new Map();
  }
}

/**
 * Get all enrolled employees count
 */
export function getEnrolledCount(): number {
  return Array.from(enrolledFaces.values()).filter(
    e => e.descriptors.length >= CONFIG.minEnrollmentSamples
  ).length;
}

/**
 * Get all enrollments (for admin view)
 */
export function getAllEnrollments(): FaceEnrollment[] {
  return Array.from(enrolledFaces.values());
}

// ============================================================================
// Server Sync Functions (Optional - for production)
// ============================================================================

const API_BASE = '/api';

/**
 * Sync enrollment to server
 */
export async function syncEnrollmentToServer(employeeId: number): Promise<boolean> {
  const enrollment = enrolledFaces.get(employeeId);
  if (!enrollment) return false;

  try {
    const response = await fetch(`${API_BASE}/face/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: employeeId.toString(),
        descriptors: enrollment.descriptors,
      }),
    });

    if (!response.ok) {
      console.warn('Failed to sync enrollment to server');
      return false;
    }

    console.log(`✅ Enrollment synced to server for employee ${employeeId}`);
    return true;
  } catch (error) {
    console.warn('Server sync failed (offline mode):', error);
    return false;
  }
}

/**
 * Load enrollment from server
 */
export async function loadEnrollmentFromServer(employeeId: number): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/face/enrollment/${employeeId}`);
    
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    
    if (data.enrolled && data.descriptors) {
      enrolledFaces.set(employeeId, {
        employeeId,
        employeeName: data.employeeName || `Employee ${employeeId}`,
        descriptors: data.descriptors,
        enrolledAt: data.enrolledAt,
      });
      console.log(`✅ Loaded enrollment from server for employee ${employeeId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('Failed to load from server (using local):', error);
    return false;
  }
}

/**
 * Verify face with server
 */
export async function verifyFaceWithServer(
  employeeId: number,
  descriptor: number[]
): Promise<FaceMatchResult> {
  try {
    const response = await fetch(`${API_BASE}/face/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: employeeId.toString(),
        descriptor,
        threshold: CONFIG.matchThreshold,
      }),
    });

    if (!response.ok) {
      throw new Error('Server verification failed');
    }

    const data = await response.json();
    
    return {
      matched: data.matched,
      employeeId: data.matched ? employeeId : undefined,
      confidence: data.confidence * 100,
      distance: data.distance,
      threshold: CONFIG.matchThreshold,
    };
  } catch (error) {
    console.warn('Server verification failed, using local:', error);
    // Fall back to local verification
    return {
      matched: false,
      confidence: 0,
      distance: 1,
      threshold: CONFIG.matchThreshold,
    };
  }
}

// ============================================================================
// Canvas Utilities
// ============================================================================

/**
 * Capture frame from video element
 */
export function captureFrame(
  video: HTMLVideoElement
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0);
  }
  return canvas;
}

/**
 * Draw face detection overlay on canvas
 */
export function drawFaceOverlay(
  canvas: HTMLCanvasElement,
  box: { x: number; y: number; width: number; height: number },
  matched: boolean,
  label?: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const color = matched ? '#22c55e' : '#ef4444';

  // Draw bounding box
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  // Draw label background
  if (label) {
    ctx.fillStyle = color;
    const textWidth = ctx.measureText(label).width;
    ctx.fillRect(box.x, box.y - 25, textWidth + 20, 25);
    
    // Draw label text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(label, box.x + 10, box.y - 7);
  }

  // Draw corner markers
  const cornerLength = 15;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;

  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + cornerLength);
  ctx.lineTo(box.x, box.y);
  ctx.lineTo(box.x + cornerLength, box.y);
  ctx.stroke();

  // Top-right corner
  ctx.beginPath();
  ctx.moveTo(box.x + box.width - cornerLength, box.y);
  ctx.lineTo(box.x + box.width, box.y);
  ctx.lineTo(box.x + box.width, box.y + cornerLength);
  ctx.stroke();

  // Bottom-left corner
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + box.height - cornerLength);
  ctx.lineTo(box.x, box.y + box.height);
  ctx.lineTo(box.x + cornerLength, box.y + box.height);
  ctx.stroke();

  // Bottom-right corner
  ctx.beginPath();
  ctx.moveTo(box.x + box.width - cornerLength, box.y + box.height);
  ctx.lineTo(box.x + box.width, box.y + box.height);
  ctx.lineTo(box.x + box.width, box.y + box.height - cornerLength);
  ctx.stroke();
}
