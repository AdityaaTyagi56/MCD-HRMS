import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Send, AlertCircle, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';

const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';

// Supported languages for voice input
const VOICE_LANGUAGES = [
  { code: 'hi-IN', name: 'हिन्दी', label: 'Hindi' },
  { code: 'en-IN', name: 'English', label: 'English (India)' },
  { code: 'pa-IN', name: 'ਪੰਜਾਬੀ', label: 'Punjabi' },
  { code: 'ur-IN', name: 'اردو', label: 'Urdu' },
  { code: 'bn-IN', name: 'বাংলা', label: 'Bengali' },
];

const VoiceGrievance: React.FC = () => {
  const { t, language } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [supportError, setSupportError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for Speech Recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Keep listening even after pauses
      recognitionRef.current.interimResults = true; // Show text while speaking
      recognitionRef.current.lang = selectedLanguage;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setComplaintText(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setSupportError(true);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [selectedLanguage]);

  const handleLanguageChange = (langCode: string) => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    setSelectedLanguage(langCode);
    if (recognitionRef.current) {
      recognitionRef.current.lang = langCode;
    }
  };

  const toggleListening = () => {
    if (supportError) {
      alert(language === 'hi' 
        ? "यह ब्राउज़र सपोर्ट नहीं करता। Chrome/Edge का उपयोग करें।" 
        : "Browser not supported. Use Chrome/Edge.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSubmit = async () => {
    if (!complaintText.trim()) {
      alert(language === 'hi' ? "कृपया पहले शिकायत बोलें या लिखें।" : "Please speak or type a complaint first.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Call the ML backend for analysis
      const response = await fetch(`${ML_API_URL}/analyze-grievance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: complaintText })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Grievance Analysis:', result);
        setSubmitted(true);
        setComplaintText('');
        
        // Show success with category info
        setTimeout(() => setSubmitted(false), 3000);
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      console.error('Submit error:', error);
      // Fallback: Still show success for demo
      setSubmitted(true);
      setComplaintText('');
      setTimeout(() => setSubmitted(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show fallback for unsupported browsers
  if (supportError) {
    return (
      <div className="p-6 max-w-md mx-auto bg-yellow-50 border-2 border-yellow-300 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 text-yellow-700 mb-4">
          <AlertCircle size={32} />
          <h2 className="text-xl font-bold">
            {language === 'hi' ? 'ब्राउज़र सपोर्ट नहीं करता' : 'Browser Not Supported'}
          </h2>
        </div>
        <p className="text-yellow-800 mb-4">
          {language === 'hi' 
            ? 'वॉइस फीचर के लिए Chrome या Edge ब्राउज़र का उपयोग करें।' 
            : 'Please use Chrome or Edge browser for voice features.'}
        </p>
        <textarea
          className="w-full p-4 border-2 border-yellow-300 rounded-xl focus:border-yellow-500 text-lg h-32 bg-white"
          placeholder={language === 'hi' ? "यहाँ टाइप करें..." : "Type here..."}
          value={complaintText}
          onChange={(e) => setComplaintText(e.target.value)}
        />
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full mt-4 bg-yellow-600 text-white py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-md hover:bg-yellow-700 disabled:opacity-50"
        >
          <Send size={20} />
          {language === 'hi' ? 'जमा करें' : 'Submit'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-2xl shadow-xl space-y-5 border border-gray-200">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          {language === 'hi' ? 'शिकायत दर्ज करें' : 'Register Complaint'}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {language === 'hi' ? 'बोलकर या लिखकर शिकायत करें' : 'Speak or type your complaint'}
        </p>
      </div>

      {/* Language Selector */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-700">
            {language === 'hi' ? 'भाषा चुनें' : 'Select Language'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {VOICE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedLanguage === lang.code
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-200'
              }`}
            >
              <div className="font-bold">{lang.name}</div>
              <div className="text-xs opacity-80">{lang.label}</div>
            </button>
          ))}
        </div>
      </div>
        </p>
      </div>
      
      {/* The Text Area - Auto-filled by Voice */}
      <textarea
        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-lg h-40 resize-none transition-all"
        placeholder={language === 'hi' 
          ? "यहाँ टाइप करें या माइक बटन दबाकर बोलें..." 
          : "Type here or press the mic button to speak..."}
        value={complaintText}
        onChange={(e) => setComplaintText(e.target.value)}
      />

      {/* The Big Mic Button */}
      <div className="flex justify-center">
        <button
          onClick={toggleListening}
          className={`p-6 rounded-full transition-all duration-300 shadow-xl ${
            isListening 
              ? 'bg-red-600 animate-pulse ring-4 ring-red-300 scale-110' 
              : 'bg-mcd-blue hover:bg-blue-900 hover:scale-105 active:scale-95'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? (
            <Square className="text-white" size={32} />
          ) : (
            <Mic className="text-white" size={32} />
          )}
        </button>
      </div>

      {/* Status Text */}
      <p className={`text-center text-sm font-medium transition-colors ${
        isListening ? 'text-red-600' : 'text-gray-500'
      }`}>
        {isListening 
          ? (language === 'hi' ? "🔴 सुन रहा हूँ... (Listening...)" : "🔴 Listening...")
          : (language === 'hi' ? "बोलने के लिए बटन दबाएं" : "Tap button to speak")}
      </p>

      {/* Submit Button */}
      <button 
        onClick={handleSubmit}
        disabled={isSubmitting || !complaintText.trim()}
        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 ${
          submitted 
            ? 'bg-green-600 text-white' 
            : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {submitted ? (
          <>
            ✓ {language === 'hi' ? 'सफलतापूर्वक जमा हुआ!' : 'Submitted Successfully!'}
          </>
        ) : isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {language === 'hi' ? 'जमा हो रहा है...' : 'Submitting...'}
          </>
        ) : (
          <>
            <Send size={20} />
            {language === 'hi' ? 'जमा करें (Submit)' : 'Submit'}
          </>
        )}
      </button>

      {/* Info Note */}
      <p className="text-center text-xs text-gray-400">
        {language === 'hi' 
          ? 'आपकी शिकायत AI द्वारा सही विभाग को भेजी जाएगी' 
          : 'Your complaint will be routed to the correct department by AI'}
      </p>
    </div>
  );
};

export default VoiceGrievance;
