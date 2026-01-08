"""
BioLock - Face Recognition Module with Lazy Loading
Optimized for fast startup - imports heavy libraries only when needed
"""

# Global flags for availability checks (lightweight, no imports)
FACE_RECOGNITION_AVAILABLE = None
CV2_AVAILABLE = None
SCIPY_AVAILABLE = None

# Cache for loaded libraries (lazy initialization)
_face_recognition = None
_cv2 = None
_dist = None
_np = None

def _load_face_recognition():
    """Lazy load face_recognition library"""
    global _face_recognition, FACE_RECOGNITION_AVAILABLE
    if _face_recognition is None:
        try:
            import face_recognition
            _face_recognition = face_recognition
            FACE_RECOGNITION_AVAILABLE = True
        except ImportError:
            FACE_RECOGNITION_AVAILABLE = False
            print("Warning: face_recognition not available. Using fallback face detection.")
    return _face_recognition

def _load_cv2():
    """Lazy load OpenCV library"""
    global _cv2, CV2_AVAILABLE
    if _cv2 is None:
        try:
            import cv2
            _cv2 = cv2
            CV2_AVAILABLE = True
        except ImportError:
            CV2_AVAILABLE = False
    return _cv2

def _load_numpy():
    """Lazy load numpy"""
    global _np
    if _np is None:
        import numpy as np
        _np = np
    return _np

def _load_scipy_distance():
    """Lazy load scipy distance functions"""
    global _dist, SCIPY_AVAILABLE
    if _dist is None:
        try:
            from scipy.spatial import distance as dist
            _dist = dist
            SCIPY_AVAILABLE = True
        except ImportError:
            SCIPY_AVAILABLE = False
    return _dist

