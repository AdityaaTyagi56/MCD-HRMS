import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { 
  MapPin, 
  IndianRupee, 
  Mic, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Loader2,
  Calendar,
  MessageSquare,
  Phone,
  Clock,
  MicOff,
  Shield,
  Navigation,
  Wifi
} from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const { language, setCurrentView, addGrievance, markAttendance, t, grievances } = useApp();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [manualComplaint, setManualComplaint] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micError, setMicError] = useState('');
  const [employeeView, setEmployeeView] = useState<'dashboard' | 'case-history'>('dashboard');
  
  // Enhanced Complaint Form State
  const [complaintCategory, setComplaintCategory] = useState('');
  const [complaintLocation, setComplaintLocation] = useState('');
  const [complaintFile, setComplaintFile] = useState<File | null>(null);
  
  // Attendance State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceStep, setAttendanceStep] = useState<'locating' | 'verifying' | 'success' | 'error' | 'spoofing'>('locating');
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [locationPings, setLocationPings] = useState<any[]>([]);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const recognitionRef = useRef<any>(null);
  const locationWatchRef = useRef<number | null>(null);
  const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';
  
  // Office location (MCD Civic Centre, Delhi)
  const OFFICE_LOCATION = { lat: 28.6328, lng: 77.2197, radius: 0.5 };

  const employeeData = {
    id: 1,
    name: 'Ramesh Gupta',
    checkInTime: '09:15 AM',
    leaveBalance: 8,
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if current time is within attendance window (7 AM - 5 PM)
  const isWithinAttendanceWindow = () => {
    const hours = currentTime.getHours();
    return hours >= 7 && hours < 17; // 7 AM to 5 PM (17:00)
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // NLP Analysis
  const analyzeGrievanceNLP = async (text: string) => {
    console.log('🔍 Analyzing:', text);
    try {
      const response = await fetch(`${ML_API_URL}/analyze-grievance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('NLP unavailable');
      const data = await response.json();
      console.log('✅ NLP Result:', data);
      return {
        category: data?.category || 'General',
        priority: (data?.priority === 'High' ? 'High' : data?.priority === 'Low' ? 'Low' : 'Medium') as 'High' | 'Medium' | 'Low',
      };
    } catch (error) {
      console.error('❌ NLP Error:', error);
      return { category: 'General', priority: 'Medium' as const };
    }
  };

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      console.log('❌ No Speech Recognition API');
      setSpeechSupported(false);
      return;
    }

    console.log('✅ Speech Recognition available');
    setSpeechSupported(true);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      setMicError(t('speech_not_supported'));
      return;
    }

    // Create fresh instance each time
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log('🎤 Started listening');
      setIsListening(true);
      setMicError('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      
      console.log('📝 Speech:', { final, interim });
      
      if (final.trim()) {
        setTranscript(prev => (prev + ' ' + final).trim());
        setManualComplaint('');
      } else if (interim) {
        setManualComplaint(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech error:', event.error);
      setIsListening(false);
      
      switch(event.error) {
        case 'not-allowed':
          setMicError(t('mic_permission_required'));
          break;
        case 'no-speech':
          setMicError(t('no_speech_detected'));
          break;
        case 'network':
          setMicError(t('network_error'));
          break;
        default:
          setMicError(`${t('error')}: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('🔇 Stopped listening');
      setIsListening(false);
    };

    try {
      recognition.start();
      console.log('🎤 Recognition.start() called');
    } catch (e) {
      console.error('Failed to start:', e);
      setMicError(t('speech_start_failed'));
    }
  }, [t]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('🔇 Recognition.stop() called');
      } catch (e) {
        console.error('Stop error:', e);
      }
    }
    setIsListening(false);
  }, []);

  const handleVoiceSubmit = async (text: string) => {
    if (!text.trim()) return;
    
    // Stop listening if active
    if (isListening) stopListening();
    
    console.log('📝 Submitting:', text);
    setProcessing(true);
    
    try {
      const analysis = await analyzeGrievanceNLP(text);
      await addGrievance({
        userId: 1,
        category: complaintCategory || analysis.category,
        description: text,
        priority: analysis.priority,
        location: complaintLocation || undefined,
      });
      
      setShowVoiceModal(false);
      setTranscript('');
      setManualComplaint('');
      setComplaintCategory('');
      setComplaintLocation('');
      setComplaintFile(null);
      alert(`${t('complaint_submitted_success')}${complaintCategory || analysis.category}\n${t('priority')}: ${analysis.priority}`);
    } catch (error) {
      console.error('❌ Submit error:', error);
      alert(t('something_went_wrong'));
    } finally {
      setProcessing(false);
    }
  };

  const handleAttendance = async () => {
    // Check if within attendance window
    if (!isWithinAttendanceWindow()) {
      const hours = currentTime.getHours();
      const message = hours < 7 
        ? t('attendance_not_started')
        : t('attendance_ended');
      alert(message);
      return;
    }

    setShowAttendanceModal(true);
    setAttendanceStep('locating');
    setLocationPings([]);
    setVerificationResult(null);
    setVerificationProgress(0);

    try {
      // Step 1: Collect multiple location pings for verification
      const pings: any[] = [];
      const PING_COUNT = 4;
      const PING_INTERVAL = 1500; // 1.5 seconds between pings
      
      for (let i = 0; i < PING_COUNT; i++) {
        setVerificationProgress(Math.round(((i + 1) / PING_COUNT) * 50));
        
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0 // Force fresh location
          });
        });

        pings.push({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed
        });
        
        setLocationPings([...pings]);
        
        if (i < PING_COUNT - 1) {
          await new Promise(resolve => setTimeout(resolve, PING_INTERVAL));
        }
      }

      // Step 2: Verify location with ML service
      setAttendanceStep('verifying');
      setVerificationProgress(60);

      const verifyResponse = await fetch(`${ML_API_URL}/location/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeData.id,
          employee_name: employeeData.name,
          office_lat: OFFICE_LOCATION.lat,
          office_lng: OFFICE_LOCATION.lng,
          office_radius_km: OFFICE_LOCATION.radius,
          pings: pings,
          check_in_time: new Date().toISOString()
        })
      });

      setVerificationProgress(80);
      const verification = await verifyResponse.json();
      setVerificationResult(verification);
      setVerificationProgress(100);

      // Step 3: Handle verification result
      if (verification.status === 'SPOOFING_SUSPECTED') {
        setAttendanceStep('spoofing');
        return;
      }

      if (!verification.verified && verification.confidence < 50) {
        setAttendanceStep('error');
        return;
      }

      // Step 4: Mark attendance if verified
      const mainPing = pings[0];
      await markAttendance(employeeData.id, { lat: mainPing.lat, lng: mainPing.lng });
      
      setAttendanceStep('success');
      setAttendanceMarked(true);
      setTimeout(() => setShowAttendanceModal(false), 3000);
      
    } catch (error) {
      console.error('Attendance error:', error);
      setAttendanceStep('error');
    }
  };

  // Cleanup location watch on unmount
  useEffect(() => {
    return () => {
      if (locationWatchRef.current) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, []);

  const currentText = transcript || manualComplaint;

  // Get user's grievances
  const myGrievances = grievances.filter(g => g.userId === 1);
  const pendingCount = myGrievances.filter(g => g.status === 'Pending').length;
  const resolvedCount = myGrievances.filter(g => g.status === 'Resolved').length;

  const categories = ['Salary', 'Leave', 'Equipment', 'Transfer', 'Harassment', 'Safety', 'Infrastructure', 'Other'];
  const wards = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8'];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Salary': '#22c55e',
      'Leave': '#3b82f6',
      'Equipment': '#f59e0b',
      'Transfer': '#8b5cf6',
      'Harassment': '#ef4444',
      'Safety': '#f97316',
      'Infrastructure': '#06b6d4',
      'Other': '#64748b'
    };
    return colors[category] || '#64748b';
  };

  // Case History View
  if (employeeView === 'case-history') {
    return (
      <div className="min-h-screen pb-24" style={{ background: '#f8fafc' }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', 
          padding: '24px 20px',
          borderRadius: '0 0 24px 24px'
        }}>
          <button
            onClick={() => setEmployeeView('dashboard')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '12px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Back to Dashboard
          </button>
          
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
            📋 My Case History
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: 0 }}>
            Track all your submitted grievances
          </p>
        </div>

        {/* Stats */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center', border: '2px solid #e2e8f0' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>{myGrievances.length}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Total Cases</div>
            </div>
            <div style={{ background: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center', border: '2px solid #fbbf24' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{pendingCount}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Pending</div>
            </div>
            <div style={{ background: 'white', borderRadius: '16px', padding: '16px', textAlign: 'center', border: '2px solid #22c55e' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>{resolvedCount}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Resolved</div>
            </div>
          </div>

          {/* Grievances List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {myGrievances.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>No grievances submitted yet</p>
              </div>
            ) : (
              myGrievances.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map((grievance) => (
                <div key={grievance.id} style={{ 
                  background: 'white', 
                  borderRadius: '16px', 
                  padding: '20px', 
                  border: '2px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 'bold', 
                          padding: '4px 10px', 
                          borderRadius: '8px',
                          background: getCategoryColor(grievance.category) + '15',
                          color: getCategoryColor(grievance.category)
                        }}>
                          {grievance.category}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>#{grievance.id}</span>
                      </div>
                      <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 8px 0', lineHeight: '1.5' }}>
                        {grievance.description.substring(0, 100)}{grievance.description.length > 100 ? '...' : ''}
                      </p>
                    </div>
                    <div style={{ 
                      padding: '6px 12px', 
                      borderRadius: '8px', 
                      fontSize: '11px', 
                      fontWeight: '600',
                      background: grievance.status === 'Resolved' ? '#dcfce7' : '#fef3c7',
                      color: grievance.status === 'Resolved' ? '#166534' : '#92400e',
                      whiteSpace: 'nowrap'
                    }}>
                      {grievance.status === 'Resolved' ? '✅ Resolved' : '⏳ Pending'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                      <span>🚨 {grievance.priority}</span>
                      <span>📅 {new Date(grievance.submittedAt).toLocaleDateString()}</span>
                      {grievance.location && <span>📍 {grievance.location}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', 
        padding: '24px 20px',
        borderRadius: '0 0 24px 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ 
            width: '60px', height: '60px', 
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', color: 'white', fontWeight: 'bold'
          }}>
            {employeeData.name.charAt(0)}
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
              {`${t('hello')}, ${employeeData.name.split(' ')[0]}! 👋`}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: '4px 0 0 0' }}>
              {t('have_good_day')}
            </p>
          </div>
        </div>
        
        <div style={{ 
          background: attendanceMarked ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.15)', 
          borderRadius: '12px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {attendanceMarked ? <CheckCircle size={20} style={{ color: '#4ade80' }} /> : <Clock size={20} style={{ color: 'rgba(255,255,255,0.8)' }} />}
            <span style={{ color: 'white', fontSize: '15px', fontWeight: '500' }}>
              {attendanceMarked ? `${t('attendance_marked_at')}: ${employeeData.checkInTime}` : t('mark_attendance_now')}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
              {formatTime(currentTime)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
              {isWithinAttendanceWindow() ? t('time_window_in') : t('time_window_out')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Buttons */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Attendance */}
        <button onClick={handleAttendance} disabled={attendanceMarked || !isWithinAttendanceWindow()}
          style={{
            width: '100%', padding: '24px',
            background: attendanceMarked ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : !isWithinAttendanceWindow() ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            border: 'none', borderRadius: '20px',
            display: 'flex', alignItems: 'center', gap: '16px',
            cursor: (attendanceMarked || !isWithinAttendanceWindow()) ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
            opacity: (attendanceMarked || !isWithinAttendanceWindow()) ? 0.7 : 1
          }}>
          <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {attendanceMarked ? <CheckCircle size={32} style={{ color: 'white' }} /> : <MapPin size={32} style={{ color: 'white' }} />}
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <p style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              {attendanceMarked ? `✓ ${t('attendance_complete')}` : !isWithinAttendanceWindow() ? `⏰ ${t('time_window_out')}` : `📍 ${t('mark_attendance_now')}`}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: '4px 0 0 0' }}>
              {attendanceMarked ? t('attendance_complete') : !isWithinAttendanceWindow() ? t('time_window_hours') : t('tap_here')}
            </p>
          </div>
        </button>

        {/* Salary & Leave */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button onClick={() => setCurrentView('payroll')}
            style={{ padding: '20px 16px', background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={26} style={{ color: 'white' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#1e293b', fontSize: '16px', fontWeight: '600', margin: 0 }}>💰 {t('salary_slip')}</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>{t('view_download')}</p>
            </div>
          </button>

          <button onClick={() => setCurrentView('leave')}
            style={{ padding: '20px 16px', background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={26} style={{ color: 'white' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#1e293b', fontSize: '16px', fontWeight: '600', margin: 0 }}>📅 {t('leave')}</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>{employeeData.leaveBalance} {t('leave_remaining')}</p>
            </div>
          </button>
        </div>

        {/* Complaint */}
        <button onClick={() => setShowVoiceModal(true)}
          style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(239,68,68,0.25)' }}>
          <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={26} style={{ color: 'white' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>🎤 {t('file_complaint_voice')}</p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: '4px 0 0 0' }}>{t('speak_or_type')}</p>
          </div>
        </button>

        {/* Case History */}
        <button onClick={() => setEmployeeView('case-history')}
          style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', border: 'none', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(139,92,246,0.25)' }}>
          <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={26} style={{ color: 'white' }} />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <p style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>📋 My Case History</p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: '4px 0 0 0' }}>
              {myGrievances.length} {myGrievances.length === 1 ? 'case' : 'cases'} • {pendingCount} pending
            </p>
          </div>
        </button>

        {/* Help */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', border: '2px solid #e2e8f0', marginTop: '8px' }}>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 12px 0', fontWeight: '500' }}>📞 {t('need_help')}</p>
          <a href="tel:1800-123-4567" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e40af', textDecoration: 'none', fontSize: '16px', fontWeight: '600' }}>
            <Phone size={20} />1800-123-4567 ({t('toll_free')})
          </a>
        </div>
      </div>

      {/* Attendance Modal with Location Verification */}
      {showAttendanceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
            
            {/* Locating Step */}
            {attendanceStep === 'locating' && (
              <>
                <div style={{ width: '80px', height: '80px', background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', position: 'relative' }}>
                  <Navigation size={36} style={{ color: '#2563eb' }} className="animate-pulse" />
                  <div style={{ position: 'absolute', inset: '-4px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                </div>
                <h3 style={{ color: '#1e293b', fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>📍 {t('location_verification')}</h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>
                  {locationPings.length === 0 ? t('searching_gps') : `${locationPings.length}/4 ${t('locations_recorded')}`}
                </p>
                
                {/* Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ width: `${verificationProgress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                </div>
                
                {/* Location Pings Indicator */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: locationPings.length >= i ? '#22c55e' : '#e2e8f0',
                      transition: 'background 0.3s ease'
                    }}></div>
                  ))}
                </div>
                
                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                  <Shield size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {t('ai_location_active')}
                </p>
              </>
            )}

            {/* Verifying Step */}
            {attendanceStep === 'verifying' && (
              <>
                <div style={{ width: '80px', height: '80px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Shield size={36} style={{ color: '#d97706' }} />
                </div>
                <h3 style={{ color: '#1e293b', fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>🔍 {t('ai_verification_progress')}</h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>{t('analyzing_location')}</p>
                
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${verificationProgress}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #d97706)', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                </div>
              </>
            )}

            {/* Success Step */}
            {attendanceStep === 'success' && (
              <>
                <div style={{ width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={40} style={{ color: '#16a34a' }} />
                </div>
                <h3 style={{ color: '#16a34a', fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0' }}>✅ {t('verified')}</h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>{t('attendance_success')}</p>
                
                {verificationResult && (
                  <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '12px', marginBottom: '12px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#166534', fontSize: '12px' }}>{t('confidence_score')}</span>
                      <span style={{ color: '#166534', fontSize: '14px', fontWeight: 'bold' }}>{verificationResult.confidence}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#166534', fontSize: '12px' }}>{t('in_office_zone')}</span>
                      <span style={{ color: '#166534', fontSize: '14px', fontWeight: 'bold' }}>{verificationResult.metrics?.zone_percentage || 100}%</span>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#22c55e', fontSize: '12px' }}>
                  <Shield size={14} />
                  <span>{t('verified_by_ai')}</span>
                </div>
              </>
            )}

            {/* Spoofing Detected Step */}
            {attendanceStep === 'spoofing' && (
              <>
                <div style={{ width: '80px', height: '80px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <AlertTriangle size={40} style={{ color: '#dc2626' }} />
                </div>
                <h3 style={{ color: '#dc2626', fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0' }}>⚠️ {t('suspicious_location')}</h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>{t('gps_spoofing_suspected')}</p>
                
                {verificationResult && (
                  <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '12px', marginBottom: '16px', textAlign: 'left' }}>
                    <p style={{ color: '#991b1b', fontSize: '12px', fontWeight: '600', margin: '0 0 8px 0' }}>{t('issues_found')}</p>
                    {verificationResult.spoofing_indicators?.map((indicator: string, idx: number) => (
                      <p key={idx} style={{ color: '#b91c1c', fontSize: '11px', margin: '4px 0', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <span>•</span> {indicator}
                      </p>
                    ))}
                    {verificationResult.ai_analysis && (
                      <p style={{ color: '#7f1d1d', fontSize: '11px', marginTop: '8px', fontStyle: 'italic' }}>
                        AI: {verificationResult.ai_analysis}
                      </p>
                    )}
                  </div>
                )}
                
                <button onClick={() => setShowAttendanceModal(false)} style={{ padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                  {t('close')}
                </button>
                <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '12px' }}>
                  {t('retry_at_office')}
                </p>
              </>
            )}

            {/* Error Step */}
            {attendanceStep === 'error' && (
              <>
                <div style={{ width: '80px', height: '80px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <AlertTriangle size={40} style={{ color: '#dc2626' }} />
                </div>
                <h3 style={{ color: '#dc2626', fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0' }}>❌ {t('error_exclamation')}</h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>
                  {verificationResult?.message || t('location_verification_failed')}
                </p>
                
                {verificationResult?.risk_factors?.length > 0 && (
                  <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '12px', marginBottom: '16px', textAlign: 'left' }}>
                    {verificationResult.risk_factors.map((factor: string, idx: number) => (
                      <p key={idx} style={{ color: '#b91c1c', fontSize: '11px', margin: '4px 0' }}>• {factor}</p>
                    ))}
                  </div>
                )}
                
                <button onClick={() => setShowAttendanceModal(false)} style={{ padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                  {t('close')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Voice Modal */}
      {showVoiceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#0f172a', fontSize: '22px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: '#eff6ff', padding: '8px', borderRadius: '12px' }}>🎤</span>
                {t('file_complaint_voice')}
              </h2>
              <button onClick={() => { stopListening(); setShowVoiceModal(false); setTranscript(''); setManualComplaint(''); setMicError(''); }}
                style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                <X size={20} style={{ color: '#64748b' }} />
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <textarea
                value={currentText}
                onChange={(e) => { setManualComplaint(e.target.value); setTranscript(''); }}
                placeholder={t('type_or_speak')}
                style={{ 
                  width: '100%', 
                  height: '140px', 
                  padding: '16px', 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0', 
                  borderRadius: '16px', 
                  fontSize: '16px', 
                  lineHeight: '1.5',
                  resize: 'none', 
                  fontFamily: 'inherit', 
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  color: '#334155'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              {!currentText && !isListening && (
                <div style={{ position: 'absolute', bottom: '16px', right: '16px', pointerEvents: 'none' }}>
                  <Mic size={20} style={{ color: '#94a3b8', opacity: 0.5 }} />
                </div>
              )}
            </div>

            {/* Enhanced Form Fields */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#475569', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Category (Optional)
              </label>
              <select
                value={complaintCategory}
                onChange={(e) => setComplaintCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">Auto-detect category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#475569', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Location (Optional)
              </label>
              <select
                value={complaintLocation}
                onChange={(e) => setComplaintLocation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">Select ward/location</option>
                {wards.map(ward => (
                  <option key={ward} value={ward}>{ward}</option>
                ))}
              </select>
            </div>

            {/* Error Message */}
            {micError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MicOff size={18} style={{ color: '#dc2626' }} />
                <span style={{ color: '#b91c1c', fontSize: '14px', fontWeight: '500' }}>{micError}</span>
              </div>
            )}

            {/* Mic Button - Centered and Enhanced */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ position: 'relative' }}>
                {isListening && (
                  <div style={{
                    position: 'absolute', inset: '-8px', borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.2)',
                    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                  }} />
                )}
                <button
                  onClick={isListening ? stopListening : startListening}
                  style={{
                    width: '72px', height: '72px', borderRadius: '50%', border: 'none',
                    background: !speechSupported ? '#9ca3af' : isListening ? '#ef4444' : '#3b82f6',
                    cursor: 'pointer',
                    boxShadow: isListening ? '0 0 0 4px rgba(239,68,68,0.3)' : '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: isListening ? 'scale(1.1)' : 'scale(1)'
                  }}>
                  <Mic size={32} style={{ color: 'white' }} />
                </button>
              </div>
              <p style={{ 
                textAlign: 'center', 
                color: isListening ? '#ef4444' : '#64748b', 
                fontSize: '14px', 
                fontWeight: '600',
                margin: 0,
                height: '20px'
              }}>
                {!speechSupported ? `⚠️ ${t('voice_not_supported')}` : isListening ? t('listening_speak') : t('press_to_speak')}
              </p>
            </div>

            <button
              onClick={() => handleVoiceSubmit(currentText)}
              disabled={processing || !currentText.trim()}
              style={{
                width: '100%', padding: '16px',
                background: processing || !currentText.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: processing || !currentText.trim() ? '#94a3b8' : 'white',
                border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '700',
                cursor: processing || !currentText.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: processing || !currentText.trim() ? 'none' : '0 10px 20px -5px rgba(22, 163, 74, 0.3)',
                transition: 'all 0.2s ease',
                transform: processing || !currentText.trim() ? 'none' : 'translateY(0)'
              }}
              onMouseDown={(e) => !processing && currentText.trim() && (e.currentTarget.style.transform = 'translateY(2px)')}
              onMouseUp={(e) => !processing && currentText.trim() && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {processing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {t('sending')}
                </>
              ) : (
                <>
                  <MessageSquare size={20} />
                  {t('send_complaint')}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EmployeeDashboard;
