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
      <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('my_compensation')}</h1>
            <p className="text-gray-600">{t('view_salary_details')}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
              <Building2 size={16} /> {t('tax_documents')}
            </button>
          </div>
        </div>

        {/* Latest Salary Card */}
        {lastPayslip && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">{t('net_pay')} - {lastPayslip.month}</p>
                    <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white break-words" style={{ color: '#ffffff' }}>₹{lastPayslip.netSalary.toLocaleString()}</h2>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10">
                    <DollarSign size={32} className="text-emerald-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{t('earnings')}</p>
                    <p className="text-xl font-semibold" style={{ color: '#ffffff' }}>₹{lastPayslip.basicSalary.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{t('deductions')}</p>
                    <p className="text-xl font-semibold" style={{ color: '#fca5a5' }}>-₹{lastPayslip.deductions.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${lastPayslip.status === 'Paid' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></div>
                    <span className="text-sm font-medium text-slate-300">{t('status')}: {lastPayslip.status}</span>
                  </div>
                  <button
                    onClick={() => generatePayslipPDF(lastPayslip)}
                    className="flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <Download size={16} /> {t('download_slip')}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">{t('salary_structure')}</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{t('basic_pay')}</span>
                      <span className="font-medium">70%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-mcd-blue w-[70%] rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{t('hra_allowances')}</span>
                      <span className="font-medium">20%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 w-[20%] rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{t('pf_tax')}</span>
                      <span className="font-medium">10%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 w-[10%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Calendar size={16} className="text-mcd-blue" />
                  <span>{t('next_payday')}: <span className="font-semibold text-gray-900">{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">{t('payment_history')}</h3>
            <button className="text-sm text-mcd-blue font-medium hover:underline flex items-center gap-1">
              {t('view_all')} <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-600 font-semibold">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[140px]">{t('month_year')}</th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[120px]">{t('earnings')}</th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[120px]">{t('deductions')}</th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[120px]">{t('net_pay')}</th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[120px]">{t('status')}</th>
                  <th className="px-6 py-4 whitespace-nowrap min-w-[90px]">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {myPayslips.map(slip => (
                  <tr key={slip.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-mcd-blue">
                          <FileText size={16} />
                        </div>
                        <span className="font-medium text-gray-900">{slip.month} {slip.year}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">₹{slip.basicSalary.toLocaleString()}</td>
                    <td className="px-6 py-4 text-red-600">-₹{slip.deductions.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">₹{slip.netSalary.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${slip.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${slip.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {slip.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => generatePayslipPDF(slip)}
                        className="text-gray-400 hover:text-mcd-blue transition-colors"
                        title="Download PDF"
                      >
                        <Download size={18} />
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
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500">
      {/* Admin Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-shrink-0">
        {/* Integrity Shield Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <p className="text-indigo-100 text-sm font-medium relative z-10">{t('security_core')}</p>
          <h2 className="text-2xl font-bold mt-1 relative z-10">{t('integrity_shield')}</h2>

          <button
            onClick={handleIntegrityScan}
            disabled={isScanning}
            className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all border border-white/10"
          >
            {isScanning ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            ) : (
              <ShieldCheck size={16} />
            )}
            {isScanning ? t('scanning') : t('run_integrity_scan')}
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <p className="text-gray-600 text-sm font-medium relative z-10">{t('total_disbursed')} (Oct)</p>
          <h2 className="text-3xl font-bold text-gray-900 mt-2 relative z-10">₹{totalProcessed.toLocaleString()}</h2>
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 relative z-10 font-medium">
            <TrendingUp size={14} /> +12% {t('from_last_month')}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <p className="text-gray-600 text-sm font-medium relative z-10">{t('pending_processing')}</p>
          <h2 className="text-3xl font-bold text-gray-900 mt-2 relative z-10">{pendingCount}</h2>
          <p className="text-xs text-orange-600 mt-2 flex items-center gap-1 relative z-10 font-medium">
            <Clock size={14} /> {t('action_required')}
          </p>
        </div>

        <div className="bg-gradient-to-br from-mcd-blue to-blue-700 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">{t('quick_action')}</p>
            <h3 className="text-lg font-bold">{t('payroll_run')}: {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</h3>
          </div>
          <button
            onClick={handleReleaseSalaries}
            disabled={pendingCount === 0 || isReleasing}
            aria-label={pendingCount === 0 ? 'All salaries processed' : 'Release all pending salaries'}
            className={`mt-4 w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${pendingCount === 0
                ? 'bg-white/20 text-white/50 cursor-not-allowed'
                : 'bg-white text-mcd-blue hover:bg-blue-50 shadow-md'
              }`}
          >
            {isReleasing ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
            ) : (
              <DollarSign size={16} />
            )}
            {pendingCount === 0 ? t('all_processed') : isReleasing ? t('processing_ellipsis') : t('release_all_salaries')}
          </button>
        </div>
      </div>

      {/* Integrity Scan Results */}
      {scanResult && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldCheck className={scanResult.anomalies_detected > 0 ? "text-amber-500" : "text-emerald-500"} size={20} />
              <h3 className="font-bold text-gray-800">{t('integrity_scan_report')}</h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${scanResult.anomalies_detected > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
              }`}>
              {scanResult.anomalies_detected > 0 ? t('action_required') : t('secure')}
            </span>
          </div>

          <div className="p-6">
            {scanResult.anomalies_detected === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="text-emerald-600" size={24} />
                </div>
                <h4 className="text-lg font-bold text-gray-900">{t('no_anomalies_detected')}</h4>
                <p className="text-gray-600 text-sm mt-1">{t('all_records_passed')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-amber-900">{t('anomalies_detected')}</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      {t('integrity_engine_flagged').replace('{count}', scanResult.anomalies_detected)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {scanResult.details && scanResult.details.map((anomaly: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                          !
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">Employee ID: {anomaly.employee_id}</div>
                          <div className="text-xs text-gray-500">Anomaly Score: {anomaly.anomaly_score ? anomaly.anomaly_score.toFixed(4) : 'N/A'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-amber-600">{t('flagged_for_review')}</div>
                        <div className="text-xs text-gray-400">{t('ghost_employee_check')}</div>
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{t('employee_payroll_status')}</h3>
            <p className="text-sm text-gray-600">{t('manage_track_salaries')}</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <Download size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-600 font-semibold sticky top-0 z-10 backdrop-blur-sm">
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 bg-gray-50/50 whitespace-nowrap min-w-[220px]">{t('employee')}</th>
                <th className="px-6 py-4 bg-gray-50/50 whitespace-nowrap min-w-[160px]">{t('role')}</th>
                <th className="px-6 py-4 bg-gray-50/50 whitespace-nowrap min-w-[140px]">{t('days_present')}</th>
                <th className="px-6 py-4 bg-gray-50/50 whitespace-nowrap min-w-[140px]">{t('net_pay')}</th>
                <th className="px-6 py-4 bg-gray-50/50 whitespace-nowrap min-w-[140px]">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payslips.map(slip => (
                <tr key={slip.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-mcd-blue flex items-center justify-center text-xs font-bold">
                        {slip.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{slip.userName}</div>
                        <div className="text-xs text-gray-600">ID: MCD-{slip.userId.toString().padStart(4, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {slip.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm align-middle">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(slip.daysPresent / 30) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-700 font-medium">{slip.daysPresent}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800 align-middle">₹{slip.netSalary.toLocaleString()}</td>
                  <td className="px-6 py-4 align-middle">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${slip.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                      {slip.status === 'Paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
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