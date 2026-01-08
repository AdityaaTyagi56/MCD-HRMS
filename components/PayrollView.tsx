import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DollarSign, Download, CheckCircle, Clock, Check, AlertCircle, TrendingUp, Building2, Calendar, FileText, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Payslip } from '../types';

const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';

const PayrollView: React.FC = () => {
  const { currentRole, payslips, releaseAllSalaries, employees, t } = useApp();
  const currentUserId = 1; // Mock Ramesh
  const [isReleasing, setIsReleasing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleIntegrityScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const response = await fetch(`${ML_API_URL}/integrity/payroll-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: employees.map(e => ({
            id: e.id,
            name: e.name,
            bank_account: `MOCK_BANK_${e.id}`, // In real app, this would be real data
            mobile_number: `MOCK_MOBILE_${e.id}`,
            department: e.department,
            role: e.role,
            salary: 50000 // Mock salary
          }))
        })
      });
      const data = await response.json();
      setScanResult(data);
    } catch (e) {
      console.warn("ML Service unavailable - Integrity scan skipped", e);
      // Silently fail - ML service is optional
      setScanResult({ status: 'unavailable', message: 'ML Service offline - feature unavailable' });
    } finally {
      setIsScanning(false);
    }
  };

  const generatePayslipPDF = (slip: Payslip) => {
    const doc = new jsPDF();

    // -- Header Background --
    doc.setFillColor(30, 58, 138); // mcd-blue
    doc.rect(0, 0, 210, 40, 'F');

    // -- Header Text --
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("MUNICIPAL CORPORATION OF DELHI", 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Employee Payslip - Confidential", 105, 30, { align: 'center' });

    // -- Employee Details --
    doc.setTextColor(0, 0, 0);

    let y = 60;
    const leftCol = 20;
    const rightCol = 120;
    const lineHeight = 10;

    doc.setFontSize(12);
    doc.text(`Employee Name:`, leftCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${slip.userName}`, leftCol + 40, y);

    doc.setFont("helvetica", "normal");
    doc.text(`Pay Period:`, rightCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${slip.month} ${slip.year}`, rightCol + 30, y);

    y += lineHeight;

    doc.setFont("helvetica", "normal");
    doc.text(`Employee ID:`, leftCol, y);
    doc.text(`MCD-${slip.userId.toString().padStart(4, '0')}`, leftCol + 40, y);

    doc.text(`Role:`, rightCol, y);
    doc.text(`${slip.role}`, rightCol + 30, y);

    y += lineHeight;

    doc.text(`Status:`, rightCol, y);
    if (slip.status === 'Paid') {
      doc.setTextColor(0, 128, 0);
    } else {
      doc.setTextColor(200, 100, 0);
    }
    doc.text(`${slip.status.toUpperCase()}`, rightCol + 30, y);
    doc.setTextColor(0, 0, 0);

    y += 15;

    // -- Table Header --
    doc.setFillColor(243, 244, 246); // gray-100
    doc.rect(15, y - 6, 180, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("Earnings / Deductions", 20, y);
    doc.text("Amount (INR)", 160, y);

    y += 15;

    // -- Table Content --
    doc.setFont("helvetica", "normal");

    // Basic Salary
    doc.text("Basic Salary", 20, y);
    doc.text(`${slip.basicSalary.toLocaleString()}.00`, 160, y);
    y += lineHeight;

    // Days Present
    doc.text(`Days Present (${slip.daysPresent}/30)`, 20, y);
    doc.text("-", 160, y);
    y += lineHeight;

    // Deductions
    doc.text("Deductions (Tax & PF)", 20, y);
    doc.setTextColor(220, 38, 38); // Red
    doc.text(`-${slip.deductions.toLocaleString()}.00`, 160, y);
    doc.setTextColor(0, 0, 0);
    y += lineHeight;

    // Divider
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 10;

    // -- Net Pay --
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Net Payable", 20, y);
    doc.text(`Rs. ${slip.netSalary.toLocaleString()}.00`, 160, y);

    // -- Footer --
    y = 260;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    doc.text("This is a system generated payslip. No signature required.", 105, y, { align: 'center' });
    doc.text("Municipal Corporation of Delhi | Civic Centre, Minto Road, New Delhi", 105, y + 5, { align: 'center' });

    // Save
    doc.save(`MCD_Payslip_${slip.userName.replace(' ', '_')}_${slip.month}_${slip.year}.pdf`);
  };

  const handleReleaseSalaries = async () => {
    if (confirm("Are you sure you want to release all pending salaries?")) {
      setIsReleasing(true);
      try {
        // Simulate network delay for effect
        await new Promise(resolve => setTimeout(resolve, 1500));
        await releaseAllSalaries();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to release salaries';
        alert(message);
      } finally {
        setIsReleasing(false);
      }
    }
  };

  if (currentRole === 'employee') {
    const myPayslips = payslips.filter(p => p.userId === currentUserId);
    const lastPayslip = myPayslips[0]; // Logic assumes index 0 is latest for this mock

    return (
      <div className="space-y-8 max-w-6xl mx-auto animate-enter">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('my_compensation')}</h1>
            <p className="text-slate-500 font-medium mt-1">{t('view_salary_details')}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 hover:shadow-md hover:-translate-y-0.5">
              <Building2 size={18} className="text-slate-400 group-hover:text-primary-600 transition-colors" />
              {t('tax_documents')}
            </button>
          </div>
        </div>

        {/* Latest Salary Card */}
        {lastPayslip && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden group border border-slate-700/50">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 bg-slate-800/50 inline-block px-3 py-1 rounded-lg border border-slate-700/50">{t('net_pay')} - {lastPayslip.month}</p>
                    <h2 className="text-5xl sm:text-6xl font-bold tracking-tight text-white mt-1">₹{lastPayslip.netSalary.toLocaleString()}</h2>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                    <DollarSign size={36} className="text-emerald-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 mb-10">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-400" />
                      {t('earnings')}
                    </p>
                    <p className="text-2xl font-bold text-white tracking-tight">₹{lastPayslip.basicSalary.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-400" />
                      {t('deductions')}
                    </p>
                    <p className="text-2xl font-bold text-rose-300 tracking-tight">-₹{lastPayslip.deductions.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-full border border-white/5">
                    <div className={`w-2.5 h-2.5 rounded-full ${lastPayslip.status === 'Paid' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-amber-400'} animate-pulse`}></div>
                    <span className="text-sm font-bold text-slate-200 tracking-wide">{lastPayslip.status.toUpperCase()}</span>
                  </div>
                  <button
                    onClick={() => generatePayslipPDF(lastPayslip)}
                    className="flex items-center gap-2 bg-white text-slate-950 px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-lg active:shadow-sm"
                  >
                    <Download size={18} /> {t('download_slip')}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="glass-card bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                  {t('salary_structure')}
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-slate-600">{t('basic_pay')}</span>
                      <span className="text-slate-900 font-bold">70%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 w-[70%] rounded-full shadow-[0_2px_10px_rgba(37,99,235,0.3)]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-slate-600">{t('hra_allowances')}</span>
                      <span className="text-slate-900 font-bold">20%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 w-[20%] rounded-full shadow-[0_2px_10px_rgba(139,92,246,0.3)]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-slate-600">{t('pf_tax')}</span>
                      <span className="text-slate-900 font-bold">10%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 w-[10%] rounded-full shadow-[0_2px_10px_rgba(244,63,94,0.3)]"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 text-sm bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">{t('next_payday')}</p>
                    <p className="font-bold text-slate-900 text-base">{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="glass-card bg-white rounded-3xl border border-slate-200/60 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-slate-400" size={20} />
              {t('payment_history')}
            </h3>
            <button className="text-sm text-primary-600 font-bold hover:text-primary-700 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary-50">
              {t('view_all')} <ArrowRight size={16} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">{t('month_year')}</th>
                  <th className="px-6 py-4 whitespace-nowrap">{t('earnings')}</th>
                  <th className="px-6 py-4 whitespace-nowrap">{t('deductions')}</th>
                  <th className="px-6 py-4 whitespace-nowrap">{t('net_pay')}</th>
                  <th className="px-6 py-4 whitespace-nowrap">{t('status')}</th>
                  <th className="px-6 py-4 whitespace-nowrap text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myPayslips.map(slip => (
                  <tr key={slip.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold shadow-sm border border-blue-100">
                          {slip.month.substring(0, 3)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{slip.year}</p>
                          <p className="text-xs text-slate-500 font-medium">Monthly Salary</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">+₹{slip.basicSalary.toLocaleString()}</td>
                    <td className="px-6 py-4 text-rose-600 font-medium">-₹{slip.deductions.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-lg">₹{slip.netSalary.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${slip.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm'
                        : 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${slip.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {slip.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => generatePayslipPDF(slip)}
                        className="text-slate-400 hover:text-primary-600 hover:bg-primary-50 p-2 rounded-lg transition-all"
                        title="Download PDF"
                      >
                        <Download size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Admin View
  const totalProcessed = payslips.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + curr.netSalary, 0);
  const pendingCount = payslips.filter(p => p.status === 'Pending').length;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)] animate-enter">
      {/* Admin Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-shrink-0">
        {/* Integrity Shield Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/20 transition-all"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={20} className="text-indigo-200" />
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">{t('security_core')}</p>
            </div>
            <h2 className="text-2xl font-bold mb-6 tracking-tight">{t('integrity_shield')}</h2>

            <button
              onClick={handleIntegrityScan}
              disabled={isScanning}
              className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border border-white/10 shadow-lg active:scale-95"
            >
              {isScanning ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              ) : (
                <ShieldCheck size={18} />
              )}
              {isScanning ? t('scanning') : t('run_integrity_scan')}
            </button>
          </div>
        </div>

        <div className="glass-card bg-white p-6 rounded-3xl border border-slate-200/60 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{t('total_disbursed')} (Oct)</p>
            <h2 className="text-4xl font-bold text-slate-800 tracking-tight">₹{totalProcessed.toLocaleString()}</h2>
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-bold bg-emerald-50 inline-block px-2 py-1 rounded-lg">
              <TrendingUp size={14} /> +12% {t('from_last_month')}
            </p>
          </div>
        </div>

        <div className="glass-card bg-white p-6 rounded-3xl border border-slate-200/60 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{t('pending_processing')}</p>
            <h2 className="text-4xl font-bold text-slate-800 tracking-tight">{pendingCount}</h2>
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1 font-bold bg-amber-50 inline-block px-2 py-1 rounded-lg">
              <Clock size={14} /> {t('action_required')}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-white/20 transition-all"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-blue-500/30 rounded">
                <DollarSign size={14} className="text-blue-100" />
              </div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">{t('quick_action')}</p>
            </div>
            <h3 className="text-lg font-bold mb-4">{t('payroll_run')}: {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</h3>
          </div>
          <button
            onClick={handleReleaseSalaries}
            disabled={pendingCount === 0 || isReleasing}
            aria-label={pendingCount === 0 ? 'All salaries processed' : 'Release all pending salaries'}
            className={`relative z-10 mt-auto w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${pendingCount === 0
              ? 'bg-white/10 text-white/50 cursor-not-allowed border border-white/5'
              : 'bg-white text-blue-700 hover:bg-blue-50 border border-transparent'
              }`}
          >
            {isReleasing ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
            ) : (
              <DollarSign size={18} />
            )}
            {pendingCount === 0 ? t('all_processed') : isReleasing ? t('processing_ellipsis') : t('release_all_salaries')}
          </button>
        </div>
      </div>

      {/* Integrity Scan Results */}
      {scanResult && (
        <div className="glass-card bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden animate-slide-up">
          <div className={`p-5 border-b flex justify-between items-center ${scanResult.anomalies_detected > 0 ? 'bg-amber-50/50 border-amber-100' : 'bg-emerald-50/50 border-emerald-100'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${scanResult.anomalies_detected > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{t('integrity_scan_report')}</h3>
                <p className="text-xs font-medium opacity-70">AI-Powered Verification</p>
              </div>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm border ${scanResult.anomalies_detected > 0
              ? "bg-amber-100 text-amber-700 border-amber-200"
              : "bg-emerald-100 text-emerald-700 border-emerald-200"
              }`}>
              {scanResult.anomalies_detected > 0 ? t('action_required') : t('secure')}
            </span>
          </div>

          <div className="p-6">
            {scanResult.anomalies_detected === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 shadow-sm border border-emerald-100">
                  <CheckCircle className="text-emerald-500" size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-800">{t('no_anomalies_detected')}</h4>
                <p className="text-slate-500 text-sm mt-2 max-w-md">{t('all_records_passed')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-5 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
                  <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                    <AlertTriangle className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-lg">{t('anomalies_detected')}</h4>
                    <p className="text-sm text-amber-800 mt-1 font-medium">
                      {t('integrity_engine_flagged').replace('{count}', scanResult.anomalies_detected)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {scanResult.details && scanResult.details.map((anomaly: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-300 transition-all hover:shadow-md group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold border border-amber-200">
                          !
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">Employee ID: {anomaly.employee_id}</div>
                          <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">Anomaly Score: {anomaly.anomaly_score ? anomaly.anomaly_score.toFixed(4) : 'N/A'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-amber-600">{t('flagged_for_review')}</div>
                        <div className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors">{t('ghost_employee_check')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee List Table */}
      <div className="glass-card bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden flex flex-col flex-1">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{t('employee_payroll_status')}</h3>
            <p className="text-sm text-slate-500 mt-1">{t('manage_track_salaries')}</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 shadow-sm">
              <Download size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-bold sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 min-w-[220px]">{t('employee')}</th>
                <th className="px-6 py-4 min-w-[160px]">{t('role')}</th>
                <th className="px-6 py-4 min-w-[140px]">{t('days_present')}</th>
                <th className="px-6 py-4 min-w-[140px]">{t('net_pay')}</th>
                <th className="px-6 py-4 min-w-[140px]">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payslips.map(slip => (
                <tr key={slip.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
                        {slip.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{slip.userName}</div>
                        <div className="text-xs text-slate-500 font-medium">ID: MCD-{slip.userId.toString().padStart(4, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 capitalize">
                      {slip.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(slip.daysPresent / 30) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-700 font-bold">{slip.daysPresent}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800 align-middle">₹{slip.netSalary.toLocaleString()}</td>
                  <td className="px-6 py-4 align-middle">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${slip.status === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm'
                      : 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm'
                      }`}>
                      {slip.status === 'Paid' ? <CheckCircle size={14} /> : <Clock size={14} />}
                      {slip.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollView;