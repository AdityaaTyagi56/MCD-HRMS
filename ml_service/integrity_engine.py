import pandas as pd
import numpy as np
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import LabelEncoder
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
from PIL import Image, ImageChops, ImageEnhance
import os

class IntegrityEngine:
    def __init__(self):
        self.model = IsolationForest(contamination=0.05, random_state=42)
        self.encoders = {}

    def detect_payroll_anomalies(self, employee_data: list):
        """
        Task 1: Payroll Anomaly Detection (The "Ghost" Hunter)
        Input: List of dicts containing employee records.
        """
        df = pd.DataFrame(employee_data)
        
        if df.empty:
            return []

        # 1. Deterministic Clustering (The "Hard" Rules)
        # Detect multiple employees sharing critical PII
        high_risk_flags = []
        
        # Check for shared Bank Accounts
        bank_counts = df['bank_account'].value_counts()
        shared_banks = bank_counts[bank_counts > 1].index.tolist()
        
        # Check for shared Mobile Numbers
        mobile_counts = df['mobile_number'].value_counts()
        shared_mobiles = mobile_counts[mobile_counts > 1].index.tolist()

        for index, row in df.iterrows():
            reasons = []
            if row['bank_account'] in shared_banks:
                reasons.append(f"Shared Bank Account with {bank_counts[row['bank_account']] - 1} others")
            if row['mobile_number'] in shared_mobiles:
                reasons.append(f"Shared Mobile Number with {mobile_counts[row['mobile_number']] - 1} others")
            
            if reasons:
                high_risk_flags.append({
                    "user_id": row.get('id'),
                    "name": row.get('name'),
                    "risk_level": "CRITICAL",
                    "reasons": reasons
                })

        # 2. ML-based Anomaly Detection (The "Soft" Rules)
        # Use Isolation Forest to find outliers in the data distribution
        # We need to encode categorical data first
        features = ['department', 'role', 'salary'] # Assuming these exist
        
        ml_df = df.copy()
        
        # Fill missing or ensure columns exist
        for col in features:
            if col not in ml_df.columns:
                ml_df[col] = 'Unknown' if col != 'salary' else 0

        # Encode categorical
        for col in ['department', 'role']:
            le = LabelEncoder()
            ml_df[col] = le.fit_transform(ml_df[col].astype(str))
        
        # Fit Isolation Forest
        # We only run this if we have enough data points
        if len(df) > 10:
            self.model.fit(ml_df[features])
            ml_df['anomaly_score'] = self.model.decision_function(ml_df[features])
            ml_df['is_anomaly'] = self.model.predict(ml_df[features]) # -1 for outlier, 1 for inlier
            
            outliers = ml_df[ml_df['is_anomaly'] == -1]
            
            for index, row in outliers.iterrows():
                # Check if already flagged as critical
                existing = next((item for item in high_risk_flags if item["user_id"] == df.iloc[index]['id']), None)
                if not existing:
                    high_risk_flags.append({
                        "user_id": df.iloc[index]['id'],
                        "name": df.iloc[index]['name'],
                        "risk_level": "MODERATE",
                        "reasons": ["Statistical outlier in salary/role distribution"]
                    })

        return high_risk_flags

    def detect_forged_document(self, image_path: str):
        """
        Task 2: Forged Document Detector using Error Level Analysis (ELA)
        """
        try:
            original = Image.open(image_path).convert('RGB')
            
            # 1. Resave image at a specific quality to introduce known compression artifacts
            # Use a unique temp filename for the resaved image too
            import uuid
            resaved_path = f'temp_ela_{uuid.uuid4()}.jpg'
            original.save(resaved_path, 'JPEG', quality=90)
            resaved = Image.open(resaved_path)
            
            # 2. Calculate the difference (ELA)
            ela_image = ImageChops.difference(original, resaved)
            
            # 3. Enhance the difference to make it visible
            extrema = ela_image.getextrema()
            max_diff = max([ex[1] for ex in extrema])
            if max_diff == 0:
                max_diff = 1
            scale = 255.0 / max_diff
            
            ela_image = ImageEnhance.Brightness(ela_image).enhance(scale)
            
            # 4. Analyze the ELA result for tampering
            # Convert to CV2 format for analysis
            ela_cv = np.array(ela_image)
            ela_cv = cv2.cvtColor(ela_cv, cv2.COLOR_RGB2BGR)
            gray_ela = cv2.cvtColor(ela_cv, cv2.COLOR_BGR2GRAY)
            
            # Threshold to find high-error regions
            _, thresh = cv2.threshold(gray_ela, 150, 255, cv2.THRESH_BINARY)
            
            # Calculate percentage of high-error pixels
            total_pixels = thresh.size
            high_error_pixels = np.count_nonzero(thresh)
            error_ratio = high_error_pixels / total_pixels
            
            # Cleanup
            if os.path.exists(resaved_path):
                os.remove(resaved_path)
                
            # Logic: If specific regions have vastly different compression levels (high error), it's likely tampered.
            # A high global error ratio might just mean a noisy image, but localized clusters are suspicious.
            # For this prototype, we use a simple threshold.
            
            is_tampered = error_ratio > 0.05 # Threshold would need tuning
            
            return {
                "is_tampered": is_tampered,
                "confidence_score": min(error_ratio * 10, 1.0), # Mock confidence
                "details": "High compression artifact variance detected" if is_tampered else "Consistent compression levels"
            }
            
        except Exception as e:
            return {"error": str(e)}
