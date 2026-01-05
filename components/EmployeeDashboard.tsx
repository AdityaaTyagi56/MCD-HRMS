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
  Wifi,
  ScanFace,
  Fingerprint
} from 'lucide-react';
import FaceRecognition from './FaceRecognition';
import { hasEnrolledFace, getEnrollmentStatus } from '../services/face-recognition';

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
  const [attendanceStep, setAttendanceStep] = useState<'locating' | 'face-verify' | 'verifying' | 'success' | 'error' | 'spoofing'>('locating');
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [locationPings, setLocationPings] = useState<any[]>([]);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Face Recognition State
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);

  const recognitionRef = useRef<any>(null);
  const locationWatchRef = useRef<number | null>(null);
  const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || 'https://mcd-hrms-ml.onrender.com';
  
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

    // Check if face is enrolled
    if (!hasEnrolledFace(employeeData.id)) {
      // Show enrollment modal instead
      setShowFaceEnrollment(true);
      return;
    }

    setShowAttendanceModal(true);
    setAttendanceStep('locating');
    setLocationPings([]);
    setVerificationResult(null);
    setVerificationProgress(0);
    setFaceVerified(false);

    try {
      // Step 1: Collect multiple location pings for verification
      const pings: any[] = [];
      const PING_COUNT = 4;
      const PING_INTERVAL = 1500; // 1.5 seconds between pings
      
      for (let i = 0; i < PING_COUNT; i++) {
        setVerificationProgress(Math.round(((i + 1) / PING_COUNT) * 40));
        
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

      // Step 2: Facial Recognition Verification
      setAttendanceStep('face-verify');
      setVerificationProgress(50);
      
    } catch (error) {
      console.error('Attendance error:', error);
      setAttendanceStep('error');
    }
  };

  // Handle face verification success
  const handleFaceVerificationSuccess = async () => {
    setFaceVerified(true);
    setAttendanceStep('verifying');
    setVerificationProgress(70);

    try {
      const verifyResponse = await fetch(`${ML_API_URL}/location/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeData.id,
          employee_name: employeeData.name,
          office_lat: OFFICE_LOCATION.lat,
          office_lng: OFFICE_LOCATION.lng,
          office_radius_km: OFFICE_LOCATION.radius,
          pings: locationPings,
          check_in_time: new Date().toISOString(),
          face_verified: true
        })
      });

      setVerificationProgress(90);
      const verification = await verifyResponse.json();
      setVerificationResult(verification);
      setVerificationProgress(100);

      // Handle verification result
      if (verification.status === 'SPOOFING_SUSPECTED') {
        setAttendanceStep('spoofing');
        return;
      }

      if (!verification.verified && verification.confidence < 50) {
        setAttendanceStep('error');
        return;
      }

      // Mark attendance if verified
      const mainPing = locationPings[0];
      await markAttendance(employeeData.id, { lat: mainPing.lat, lng: mainPing.lng });
      
      setAttendanceStep('success');
      setAttendanceMarked(true);
      setTimeout(() => setShowAttendanceModal(false), 3000);
      
    } catch (error) {
      console.error('Verification error:', error);
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
      <div className="-m-4 min-h-screen pb-24 bg-neutral-100">
        <div className="bg-white border-b border-neutral-200 p-4">
          <button
            onClick={() => setEmployeeView('dashboard')}
            className="inline-flex items-center gap-2 bg-neutral-100 border border-neutral-200 px-3 py-2 rounded-xl text-sm font-semibold text-neutral-900"
          >
            ← {t('back_to_dashboard') || 'Back to dashboard'}
          </button>
          <h1 className="text-neutral-900 text-xl font-bold mt-3 mb-1">
            {t('case_history') || 'My Case History'}
          </h1>
          <p className="text-sm text-neutral-600 m-0">
            {t('track_cases') || 'See all complaints you have raised'}
          </p>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[{ label: t('total_cases') || 'Total cases', value: myGrievances.length }, { label: t('pending') || 'Pending', value: pendingCount }, { label: t('resolved') || 'Resolved', value: resolvedCount }].map((item, idx) => (
              <div key={idx} className="bg-white border border-neutral-200 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-neutral-900 leading-tight">{item.value}</div>
                <div className="text-xs text-neutral-600 mt-1 leading-tight">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {myGrievances.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm text-neutral-600 m-0">{t('no_grievances') || 'No grievances submitted yet'}</p>
              </div>
            ) : (
              myGrievances
                .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                .map((grievance) => (
                  <div key={grievance.id} className="bg-white border border-neutral-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-neutral-100 text-neutral-900">
                            {grievance.category}
                          </span>
                          <span className="text-[11px] text-neutral-500">#{grievance.id}</span>
                        </div>
                        <p className="text-sm text-neutral-800 m-0 mb-2 leading-snug break-words">
                          {grievance.description.substring(0, 120)}{grievance.description.length > 120 ? '…' : ''}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600">
                          <span className="whitespace-nowrap">📅 {new Date(grievance.submittedAt).toLocaleDateString()}</span>
                          <span className="whitespace-nowrap">🚨 {grievance.priority}</span>
                          {grievance.location && <span className="truncate max-w-[14rem]">📍 {grievance.location}</span>}
                        </div>
                      </div>
                      <div
                        className={`shrink-0 self-start px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                          grievance.status === 'Resolved'
                            ? 'border-success-200 bg-success-50 text-success-700'
                            : 'border-warning-200 bg-warning-50 text-warning-700'
                        }`}
                      >
                        {grievance.status === 'Resolved' ? 'Resolved' : 'Pending'}
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
    <div className="-m-4 min-h-screen pb-24 bg-neutral-100 p-4 space-y-3">
      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-900 shrink-0">
                {employeeData.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-neutral-900 truncate">{`${t('hello')}, ${employeeData.name.split(' ')[0]}`}</div>
              <div className="text-sm text-neutral-600 truncate">{t('have_good_day')}</div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-bold text-neutral-900 tabular-nums">{formatTime(currentTime)}</div>
            <div className="text-xs text-neutral-500">{isWithinAttendanceWindow() ? t('time_window_in') : t('time_window_out')}</div>
          </div>
        </div>
      </div>

      {!hasEnrolledFace(employeeData.id) && (
        <button
          onClick={() => setShowFaceEnrollment(true)}
          className="w-full flex items-center justify-between gap-3 bg-warning-50 border border-warning-200 rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <ScanFace size={22} className="text-warning-700 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-sm font-bold text-warning-700 truncate">{t('setup_face_id') || 'Set up Face ID'}</div>
              <div className="text-xs text-warning-700/80 truncate">{t('required_for_attendance') || 'Needed for attendance'}</div>
            </div>
          </div>
          <span className="text-xs font-semibold text-warning-700 shrink-0">{t('enroll_now') || 'Enroll'}</span>
        </button>
      )}

      {hasEnrolledFace(employeeData.id) && (
        <div className="w-full flex items-center justify-between gap-3 bg-success-50 border border-success-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Fingerprint size={20} className="text-success-700 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-success-700 truncate">{t('face_id_ready') || 'Face ID ready'}</div>
              <div className="text-xs text-success-700/80 truncate">
                {getEnrollmentStatus(employeeData.id).samplesCount} {t('samples') || 'samples saved'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowFaceEnrollment(true)}
            className="shrink-0 border border-success-600 bg-white text-success-700 px-3 py-1.5 rounded-xl text-xs font-semibold"
          >
            {t('update') || 'Update'}
          </button>
        </div>
      )}

      <button
        onClick={handleAttendance}
        disabled={attendanceMarked || !isWithinAttendanceWindow()}
        className={`w-full rounded-xl p-4 flex items-center gap-3 text-white ${
          attendanceMarked
            ? 'bg-success-600'
            : !isWithinAttendanceWindow()
              ? 'bg-neutral-400'
              : 'bg-primary-500'
        } ${attendanceMarked || !isWithinAttendanceWindow() ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          {attendanceMarked ? <CheckCircle size={24} /> : <MapPin size={24} />}
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-base font-bold truncate">{attendanceMarked ? t('attendance_complete') : t('mark_attendance_now')}</div>
          <div className="text-xs truncate">
            {attendanceMarked ? `${t('attendance_marked_at')}: ${employeeData.checkInTime}` : t('tap_here')}
          </div>
        </div>
        <div className="text-lg font-bold shrink-0">›</div>
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={() => setCurrentView('payroll')}
          className="bg-white border border-neutral-200 rounded-xl p-4 text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee size={20} className="text-success-700" />
            <span className="font-bold text-neutral-900">{t('salary_slip')}</span>
          </div>
          <div className="text-xs text-neutral-600">{t('view_download')}</div>
        </button>

        <button
          onClick={() => setCurrentView('leave')}
          className="bg-white border border-neutral-200 rounded-xl p-4 text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={20} className="text-warning-700" />
            <span className="font-bold text-neutral-900">{t('leave')}</span>
          </div>
          <div className="text-xs text-neutral-600">{employeeData.leaveBalance} {t('leave_remaining')}</div>
        </button>
      </div>

      <button
        onClick={() => setShowVoiceModal(true)}
        className="w-full bg-error-50 border border-error-200 rounded-xl p-4 flex items-center gap-3"
      >
        <div className="w-11 h-11 rounded-xl bg-error-100 flex items-center justify-center shrink-0">
          <Mic size={22} className="text-error-700" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="font-bold text-error-700 truncate">{t('file_complaint_voice')}</div>
          <div className="text-xs text-error-700/80 truncate">{t('speak_or_type')}</div>
        </div>
        <div className="text-lg font-bold text-error-700 shrink-0">›</div>
      </button>

      <button
        onClick={() => setEmployeeView('case-history')}
        className="w-full bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3"
      >
        <div className="w-11 h-11 rounded-xl bg-neutral-200 flex items-center justify-center shrink-0">
          <MessageSquare size={20} className="text-neutral-900" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="font-bold text-neutral-900 truncate">{t('case_history') || 'Case history'}</div>
          <div className="text-xs text-neutral-600 truncate">
            {myGrievances.length} {myGrievances.length === 1 ? t('case_single') || 'case' : t('case_plural') || 'cases'} • {pendingCount} {t('pending') || 'pending'}
          </div>
        </div>
        <div className="text-lg font-bold shrink-0">›</div>
      </button>

      <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-1">
        <div className="font-bold text-neutral-900 text-sm">📞 {t('need_help')}</div>
        <a href="tel:1800-123-4567" className="text-neutral-900 font-bold text-base no-underline">
          1800-123-4567 ({t('toll_free')})
        </a>
        <div className="text-xs text-neutral-600">{t('working_hours') || 'Working hours: 9 AM - 6 PM'}</div>
      </div>

      {/* Attendance Modal with Location + Face Verification */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]">
          <div
            className={`w-full bg-white rounded-3xl shadow-soft-lg max-h-[90vh] overflow-y-auto ${
              attendanceStep === 'face-verify' ? 'max-w-xl p-0' : 'max-w-sm p-6'
            }`}
          >
            
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

            {/* Face Verification Step */}
            {attendanceStep === 'face-verify' && (
              <>
                <div className="p-4 pb-0">
                  <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
                    <div className="w-8 h-8 bg-success-50 border border-success-200 rounded-full flex items-center justify-center">
                      <CheckCircle size={18} className="text-success-700" />
                    </div>
                    <span className="text-success-700 text-sm font-semibold">{t('step_location_verified')}</span>
                    <span className="text-neutral-400 text-xs">→</span>
                    <div className="w-8 h-8 bg-primary-50 border border-primary-200 rounded-full flex items-center justify-center">
                      <ScanFace size={18} className="text-primary-600" />
                    </div>
                    <span className="text-primary-600 text-sm font-semibold">{t('step_face_verification')}</span>
                  </div>
                </div>
                
                <FaceRecognition
                  employeeId={employeeData.id}
                  employeeName={employeeData.name}
                  mode="attendance"
                  onSuccess={handleFaceVerificationSuccess}
                  onError={(error) => {
                    console.error('Face verification error:', error);
                    setAttendanceStep('error');
                    setVerificationResult({ message: `${t('face_verification')}: ${t('failed')} - ${error}` });
                  }}
                  onClose={() => setShowAttendanceModal(false)}
                />
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
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ background: '#dcfce7', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} style={{ color: '#16a34a' }} />
                    <span style={{ color: '#166534', fontSize: '12px', fontWeight: '600' }}>{t('badge_location_ok')}</span>
                  </div>
                  <div style={{ background: '#dcfce7', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Fingerprint size={16} style={{ color: '#16a34a' }} />
                    <span style={{ color: '#166534', fontSize: '12px', fontWeight: '600' }}>{t('badge_face_ok')}</span>
                  </div>
                </div>
                
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
                
                {/* Verification Badges */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#dcfce7', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} style={{ color: '#16a34a' }} />
                    <span style={{ color: '#166534', fontSize: '11px', fontWeight: '600' }}>{t('badge_location_ok')}</span>
                  </div>
                  <div style={{ background: '#dcfce7', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ScanFace size={14} style={{ color: '#16a34a' }} />
                    <span style={{ color: '#166534', fontSize: '11px', fontWeight: '600' }}>{t('badge_face_id_ok')}</span>
                  </div>
                </div>
                
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

      {/* Face Enrollment Modal */}
      {showFaceEnrollment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]">
          <div className="w-full max-w-xl bg-white rounded-3xl overflow-hidden max-h-[90vh] shadow-soft-lg">
            <FaceRecognition
              employeeId={employeeData.id}
              employeeName={employeeData.name}
              mode="enroll"
              onSuccess={() => {
                setShowFaceEnrollment(false);
                alert(`${t('success')}: ${t('fr_enrollment_complete')} ${t('mark_attendance')}`);
              }}
              onError={(error) => {
                console.error('Enrollment error:', error);
              }}
              onClose={() => setShowFaceEnrollment(false)}
            />
          </div>
        </div>
      )}

      {/* Voice Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-soft-lg max-h-[90vh] overflow-y-auto p-5 sm:p-8">
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
