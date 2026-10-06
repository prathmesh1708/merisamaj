import React from 'react';

export const ELECTION_ROLES = [
  ['community_head', 'Community Head'],
  ['community_sub_head', 'Sub-Community Head'],
  ['local_head', 'Local Head'],
  ['local_sub_head', 'Sub-Local Head'],
  ['member', 'General Members']
];

// Default values for the structured election fields, merged into each panel's form state.
export const electionFieldDefaults = {
  bannerImage: '',
  resultDate: '',
  isPublished: true,
  allowedRoles: [],
  targetCities: [],
  targetCommunityIds: []
};

const pad = (n) => String(n).padStart(2, '0');
export const toInputDate = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

// Read the structured fields back from a saved election (for the edit form).
export const electionFieldsFromElection = (el) => ({
  bannerImage: el.bannerImage || '',
  resultDate: toInputDate(el.resultDate),
  isPublished: el.isPublished !== false,
  allowedRoles: el.allowedRoles || [],
  targetCities: el.targetCities || [],
  targetCommunityIds: (el.targetCommunityIds || []).map(c => c._id || c)
});

const toggle = (list, value) => (list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

/**
 * Who can vote, where, when the result is declared, and whether it is published.
 * Roles/locations chosen here take priority over the older audience dropdown.
 * `lockedCity` pins a Local Head to their own location.
 */
export default function ElectionEligibilityFields({ formData, setFormData, cities = [], communities = [], lockedCity = '' }) {
  const set = (patch) => setFormData({ ...formData, ...patch });
  const chip = (on) => `px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`;
  const label = 'text-[10px] font-bold text-slate-500 uppercase tracking-wider';
  const input = 'w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-800 font-semibold';

  return (
    <div className="space-y-4">
      <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-100 pb-1">
        Voters, locations &amp; result
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={label}>Result declaration date &amp; time</label>
          <input type="datetime-local" value={formData.resultDate || ''} onChange={(e) => set({ resultDate: e.target.value })} className={input} />
          <p className="text-[10px] text-slate-400 font-semibold">Leave empty to show the result as soon as voting ends.</p>
        </div>
        <div className="space-y-1">
          <label className={label}>Banner image URL</label>
          <input type="url" placeholder="https://..." value={formData.bannerImage || ''} onChange={(e) => set({ bannerImage: e.target.value })} className={input} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={label}>Who can vote (select one or more; none = everyone)</label>
        <div className="flex flex-wrap gap-2">
          {ELECTION_ROLES.map(([key, name]) => (
            <button type="button" key={key} onClick={() => set({ allowedRoles: toggle(formData.allowedRoles || [], key) })} className={chip((formData.allowedRoles || []).includes(key))}>{name}</button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={label}>Locations (none = all locations)</label>
        {lockedCity ? (
          <p className="text-xs font-bold text-slate-700">Limited to your location: {lockedCity}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cities.length === 0 && <span className="text-[11px] text-slate-400">No locations available.</span>}
            {cities.map(city => (
              <button type="button" key={city} onClick={() => set({ targetCities: toggle(formData.targetCities || [], city) })} className={chip((formData.targetCities || []).includes(city))}>{city}</button>
            ))}
          </div>
        )}
      </div>

      {communities.length > 0 && (
        <div className="space-y-1.5">
          <label className={label}>Communities (none = the community selected above / all)</label>
          <div className="flex flex-wrap gap-2">
            {communities.map(c => (
              <button type="button" key={c._id} onClick={() => set({ targetCommunityIds: toggle(formData.targetCommunityIds || [], c._id) })} className={chip((formData.targetCommunityIds || []).includes(c._id))}>{c.name}</button>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
        <input type="checkbox" checked={formData.isPublished !== false} onChange={(e) => set({ isPublished: e.target.checked })} />
        Publish now (eligible users are notified and the election appears in their Voting section)
      </label>
      <p className="text-[10px] text-slate-400 font-semibold -mt-2">Roles and locations chosen here take priority over the audience option below.</p>
    </div>
  );
}
