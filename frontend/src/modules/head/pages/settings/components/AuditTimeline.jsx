import React from 'react';
import { Clock3, Save } from 'lucide-react';

export const AuditTimeline = ({ settings = {} }) => {
  const entries = [...(settings.auditTimeline || [])].reverse();
  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Clock3 size={19} className="text-purple-600" /> Settings activity</h2><p className="mt-1 text-sm text-slate-500">Recent configuration saves for this community.</p></div>
      {entries.length ? <ol className="relative space-y-3 border-l-2 border-purple-100 pl-5">{entries.map((entry, index) => <li key={entry.id || index} className="relative rounded-xl border border-slate-200 bg-white p-4"><span className="absolute -left-[27px] top-5 flex h-3 w-3 items-center justify-center rounded-full bg-purple-500 ring-4 ring-white" /><div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-bold text-slate-800"><Save size={14} className="text-purple-600" />Settings saved</span><time className="text-xs text-slate-500">{entry.savedAt ? new Date(entry.savedAt).toLocaleString() : 'Date unavailable'}</time></div><p className="mt-1 text-xs text-slate-500">{entry.summary || 'Community settings were updated.'}</p></li>)}</ol> : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No settings changes have been saved yet.</div>}
    </div>
  );
};

export default AuditTimeline;
