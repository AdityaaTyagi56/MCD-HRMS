# API Keys Configuration

## Current OpenRouter Key (Active)
```
VITE_OPENROUTER_API_KEY=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
```

This key is configured in:
- `.env.local` (for local development)
- `.env` (alternative config file)

---

# Required API Keys for Production Deployment

To transition this "MCD Unified HRMS" from a prototype to a fully functional production system, the following API keys and services would be required:

## 1. Face Recognition & Liveness Detection
*   **Service:** AWS Rekognition / Azure Face API / FaceIO
*   **Purpose:** To perform the "Ghost-Buster" biometric verification and liveness checks (anti-spoofing).
*   **Key Name:** `FACE_RECOGNITION_API_KEY`

## 2. Geolocation & Maps
*   **Service:** Google Maps Platform (Maps JavaScript API, Geocoding API) / Mapbox
*   **Purpose:** For the "Geo-Fencing" feature to validate employee location against office coordinates and for the "Command Centre" heatmaps.
*   **Key Name:** `GOOGLE_MAPS_API_KEY`

## 3. Blockchain Ledger (Digital Service Book)
*   **Service:** Hyperledger Fabric / Ethereum (Infura/Alchemy) / Polygon
*   **Purpose:** To store the immutable "Service Book" records (hiring, transfers, awards, punishments) ensuring they cannot be tampered with.
*   **Key Name:** `BLOCKCHAIN_NODE_API_KEY` / `INFURA_PROJECT_ID`

## 4. SMS/Notification Gateway
*   **Service:** Twilio / MSG91 / AWS SNS
*   **Purpose:** To send real-time alerts for "Jan-Sunwai" grievance escalations and transfer orders.
*   **Key Name:** `SMS_GATEWAY_API_KEY`

## 5. Database & Backend
*   **Service:** PostgreSQL / Firebase / Supabase
*   **Purpose:** To store user data, attendance logs, and grievance history.
*   **Key Name:** `DATABASE_URL` / `SUPABASE_ANON_KEY`

---
*Note: The current application runs in "Demo Mode" using sophisticated mock data generators and client-side logic, so no keys are immediately required to run the prototype.*
