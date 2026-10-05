import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Archive, Star, Loader2, Image as ImageIcon } from 'lucide-react';
import { adminMatrimonialService } from '../../../../core/api/adminMatrimonialService';
import { uploadService } from '../../../../core/api/uploadService';

const SuccessStoriesManagement = () => {
  const [activeTab, setActiveTab] = useState('published'); // published, draft, archived, eligible
  const [stories, setStories] = useState([]);
  const [eligibleCouples, setEligibleCouples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '', shortDescription: '', story: '', coverImage: '', gallery: [],
    groomId: '', brideId: '', marriageRequestId: '', weddingDate: '', communityId: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (activeTab === 'eligible') fetchEligibleCouples();
    else fetchStories(activeTab);
  }, [activeTab]);

  const fetchStories = async (status) => {
    setLoading(true);
    try {
      const res = await adminMatrimonialService.getSuccessStories({ status });
      setStories(res.data.data.stories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleCouples = async () => {
    setLoading(true);
    try {
      const res = await adminMatrimonialService.getEligibleCouples();
      setEligibleCouples(res.data.data.eligibleCouples);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = (couple = null) => {
    if (couple) {
      setFormData({
        title: '', shortDescription: '', story: '', coverImage: couple.bride?.avatar || couple.groom?.avatar || '',
        gallery: [], groomId: couple.groom?._id, brideId: couple.bride?._id, 
        marriageRequestId: couple.marriageRequestId, weddingDate: couple.marriageDate ? new Date(couple.marriageDate).toISOString().split('T')[0] : '',
        communityId: couple.community?._id || ''
      });
    } else {
      setFormData({ title: '', shortDescription: '', story: '', coverImage: '', gallery: [], groomId: '', brideId: '', marriageRequestId: '', weddingDate: '', communityId: '' });
    }
    setEditingStory(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (story) => {
    setFormData({
      title: story.title, shortDescription: story.shortDescription, story: story.story,
      coverImage: story.coverImage, gallery: story.gallery, groomId: story.groomId?._id,
      brideId: story.brideId?._id, marriageRequestId: story.marriageRequestId,
      weddingDate: story.weddingDate ? new Date(story.weddingDate).toISOString().split('T')[0] : '',
      communityId: story.communityId?._id || ''
    });
    setEditingStory(story);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadService.uploadSingle(fd);
      setFormData(prev => ({ ...prev, coverImage: res.data.data.url }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStory) {
        await adminMatrimonialService.updateSuccessStory(editingStory._id, formData);
      } else {
        await adminMatrimonialService.createSuccessStory(formData);
      }
      setIsModalOpen(false);
      if (activeTab === 'eligible') {
        setActiveTab('draft');
      } else {
        fetchStories(activeTab);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (id, action, value = null) => {
    try {
      if (action === 'publish') await adminMatrimonialService.publishSuccessStory(id);
      if (action === 'archive') await adminMatrimonialService.archiveSuccessStory(id);
      if (action === 'delete') await adminMatrimonialService.deleteSuccessStory(id);
      if (action === 'feature') await adminMatrimonialService.toggleFeatureSuccessStory(id, value);
      fetchStories(activeTab);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">Success Stories Management</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        {['published', 'draft', 'archived', 'eligible'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-2 capitalize font-semibold transition-all ${
              activeTab === tab ? 'border-b-2 border-rose-500 text-rose-500' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-rose-500" /></div>
      ) : activeTab === 'eligible' ? (
        <div className="grid gap-4">
          {eligibleCouples.map(couple => (
            <div key={couple.marriageRequestId} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
              <div>
                <p className="font-bold text-slate-800">{couple.groom?.name} & {couple.bride?.name}</p>
                <p className="text-sm text-slate-500">Married on: {new Date(couple.marriageDate).toLocaleDateString()}</p>
              </div>
              <button onClick={() => handleOpenCreateModal(couple)} className="bg-rose-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-rose-600 transition-all">
                Create Story
              </button>
            </div>
          ))}
          {eligibleCouples.length === 0 && <p className="text-slate-500 text-center py-8">No eligible couples found.</p>}
        </div>
      ) : (
        <div className="grid gap-4">
          {stories.map(story => (
            <div key={story._id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4">
              <div className="flex gap-4 items-center">
                {story.coverImage ? (
                  <img src={story.coverImage} alt="Cover" className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon /></div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800">{story.title || 'Untitled'}</h3>
                  <p className="text-sm text-slate-500">{story.groomId?.name} & {story.brideId?.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleOpenEditModal(story)} className="p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200" title="Edit"><Edit size={16} /></button>
                {activeTab !== 'published' && <button onClick={() => handleAction(story._id, 'publish')} className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100" title="Publish"><CheckCircle size={16} /></button>}
                {activeTab !== 'archived' && <button onClick={() => handleAction(story._id, 'archive')} className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100" title="Archive"><Archive size={16} /></button>}
                <button onClick={() => handleAction(story._id, 'feature', !story.featured)} className={`p-2 rounded-lg ${story.featured ? 'text-yellow-600 bg-yellow-50' : 'text-slate-400 bg-slate-100'}`} title="Feature"><Star size={16} fill={story.featured ? 'currentColor' : 'none'} /></button>
                <button onClick={() => handleAction(story._id, 'delete')} className="p-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {stories.length === 0 && <p className="text-slate-500 text-center py-8">No stories found.</p>}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">{editingStory ? 'Edit Story' : 'Create Story'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Short Description</label>
                <textarea required value={formData.shortDescription} onChange={e => setFormData({...formData, shortDescription: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 h-20" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Full Story</label>
                <textarea required value={formData.story} onChange={e => setFormData({...formData, story: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 h-32" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Cover Image</label>
                {formData.coverImage && <img src={formData.coverImage} alt="Cover" className="w-full h-32 object-cover rounded-lg mb-2" />}
                <input type="file" onChange={handleImageUpload} accept="image/*" disabled={uploading} className="text-sm" />
                {uploading && <span className="text-xs text-rose-500 ml-2">Uploading...</span>}
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-slate-500 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={uploading} className="px-4 py-2 font-bold text-white bg-rose-500 rounded-lg">Save Story</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessStoriesManagement;
