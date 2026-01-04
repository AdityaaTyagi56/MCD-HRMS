import React, { useState, useEffect } from 'react';
import { Loader2, Server, CheckCircle, AlertCircle } from 'lucide-react';

interface ServiceStatus {
  api: 'checking' | 'online' | 'offline';
  ml: 'checking' | 'online' | 'offline';
}

interface Props {
  onReady: () => void;
}

const ServiceWakeUp: React.FC<Props> = ({ onReady }) => {
  const [status, setStatus] = useState<ServiceStatus>({ api: 'checking', ml: 'checking' });
  const [message, setMessage] = useState('सर्वर जाग रहा है...');
  const [dots, setDots] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8010';
  const ML_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  useEffect(() => {
    const checkServices = async () => {
      // Check API
      try {
        setMessage('API सर्वर से कनेक्ट हो रहा है...');
        const apiRes = await fetch(`${API_URL}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(30000)
        });
        if (apiRes.ok) {
          setStatus(prev => ({ ...prev, api: 'online' }));
        } else {
          setStatus(prev => ({ ...prev, api: 'offline' }));
        }
      } catch {
        setStatus(prev => ({ ...prev, api: 'offline' }));
      }

      // Check ML
      try {
        setMessage('ML सर्वर से कनेक्ट हो रहा है...');
        const mlRes = await fetch(`${ML_URL}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(30000)
        });
        if (mlRes.ok) {
          setStatus(prev => ({ ...prev, ml: 'online' }));
        } else {
          setStatus(prev => ({ ...prev, ml: 'offline' }));
        }
      } catch {
        setStatus(prev => ({ ...prev, ml: 'offline' }));
      }
    };

    checkServices();
  }, [API_URL, ML_URL]);

  useEffect(() => {
    if (status.api !== 'checking' && status.ml !== 'checking') {
      if (status.api === 'online' || status.ml === 'online') {
        setMessage('तैयार है!');
        setTimeout(onReady, 1000);
      } else {
        setMessage('सर्वर ऑफलाइन है। कृपया बाद में प्रयास करें।');
      }
    }
  }, [status, onReady]);

  const getStatusIcon = (s: 'checking' | 'online' | 'offline') => {
    if (s === 'checking') return <Loader2 size={16} className="animate-spin" style={{ color: '#f59e0b' }} />;
    if (s === 'online') return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
    return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
  };

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
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>
          {message}{dots}
        </p>

        {/* Service Status */}
        <div style={{ 
          background: '#f8fafc', 
          borderRadius: '12px', 
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Backend API</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {getStatusIcon(status.api)}
              <span style={{ fontSize: '12px', color: status.api === 'online' ? '#22c55e' : status.api === 'offline' ? '#ef4444' : '#f59e0b' }}>
                {status.api === 'checking' ? 'Connecting...' : status.api === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>ML Service</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {getStatusIcon(status.ml)}
              <span style={{ fontSize: '12px', color: status.ml === 'online' ? '#22c55e' : status.ml === 'offline' ? '#ef4444' : '#f59e0b' }}>
                {status.ml === 'checking' ? 'Connecting...' : status.ml === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Loading bar */}
        {(status.api === 'checking' || status.ml === 'checking') && (
          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              width: '30%',
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
              borderRadius: '2px',
              animation: 'loading 1.5s ease-in-out infinite'
            }} />
          </div>
        )}

        <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '16px' }}>
          Free tier servers may take 30-50 seconds to wake up
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
