import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Server, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface ServiceStatus {
  api: 'checking' | 'online' | 'offline' | 'waking';
  ml: 'checking' | 'online' | 'offline' | 'waking';
}

interface Props {
  onReady: () => void;
}

const MAX_RETRIES = 8;
const INITIAL_DELAY = 3000;

const ServiceWakeUp: React.FC<Props> = ({ onReady }) => {
  const [status, setStatus] = useState<ServiceStatus>({ api: 'checking', ml: 'checking' });
  const [message, setMessage] = useState('सर्वर जाग रहा है...');
  const [dots, setDots] = useState('');
  const [retryCount, setRetryCount] = useState({ api: 0, ml: 0 });
  const [canSkip, setCanSkip] = useState(false);
  const mountedRef = useRef(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8010';
  const ML_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  // Allow skip after 20 seconds
  useEffect(() => {
    const timer = setTimeout(() => setCanSkip(true), 20000);
    return () => clearTimeout(timer);
  }, []);

  const checkService = useCallback(async (url: string, name: 'api' | 'ml', attempt: number): Promise<boolean> => {
    if (!mountedRef.current) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        if (mountedRef.current) {
          setStatus(prev => ({ ...prev, [name]: 'online' }));
        }
        return true;
      }
      throw new Error('Not OK');
    } catch {
      if (!mountedRef.current) return false;

      if (attempt < MAX_RETRIES) {
        setStatus(prev => ({ ...prev, [name]: 'waking' }));
        setRetryCount(prev => ({ ...prev, [name]: attempt + 1 }));

        const delay = Math.min(INITIAL_DELAY * Math.pow(1.5, attempt), 15000);
        await new Promise(r => setTimeout(r, delay));

        if (mountedRef.current) {
          return checkService(url, name, attempt + 1);
        }
      } else {
        if (mountedRef.current) {
          setStatus(prev => ({ ...prev, [name]: 'offline' }));
        }
      }
      return false;
    }
  }, []);

  useEffect(() => {
    const wakeUpServices = async () => {
      setMessage('API सर्वर जगा रहे हैं...');
      const apiOnline = await checkService(API_URL, 'api', 0);

      if (mountedRef.current) {
        setMessage('ML सर्वर जगा रहे हैं...');
        await checkService(ML_URL, 'ml', 0);
      }
    };

    wakeUpServices();
  }, [API_URL, ML_URL, checkService]);

  useEffect(() => {
    const apiDone = status.api === 'online' || status.api === 'offline';
    const mlDone = status.ml === 'online' || status.ml === 'offline';

    if (apiDone && mlDone) {
      if (status.api === 'online' || status.ml === 'online') {
        setMessage('तैयार है!');
        setTimeout(onReady, 800);
      } else {
        setMessage('सर्वर ऑफलाइन। Retry या Skip करें।');
      }
    }
  }, [status, onReady]);

  const handleRetry = () => {
    setStatus({ api: 'checking', ml: 'checking' });
    setRetryCount({ api: 0, ml: 0 });
    setMessage('पुनः प्रयास...');

    const wakeUp = async () => {
      await checkService(API_URL, 'api', 0);
      await checkService(ML_URL, 'ml', 0);
    };
    wakeUp();
  };

  const handleSkip = () => {
    onReady();
  };

  const getStatusIcon = (s: 'checking' | 'online' | 'offline' | 'waking') => {
    if (s === 'checking' || s === 'waking') return <Loader2 size={16} className="animate-spin" style={{ color: '#f59e0b' }} />;
    if (s === 'online') return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
    return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
  };

  const getStatusText = (s: 'checking' | 'online' | 'offline' | 'waking', name: 'api' | 'ml') => {
    if (s === 'checking') return 'Connecting...';
    if (s === 'waking') return `Waking (${retryCount[name]}/${MAX_RETRIES})`;
    if (s === 'online') return 'Online';
    return 'Offline';
  };

  const isLoading = status.api === 'checking' || status.api === 'waking' || status.ml === 'checking' || status.ml === 'waking';
  const bothOffline = status.api === 'offline' && status.ml === 'offline';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '360px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Logo */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
        }}>
          <Server size={40} style={{ color: 'white' }} />
        </div>

        <h2 style={{ color: '#1e293b', fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px' }}>
          MCD HRMS
        </h2>
        <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 24px' }}>
          {message}{isLoading ? dots : ''}
        </p>

        {/* Service Status */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#475569', fontSize: '13px' }}>Backend API</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {getStatusIcon(status.api)}
              <span style={{ fontSize: '12px', color: status.api === 'online' ? '#22c55e' : status.api === 'offline' ? '#ef4444' : '#f59e0b' }}>
                {getStatusText(status.api, 'api')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#475569', fontSize: '13px' }}>ML Service</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {getStatusIcon(status.ml)}
              <span style={{ fontSize: '12px', color: status.ml === 'online' ? '#22c55e' : status.ml === 'offline' ? '#ef4444' : '#f59e0b' }}>
                {getStatusText(status.ml, 'ml')}
              </span>
            </div>
          </div>
        </div>

        {/* Loading bar */}
        {isLoading && (
          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{
              width: '30%',
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
              borderRadius: '2px',
              animation: 'loading 1.5s ease-in-out infinite'
            }} />
          </div>
        )}

        {/* Action Buttons */}
        {bothOffline && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button
              onClick={handleRetry}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} />
              Retry
            </button>
            <button
              onClick={handleSkip}
              style={{
                flex: 1,
                padding: '12px',
                background: '#f1f5f9',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Skip
            </button>
          </div>
        )}

        {canSkip && isLoading && (
          <button
            onClick={handleSkip}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '12px'
            }}
          >
            Skip & Continue Anyway
          </button>
        )}

        <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>
          Free tier servers may take 30-60 seconds to wake up
        </p>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(250%); }
          100% { transform: translateX(-100%); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ServiceWakeUp;
