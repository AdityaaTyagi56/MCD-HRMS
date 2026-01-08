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
    <div className="pb-24 space-y-4 max-w-lg mx-auto md:max-w-4xl">
      {/* Header Profile Card */}
      <div className="glass-card rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center font-bold text-xl text-primary-600 shadow-sm border border-primary-100 shrink-0">
            {employeeData.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-slate-800 truncate">{`${t('hello')}, ${employeeData.name.split(' ')[0]}`}</div>
            <div className="text-sm text-slate-500 truncate font-medium">{t('have_good_day')}</div>
          </div>
        </div>
        <div className="text-right shrink-0 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <div className="text-lg font-bold text-slate-900 tabular-nums tracking-tight">{formatTime(currentTime)}</div>
          <div className={`text-xs font-bold uppercase tracking-wide ${isWithinAttendanceWindow() ? 'text-emerald-600' : 'text-slate-400'}`}>
            {isWithinAttendanceWindow() ? t('time_window_in') : t('time_window_out')}
          </div>
        </div>
      </div>

      {/* Face ID Status */}
      {!hasEnrolledFace(employeeData.id) ? (
        <button
          onClick={() => setShowFaceEnrollment(true)}
          className="w-full flex items-center justify-between gap-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-2xl px-5 py-4 shadow-sm hover:bg-amber-100/80 transition-colors group"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-110 transition-transform">
              <ScanFace size={20} />
            </div>
            <div className="text-left min-w-0">
              <div className="text-base font-bold text-amber-900 truncate">{t('setup_face_id') || 'Set up Face ID'}</div>
              <div className="text-sm text-amber-700 truncate">{t('required_for_attendance') || 'Needed for attendance verification'}</div>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-200/50 px-3 py-1.5 rounded-full shrink-0">{t('enroll_now') || 'ENROLL'}</span>
        </button>
      ) : (
        <div className="w-full flex items-center justify-between gap-4 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200 rounded-2xl px-5 py-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Fingerprint size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-emerald-900 truncate">{t('face_id_ready') || 'Face ID Active'}</div>
              <div className="text-xs text-emerald-700 truncate font-medium">
                {getEnrollmentStatus(employeeData.id).samplesCount} {t('samples') || 'samples verified'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowFaceEnrollment(true)}
            className="shrink-0 text-emerald-700 hover:text-emerald-800 text-xs font-bold px-3 py-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            {t('update') || 'Update'}
          </button>
        </div>
      )}

      {/* Attendance Action Button */}
      <button
        onClick={handleAttendance}
        disabled={attendanceMarked || !isWithinAttendanceWindow()}
        className={`w-full rounded-2xl p-1.5 relative overflow-hidden group transition-all duration-300 transform active:scale-98 ${attendanceMarked
          ? 'cursor-not-allowed opacity-90'
          : !isWithinAttendanceWindow()
            ? 'cursor-not-allowed opacity-70 grayscale'
            : 'hover:shadow-lg shadow-md hover:-translate-y-0.5'
          }`}
      >
        <div className={`absolute inset-0 rounded-2xl ${attendanceMarked ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
          !isWithinAttendanceWindow() ? 'bg-slate-200' :
            'bg-gradient-to-br from-blue-600 to-indigo-600 animate-pulse-slow'
          }`}></div>

        <div className={`relative rounded-xl p-5 flex items-center gap-4 h-full border ${attendanceMarked ? 'bg-emerald-500 border-none' :
          !isWithinAttendanceWindow() ? 'bg-slate-100 border-slate-200' :
            'bg-white/10 backdrop-blur-sm border-white/20'
          }`}>
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${attendanceMarked ? 'bg-white/20 text-white' :
              !isWithinAttendanceWindow() ? 'bg-slate-200 text-slate-400' :
                'bg-white text-blue-600'
              }`}
          >
            {attendanceMarked ? <CheckCircle size={28} strokeWidth={3} /> : <MapPin size={28} strokeWidth={2.5} />}
          </div>

          <div className="text-left flex-1 min-w-0">
            <div className={`text-lg font-bold truncate ${attendanceMarked || (!attendanceMarked && isWithinAttendanceWindow()) ? 'text-white' : 'text-slate-500'}`}>
              {attendanceMarked ? t('attendance_complete') : t('mark_attendance_now')}
            </div>
            <div className={`text-sm truncate font-medium opacity-90 ${attendanceMarked || (!attendanceMarked && isWithinAttendanceWindow()) ? 'text-purple-50' : 'text-slate-400'}`}>
              {attendanceMarked ? `${t('attendance_marked_at')}: ${employeeData.checkInTime}` : t('tap_here')}
            </div>
          </div>

          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${attendanceMarked || (!attendanceMarked && isWithinAttendanceWindow()) ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-400'}`}>
            <span className="text-xl font-bold">›</span>
          </div>
        </div>
      </button>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setCurrentView('payroll')}
          className="glass-card hover:bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-md group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <IndianRupee size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">New</span>
          </div>
          <span className="block font-bold text-slate-800 text-lg mb-0.5">{t('salary_slip')}</span>
          <div className="text-xs font-medium text-slate-500">{t('view_download')}</div>
        </button>

        <button
          onClick={() => setCurrentView('leave')}
          className="glass-card hover:bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-md group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <Calendar size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{employeeData.leaveBalance} Left</span>
          </div>
          <span className="block font-bold text-slate-800 text-lg mb-0.5">{t('leave')}</span>
          <div className="text-xs font-medium text-slate-500">Apply or check balance</div>
        </button>
      </div>

      {/* Voice Complaint Button */}
      <button
        onClick={() => setShowVoiceModal(true)}
        className="w-full bg-rose-50 hover:bg-rose-100/80 border border-rose-100 rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 group"
      >
        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-rose-100 group-hover:scale-105 transition-transform">
          <Mic size={24} className="text-rose-500" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="font-bold text-rose-800 truncate text-lg">{t('file_complaint_voice')}</div>
          <div className="text-sm text-rose-600/80 truncate font-medium">{t('speak_or_type')}</div>
        </div>
        <div className="text-2xl font-bold text-rose-300 group-hover:text-rose-400 transition-colors">›</div>
      </button>

      {/* Case History Button */}
      <button
        onClick={() => setEmployeeView('case-history')}
        className="w-full glass-card hover:bg-slate-50 rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 group border border-slate-200/60"
      >
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <MessageSquare size={22} className="text-slate-600" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="font-bold text-slate-800 truncate text-lg">{t('case_history') || 'Case history'}</div>
          <div className="text-sm text-slate-500 truncate font-medium">
            {myGrievances.length} {myGrievances.length === 1 ? 'Case' : 'Cases'} • <span className={pendingCount > 0 ? 'text-amber-600 font-bold' : ''}>{pendingCount} Pending</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-300 group-hover:text-slate-400 transition-colors">›</div>
      </button>

      {/* Help Footer */}
      <div className="glass-card hover:bg-slate-50/50 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Phone size={18} />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm">Help & Support</div>
            <div className="text-xs text-slate-500">{t('working_hours') || '9:00 AM - 6:00 PM'}</div>
          </div>
        </div>
        <a href="tel:1800-123-4567" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-800 font-bold text-sm transition-colors no-underline">
          Call Now
        </a>
      </div>

      {/* Attendance Modal with Location + Face Verification */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300">
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
                <div className="text-center py-4">
                  <div className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-50 rounded-full animate-pulse-slow"></div>
                    <div className="relative z-10 w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <Navigation size={40} className="text-blue-600 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-2">📍 {t('location_verification')}</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    {locationPings.length === 0 ? t('searching_gps') : `${locationPings.length}/4 ${t('locations_recorded')}`}
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${verificationProgress}%` }}
                    ></div>
                  </div>

                  {/* Location Pings Indicator */}
                  <div className="flex justify-center gap-2 mb-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`w-3 h-3 rounded-full transition-colors duration-300 ${locationPings.length >= i ? 'bg-emerald-500 shadow-sm' : 'bg-slate-200'
                        }`}></div>
                    ))}
                  </div>

                  <p className="text-slate-400 text-xs flex items-center justify-center gap-1.5">
                    <Shield size={12} />
                    {t('ai_location_active')}
                  </p>
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
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-300"
                      style={{ width: `${verificationProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Success Step */}
              {attendanceStep === 'success' && (
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle size={48} className="text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-600 mb-2">✅ {t('verified')}</h3>
                  <p className="text-slate-500 text-sm mb-6">{t('attendance_success')}</p>

                  {/* Verification Badges */}
                  <div className="flex justify-center gap-3 mb-6">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full text-emerald-700 border border-emerald-100">
                      <MapPin size={14} />
                      <span className="text-xs font-bold">{t('badge_location_ok')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full text-emerald-700 border border-emerald-100">
                      <ScanFace size={14} />
                      <span className="text-xs font-bold">{t('badge_face_id_ok')}</span>
                    </div>
                  </div>

                  {verificationResult && (
                    <div className="bg-emerald-50/50 rounded-xl p-4 text-left border border-emerald-100 mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-medium text-emerald-800">{t('confidence_score')}</span>
                        <span className="text-sm font-bold text-emerald-700">{verificationResult.confidence}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs font-medium text-emerald-800">{t('in_office_zone')}</span>
                        <span className="text-sm font-bold text-emerald-700">{verificationResult.metrics?.zone_percentage || 100}%</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-medium">
                    <Shield size={14} />
                    <span>{t('verified_by_ai')}</span>
                  </div>
                </div>
              )}

              {/* Spoofing Detected Step */}
              {attendanceStep === 'spoofing' && (
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <AlertTriangle size={48} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-red-600 mb-2">⚠️ {t('suspicious_location')}</h3>
                  <p className="text-slate-500 text-sm mb-6">{t('gps_spoofing_suspected')}</p>

                  {verificationResult && (
                    <div className="bg-red-50/50 rounded-xl p-4 text-left border border-red-100 mb-6">
                      <p className="text-xs font-bold text-red-800 mb-2 uppercase tracking-wide">{t('issues_found')}</p>
                      {verificationResult.spoofing_indicators?.map((indicator: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-red-700 text-xs mb-1 last:mb-0">
                          <span className="mt-0.5">•</span>
                          <span>{indicator}</span>
                        </div>
                      ))}
                      {verificationResult.ai_analysis && (
                        <p className="text-xs text-red-900 mt-3 italic bg-red-100/50 p-2 rounded-lg">
                          AI: {verificationResult.ai_analysis}
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-200"
                  >
                    {t('close')}
                  </button>
                  <p className="text-xs text-slate-400 mt-4">
                    {t('retry_at_office')}
                  </p>
                </div>
              )}

              {/* Error Step */}
              {attendanceStep === 'error' && (
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <AlertTriangle size={48} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-red-600 mb-2">❌ {t('error_exclamation')}</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    {verificationResult?.message || t('location_verification_failed')}
                  </p>

                  {verificationResult?.risk_factors?.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-4 text-left border border-red-100 mb-6">
                      {verificationResult.risk_factors.map((factor: string, idx: number) => (
                        <p key={idx} className="text-xs text-red-700 mb-1 last:mb-0 flex gap-1">
                          <span>•</span> {factor}
                        </p>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors"
                  >
                    {t('close')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Face Enrollment Modal */}
      {showFaceEnrollment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300">
          <div className="w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{t('face_enrollment')}</h3>
              <button
                onClick={() => setShowFaceEnrollment(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto p-6 relative">

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <span className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                  <Mic size={20} />
                </span>
                {t('file_complaint_voice')}
              </h2>
              <button
                onClick={() => { stopListening(); setShowVoiceModal(false); setTranscript(''); setManualComplaint(''); setMicError(''); }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative mb-6">
              <textarea
                value={currentText}
                onChange={(e) => { setManualComplaint(e.target.value); setTranscript(''); }}
                placeholder={t('type_or_speak')}
                className="w-full h-36 p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 placeholder:text-slate-400"
              />
              {!currentText && !isListening && (
                <div className="absolute bottom-4 right-4 pointer-events-none opacity-50">
                  <Mic size={20} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* Enhanced Form Fields */}
            <div className="mb-4">
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wide mb-2">
                Category (Optional)
              </label>
              <div className="relative">
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Auto-detect category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <span className="text-xs">▼</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wide mb-2">
                Location (Optional)
              </label>
              <div className="relative">
                <select
                  value={complaintLocation}
                  onChange={(e) => setComplaintLocation(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select ward/location</option>
                  {wards.map(ward => (
                    <option key={ward} value={ward}>{ward}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <span className="text-xs">▼</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {micError && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-6 flex items-center gap-3">
                <MicOff size={18} className="text-red-500 shrink-0" />
                <span className="text-sm font-medium text-red-700">{micError}</span>
              </div>
            )}

            {/* Mic Button - Centered and Enhanced */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="relative">
                {isListening && (
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></div>
                )}
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 ${!speechSupported ? 'bg-slate-300 cursor-not-allowed' :
                    isListening ? 'bg-red-500 shadow-red-500/30' :
                      'bg-blue-600 shadow-blue-600/30'
                    }`}
                >
                  <Mic size={32} className="text-white" />
                </button>
              </div>
              <p className={`text-sm font-bold ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
                {!speechSupported ? `⚠️ ${t('voice_not_supported')}` : isListening ? t('listening_speak') : t('press_to_speak')}
              </p>
            </div>

            <button
              onClick={() => handleVoiceSubmit(currentText)}
              disabled={processing || !currentText.trim()}
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${processing || !currentText.trim()
                ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0'
                }`}
            >
              {processing ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  {t('sending')}
                </>
              ) : (
                <>
                  <MessageSquare size={24} />
                  {t('send_complaint')}
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeDashboard;
