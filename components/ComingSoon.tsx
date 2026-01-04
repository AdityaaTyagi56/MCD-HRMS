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
    <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in zoom-in duration-500">
      <div className="bg-blue-50 p-6 rounded-full mb-6">
        <Construction size={64} className="text-mcd-blue" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
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