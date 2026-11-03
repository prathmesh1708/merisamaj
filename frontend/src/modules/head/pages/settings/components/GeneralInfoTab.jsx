import React from 'react';
import { Building2 } from 'lucide-react';

const fields = [
  ['name', 'Community name', 'text'], ['tagline', 'Tagline', 'text'],
  ['description', 'Description', 'textarea'], ['mission', 'Mission', 'textarea'],
  ['vision', 'Vision', 'textarea'], ['history', 'History', 'textarea'],
  ['establishedYear', 'Established year', 'text'], ['registrationNumber', 'Registration number', 'text'],
  ['city', 'City', 'text'], ['website', 'Website', 'url'], ['email', 'Public email', 'email'],
  ['phone', 'Phone number', 'tel'], ['officeAddress', 'Office address', 'textarea'],
  ['workingHours', 'Working hours', 'text'], ['supportDetails', 'Support details', 'text'],
  ['mapIframe', 'Map embed URL', 'url']
];

export const GeneralInfoTab = ({ settings = {}, updateDraft }) => {
  const general = settings.general || {};
  const control = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100';
  const update = (key, value) => updateDraft?.('general', key, value);

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Building2 size={19} className="text-purple-600" /> Community information</h2>
        <p className="mt-1 text-sm text-slate-500">Update the contact and public profile details shown to members.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map(([key, label, type]) => (
          <label key={key} className={`space-y-1.5 ${type === 'textarea' ? 'md:col-span-2' : ''}`}>
            <span className="text-xs font-bold text-slate-600">{label}</span>
            {type === 'textarea' ? (
              <textarea rows={key === 'description' || key === 'history' ? 3 : 2} value={general[key] || ''} onChange={e => update(key, e.target.value)} className={control} />
            ) : (
              <input type={type} value={general[key] || ''} onChange={e => update(key, e.target.value)} className={control} />
            )}
          </label>
        ))}
      </div>
    </div>
  );
};

export default GeneralInfoTab;
