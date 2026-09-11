import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, RefreshCw, Edit3, Trash2, CheckCircle, 
  XCircle, Award, X, Check, Settings
} from 'lucide-react';
import { professionalService } from '../../../../core/api/professionalService';

export default function HeadProfessionalCategories() {
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

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await professionalService.headGetCategories();
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
    setEditMode(false);
    setSelectedId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setForm({ name: cat.name, icon: cat.icon || 'Briefcase', isActive: cat.isActive });
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
        const res = await professionalService.headUpdateCategory(selectedId, form);
        if (res.success) {
          triggerToast('Category updated successfully.');
        }
      } else {
        const res = await professionalService.headCreateCategory(form);
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
      const res = await professionalService.headUpdateCategory(cat._id, {
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
      const res = await professionalService.headDeleteCategory(id);
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
            <Settings className="text-[#7C3AED]" />
            Category Manager Desk
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Configure dynamic business categories, custom icons, and active/inactive visibility inside your chapter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-opacity-90 text-white font-bold text-sm uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-purple-100 cursor-pointer"
          >
            <Plus size={16} /> Add Category
          </button>
          <button 
            onClick={loadCategories}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
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
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700 uppercase tracking-wider">
                <th className="p-4 pl-6">Category Name</th>
                <th className="p-4">Key / URL identifier</th>
                <th className="p-4 text-center">Lucide Icon Class</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-sm font-semibold text-slate-800">
              {categories.map(cat => (
                <tr key={cat._id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-slate-900 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 text-[#7C3AED] flex items-center justify-center font-black">
                      {cat.name.substring(0, 1).toUpperCase()}
                    </span>
                    {cat.name}
                  </td>
                  <td className="p-4 text-xs font-mono font-bold text-slate-600">{cat.key}</td>
                  <td className="p-4 text-center text-xs font-bold text-slate-700">{cat.icon}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleStatus(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer ${
                        cat.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4 pr-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openEditModal(cat)}
                        className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:text-[#7C3AED] hover:bg-purple-50 transition-colors cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat._id)}
                        className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {categories.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-600 font-bold text-sm">
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
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Briefcase size={20} className="text-[#7C3AED]" />
                {editMode ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Legal Services"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-sm font-semibold text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lucide Icon Class</label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white text-sm font-bold text-slate-900 h-[43px]"
                >
                  <option value="GraduationCap">GraduationCap (Education)</option>
                  <option value="Heart">Heart (Health / Diagnostics)</option>
                  <option value="Hammer">Hammer (Construction / Build)</option>
                  <option value="Building">Building (Manufacturing / Industries)</option>
                  <option value="Briefcase">Briefcase (Business / Consult)</option>
                  <option value="MoreHorizontal">MoreHorizontal (Others)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-800 cursor-pointer select-none">
                  Enable / Make Category Active immediately
                </label>
              </div>

              <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-[#7C3AED] text-white font-bold uppercase tracking-wider text-sm shadow-lg shadow-purple-100 hover:bg-opacity-90 cursor-pointer"
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
