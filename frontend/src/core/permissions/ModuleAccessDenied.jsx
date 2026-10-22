import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';

/** Shown when a user opens a module page they haven't been granted (e.g. by typing the URL) */
const ModuleAccessDenied = ({ moduleName = 'this module', grantedBy, homePath = '/head/dashboard' }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
          <ShieldOff size={26} className="text-rose-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">No access to {moduleName}</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          This module hasn't been assigned to your account
          {grantedBy ? <> by <span className="font-semibold text-slate-700">{grantedBy}</span></> : null}.
          Ask the administrator above you to grant it if you need it.
        </p>
        <button
          type="button"
          onClick={() => navigate(homePath, { replace: true })}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>
      </div>
    </div>
  );
};

export default ModuleAccessDenied;