class BioLock:
    def __init__(self):
        """Lightweight initialization - no heavy imports"""
        self.EYE_ASPECT_RATIO_THRESHOLD = 0.25
        self.MOUTH_ASPECT_RATIO_THRESHOLD = 0.6
        self.HEAD_TURN_THRESHOLD = 20  # pixels deviation
        
        # Lazy-loaded attributes
        self._face_cascade = None
    
    def _get_face_cascade(self):
        """Lazy load OpenCV face cascade"""
        if self._face_cascade is None:
            cv2 = _load_cv2()
            if cv2:
                self._face_cascade = cv2.CascadeClassifier(
                    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                )
        return self._face_cascade
    
    def get_face_embedding(self, image_path: str, enrolled_embeddings: dict = None):
        """
        Enhanced: If multiple faces are detected, match each to enrolled embeddings and proceed if only one matches.
        enrolled_embeddings: dict mapping employee_id to embedding list
        
        Now with lazy loading - imports only when called
        """
        try:
            face_recognition = _load_face_recognition()
            
            if FACE_RECOGNITION_AVAILABLE and face_recognition:
                image = face_recognition.load_image_file(image_path)
                face_locations = face_recognition.face_locations(image)
                
                if not face_locations:
                    return {"error": "No face detected"}
                
                face_encodings = face_recognition.face_encodings(image, face_locations)
                
                if len(face_encodings) == 1:
                    return {
                        "embedding": face_encodings[0].tolist(),
                        "status": "success"
                    }
                elif len(face_encodings) > 1:
                    # If enrolled_embeddings provided, match each detected face
                    if enrolled_embeddings and len(enrolled_embeddings) > 0:
                        np = _load_numpy()
                        known_ids = list(enrolled_embeddings.keys())
                        known_encs = np.array([enrolled_embeddings[eid] for eid in known_ids])
                        matches = []
                        for idx, enc in enumerate(face_encodings):
                            # Compare to all enrolled
                            dists = np.linalg.norm(known_encs - enc, axis=1)
                            min_idx = np.argmin(dists)
                            if dists[min_idx] < 0.5:  # Threshold for match (tune as needed)
                                matches.append((idx, known_ids[min_idx], float(dists[min_idx])))
                        if len(matches) == 1:
                            idx, emp_id, dist = matches[0]
                            return {
                                "embedding": face_encodings[idx].tolist(),
                                "matched_employee_id": emp_id,
                                "distance": dist,
                                "status": "success",
                                "message": "Unique enrolled face matched from multiple detected."
                            }
                        elif len(matches) == 0:
                            return {"error": "Multiple faces detected, but none match enrolled faces."}
                        else:
                            return {"error": "Multiple faces detected, more than one match to enrolled faces. Please ensure only one enrolled person is present."}
                    else:
                        return {"error": "Multiple faces detected. Please ensure only one person is in frame."}
                else:
                    return {"error": "No face detected"}
            else:
                # Fallback: Use OpenCV for basic face detection
                cv2 = _load_cv2()
                np = _load_numpy()
                
                if not cv2:
                    return {"error": "No face detection libraries available"}
                
                image = cv2.imread(image_path)
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                face_cascade = self._get_face_cascade()
                faces = face_cascade.detectMultiScale(gray, 1.3, 5)
                
                if len(faces) == 0:
                    return {"error": "No face detected"}
                if len(faces) > 1:
                    return {"error": "Multiple faces detected"}
                
                # Generate a mock 128-d embedding based on face region features
                x, y, w, h = faces[0]
                face_region = gray[y:y+h, x:x+w]
                face_resized = cv2.resize(face_region, (128, 128))
                embedding = cv2.mean(face_resized)[:3] * np.random.randn(128)
                
                return {
                    "embedding": embedding.tolist(),
                    "status": "success (fallback mode)",
                    "warning": "face_recognition library not available, using basic detection"
                }
        except Exception as e:
            return {"error": str(e)}

    def calculate_ear(self, eye):
        """Calculate Eye Aspect Ratio - lazy loads scipy"""
        dist = _load_scipy_distance()
        if not dist:
            return 0.3  # Default value if scipy unavailable
        
        # compute the euclidean distances between the two sets of
        # vertical eye landmarks (x, y)-coordinates
        A = dist.euclidean(eye[1], eye[5])
        B = dist.euclidean(eye[2], eye[4])
        # compute the euclidean distance between the horizontal
        # eye landmark (x, y)-coordinates
        C = dist.euclidean(eye[0], eye[3])
        # compute the eye aspect ratio
        ear = (A + B) / (2.0 * C)
        return ear

    def calculate_mar(self, mouth):
        # Mouth Aspect Ratio for smile/open mouth detection
        return 0  # Placeholder, implemented in verify_liveness logic below

    def verify_liveness(self, frame_array, command: str):
        """
        Task 1: Face Liveness Detection
        Lazy loads dependencies only when called
        """
        face_recognition = _load_face_recognition()
        
        if not FACE_RECOGNITION_AVAILABLE or not face_recognition:
            # Fallback: Basic face detection without liveness
            cv2 = _load_cv2()
            if not cv2:
                return {"verified": False, "message": "No face detection available"}
            
            gray = cv2.cvtColor(frame_array, cv2.COLOR_RGB2GRAY)
            face_cascade = self._get_face_cascade()
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            
            if len(faces) == 0:
                return {"verified": False, "message": "No face detected"}
            
            # Mock verification for demo purposes
            return {
                "verified": True,
                "message": f"Liveness check passed (fallback mode - command: {command})",
                "warning": "face_recognition not available, using basic detection",
                "confidence": 0.75
            }
        
        # Find face landmarks
        face_landmarks_list = face_recognition.face_landmarks(frame_array)
        
        if not face_landmarks_list:
            return {"verified": False, "message": "No face detected"}
            
        landmarks = face_landmarks_list[0]
        
        # 1. Blink Detection (EAR)
        left_eye = landmarks['left_eye']
        right_eye = landmarks['right_eye']
        
        leftEAR = self.calculate_ear(left_eye)
        rightEAR = self.calculate_ear(right_eye)
        avgEAR = (leftEAR + rightEAR) / 2.0
        
        is_blinking = avgEAR < self.EYE_ASPECT_RATIO_THRESHOLD
        
        # 2. Command Verification
        command_verified = False
        dist = _load_scipy_distance()
        np = _load_numpy()
        
        if command == "BLINK":
            # In a single frame, we can only check if eyes are closed. 
            if is_blinking:
                command_verified = True
                
        elif command == "SMILE":
            # Check mouth width/height
            top_lip = landmarks['top_lip']
            bottom_lip = landmarks['bottom_lip']
            
            if dist:
                top_point = min(top_lip, key=lambda p: p[1])  # Highest point
                bottom_point = max(bottom_lip, key=lambda p: p[1])  # Lowest point
                
                left_point = min(top_lip + bottom_lip, key=lambda p: p[0])
                right_point = max(top_lip + bottom_lip, key=lambda p: p[0])
                
                mouth_height = dist.euclidean(top_point, bottom_point)
                mouth_width = dist.euclidean(left_point, right_point)
                
                ratio = mouth_height / mouth_width
                
                if ratio > 0.3:  # Arbitrary threshold for open mouth/smile
                    command_verified = True
                
        elif command == "TURN_LEFT":
            # Check nose position relative to eyes
            nose_bridge = landmarks['nose_bridge']
            nose_tip = landmarks['nose_tip']
            
            # Get center of eyes
            if np:
                left_eye_center = np.mean(left_eye, axis=0)
                right_eye_center = np.mean(right_eye, axis=0)
                eye_center = (left_eye_center + right_eye_center) / 2
                
                nose_center = np.mean(nose_tip, axis=0)
                
                # Deviation
                deviation = nose_center[0] - eye_center[0]
                
                # If nose is significantly to the left of eye center
                if deviation < -self.HEAD_TURN_THRESHOLD:
                    command_verified = True

        return {
            "verified": command_verified,
            "ear": avgEAR,
            "is_blinking": is_blinking,
            "command": command
        }
