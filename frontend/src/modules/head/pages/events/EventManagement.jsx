import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Search, Filter, Edit, Trash2, X, ChevronLeft, ChevronRight, 
  Clock, MapPin, Users, Heart, Plus, Eye, AlertTriangle, CheckCircle, 
  XCircle, RefreshCw, Shield, Layers, Upload
} from 'lucide-react';
import { headEventService } from '../../../../core/api/headEventService';

export const EventManagement = () => {
  // Data states
  const [events, setEvents] = useState([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [analytics, setAnalytics] = useState(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modal / Drawer States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [memberResponses, setMemberResponses] = useState([]);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [responseFilterTab, setResponseFilterTab] = useState('ALL'); // 'ALL' | 'INTERESTED' | 'GOING' | 'NOT_GOING'
  const [drawerActiveTab, setDrawerActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'GALLERY'
  const [imageInputMode, setImageInputMode] = useState('file'); // 'file' | 'url'
  
  // Gallery Management States
  const [galleryPhotoUrl, setGalleryPhotoUrl] = useState('');
  const [galleryPhotoCaption, setGalleryPhotoCaption] = useState('');
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryInputMode, setGalleryInputMode] = useState('file');

  // Form State
  const [formValues, setFormValues] = useState({
    title: '', description: '', category: 'Cultural', venue: '', address: '',
    startDate: '', startTime: '', endTime: '', contact: '', entryFee: 'Free',
    capacity: 0, registrationRequired: false, isFeatured: false,
    status: 'Published', image: ''
  });

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormValues(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Photo size should be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setGalleryPhotoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Real Analytics for Head's Community
  const fetchAnalytics = async () => {
    try {
      const res = await headEventService.getAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      console.error('Head analytics error', err);
    }
  };

  // Fetch Community Events
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        search,
        category: categoryFilter,
        status: statusFilter
      };
      const res = await headEventService.getEvents(params);
      setEvents(res.data || []);
      setTotalEvents(res.total || 0);
      setTotalPages(res.pages || 1);
    } catch (err) {
      console.error(err);
      showToast('Failed to load community events.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchAnalytics();
  }, [currentPage, categoryFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchEvents();
  };

  // Create Event Handler
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formValues.title || !formValues.description || !formValues.venue || !formValues.startDate) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await headEventService.createEvent(formValues);
      showToast('Community event created successfully!');
      setCreateModalOpen(false);
      resetForm();
      fetchEvents();
      fetchAnalytics();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create event.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Event Handler
  const openEditModal = (event) => {
    setSelectedEventId(event._id || event.id);
    setFormValues({
      title: event.title || '',
      description: event.description || '',
      category: event.category || 'Cultural',
      venue: event.venue || '',
      address: event.address || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : (event.date || ''),
      startTime: event.startTime || event.time || '',
      endTime: event.endTime || '',
      contact: event.contact || '',
      entryFee: event.entryFee || 'Free',
      capacity: event.capacity || 0,
      registrationRequired: !!event.registrationRequired,
      isFeatured: !!event.isFeatured,
      status: event.status || 'Published',
      image: event.image || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await headEventService.updateEvent(selectedEventId, formValues);
      showToast('Event updated successfully!');
      setEditModalOpen(false);
      resetForm();
      fetchEvents();
      fetchAnalytics();
    } catch (err) {
      showToast('Failed to update event.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEvent = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    try {
      await headEventService.cancelEvent(id);
      showToast('Event marked as Cancelled.');
      fetchEvents();
      fetchAnalytics();
    } catch (err) {
      showToast('Failed to cancel event.', 'error');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await headEventService.deleteEvent(id);
      showToast('Event deleted successfully.');
      fetchEvents();
      fetchAnalytics();
    } catch (err) {
      showToast('Failed to delete event.', 'error');
    }
  };

  const handleViewResponses = async (id) => {
    if (!id) return;
    const strId = id.toString();
    setSelectedEventId(strId);
    setDetailDrawerOpen(true);
    setSelectedEventDetails(null);
    setMemberResponses([]);
    setResponseFilterTab('ALL');

    try {
      const matchedEvent = events.find(e => (e._id?.toString() || e.id?.toString()) === strId);

      const res = await headEventService.getMemberResponses(strId);
      const responsesList = Array.isArray(res?.data) ? res.data : (res?.data?.memberResponses || []);
      const detailsFromRes = res?.eventDetails || res?.data?.eventDetails;
      
      const baseDetails = detailsFromRes || matchedEvent || { _id: strId, title: matchedEvent?.title || 'Event Details' };

      const calcInterested = responsesList.filter(r => r.isInterested || r.response === 'Interested').length;
      const calcGoing = responsesList.filter(r => r.isGoing || r.registered || r.response === 'Going').length;

      const combinedDetails = {
        ...baseDetails,
        interestedCount: calcInterested,
        goingCount: calcGoing,
        memberResponses: responsesList
      };

      setSelectedEventDetails(combinedDetails);
      setMemberResponses(responsesList);
    } catch (err) {
      console.error('Failed to load member responses:', err);
      showToast('Failed to load member responses.', 'error');
      const matchedEvent = events.find(e => (e._id?.toString() || e.id?.toString()) === strId);
      if (matchedEvent) {
        setSelectedEventDetails({
          ...matchedEvent,
          interestedCount: matchedEvent.interestedCount || 0,
          goingCount: matchedEvent.goingCount || matchedEvent.attendees || 0,
          memberResponses: []
        });
      }
    }
  };

  const handleAddGalleryPhoto = async (e) => {
    e.preventDefault();
    if (!galleryPhotoUrl.trim()) {
      showToast('Please upload an image or provide a photo URL', 'error');
      return;
    }
    setGalleryUploading(true);
    try {
      const res = await headEventService.addGalleryPhoto(selectedEventId, {
        url: galleryPhotoUrl,
        caption: galleryPhotoCaption
      });
      showToast('Photo added to event gallery!');
      setGalleryPhotoUrl('');
      setGalleryPhotoCaption('');
      if (selectedEventDetails) {
        setSelectedEventDetails(prev => ({
          ...prev,
          gallery: res.data || [...(prev.gallery || []), { url: galleryPhotoUrl, caption: galleryPhotoCaption, uploadedAt: new Date() }]
        }));
      }
      fetchEvents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add photo', 'error');
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleRemoveGalleryPhoto = async (photoId) => {
    if (!window.confirm('Delete this photo from the event gallery?')) return;
    try {
      const res = await headEventService.removeGalleryPhoto(selectedEventId, photoId);
      showToast('Photo removed from event gallery.');
      if (selectedEventDetails) {
        setSelectedEventDetails(prev => ({
          ...prev,
          gallery: res.data || (prev.gallery || []).filter(p => p._id !== photoId && p.url !== photoId)
        }));
      }
      fetchEvents();
    } catch (err) {
      showToast('Failed to remove photo', 'error');
    }
  };

  const resetForm = () => {
    setFormValues({
      title: '', description: '', category: 'Cultural', venue: '', address: '',
      startDate: '', startTime: '', endTime: '', contact: '', entryFee: 'Free',
      capacity: 0, registrationRequired: false, isFeatured: false,
      status: 'Published', image: ''
    });
    setSelectedEventId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-white font-medium text-sm flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* HEADER SECTION (WEB VIEW ONLY) */}
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-brand-primary" /> Community Event Desk
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">Create and manage exclusive events for your community members.</p>
        </div>
        <button
          onClick={() => { resetForm(); setCreateModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-sm rounded-xl transition shadow-md shadow-brand-primary/20 cursor-pointer"
        >
          <Plus size={18} /> Create Event
        </button>
      </div>

      {/* MOBILE FAB FOR CREATE EVENT */}
      <button
        onClick={() => { resetForm(); setCreateModalOpen(true); }}
        className="md:hidden fixed bottom-24 right-5 z-40 w-13 h-13 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/30 flex items-center justify-center active:scale-90 transition-all border-2 border-white cursor-pointer"
        title="Create Event"
      >
        <Plus size={24} />
      </button>

      {/* REAL DASHBOARD METRICS */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Events</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{analytics.totalEvents}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 text-center">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Upcoming</p>
            <p className="text-2xl font-black text-blue-800 mt-1">{analytics.upcomingEvents}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 text-center">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Ongoing</p>
            <p className="text-2xl font-black text-amber-800 mt-1">{analytics.ongoingEvents}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 text-center">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-black text-emerald-800 mt-1">{analytics.completedEvents}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30 text-center">
            <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Cancelled</p>
            <p className="text-2xl font-black text-rose-800 mt-1">{analytics.cancelledEvents}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/30 text-center">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Interested</p>
            <p className="text-2xl font-black text-purple-800 mt-1">{analytics.totalInterested}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 text-center">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Going</p>
            <p className="text-2xl font-black text-emerald-800 mt-1">{analytics.totalGoing}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 text-center">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Registrations</p>
            <p className="text-2xl font-black text-indigo-800 mt-1">{analytics.totalRegistrations}</p>
          </div>
        </div>
      )}

      {/* SEARCH & FILTER */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search community events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 h-[43px]"
          >
            <option value="all">All Categories</option>
            {['Cultural', 'Education', 'Matrimonial', 'Health', 'Sports'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 h-[43px]"
          >
            <option value="all">All Statuses</option>
            {['Draft', 'Published', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'].map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
      </div>

      {/* EVENT LIST TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-600 font-bold text-sm">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-600 font-bold text-sm">No events created yet for your community.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-black text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-4 px-4">Banner</th>
                  <th className="py-4 px-4">Event Title</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Date</th>
                  <th className="py-4 px-4 text-center">Interested</th>
                  <th className="py-4 px-4 text-center">Going</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-sm font-semibold text-slate-800">
                {events.map((ev) => (
                  <tr key={ev._id || ev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                        {ev.image ? (
                          <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs">No Img</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {ev.title}
                      <p className="text-xs text-slate-600 font-semibold">{ev.venue}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                        {ev.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {ev.date || 'TBA'}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-purple-700">
                      {ev.interestedCount || 0}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-emerald-700">
                      {ev.goingCount || 0}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-block ${
                        ev.status === 'Published' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        ev.status === 'Cancelled' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewResponses(ev._id || ev.id)}
                          className="p-2 text-slate-600 hover:text-brand-primary hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Member Responses"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(ev)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Edit Event"
                        >
                          <Edit size={16} />
                        </button>
                        {ev.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleCancelEvent(ev._id || ev.id)}
                            className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                            title="Cancel Event"
                          >
                            <AlertTriangle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteEvent(ev._id || ev.id)}
                          className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete Event"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT EVENT MODAL */}
      <AnimatePresence>
        {(createModalOpen || editModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-black text-slate-900">{createModalOpen ? 'Create Community Event' : 'Edit Event'}</h3>
                <button onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }} className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"><X size={20} /></button>
              </div>
              <form onSubmit={createModalOpen ? handleCreateSubmit : handleEditSubmit} className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Event Title *</label>
                  <input type="text" required value={formValues.title} onChange={e => setFormValues({...formValues, title: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-brand-primary" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category *</label>
                    <select value={formValues.category} onChange={e => setFormValues({...formValues, category: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-primary h-[43px]">
                      {['Cultural', 'Education', 'Matrimonial', 'Health', 'Sports'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Venue *</label>
                    <input type="text" required value={formValues.venue} onChange={e => setFormValues({...formValues, venue: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-brand-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Event Date *</label>
                    <input type="date" required value={formValues.startDate} onChange={e => setFormValues({...formValues, startDate: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-brand-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Start Time</label>
                    <input type="text" placeholder="e.g. 10:00 AM" value={formValues.startTime} onChange={e => setFormValues({...formValues, startTime: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-brand-primary placeholder-slate-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Event Banner Image</label>
                    <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button 
                        type="button" 
                        onClick={() => setImageInputMode('file')}
                        className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${imageInputMode === 'file' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        📱 Device Upload
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setImageInputMode('url')}
                        className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${imageInputMode === 'url' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        🌐 Image URL
                      </button>
                    </div>
                  </div>

                  {/* Live Banner Preview if present */}
                  {formValues.image ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group aspect-video max-h-48 my-2 shadow-xs">
                      <img src={formValues.image} alt="Banner Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label htmlFor="banner-file-input" className="px-3.5 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold cursor-pointer shadow-md hover:bg-slate-100 flex items-center gap-1">
                          <Upload size={14} /> Change Banner
                        </label>
                        <button 
                          type="button" 
                          onClick={() => setFormValues({ ...formValues, image: '' })}
                          className="px-3.5 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-rose-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  ) : imageInputMode === 'file' ? (
                    <label 
                      htmlFor="banner-file-input"
                      className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-400 cursor-pointer transition-all text-center group my-1"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                        <Upload size={18} />
                      </div>
                      <p className="text-sm font-bold text-slate-800">Click or tap to select banner from Gallery / Files</p>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">Supports PNG, JPG, WEBP (Max 5MB)</p>
                    </label>
                  ) : (
                    <input 
                      type="url" 
                      placeholder="https://..." 
                      value={formValues.image} 
                      onChange={e => setFormValues({...formValues, image: e.target.value})} 
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 mt-1 placeholder-slate-400" 
                    />
                  )}

                  <input 
                    type="file" 
                    id="banner-file-input" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleBannerFileChange} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description *</label>
                  <textarea rows={4} required value={formValues.description} onChange={e => setFormValues({...formValues, description: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-primary" />
                </div>
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }} className="px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={actionLoading} className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold text-sm cursor-pointer">{actionLoading ? 'Saving...' : 'Save Event'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MEMBER RESPONSES & EVENT DETAILS DRAWER */}
      <AnimatePresence>
        {detailDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="bg-white w-full max-w-xl h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-slate-50 z-10">
                <h3 className="text-lg font-black text-slate-900">Event Details & Responses</h3>
                <button onClick={() => setDetailDrawerOpen(false)} className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"><X size={20} /></button>
              </div>

              {selectedEventDetails ? (
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  {/* Banner Image */}
                  {selectedEventDetails.image && (
                    <img src={selectedEventDetails.image} alt={selectedEventDetails.title} className="w-full h-52 object-cover rounded-2xl border border-slate-200 shadow-xs" />
                  )}
                  
                  {/* Header Title & Badges */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full font-bold text-xs">
                        🏷️ {selectedEventDetails.category || 'Cultural'}
                      </span>
                      <span className={`px-3 py-1 rounded-full font-bold text-xs border ${
                        selectedEventDetails.status === 'Draft' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        ● {selectedEventDetails.status || 'Published'}
                      </span>
                      {selectedEventDetails.isFeatured && (
                        <span className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-full font-bold text-xs">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black text-slate-900">{selectedEventDetails.title}</h2>
                  </div>

                  {/* Metadata Grid (Venue, Date, Time, Contact) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-sm text-slate-800 font-medium">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span><strong>Date & Time:</strong> {selectedEventDetails.startDate || selectedEventDetails.date} {selectedEventDetails.startTime || selectedEventDetails.time ? `at ${selectedEventDetails.startTime || selectedEventDetails.time}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Venue:</strong> {selectedEventDetails.venue || 'N/A'} {selectedEventDetails.address ? `(${selectedEventDetails.address})` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-amber-600 shrink-0" />
                      <span><strong>Entry Fee:</strong> {selectedEventDetails.entryFee || 'Free'} {selectedEventDetails.capacity ? `• Capacity: ${selectedEventDetails.capacity}` : ''}</span>
                    </div>
                    {selectedEventDetails.contact && (
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-purple-600 shrink-0" />
                        <span><strong>Contact Person:</strong> {selectedEventDetails.contact}</span>
                      </div>
                    )}
                  </div>

                  {/* Event Description */}
                  {selectedEventDetails.description && (
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">About Event</h4>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                        {selectedEventDetails.description}
                      </div>
                    </div>
                  )}

                  {/* Drawer Tab Switcher: Overview vs Gallery */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setDrawerActiveTab('OVERVIEW')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        drawerActiveTab === 'OVERVIEW'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      👥 Attendees & Responses ({memberResponses.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerActiveTab('GALLERY')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        drawerActiveTab === 'GALLERY'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      🖼️ Event Photo Gallery ({selectedEventDetails.gallery?.length || 0})
                    </button>
                  </div>

                  {drawerActiveTab === 'OVERVIEW' ? (
                    <div className="space-y-4">
                      {/* Live Engagement Counters & Clickable Filters */}
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Participation Stats (Click to Filter)</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setResponseFilterTab(responseFilterTab === 'INTERESTED' ? 'ALL' : 'INTERESTED')}
                            className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                              responseFilterTab === 'INTERESTED'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-[1.02]'
                                : 'bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100'
                            }`}
                          >
                            <p className={`text-xs font-bold ${responseFilterTab === 'INTERESTED' ? 'text-purple-100' : 'text-purple-700'}`}>Interested</p>
                            <p className="text-2xl font-black mt-0.5">{selectedEventDetails.interestedCount || 0}</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setResponseFilterTab(responseFilterTab === 'GOING' ? 'ALL' : 'GOING')}
                            className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                              responseFilterTab === 'GOING'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                            }`}
                          >
                            <p className={`text-xs font-bold ${responseFilterTab === 'GOING' ? 'text-emerald-100' : 'text-emerald-700'}`}>Going / Joined</p>
                            <p className="text-2xl font-black mt-0.5">{selectedEventDetails.goingCount || 0}</p>
                          </button>
                        </div>
                      </div>

                      {/* Member Responses List */}
                      <div>
                        <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            Community Member List ({memberResponses.filter(mr => {
                              if (responseFilterTab === 'INTERESTED') return mr.isInterested || mr.response === 'Interested';
                              if (responseFilterTab === 'GOING') return mr.isGoing || mr.response === 'Going';
                              return true;
                            }).length})
                          </h4>
                          {responseFilterTab !== 'ALL' && (
                            <button
                              type="button"
                              onClick={() => setResponseFilterTab('ALL')}
                              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              Clear Filter (Show All)
                            </button>
                          )}
                        </div>

                        {/* Filtered Responses */}
                        {(() => {
                          const filtered = memberResponses.filter(mr => {
                            if (responseFilterTab === 'INTERESTED') return mr.isInterested || mr.response === 'Interested';
                            if (responseFilterTab === 'GOING') return mr.isGoing || mr.response === 'Going';
                            return true;
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                                <p className="text-sm font-bold text-slate-700">No member responses found for this filter</p>
                                <p className="text-xs text-slate-500 font-medium">
                                  {responseFilterTab === 'INTERESTED' ? 'No members have marked Interested yet.' :
                                   responseFilterTab === 'GOING' ? 'No members have Joined/Going yet.' : 'No member responses recorded.'}
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-2.5">
                              {filtered.map((mr) => (
                                <div 
                                  key={mr.id} 
                                  className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-indigo-200 transition-all flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    {mr.avatar ? (
                                      <img src={mr.avatar} alt={mr.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                    ) : (
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white ${
                                        mr.response === 'Going' ? 'bg-emerald-600' :
                                        mr.response === 'Interested' ? 'bg-purple-600' : 'bg-slate-600'
                                      }`}>
                                        {mr.initials || mr.name?.charAt(0) || 'M'}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                                        {mr.name}
                                        {mr.gotra && mr.gotra !== 'N/A' && (
                                          <span className="text-xs font-bold text-slate-500">({mr.gotra})</span>
                                        )}
                                      </p>
                                      <p className="text-xs text-slate-600 font-semibold mt-0.5">
                                        {mr.communityName !== 'N/A' ? mr.communityName : ''} {mr.cityName !== 'N/A' ? `• ${mr.cityName}` : ''}
                                      </p>
                                      {(mr.phone !== 'N/A' || mr.email !== 'N/A') && (
                                        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold mt-1">
                                          {mr.phone !== 'N/A' && <span>📞 {mr.phone}</span>}
                                          {mr.email !== 'N/A' && <span>• ✉️ {mr.email}</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className={`px-3 py-1 rounded-full font-extrabold text-xs inline-block ${
                                      mr.response === 'Going' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                      mr.response === 'Interested' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                      'bg-slate-100 text-slate-800 border border-slate-200'
                                    }`}>
                                      {mr.response === 'Going' ? '✓ Joined / Going' : mr.response === 'Interested' ? '⭐ Interested' : mr.response}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    /* Event Gallery Tab */
                    <div className="space-y-4">
                      {/* Upload/Add Photo Card */}
                      <form onSubmit={handleAddGalleryPhoto} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Add Photo to Gallery</h4>
                          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setGalleryInputMode('file')}
                              className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer ${galleryInputMode === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}
                            >
                              Upload File
                            </button>
                            <button
                              type="button"
                              onClick={() => setGalleryInputMode('url')}
                              className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer ${galleryInputMode === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}
                            >
                              Image URL
                            </button>
                          </div>
                        </div>

                        {galleryInputMode === 'file' ? (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleGalleryFileChange}
                              className="w-full text-xs text-slate-700 font-semibold file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                            />
                            {galleryPhotoUrl && (
                              <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300">
                                <img src={galleryPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            type="url"
                            value={galleryPhotoUrl}
                            onChange={e => setGalleryPhotoUrl(e.target.value)}
                            placeholder="https://example.com/event-photo.jpg"
                            className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 placeholder-slate-400"
                          />
                        )}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={galleryPhotoCaption}
                            onChange={e => setGalleryPhotoCaption(e.target.value)}
                            placeholder="Caption (e.g. Prize Distribution Ceremony)..."
                            className="flex-1 p-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 placeholder-slate-400"
                          />
                          <button
                            type="submit"
                            disabled={galleryUploading}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {galleryUploading ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={14} />}
                            Upload
                          </button>
                        </div>
                      </form>

                      {/* Photo Grid */}
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
                          Event Media Album ({selectedEventDetails.gallery?.length || 0} Photos)
                        </h4>

                        {(!selectedEventDetails.gallery || selectedEventDetails.gallery.length === 0) ? (
                          <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                            <p className="text-sm font-bold text-slate-700">No photos in event gallery yet</p>
                            <p className="text-xs text-slate-500 font-medium">Upload photos above to publish memories of this community event.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedEventDetails.gallery.map((photo, pIdx) => (
                              <div key={photo._id || pIdx} className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square shadow-2xs">
                                <img src={photo.url} alt={photo.caption || 'Event photo'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGalleryPhoto(photo._id || photo.url)}
                                    className="self-end p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
                                    title="Delete Photo"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                  {photo.caption && (
                                    <p className="text-xs text-white font-bold line-clamp-2">{photo.caption}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-600 font-bold text-sm">Loading complete event details...</div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventManagement;
