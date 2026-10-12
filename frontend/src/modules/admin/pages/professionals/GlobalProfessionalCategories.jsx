import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, RefreshCw, Edit3, Trash2, CheckCircle, 
  XCircle, Award, HelpCircle, X, Check, Grid, Settings
} from 'lucide-react';
import { professionalService } from '../../../../core/api/professionalService';
import {
  LucideIconByName, isLucideIconName, toLucideKebab, toLucidePascal, lucideIconNames
} from '../../../../core/components/LucideIconByName';

// Ready-made choices; the admin can add any other Lucide icon with the + button
const PRESET_ICONS = [
  { value: 'GraduationCap', label: 'GraduationCap (Education)' },
  { value: 'Heart', label: 'Heart (Health / Diagnostics)' },
  { value: 'Hammer', label: 'Hammer (Construction / Build)' },
  { value: 'Building', label: 'Building (Manufacturing / Industries)' },
  { value: 'Briefcase', label: 'Briefcase (Business / Consult)' },
  { value: 'MoreHorizontal', label: 'MoreHorizontal (Others)' },
];

export default function GlobalProfessionalCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    icon: 'Briefcase',
    isActive: true
  });

  // "+" custom Lucide icon picker
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState('');
  const [customIcons, setCustomIcons] = useState([]); // added this session (PascalCase)

  // Icons in the dropdown: presets + any icon already used by a category + newly added ones
  const iconOptions = [
    ...PRESET_ICONS,
    ...Array.from(new Set([...categories.map(c => c.icon), ...customIcons, form.icon]))
      .filter(icon => icon && !PRESET_ICONS.some(p => p.value === icon))
      .map(icon => ({ value: icon, label: `${icon} (custom)` }))
  ];

  const iconQueryKebab = toLucideKebab(iconQuery);
  const iconSuggestions = iconQueryKebab
    ? lucideIconNames.filter(n => n.includes(iconQueryKebab)).slice(0, 30)
    : [];

  const addCustomIcon = (name) => {
    if (!isLucideIconName(name)) {
      triggerToast(`"${name}" is not a Lucide icon. Check the name on lucide.dev/icons.`, 'error');
      return;
    }
    const pascal = toLucidePascal(name);
    setCustomIcons(prev => (prev.includes(pascal) ? prev : [...prev, pascal]));
    setForm(f => ({ ...f, icon: pascal }));
    setIconPickerOpen(false);
    setIconQuery('');
  };

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await professionalService.adminGetCategories();
      if (res.success) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch categories list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setForm({ name: '', icon: 'Briefcase', isActive: true });
    setIconPickerOpen(false);
    setIconQuery('');
    setEditMode(false);
    setSelectedId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setForm({ name: cat.name, icon: cat.icon || 'Briefcase', isActive: cat.isActive });
    setIconPickerOpen(false);
    setIconQuery('');
    setEditMode(true);
    setSelectedId(cat._id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      triggerToast('Category Name is required.', 'error');
      return;
    }
    try {
      if (editMode) {
        const res = await professionalService.adminUpdateCategory(selectedId, form);
        if (res.success) {
          triggerToast('Category updated successfully.');
        }
      } else {
        const res = await professionalService.adminCreateCategory(form);
        if (res.success) {
          triggerToast('Category created successfully.');
        }
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Action failed.', 'error');
    }
  };

  const toggleStatus = async (cat) => {
    try {
      const res = await professionalService.adminUpdateCategory(cat._id, {
        isActive: !cat.isActive
      });
      if (res.success) {
        triggerToast(`Category ${!cat.isActive ? 'activated' : 'deactivated'} successfully.`);
        loadCategories();
      }
    } catch (err) {
      triggerToast('Failed to update category status.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? Listings in this category may become uncategorized.')) return;
    try {
      const res = await professionalService.adminDeleteCategory(id);
      if (res.success) {
        triggerToast('Category deleted successfully.');
        loadCategories();
      }
    } catch (err) {
      triggerToast('Failed to delete category.', 'error');
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 font-sans rounded-3xl">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-5 py-3.5 rounded-xl shadow-lg text-white font-bold text-sm z-50 flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          <CheckCircle size={16} />
          {toast.message}
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="text-indigo-650" />
            Category Manager Desk
          </h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Configure dynamic business categories, custom icons, and active/inactive visibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer"
          >
            <Plus size={14} /> Add Category
          </button>
          <button 
            onClick={loadCategories}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-650 flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Categories Listing Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Category Name</th>
                <th className="p-4">Key / URL identifier</th>
                <th className="p-4 text-center">Lucide Icon Class</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] font-medium text-slate-650">
              {categories.map(cat => (
                <tr key={cat._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center">
                      <LucideIconByName name={cat.icon} size={16} />
                    </span>
                    {cat.name}
                  </td>
                  <td className="p-4 text-xs font-mono text-slate-500">{cat.key}</td>
                  <td className="p-4 text-center text-xs font-semibold text-slate-600">{cat.icon}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleStatus(cat)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                        cat.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4 pr-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-650 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat._id)}
                        className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-650 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {categories.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                    No custom categories created yet. Click "Add Category" to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-md font-black text-slate-900 flex items-center gap-2">
                <Briefcase size={18} className="text-indigo-650" />
                {editMode ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Legal Services"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lucide Icon Class</label>
                <div className="flex items-center gap-2">
                  {/* Live preview of the chosen icon */}
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center" title={form.icon}>
                    <LucideIconByName name={form.icon} size={18} />
                  </span>
                  <select
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="flex-1 min-w-0 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white text-xs font-bold text-slate-800"
                  >
                    {iconOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {/* + : add any other Lucide icon */}
                  <button
                    type="button"
                    onClick={() => setIconPickerOpen(o => !o)}
                    title="Add another Lucide icon"
                    aria-label="Add another Lucide icon"
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                      iconPickerOpen ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {iconPickerOpen ? <X size={16} /> : <Plus size={16} />}
                  </button>
                </div>

                {iconPickerOpen && (
                  <div className="mt-2 p-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Type a Lucide icon name, e.g. Car, Stethoscope, ChefHat"
                        value={iconQuery}
                        onChange={(e) => setIconQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); if (iconQuery.trim()) addCustomIcon(iconQuery); }
                        }}
                        className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 text-xs font-bold text-slate-800"
                      />
                      <button
                        type="button"
                        disabled={!isLucideIconName(iconQuery)}
                        onClick={() => addCustomIcon(iconQuery)}
                        className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>

                    {iconQuery.trim() && (
                      isLucideIconName(iconQuery) ? (
                        <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                          <LucideIconByName name={iconQuery} size={14} /> {toLucidePascal(iconQuery)} — found
                        </p>
                      ) : (
                        <p className="text-[11px] font-semibold text-slate-500">
                          {iconSuggestions.length ? 'Pick one of the matching icons:' : 'No Lucide icon with that name.'}
                        </p>
                      )
                    )}

                    {iconSuggestions.length > 0 && (
                      <div className="grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {iconSuggestions.map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => addCustomIcon(n)}
                            title={toLucidePascal(n)}
                            className={`aspect-square rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                              toLucidePascal(n) === form.icon ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
                            }`}
                          >
                            <LucideIconByName name={n} size={18} />
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] font-medium text-slate-500">
                      Browse all icons at{' '}
                      <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline">lucide.dev/icons</a>
                      {' '}and type the name here.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                  Enable / Make Category Active immediately
                </label>
              </div>

              <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-150 hover:bg-opacity-90 cursor-pointer"
              >
                {editMode ? 'Update Category' : 'Save Category'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
