import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  MessageCircle, 
  Send, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  X,
  Phone,
  Bell,
  Calendar,
  IndianRupee,
  AlertTriangle
} from 'lucide-react';
import whatsappService from '../services/whatsapp';

interface WhatsAppPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsAppPanel: React.FC<WhatsAppPanelProps> = ({ isOpen, onClose }) => {
  const { employees } = useApp();
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [messageType, setMessageType] = useState<'custom' | 'attendance' | 'salary' | 'alert'>('custom');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleEmployee = (id: number) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  const getMessagePreview = (): string => {
    const siteUrl = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://mcd-hrms.vercel.app';

    switch (messageType) {
      case 'attendance':
        return `🏢 *MCD HRMS*\n\nनमस्ते [Employee Name], कृपया आज की उपस्थिति दर्ज करें।\nHello [Employee Name], please mark your attendance today.\n\nलिंक / Link: ${siteUrl}`;
      case 'salary':
        return `💰 *MCD HRMS*\n\nनमस्ते [Employee Name], आपका वेतन जमा हो गया है।\nHello [Employee Name], your salary has been credited.\n\nविवरण / Details: ${siteUrl}`;
      case 'alert':
        return `🚨 *MCD HRMS - Alert*\n\nनमस्ते [Employee Name],\n[Your message here]\n\nलिंक / Link: ${siteUrl}`;
      default:
        return customMessage || 'Type your message...';
    }
  };

  const handleSend = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    setSending(true);
    setResult(null);

    const selectedEmps = employees.filter(e => selectedEmployees.includes(e.id));
    let sent = 0;
    let failed = 0;

    for (const emp of selectedEmps) {
      let success = false;
      
      try {
        switch (messageType) {
          case 'attendance':
            const attResult = await whatsappService.sendAttendanceReminder(emp.mobile || '', emp.name);
            success = attResult.success;
            break;
          case 'salary':
            const salResult = await whatsappService.sendSalaryNotification(
              emp.mobile || '', 
              emp.name, 
              emp.salary || 25000, 
              'January 2026'
            );
            success = salResult.success;
            break;
          case 'alert':
          case 'custom':
            const msgResult = await whatsappService.sendMessage({
              to: emp.mobile || '',
              message: customMessage.replace('[Employee Name]', emp.name)
            });
            success = msgResult.success;
            break;
        }
        
        if (success) sent++;
        else failed++;
      } catch (e) {
        failed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setResult({ sent, failed });
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-green-600 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <MessageCircle size={24} />
            <div>
              <h2 className="font-bold text-lg">WhatsApp Notifications</h2>
              <p className="text-green-100 text-sm">Send messages to employees</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left: Employee Selection */}
          <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r flex flex-col max-h-[40vh] md:max-h-none">
            <div className="p-4 border-b bg-gray-50">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              />
              <div className="flex items-center justify-between mt-3">
                <button 
                  onClick={selectAll}
                  className="text-sm text-green-600 font-medium hover:text-green-800"
                >
                  {selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-500">
                  {selectedEmployees.length} selected
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {filteredEmployees.map(emp => (
                <div 
                  key={emp.id}
                  onClick={() => toggleEmployee(emp.id)}
                  className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 mb-2 transition-colors ${
                    selectedEmployees.includes(emp.id) 
                      ? 'bg-green-50 border-2 border-green-500' 
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    selectedEmployees.includes(emp.id) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {emp.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.department}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Phone size={12} />
                    <span>{emp.mobile || 'No phone'}</span>
                  </div>
                  {selectedEmployees.includes(emp.id) && (
                    <CheckCircle size={20} className="text-green-600" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Message Composer */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-3">Message Template</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'attendance', label: 'Attendance Reminder', icon: Calendar, activeClass: 'bg-blue-100 border-blue-500 text-blue-700' },
                  { id: 'salary', label: 'Salary Notification', icon: IndianRupee, activeClass: 'bg-green-100 border-green-500 text-green-700' },
                  { id: 'alert', label: 'Emergency Alert', icon: AlertTriangle, activeClass: 'bg-red-100 border-red-500 text-red-700' },
                  { id: 'custom', label: 'Custom Message', icon: MessageCircle, activeClass: 'bg-purple-100 border-purple-500 text-purple-700' },
                ].map(template => (
                  <button
                    key={template.id}
                    onClick={() => setMessageType(template.id as any)}
                    className={`p-3 rounded-xl text-left flex items-center gap-2 transition-colors border-2 ${
                      messageType === template.id 
                        ? template.activeClass
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <template.icon size={18} />
                    <span className="text-sm font-medium">{template.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-4 flex flex-col">
              {(messageType === 'custom' || messageType === 'alert') && (
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type your message here... Use [Employee Name] for personalization"
                  className="w-full flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-green-500 outline-none mb-4"
                />
              )}

              {/* Preview */}
              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Preview</p>
                <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-green-500">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {getMessagePreview()}
                  </pre>
                </div>
              </div>

              {/* Result */}
              {result && (
                <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${
                  result.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                }`}>
                  {result.failed === 0 ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  <span>
                    Sent: {result.sent} | Failed: {result.failed}
                  </span>
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={sending || selectedEmployees.length === 0}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Send to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-3 flex items-center gap-3 text-gray-700">
          <AlertCircle size={20} />
          <span className="text-sm">
            WhatsApp is sent via the backend (Twilio credentials are server-side). If sending fails, verify your API base/key and server env vars.
          </span>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppPanel;
