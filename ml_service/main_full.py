from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import shutil
import os
import numpy as np
import uuid

# Optional: Try to import cv2
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("⚠️  OpenCV not available, some features will be limited")

from integrity_engine import IntegrityEngine
from bio_lock import BioLock

# NLP Dependencies for Grievance Analysis (lazy import to keep startup fast)
NLP_AVAILABLE = False

app = FastAPI(title="MCD HRMS Security Core", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Engines
integrity_engine = IntegrityEngine()
bio_lock = BioLock()

# Initialize NLP Models (Lazy loading for grievance analysis)
classifier = None
translator = None

def get_nlp_models():
    """Lazy load NLP models to avoid startup delay if not needed"""
    global classifier, translator
    global NLP_AVAILABLE

    if classifier is None or translator is None:
        try:
            from transformers import pipeline
            from googletrans import Translator

            NLP_AVAILABLE = True
        except ImportError:
            NLP_AVAILABLE = False
            print("Warning: transformers/googletrans not installed. /analyze-grievance will be limited.")
            return None, None
    if classifier is None:
        # 'facebook/bart-large-mnli' is excellent for zero-shot classification
        classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    if translator is None:
        translator = Translator()
    return classifier, translator

# Categories for MCD Grievance Routing
GRIEVANCE_CATEGORIES = [
    "Payroll and Salary Issue", 
    "Sanitation Equipment Shortage", 
    "Workplace Harassment", 
    "Leave and Transfer Request"
]

# Models
class EmployeeRecord(BaseModel):
    id: int
    name: str
    bank_account: str
    mobile_number: str
    department: Optional[str] = None
    role: Optional[str] = None
    salary: Optional[float] = None

class PayrollScanRequest(BaseModel):
    employees: List[EmployeeRecord]

class GrievanceRequest(BaseModel):
    text: str

@app.get("/")
def health_check():
    return {"status": "secure", "system": "MCD-HRMS-CORE"}

# --- Module 1: Integrity Engine ---

@app.post("/integrity/payroll-scan")
def scan_payroll(data: PayrollScanRequest):
    """
    Detects Ghost Employees based on shared PII and statistical anomalies.
    """
    records = [item.dict() for item in data.employees]
    results = integrity_engine.detect_payroll_anomalies(records)
    return {"anomalies_detected": len(results), "details": results}

@app.post("/integrity/document-scan")
async def scan_document(file: UploadFile = File(...)):
    """
    Detects forged documents using Error Level Analysis (ELA).
    """
    # Use UUID to prevent filename collisions in concurrent requests
    file_ext = os.path.splitext(file.filename)[1]
    temp_filename = f"temp_{uuid.uuid4()}{file_ext}"
    
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = integrity_engine.detect_forged_document(temp_filename)
        return result
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

# --- Module 2: Bio-Lock ---

@app.post("/biolock/vectorize")
async def vectorize_face(file: UploadFile = File(...)):
    """
    Converts face image to 128-d embedding (GDPR compliant).
    """
    file_ext = os.path.splitext(file.filename)[1]
    temp_filename = f"temp_face_{uuid.uuid4()}{file_ext}"
    
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = bio_lock.get_face_embedding(temp_filename)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

@app.post("/biolock/liveness")
async def check_liveness(command: str = Form(...), file: UploadFile = File(...)):
    """
    Verifies if the user is performing the requested command (BLINK, SMILE, etc.)
    """
    # Read image into numpy array for opencv/face_recognition
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    result = bio_lock.verify_liveness(rgb_frame, command)
    return result

# --- Module 3: Grievance NLP Analysis ---

@app.post("/analyze-grievance")
async def analyze_grievance(grievance: GrievanceRequest):
    """
    Analyzes Hindi grievance text using AI:
    1. Translates Hindi to English
    2. Classifies into department category using Zero-Shot Classification
    3. Returns routing action based on category
    """
    try:
        clf, trans = get_nlp_models()
        
        # If NLP not available, use keyword-based fallback
        if clf is None or trans is None:
            return await fallback_analyze(grievance.text)
        
        # Step 1: Translate Hindi to English (AI models work better in English)
        translation = trans.translate(grievance.text, src='hi', dest='en')
        english_text = translation.text
        
        # Step 2: Run Zero-Shot Classification with facebook/bart-large-mnli
        result = clf(english_text, GRIEVANCE_CATEGORIES)
        
        # Step 3: Extract Top Result
        top_category = result['labels'][0]
        confidence = result['scores'][0]
        
        # Step 4: Determine Automated Action/Routing
        action_plan = ""
        priority = "Medium"
        
        if "Payroll" in top_category:
            action_plan = "High Priority: Routed to Zonal Accounts Officer."
            priority = "High"
        elif "Sanitation" in top_category:
            action_plan = "Routed to Store Manager (Inventory)."
            priority = "Medium"
        elif "Harassment" in top_category:
            action_plan = "CRITICAL: Escalated to Vigilance Commissioner."
            priority = "Critical"
        elif "Leave" in top_category or "Transfer" in top_category:
            action_plan = "Routed to Establishment Section (HR)."
            priority = "Low"
        else:
            action_plan = "Queued for manual review by Grievance Cell."
            priority = "Medium"
        
        return {
            "original_hindi": grievance.text,
            "translated_english": english_text,
            "detected_category": top_category,
            "confidence_score": f"{confidence:.2f}",
            "priority": priority,
            "automated_action": action_plan
        }
        
    except Exception as e:
        # Fallback to keyword-based classification
        print(f"NLP Error: {e}, using fallback")
        return await fallback_analyze(grievance.text)


async def fallback_analyze(text: str):
    """
    Keyword-based fallback when NLP models aren't available.
    Uses simple Hindi/English keyword matching.
    """
    text_lower = text.lower()
    
    # Keyword mappings (Hindi + English)
    payroll_keywords = ['salary', 'payment', 'overtime', 'वेतन', 'पेमेंट', 'ओवरटाइम', 'पैसा', 'money']
    equipment_keywords = ['broom', 'uniform', 'gloves', 'truck', 'झाड़ू', 'यूनिफॉर्म', 'दस्ताने', 'गाड़ी', 'equipment']
    harassment_keywords = ['harassment', 'abuse', 'shouting', 'hit', 'उत्पीड़न', 'गाली', 'मारना', 'धमकी']
    leave_keywords = ['leave', 'transfer', 'holiday', 'छुट्टी', 'ट्रांसफर', 'बदली', 'sick']
    
    category = "General Complaint"
    priority = "Medium"
    action = "Queued for manual review."
    
    if any(kw in text_lower for kw in harassment_keywords):
        category = "Workplace Harassment"
        priority = "Critical"
        action = "CRITICAL: Escalated to Vigilance Commissioner."
    elif any(kw in text_lower for kw in payroll_keywords):
        category = "Payroll and Salary Issue"
        priority = "High"
        action = "Routed to Zonal Accounts Officer."
    elif any(kw in text_lower for kw in equipment_keywords):
        category = "Sanitation Equipment Shortage"
        priority = "Medium"
        action = "Routed to Store Manager (Inventory)."
    elif any(kw in text_lower for kw in leave_keywords):
        category = "Leave and Transfer Request"
        priority = "Low"
        action = "Routed to Establishment Section (HR)."
    
    return {
        "original_hindi": text,
        "translated_english": "(Translation unavailable - using keyword analysis)",
        "detected_category": category,
        "confidence_score": "0.70",
        "priority": priority,
        "automated_action": action,
        "method": "keyword_fallback"
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7002)
