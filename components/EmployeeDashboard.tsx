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
  Fingerprint,
  Languages
} from 'lucide-react';
import FaceRecognition from './FaceRecognition';
import { hasEnrolledFace, getEnrollmentStatus } from '../services/face-recognition';

const EmployeeDashboard: React.FC = () => {
  const { language, toggleLanguage, setCurrentView, addGrievance, markAttendance, t, grievances } = useApp();
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
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
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

      switch (event.error) {
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
  }, [t, language]);

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

  // Case History View
  if (employeeView === 'case-history') {
    return (
      <div className="pb-24 max-w-lg mx-auto md:max-w-4xl space-y-4">
        <div className="glass-card rounded-2xl p-5 sticky top-20 z-10 border border-slate-200/60 shadow-sm backdrop-blur-xl bg-white/90">
          <button
            onClick={() => setEmployeeView('dashboard')}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 transition-colors mb-4"
          >
            ← {t('back_to_dashboard') || 'Back'}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-slate-900 text-2xl font-bold tracking-tight">
                {t('case_history') || 'My Case History'}
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">
                {t('track_cases') || 'Track your submitted grievances'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <MessageSquare size={20} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[{ label: t('total_cases') || 'Total', value: myGrievances.length, color: 'bg-blue-50 text-blue-700' },
          { label: t('pending') || 'Pending', value: pendingCount, color: 'bg-amber-50 text-amber-700' },
          { label: t('resolved') || 'Resolved', value: resolvedCount, color: 'bg-emerald-50 text-emerald-700' }]
            .map((item, idx) => (
              <div key={idx} className={`rounded-2xl p-4 text-center border border-transparent ${item.color.replace('text', 'bg').replace('50', '50/50')}`}>
                <div className={`text-2xl font-bold ${item.color.split(' ')[1]}`}>{item.value}</div>
                <div className={`text-xs font-bold uppercase tracking-wide mt-1 opacity-80 ${item.color.split(' ')[1]}`}>{item.label}</div>
              </div>
            ))}
        </div>

        <div className="space-y-3">
          {myGrievances.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border-dashed border-2 border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">📭</div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{t('no_grievances') || 'No cases yet'}</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">Any complaints you submit will appear here with their live status.</p>
            </div>
          ) : (
            myGrievances
              .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
              .map((grievance) => (
                <div key={grievance.id} className="glass-card rounded-2xl p-5 hover:shadow-md transition-shadow duration-200 border border-slate-200/60">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 tracking-wider">
                          #{grievance.id}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg tracking-wider ${grievance.priority === 'High' ? 'bg-rose-50 text-rose-700' :
                          grievance.priority === 'Medium' ? 'bg-amber-50 text-amber-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                          {grievance.priority} Priority
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-800 mb-1 leading-snug">
                        {grievance.category}
                      </h3>

                      <p className="text-sm text-slate-600 mb-3 leading-relaxed break-words line-clamp-2">
                        {grievance.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          {new Date(grievance.submittedAt).toLocaleDateString()}
                        </span>
                        {grievance.location && (
                          <span className="flex items-center gap-1.5 truncate max-w-[120px]">
                            <MapPin size={12} />
                            {grievance.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${grievance.status === 'Resolved'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${grievance.status === 'Resolved' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                        {grievance.status === 'Resolved' ? 'Resolved' : 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-6 max-w-lg mx-auto md:max-w-4xl px-4 md:px-0">
      {/* LANGUAGE TOGGLE HEADER */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4 border border-slate-200/50 shadow-sm sticky top-4 z-20 backdrop-blur-xl bg-white/90">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
            {employeeData.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">{employeeData.name.split(' ')[0]}</h2>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Employee</p>
          </div>
        </div>

        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2 rounded-full transition-all active:scale-95"
        >
          <Languages size={18} className="text-indigo-600" />
          <span className="text-sm font-bold text-slate-700">
            {language === 'en' ? 'English' : 'हिंदी'}
          </span>
        </button>
      </div>

      {/* MINIMALIST ATTENDANCE CARD */}
      <div className={`rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ${attendanceMarked ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'
        }`}>
        {!attendanceMarked ? (
          <button
            onClick={handleAttendance}
            disabled={!isWithinAttendanceWindow()}
            className="w-full h-full flex flex-col items-center justify-center gap-4 group active:scale-95 transition-transform"
          >
            <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors shadow-inner">
              <ScanFace size={48} strokeWidth={1.5} />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-600 group-hover:text-indigo-900 transition-colors">
                {t('mark_attendance_now')}
              </h3>
              <p className="text-base text-slate-400 font-medium group-hover:text-indigo-400">
                {t('tap_here') || 'Tap here'}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
              <CheckCircle size={48} strokeWidth={2} />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-emerald-800">{t('attendance_complete')}</h3>
              <p className="text-sm text-emerald-600 font-medium">
                {t('attendance_marked_at')} {employeeData.checkInTime}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Face ID Status - Subtle Warning */}
      {!hasEnrolledFace(employeeData.id) && (
        <button
          onClick={() => setShowFaceEnrollment(true)}
          className="w-full flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 shadow-sm active:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle size={16} />
            </div>
            <span className="text-sm font-bold text-amber-900">{t('setup_face_id') || 'Face ID Required'}</span>
          </div>
          <span className="text-xs font-bold bg-amber-200 text-amber-800 px-2 py-1 rounded-md">Setup</span>
        </button>
      )}

      {/* ACTION GRID - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <button
          onClick={() => setCurrentView('leave')}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95 text-left group flex flex-col justify-between min-h-[140px]"
        >
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">{t('leave')}</h3>
            <p className="text-xs text-slate-500 font-bold mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded-full">{employeeData.leaveBalance} Remaining</p>
          </div>
        </button>

        <button
          onClick={() => setCurrentView('payroll')}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95 text-left group flex flex-col justify-between min-h-[140px]"
        >
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <IndianRupee size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">{t('salary_slip')}</h3>
            <p className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50 inline-block px-2 py-0.5 rounded-full">Available</p>
          </div>
        </button>
      </div>

      {/* Voice Complaint Button - LARGE & ACCESSIBLE */}
      <button
        onClick={() => setShowVoiceModal(true)}
        className="w-full bg-white border border-slate-200 shadow-sm hover:shadow-md rounded-3xl p-6 flex items-center gap-5 active:scale-[0.98] transition-all group"
      >
        <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 group-hover:bg-rose-100 transition-colors">
          <Mic size={28} />
        </div>
        <div className="text-left flex-1">
          <h3 className="font-bold text-slate-800 text-lg">{t('file_complaint_voice')}</h3>
          <p className="text-slate-500 text-sm">{t('speak_or_type')}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
          <span className="font-bold text-lg">›</span>
        </div>
      </button>

      {/* Case History Link */}
      <div className="text-center pt-2">
        <button
          onClick={() => setEmployeeView('case-history')}
          className="text-slate-400 hover:text-slate-600 font-medium text-sm py-2 px-4 rounded-full hover:bg-slate-100 transition-colors"
        >
          View Past Complaints ({myGrievances.length})
        </button>
      </div>

      {/* Attendance Modal with Location + Face Verification */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] transition-opacity duration-300">
          <div
            className={`w-full bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${attendanceStep === 'face-verify' ? 'max-w-xl' : 'max-w-sm'
              }`}
          >
            {attendanceStep !== 'face-verify' && (
              <div className="p-6 pb-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-slate-900">{t('attendance_verification')}</h3>
                  <button onClick={() => setShowAttendanceModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}

            <div className={`${attendanceStep === 'face-verify' ? 'p-0' : 'p-6 pt-2'}`}>

              {/* Locating Step */}
              {attendanceStep === 'locating' && (
                <div className="text-center py-8">
                  <div className="w-32 h-32 mx-auto mb-8 relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-50 rounded-full animate-pulse-slow"></div>
                    <div className="relative z-10 w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                      <Navigation size={48} className="text-blue-600 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-800 mb-2">📍 {t('location_verification')}</h3>
                  <p className="text-slate-500 text-base mb-8 font-medium">
                    {locationPings.length === 0 ? t('searching_gps') : `${locationPings.length}/4 ${t('locations_recorded')}`}
                  </p>

                  <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${locationPings.length >= i ? 'bg-blue-500' : 'bg-slate-100'
                        }`}></div>
                    ))}
                  </div>
                </div>
              )}

              {/* Face Verification Step */}
              {attendanceStep === 'face-verify' && (
                <>
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                        <CheckCircle size={14} className="text-emerald-700" />
                        <span className="text-xs font-bold text-emerald-800">{t('step_location_verified')}</span>
                      </div>
                      <span className="text-slate-300">→</span>
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full border border-blue-200">
                        <ScanFace size={14} className="text-blue-700" />
                        <span className="text-xs font-bold text-blue-800">{t('step_face_verification')}</span>
                      </div>
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
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse">
                    <Shield size={40} className="text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">🔍 {t('ai_verification_progress')}</h3>
                  <p className="text-slate-500 text-sm mb-6">{t('analyzing_location')}</p>

                  <div className="flex justify-center gap-3 mb-6">
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100">
                      <CheckCircle size={16} />
                      <span className="text-xs font-bold">{t('badge_location_ok')}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100">
                      <Fingerprint size={16} />
                      <span className="text-xs font-bold">{t('badge_face_ok')}</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full animate-progress"></div>
                  </div>
                </div>
              )}

              {/* Success Step */}
              {attendanceStep === 'success' && (
                <div className="text-center py-8">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-small">
                    <CheckCircle size={48} className="text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">{t('attendance_marked_success')}</h3>
                  <p className="text-slate-500 font-medium mb-6">
                    {t('have_great_day')}
                  </p>
                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                  >
                    {t('close')}
                  </button>
                </div>
              )}

              {/* Error Step */}
              {attendanceStep === 'error' && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <X size={40} className="text-rose-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{t('verification_failed')}</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    {verificationResult?.message || t('location_mismatch_help')}
                  </p>
                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
                  >
                    {t('try_again')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Complaint Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-slide-up sm:animate-none">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Mic className="text-rose-500" />
                {t('voice_complaint')}
              </h3>
              <button onClick={() => setShowVoiceModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="text-center py-8">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto transition-all duration-300 shadow-xl ${isListening ? 'bg-rose-500 text-white scale-110 shadow-rose-200' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                  }`}
              >
                {isListening ? <Mic size={48} className="animate-pulse" /> : <MicOff size={40} />}
              </button>
              <p className="mt-6 font-bold text-lg text-slate-800">
                {isListening ? t('listening') : t('tap_to_speak')}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {isListening ? "Say your complaint clearly..." : "Tap the mic button to start recording"}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 mb-6 min-h-[100px] border border-slate-100">
              {transcript || manualComplaint ? (
                <p className="text-slate-800 text-lg leading-relaxed">{transcript || manualComplaint}</p>
              ) : (
                <p className="text-slate-400 text-center italic mt-6">{t('transcript_placeholder')}</p>
              )}
            </div>

            <button
              onClick={() => handleVoiceSubmit(transcript || manualComplaint)}
              disabled={(!transcript && !manualComplaint) || processing}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-slate-800 transition-all shadow-lg"
            >
              {processing ? <Loader2 className="mx-auto animate-spin" /> : t('submit_complaint')}
            </button>
          </div>
        </div>
      )}

      {/* Face Enrollment Modal */}
      {showFaceEnrollment && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <div className="w-full max-w-lg">
            <FaceRecognition
              employeeId={employeeData.id}
              employeeName={employeeData.name}
              mode="enroll"
              onClose={() => setShowFaceEnrollment(false)}
              onSuccess={() => {
                setShowFaceEnrollment(false);
                alert(t('enrollment_success'));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
