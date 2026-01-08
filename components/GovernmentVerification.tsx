import { useState } from 'react';
import { Shield, CheckCircle, XCircle, Loader, CreditCard, FileText, Briefcase, Building } from 'lucide-react';
import {
  verifyAadhaar,
  verifyPAN,
  fetchEPFOBalance,
  fetchESIDetails,
  fetchDigiLockerDocuments,
  maskAadhaar,
  maskPAN,
  maskUAN,
  type AadhaarVerificationResponse,
  type PANVerificationResponse,
  type EPFOBalanceResponse,
  type ESIBalanceResponse,
  type DigiLockerResponse,
} from '../services/government-api';

interface GovVerificationProps {
  employeeId: number;
  employeeName: string;
}

export default function GovernmentVerification({ employeeId, employeeName }: GovVerificationProps) {
  const [activeTab, setActiveTab] = useState<'aadhaar' | 'pan' | 'epfo' | 'esi' | 'digilocker'>('aadhaar');

  // Aadhaar State
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarResult, setAadhaarResult] = useState<AadhaarVerificationResponse | null>(null);

  // PAN State
  const [panNumber, setPanNumber] = useState('');
  const [panLoading, setPanLoading] = useState(false);
  const [panResult, setPanResult] = useState<PANVerificationResponse | null>(null);

  // EPFO State
  const [uanNumber, setUanNumber] = useState('');
  const [epfoLoading, setEpfoLoading] = useState(false);
  const [epfoResult, setEpfoResult] = useState<EPFOBalanceResponse | null>(null);

  // ESI State
  const [ipNumber, setIpNumber] = useState('');
  const [esiLoading, setEsiLoading] = useState(false);
  const [esiResult, setEsiResult] = useState<ESIBalanceResponse | null>(null);

  // DigiLocker State
  const [digilockerLoading, setDigilockerLoading] = useState(false);
  const [digilockerResult, setDigilockerResult] = useState<DigiLockerResponse | null>(null);

  // Aadhaar Verification
  const handleAadhaarVerify = async () => {
    if (!aadhaarNumber || !aadhaarConsent) {
      alert('Please enter Aadhaar number and provide consent');
      return;
    }

    setAadhaarLoading(true);
    try {
      const result = await verifyAadhaar({
        aadhaarNumber,
        employeeId,
        consent: aadhaarConsent,
      });
      setAadhaarResult(result);
    } catch (error) {
      console.error('Aadhaar verification error:', error);
    } finally {
      setAadhaarLoading(false);
    }
  };

  // PAN Verification
  const handlePANVerify = async () => {
    if (!panNumber) {
      alert('Please enter PAN number');
      return;
    }

    setPanLoading(true);
    try {
      const result = await verifyPAN({
        panNumber: panNumber.toUpperCase(),
        employeeId,
        name: employeeName,
      });
      setPanResult(result);
    } catch (error) {
      console.error('PAN verification error:', error);
    } finally {
      setPanLoading(false);
    }
  };

  // EPFO Balance Fetch
  const handleEPFOFetch = async () => {
    if (!uanNumber) {
      alert('Please enter UAN number');
      return;
    }

    setEpfoLoading(true);
    try {
      const result = await fetchEPFOBalance({
        uan: uanNumber,
        employeeId,
      });
      setEpfoResult(result);
    } catch (error) {
      console.error('EPFO fetch error:', error);
    } finally {
      setEpfoLoading(false);
    }
  };

  // ESI Details Fetch
  const handleESIFetch = async () => {
    if (!ipNumber) {
      alert('Please enter IP number');
      return;
    }

    setEsiLoading(true);
    try {
      const result = await fetchESIDetails({
        ipNumber,
        employeeId,
      });
      setEsiResult(result);
    } catch (error) {
      console.error('ESI fetch error:', error);
    } finally {
      setEsiLoading(false);
    }
  };

  // DigiLocker Fetch
  const handleDigiLockerFetch = async () => {
    setDigilockerLoading(true);
    try {
      const result = await fetchDigiLockerDocuments(employeeId);
      setDigilockerResult(result);
    } catch (error) {
      console.error('DigiLocker fetch error:', error);
    } finally {
      setDigilockerLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-indigo-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Government Verification</h2>
          <p className="text-sm text-gray-700">Verify employee credentials with government databases</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveTab('aadhaar')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'aadhaar'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
        >
          <CreditCard className="w-4 h-4 inline mr-2" />
          Aadhaar
        </button>
        <button
          onClick={() => setActiveTab('pan')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'pan'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          PAN
        </button>
        <button
          onClick={() => setActiveTab('epfo')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'epfo'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          <Briefcase className="w-4 h-4 inline mr-2" />
          EPFO
        </button>
        <button
          onClick={() => setActiveTab('esi')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'esi'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          <Building className="w-4 h-4 inline mr-2" />
          ESI
        </button>
        <button
          onClick={() => setActiveTab('digilocker')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'digilocker'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          DigiLocker
        </button>
      </div>

      {/* Aadhaar Tab */}
      {activeTab === 'aadhaar' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Aadhaar Number (12 digits)
            </label>
            <input
              type="text"
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="123456789012"
              maxLength={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="aadhaar-consent"
              checked={aadhaarConsent}
              onChange={(e) => setAadhaarConsent(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="aadhaar-consent" className="text-sm text-gray-800">
              I consent to verify my Aadhaar details with UIDAI for employment verification purposes as per Aadhaar Act, 2016.
            </label>
          </div>

          <button
            onClick={handleAadhaarVerify}
            disabled={aadhaarLoading || !aadhaarNumber || !aadhaarConsent}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {aadhaarLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Verify Aadhaar
              </>
            )}
          </button>

          {aadhaarResult && (
            <div className={`p-4 rounded-lg border-2 ${aadhaarResult.verified
                ? 'bg-green-50 border-green-500'
                : 'bg-red-50 border-red-500'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                {aadhaarResult.verified ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <span className="font-bold text-lg">
                  {aadhaarResult.verified ? 'Verified Successfully' : 'Verification Failed'}
                </span>
              </div>
              {aadhaarResult.verified && (
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {aadhaarResult.name}</p>
                  <p><strong>DOB:</strong> {aadhaarResult.dob}</p>
                  <p><strong>Gender:</strong> {aadhaarResult.gender}</p>
                  <p><strong>Address:</strong> {aadhaarResult.address}</p>
                  <p><strong>Aadhaar:</strong> {maskAadhaar(aadhaarNumber)}</p>
                </div>
              )}
              {aadhaarResult.message && (
                <p className="text-sm mt-2 text-gray-800">{aadhaarResult.message}</p>
              )}
              {aadhaarResult.error && (
                <p className="text-sm mt-2 text-red-700">{aadhaarResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* PAN Tab */}
      {activeTab === 'pan' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              PAN Number (Format: ABCDE1234F)
            </label>
            <input
              type="text"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
              placeholder="ABCDE1234F"
              maxLength={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
            />
          </div>

          <button
            onClick={handlePANVerify}
            disabled={panLoading || !panNumber}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {panLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Verify PAN
              </>
            )}
          </button>

          {panResult && (
            <div className={`p-4 rounded-lg border-2 ${panResult.verified
                ? 'bg-green-50 border-green-500'
                : 'bg-red-50 border-red-500'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                {panResult.verified ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <span className="font-bold text-lg">
                  {panResult.verified ? 'Verified Successfully' : 'Verification Failed'}
                </span>
              </div>
              {panResult.verified && (
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {panResult.name}</p>
                  <p><strong>PAN Status:</strong> {panResult.panStatus}</p>
                  <p><strong>PAN:</strong> {maskPAN(panNumber)}</p>
                </div>
              )}
              {panResult.message && (
                <p className="text-sm mt-2 text-gray-800">{panResult.message}</p>
              )}
              {panResult.error && (
                <p className="text-sm mt-2 text-red-700">{panResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* EPFO Tab */}
      {activeTab === 'epfo' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              UAN (Universal Account Number - 12 digits)
            </label>
            <input
              type="text"
              value={uanNumber}
              onChange={(e) => setUanNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="123456789012"
              maxLength={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleEPFOFetch}
            disabled={epfoLoading || !uanNumber}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {epfoLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Briefcase className="w-5 h-5" />
                Fetch EPF Balance
              </>
            )}
          </button>

          {epfoResult && (
            <div className={`p-4 rounded-lg border-2 ${epfoResult.success
                ? 'bg-green-50 border-green-500'
                : 'bg-red-50 border-red-500'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                {epfoResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <span className="font-bold text-lg">
                  {epfoResult.success ? 'EPF Details' : 'Fetch Failed'}
                </span>
              </div>
              {epfoResult.success && (
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {epfoResult.name}</p>
                  <p><strong>UAN:</strong> {maskUAN(uanNumber)}</p>
                  <p><strong>Balance:</strong> ₹{epfoResult.balance?.toLocaleString('en-IN')}</p>
                  <p><strong>Last Contribution:</strong> {epfoResult.lastContribution}</p>
                </div>
              )}
              {epfoResult.error && (
                <p className="text-sm mt-2 text-red-700">{epfoResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ESI Tab */}
      {activeTab === 'esi' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              IP Number (Insurance Person Number)
            </label>
            <input
              type="text"
              value={ipNumber}
              onChange={(e) => setIpNumber(e.target.value.slice(0, 17))}
              placeholder="1234567890"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleESIFetch}
            disabled={esiLoading || !ipNumber}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {esiLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Building className="w-5 h-5" />
                Fetch ESI Details
              </>
            )}
          </button>

          {esiResult && (
            <div className={`p-4 rounded-lg border-2 ${esiResult.success
                ? 'bg-green-50 border-green-500'
                : 'bg-red-50 border-red-500'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                {esiResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <span className="font-bold text-lg">
                  {esiResult.success ? 'ESI Details' : 'Fetch Failed'}
                </span>
              </div>
              {esiResult.success && (
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {esiResult.name}</p>
                  <p><strong>IP Number:</strong> {esiResult.ipNumber}</p>
                  <p><strong>Dispensary:</strong> {esiResult.dispensary}</p>
                  <p><strong>Valid Upto:</strong> {esiResult.validUpto}</p>
                </div>
              )}
              {esiResult.error && (
                <p className="text-sm mt-2 text-red-700">{esiResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* DigiLocker Tab */}
      {activeTab === 'digilocker' && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>DigiLocker Integration:</strong> Fetch government-issued documents from your DigiLocker account.
            </p>
          </div>

          <button
            onClick={handleDigiLockerFetch}
            disabled={digilockerLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {digilockerLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Fetch DigiLocker Documents
              </>
            )}
          </button>

          {digilockerResult && (
            <div className={`p-4 rounded-lg border-2 ${digilockerResult.success
                ? 'bg-green-50 border-green-500'
                : 'bg-red-50 border-red-500'
              }`}>
              <div className="flex items-center gap-2 mb-3">
                {digilockerResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <span className="font-bold text-lg">
                  {digilockerResult.success ? 'Documents Found' : 'Fetch Failed'}
                </span>
              </div>
              {digilockerResult.success && digilockerResult.documents && (
                <div className="space-y-2">
                  {digilockerResult.documents.map((doc, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                      <p className="font-semibold">{doc.docType}</p>
                      <p className="text-sm text-gray-700">Issuer: {doc.issuer}</p>
                      <p className="text-sm text-gray-700">
                        Size: {(doc.size / 1024).toFixed(2)} KB | Type: {doc.mimeType}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {digilockerResult.error && (
                <p className="text-sm mt-2 text-red-700">{digilockerResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
