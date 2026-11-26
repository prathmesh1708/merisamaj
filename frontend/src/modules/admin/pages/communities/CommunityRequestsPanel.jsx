import { useEffect, useState } from 'react';
import { Inbox, ChevronDown, ChevronUp, Plus, GitMerge, X, Loader2, MapPin, Phone } from 'lucide-react';
import { getCommunityRequests, resolveCommunityRequest } from '../../services/communityService';

/**
 * "Requested communities": names members typed under "Other" at registration that
 * aren't on the platform. Members never create communities; the admin creates one
 * from here (requesters are moved in), adds the requesters to an existing community,
 * or dismisses the request (requesters choose another community).
 */
const CommunityRequestsPanel = ({ communities = [], onChanged }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [mergeTarget, setMergeTarget] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getCommunityRequests('pending')
      .then(res => { if (!cancelled) setRequests(res.data || []); })
      .catch(() => { if (!cancelled) setRequests([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const act = async (request, action) => {
    let body = { action };
    const isSub = request.kind === 'subCommunity';
    const parentName = request.parentCommunityId?.name || 'the community';
    if (action === 'create') {
      const name = window.prompt(isSub
        ? `Name of the new sub-community in ${parentName} (you can correct the spelling):`
        : 'Name of the new community (you can correct the spelling):', request.name);
      if (name === null) return;
      if (!name.trim()) return;
      body.name = name.trim();
      if (!isSub) {
        // Sub-communities created with it: what the requesters typed, editable
        const typedSubs = [...new Set((request.requesters || []).map(q => (q.subCommunity || '').trim()).filter(Boolean))];
        const subs = window.prompt(
          `Sub-communities to create in "${body.name}" (separate with commas). Leave empty for none — you can add them later.`,
          typedSubs.join(', ')
        );
        if (subs === null) return;
        body.subCommunities = subs.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (action === 'merge' && isSub) {
      const subName = mergeTarget[request._id];
      if (!subName) { window.alert('Choose the sub-community to add them to.'); return; }
      if (!window.confirm(`Add ${request.requesterCount} member(s) who asked for "${request.name}" to "${subName}" in ${parentName}?`)) return;
      body.subCommunityName = subName;
    } else if (action === 'merge') {
      const communityId = mergeTarget[request._id];
      const target = communities.find(c => c._id === communityId);
      if (!target) { window.alert('Choose the community to add them to.'); return; }
      if (!window.confirm(`Add ${request.requesterCount} member(s) who asked for "${request.name}" to "${target.name}"?`)) return;
      body.communityId = communityId;
    } else {
      const note = window.prompt(`Dismiss "${request.name}"? The ${request.requesterCount} member(s) will be asked to choose another ${isSub ? 'sub-community' : 'community'}.\n\nOptional message for them:`, '');
      if (note === null) return;
      body.note = note;
    }
    setBusyId(request._id);
    try {
      const res = await resolveCommunityRequest(request._id, body);
      window.alert(res.message || 'Done.');
      setReloadKey(k => k + 1);
      window.dispatchEvent(new Event('community-requests:changed')); // sidebar badge
      if (action !== 'dismiss') onChanged?.();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not complete this.');
    } finally {
      setBusyId('');
    }
  };

  if (loading || requests.length === 0) return null;

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Inbox size={18} className="text-amber-600" />
        <h3 className="text-sm font-black text-amber-900">Requested communities &amp; sub-communities ({requests.length})</h3>
      </div>
      <p className="text-xs font-semibold text-amber-800/80 mb-3">
        Members chose "Other" and typed these, which are not on ApniSamaj yet. They are waiting for you.
      </p>

      <div className="space-y-2.5">
        {requests.map(r => {
          const open = openId === r._id;
          const busy = busyId === r._id;
          return (
            <div key={r._id} className="rounded-xl bg-white border border-amber-100 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 p-3">
                <button type="button" onClick={() => setOpenId(open ? '' : r._id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                  {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                  <span className="font-black text-slate-800 truncate">{r.name}</span>
                  {r.kind === 'subCommunity' && (
                    <span className="text-[11px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md shrink-0">
                      Sub-community of {r.parentCommunityId?.name || '—'}
                    </span>
                  )}
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md shrink-0">
                    {r.requesterCount} {r.requesterCount === 1 ? 'person' : 'people'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">since {new Date(r.createdAt).toLocaleDateString()}</span>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button disabled={busy} onClick={() => act(r, 'create')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} {r.kind === 'subCommunity' ? 'Create sub-community' : 'Create community'}
                  </button>
                  <select value={mergeTarget[r._id] || ''} onChange={e => setMergeTarget(m => ({ ...m, [r._id]: e.target.value }))}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 max-w-[160px]">
                    <option value="">Add to existing…</option>
                    {r.kind === 'subCommunity'
                      ? (r.parentCommunityId?.subCommunities || []).filter(sc => sc.isActive !== false && sc.name).map(sc => <option key={sc.name} value={sc.name}>{sc.name}</option>)
                      : communities.filter(c => c.isActive !== false).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <button disabled={busy || !mergeTarget[r._id]} onClick={() => act(r, 'merge')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-black text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40">
                    <GitMerge size={13} /> Add
                  </button>
                  <button disabled={busy} onClick={() => act(r, 'dismiss')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                    <X size={13} /> Dismiss
                  </button>
                </div>
              </div>

              {open && (
                <div className="border-t border-slate-100 px-3 py-2.5 space-y-1.5">
                  {r.requesters.map(q => (
                    <div key={q.userId._id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      <span className="font-bold text-slate-800">{q.userId.name || 'New member'}</span>
                      {q.userId.phone && <span className="text-slate-500 flex items-center gap-1"><Phone size={11} />{q.userId.phone}</span>}
                      {(q.city || q.userId.city) && <span className="text-slate-500 flex items-center gap-1"><MapPin size={11} />{[q.city || q.userId.city, q.state || q.userId.state].filter(Boolean).join(', ')}</span>}
                      {q.typedName && q.typedName !== r.name && <span className="text-slate-400">typed "{q.typedName}"</span>}
                      {r.kind !== 'subCommunity' && q.subCommunity && (
                        <span className="text-purple-700 font-bold">sub-community: {q.subCommunity}</span>
                      )}
                      <span className="text-slate-400">{new Date(q.at).toLocaleDateString()}</span>
                      {r.kind !== 'subCommunity' && q.userId.communityId && <span className="text-emerald-600 font-bold">already joined another community</span>}
                      {r.kind === 'subCommunity' && q.userId.subCommunity && <span className="text-emerald-600 font-bold">already chose {q.userId.subCommunity}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommunityRequestsPanel;
