import React, { useRef, useState } from 'react';
import { Database, Download, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

export const BackupSettings = ({ settings = {}, replaceDraftSettings }) => {
  const inputRef = useRef(null);
  const [message, setMessage] = useState(null);
  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `community-settings-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Backup downloaded.' });
  };
  const importBackup = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The file must contain a settings object.');
      replaceDraftSettings?.(parsed);
      setMessage({ type: 'success', text: 'Backup loaded as draft. Save changes to apply it.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not read this settings file.' });
    } finally {
      event.target.value = '';
    }
  };
  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Database size={19} className="text-purple-600" /> Backup & restore</h2><p className="mt-1 text-sm text-slate-500">Download a JSON backup or restore a previous community configuration.</p></div>
      {message && <div role="status" className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{message.text}</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-slate-200 p-5"><h3 className="font-bold text-slate-800">Create a backup</h3><p className="text-sm text-slate-500">Save the current configuration as a portable JSON file.</p><button type="button" onClick={downloadBackup} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white"><Download size={16} /> Download backup</button></section>
        <section className="space-y-3 rounded-2xl border border-slate-200 p-5"><h3 className="font-bold text-slate-800">Restore configuration</h3><p className="text-sm text-slate-500">Load a backup file. Review the draft and use Save Changes to apply it.</p><input ref={inputRef} type="file" accept="application/json,.json" onChange={importBackup} className="hidden" /><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><Upload size={16} /> Choose backup file</button></section>
      </div>
    </div>
  );
};

export default BackupSettings;
