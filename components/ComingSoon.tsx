import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ComingSoonProps {
  title: string;
  description: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title, description }) => {
  const { setCurrentView } = useApp();

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-in fade-in zoom-in duration-500">
      <div className="bg-blue-50 p-5 sm:p-6 rounded-full mb-5 sm:mb-6">
        <Construction size={48} className="text-mcd-blue sm:hidden" />
        <Construction size={64} className="text-mcd-blue hidden sm:block" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 max-w-md mb-8">{description}</p>
      
      <button 
        onClick={() => setCurrentView('dashboard')}
        className="flex items-center gap-2 text-mcd-blue font-semibold hover:underline"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>
    </div>
  );
};

export default ComingSoon;