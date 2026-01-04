/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_ML_SERVICE_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  
  // AI & ML
  readonly VITE_OPENROUTER_API_KEY?: string;
  
  // WhatsApp/Twilio
  readonly VITE_TWILIO_ACCOUNT_SID?: string;
  readonly VITE_TWILIO_AUTH_TOKEN?: string;
  readonly VITE_TWILIO_WHATSAPP_NUMBER?: string;
  
  // Google Maps
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  
  // SMS Gateway
  readonly VITE_SMS_GATEWAY_API_KEY?: string;
  readonly VITE_SMS_SENDER_ID?: string;
  
  // Blockchain
  readonly VITE_BLOCKCHAIN_RPC_URL?: string;
  readonly VITE_BLOCKCHAIN_PRIVATE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
