/**
 * ModuleAccessPicker
 * "Module Access" section for the Local Head / Sub-Head forms (Admin and Head panels).
 * Lists only the modules the account's parent holds — e.g. if the Master Admin gave
 * the Community Head 20 modules, a Local Head under them can get any of those 20.
 *
 * Props:
 *   targetUserId  existing account being edited (loads its current access)
 *   parentId      parent of a new account (Head panel: the logged-in Head)
 *   communityId   Admin panel, new account: parent = that community's Head
 *   onChange      ({ mode: 'inherit' | 'custom', modules, dirty }) on every change
 *
 * Save with saveModuleAccess(userId, selection) after the account itself is saved.
 * The server re-checks everything (modules must be within the parent's modules).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Layers, AlertCircle } from 'lucide-react';
import { axiosPrivate } from '../api/axiosPrivate';
import { modulePermissionApi } from './modulePermissionApi';

const sameSet = (a, b) => a.length === b.length && a.every(k => b.includes(k));

/** Apply the picker's selection to a saved account. No-op when nothing changed. */
export const saveModuleAccess = async (userId, selection) => {
  if (!userId || !selection?.dirty) return null;
  const res = selection.mode === 'inherit'
    ? await modulePermissionApi.inheritAll(userId)
    : await modulePermissionApi.assignModules(userId, selection.modules);
  window.dispatchEvent(new Event('module-access:changed'));
  return res.data;
};

const ModuleAccessPicker = ({ targetUserId, parentId, communityId, onChange }) => {
  const [state, setState] = useState({ loading: true, error: '', catalog: [], available: [], parent: null, initial: null });
  const [mode, setMode] = useState('inherit');
  const [modules, setModules] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const params = targetUserId ? { targetId: targetUserId } : parentId ? { parentId } : communityId ? { communityId } : {};
    setState(s => ({ ...s, loading: true, error: '' }));
    axiosPrivate.get('/permissions/assignable', { params })
      .then(res => {
        if (cancelled) return;
        const { catalog = [], available = [], parent, target } = res.data?.data || {};
        const initialMode = target?.restricted ? 'custom' : 'inherit';
        const initialModules = target?.restricted ? target.assignedModules.filter(k => available.includes(k)) : [...available];
        setState({ loading: false, error: '', catalog, available, parent, initial: { mode: initialMode, modules: initialModules } });
        setMode(initialMode);
        setModules(initialModules);
      })
      .catch(err => {
        if (!cancelled) setState(s => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load modules.' }));
      });
    return () => { cancelled = true; };
  }, [targetUserId, parentId, communityId]);

  const availableModules = useMemo(
    () => state.catalog.filter(m => state.available.includes(m.key)),
    [state.catalog, state.available]
  );

  // Report every change to the form
  useEffect(() => {
    if (!state.initial) return;
    const dirty = mode !== state.initial.mode || (mode === 'custom' && !sameSet(modules, state.initial.modules));
    onChange?.({ mode, modules: mode === 'inherit' ? state.available : modules, dirty });
  }, [mode, modules, state.initial, state.available]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key) => {
    if (mode !== 'custom') return;
    setModules(list => (list.includes(key) ? list.filter(k => k !== key) : [...list, key]));
  };
  const switchMode = (next) => {
    if (next === 'custom' && mode === 'inherit') setModules([...state.available]);
    setMode(next);
  };

  const selectedCount = mode === 'inherit' ? state.available.length : modules.length;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="text-[0.8rem] font-extrabold text-indigo-900 flex items-center gap-1.5">
          <Layers size={15} /> Module Access
        </label>
        {!state.loading && !state.error && (
          <span className="text-[11px] font-bold text-slate-500">
            {selectedCount} / {state.available.length} selected
          </span>
        )}
      </div>

      {state.loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-3"><Loader2 size={14} className="animate-spin" /> Loading modules…</div>
      ) : state.error ? (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 rounded-lg p-2.5"><AlertCircle size={14} /> {state.error}</div>
      ) : (
        <>
          <p className="text-[11px] text-slate-500 mb-2">
            Only modules held by <b className="text-slate-700">{state.parent?.name}</b> ({state.parent?.roleLabel}) can be given.
          </p>

          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {[
              { id: 'inherit', title: 'All their modules', text: 'Follows the parent automatically' },
              { id: 'custom', title: 'Choose modules', text: 'Only the ticked modules' }
            ].map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => switchMode(o.id)}
                className={`text-left rounded-lg border px-2.5 py-2 transition-colors ${mode === o.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <span className="block text-xs font-bold text-slate-900">{o.title}</span>
                <span className="block text-[10px] text-slate-500">{o.text}</span>
              </button>
            ))}
          </div>

          {mode === 'custom' && availableModules.length > 0 && (
            <div className="flex gap-3 mb-1.5 text-[11px] font-bold">
              <button type="button" onClick={() => setModules([...state.available])} className="text-indigo-600 hover:underline">Select all</button>
              <button type="button" onClick={() => setModules([])} className="text-slate-500 hover:underline">Clear</button>
            </div>
          )}

          {availableModules.length === 0 ? (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5">
              {state.parent?.name} has no modules to give yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
              {availableModules.map(m => {
                const checked = mode === 'inherit' || modules.includes(m.key);
                return (
                  <label
                    key={m.key}
                    title={m.description}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold ${mode === 'custom' ? 'cursor-pointer hover:bg-white' : 'cursor-default'} ${checked ? 'text-slate-900' : 'text-slate-500'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={mode !== 'custom'}
                      onChange={() => toggle(m.key)}
                      className="w-3.5 h-3.5 accent-indigo-600"
                    />
                    {m.label}
                  </label>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ModuleAccessPicker;
