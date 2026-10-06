import React, { useState, useEffect } from 'react';
import {
  Building, MapPin, Phone, Shield, Search, Filter, Loader,
  CheckCircle2, XCircle, AlertTriangle, DollarSign, Calendar, RefreshCw, Eye,
  ClipboardList, Wallet, Globe, X
} from 'lucide-react';
import DharmashalaAccessPanel from './DharmashalaAccessPanel';
import adminDharmashalaService from '../../../../core/api/adminDharmashalaService';

export default function AdminDharmashalaManagement() {
  const [activeTab, setActiveTab] = useState('properties'); // 'properties' | 'bookings' | 'analytics'
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState({});

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Override modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideBooking, setOverrideBooking] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('approved');
  const [overrideRemarks, setOverrideRemarks] = useState('');

  // Pricing states for approval
  const [baseAmount, setBaseAmount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [pricingNote, setPricingNote] = useState('');

  // Manual / Offline Booking
  const [showManualBookingModal, setShowManualBookingModal] = useState(false);
  const [manualBookingSaving, setManualBookingSaving] = useState(false);
  const [manualBookingForm, setManualBookingForm] = useState({
    dharmashalaId: '', checkIn: '', checkOut: '', checkInTime: '', checkOutTime: '',
    bookedBy: '', phone: '', guestCount: 1, purpose: '', specialRequests: '', staffNotes: '',
    totalAmount: '', advanceAmount: '', paymentMode: 'Cash'
  });

  // Record payment on an existing booking
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [recordPaymentBooking, setRecordPaymentBooking] = useState(null);
  const [recordPaymentForm, setRecordPaymentForm] = useState({ amount: '', paymentMode: 'Cash', notes: '' });
  const [recordPaymentSaving, setRecordPaymentSaving] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [propsRes, analyticsRes, bookingsRes] = await Promise.all([
        adminDharmashalaService.getProperties({ search, city: selectedCity, status: selectedStatus }),
        adminDharmashalaService.getAnalytics(),
        adminDharmashalaService.getBookings({ search, status: selectedStatus })
      ]);

      if (propsRes.status === 'success') setProperties(propsRes.data);
      if (analyticsRes.status === 'success') setAnalytics(analyticsRes.data);
      if (bookingsRes.status === 'success') setBookings(bookingsRes.data);
    } catch (err) {
      console.error("Failed to load admin dharmashala data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    try {
      const io = window.socketInstance || null;
      if (io) {
        const handleRefresh = () => fetchDashboardData();
        io.on('dharmashala:booking_created', handleRefresh);
        io.on('dharmashala:booking_status_updated', handleRefresh);
        io.on('dharmashala:payment_completed', handleRefresh);
        return () => {
          io.off('dharmashala:booking_created', handleRefresh);
          io.off('dharmashala:booking_status_updated', handleRefresh);
          io.off('dharmashala:payment_completed', handleRefresh);
        };
      }
    } catch (e) {}
  }, [search, selectedCity, selectedStatus]);

  const handleToggleStatus = async (propertyId) => {
    try {
      const res = await adminDharmashalaService.togglePropertyStatus(propertyId);
      if (res.status === 'success') {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to toggle property status");
    }
  };

  const openOverrideModal = (b) => {
    setOverrideBooking(b);
    setOverrideStatus(b.status || 'approved');
    setOverrideRemarks('');
    const base = b.baseAmount || b.totalAmount || 1000;
    const add = b.additionalCharges || 0;
    const disc = b.discount || 0;
    setBaseAmount(base);
    setAdditionalCharges(add);
    setDiscount(disc);
    setFinalAmount(b.totalAmount || (base + add - disc));
    setPricingNote(b.pricingNote || '');
    setShowOverrideModal(true);
  };

  const handleApplyOverride = async (e) => {
    e.preventDefault();
    if (!overrideBooking) return;
    try {
      const res = await adminDharmashalaService.overrideBookingStatus(overrideBooking._id || overrideBooking.id, {
        status: overrideStatus,
        remarks: overrideRemarks,
        paymentStatus: (overrideStatus === 'confirmed' || overrideStatus === 'upcoming') ? 'Paid' : overrideBooking.paymentStatus,
        baseAmount,
        additionalCharges,
        discount,
        finalAmount,
        pricingNote
      });

      if (res.status === 'success') {
        setShowOverrideModal(false);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Override failed");
    }
  };

  // Manual / Offline Booking
  const openManualBookingForm = () => {
    setManualBookingForm({
      dharmashalaId: properties[0]?._id || '', checkIn: '', checkOut: '', checkInTime: '', checkOutTime: '',
      bookedBy: '', phone: '', guestCount: 1, purpose: '', specialRequests: '', staffNotes: '',
      totalAmount: '', advanceAmount: '', paymentMode: 'Cash'
    });
    setShowManualBookingModal(true);
  };

  const handleManualBookingSubmit = async (e) => {
    e.preventDefault();
    if (!manualBookingForm.dharmashalaId) {
      alert('Please select a property.');
      return;
    }
    setManualBookingSaving(true);
    try {
      const res = await adminDharmashalaService.createManualBooking(manualBookingForm);
      if (res.status === 'success') {
        setShowManualBookingModal(false);
        fetchDashboardData();
      } else {
        alert(res?.message || 'Failed to create booking.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create booking.');
    } finally {
      setManualBookingSaving(false);
    }
  };

  // Record (remaining) payment
  const openRecordPaymentModal = (booking) => {
    setRecordPaymentBooking(booking);
    setRecordPaymentForm({ amount: '', paymentMode: booking.paymentMode || 'Cash', notes: '' });
    setShowRecordPaymentModal(true);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!recordPaymentForm.amount || Number(recordPaymentForm.amount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    setRecordPaymentSaving(true);
    try {
      const res = await adminDharmashalaService.recordBookingPayment(recordPaymentBooking._id, recordPaymentForm);
      if (res.status === 'success') {
        setShowRecordPaymentModal(false);
        fetchDashboardData();
      } else {
        alert(res?.message || 'Failed to record payment.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to record payment.');
    } finally {
      setRecordPaymentSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Building size={16} /> Global Supervision
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Global Dharmashala Management</h1>
          <p className="text-xs text-slate-500 font-medium">Cross-community oversight, revenue stats, and emergency overrides.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openManualBookingForm}
            disabled={properties.length === 0}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <ClipboardList size={14} /> Create Manual Booking
          </button>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl flex items-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Sync
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Properties</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{analytics.totalProperties || 0}</p>
          <span className="text-[10px] font-bold text-emerald-600">{analytics.activeProperties || 0} Active</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Bookings</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{analytics.totalBookings || 0}</p>
          <span className="text-[10px] font-bold text-indigo-600">{analytics.confirmedBookings || 0} Confirmed</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-2 md:col-span-2 bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
          <p className="text-[10px] font-extrabold text-indigo-200 uppercase tracking-wider">Total Booking Revenue</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">₹{(analytics.totalRevenue || 0).toLocaleString()}</p>
          <span className="text-[10px] font-medium text-slate-300">Verified Razorpay Payments</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button 
          onClick={() => setActiveTab('properties')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'properties' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Properties ({properties.length})
        </button>
        <button 
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'bookings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Global Bookings ({bookings.length})
        </button>
        <button 
          onClick={() => setActiveTab('access')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'access' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Access &amp; Permissions
        </button>
      </div>

      {activeTab === 'access' && (
        <DharmashalaAccessPanel cities={[...new Set(properties.map(p => p.city).filter(Boolean))]} />
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search property name, city, manager, or booking ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-2">
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </div>
      </div>

      {/* CONTENT TAB 1: PROPERTIES */}
      {activeTab === 'properties' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 flex justify-center"><Loader className="animate-spin text-indigo-600" size={32} /></div>
          ) : properties.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-bold">No Dharmashalas found matching criteria.</div>
          ) : (
            properties.map(p => (
              <div key={p._id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="h-40 bg-slate-100 relative">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">No Cover Image</div>
                  )}
                  <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {p.status}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-800">{p.name}</h3>
                    <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin size={12} className="text-indigo-500" /> {p.city}, {p.state}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Community: <span className="font-bold text-slate-700">{p.communityId?.name || p.community || 'General'}</span></p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-500">Contact: {p.contactPerson} ({p.contactNumber})</span>
                    <button 
                      onClick={() => handleToggleStatus(p._id)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${p.status === 'Active' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                    >
                      {p.status === 'Active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CONTENT TAB 2: GLOBAL BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400">
                  <th className="p-4">Booking ID</th>
                  <th className="p-4">Dharmashala</th>
                  <th className="p-4">Guest Name</th>
                  <th className="p-4">Dates</th>
                  <th className="p-4">Amount / Payment</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {loading ? (
                  <tr><td colSpan="8" className="p-8 text-center"><Loader className="animate-spin text-indigo-600 inline" /></td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan="8" className="p-8 text-center text-slate-400 font-bold">No global bookings found.</td></tr>
                ) : (
                  bookings.map(b => (
                    <tr key={b._id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-bold text-indigo-600">{b.bookingId}</td>
                      <td className="p-4 font-bold">{b.dharmashala?.name || 'N/A'}</td>
                      <td className="p-4">{b.bookedBy}<span className="block text-[10px] text-slate-400">{b.phone}</span></td>
                      <td className="p-4">{new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">₹{b.totalAmount}</span>
                        <span className={`text-[9px] font-black uppercase block mt-0.5 ${
                          b.paymentStatus === 'Paid' ? 'text-emerald-600' : b.paymentStatus === 'Partial' ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {b.paymentStatus === 'Paid' ? 'Paid in full' : b.paymentStatus === 'Partial' ? `₹${b.amountReceived || 0} received` : 'Payment pending'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          b.bookingSource === 'Offline' ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {b.bookingSource === 'Offline' ? <ClipboardList size={10} /> : <Globe size={10} />}
                          {b.bookingSource === 'Offline' ? 'Offline' : 'Online'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : b.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {(b.paymentStatus === 'Pending' || b.paymentStatus === 'Partial') && !['cancelled', 'rejected', 'expired'].includes(b.status) && (
                            <button
                              onClick={() => openRecordPaymentModal(b)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-[11px] cursor-pointer flex items-center gap-1"
                            >
                              <Wallet size={11} /> Payment
                            </button>
                          )}
                          <button
                            onClick={() => openOverrideModal(b)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            Review & Action
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OVERRIDE & APPROVAL MODAL */}
      {showOverrideModal && overrideBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Admin Booking Action</span>
                <h3 className="text-lg font-black text-slate-800">Booking #{overrideBooking.bookingId}</h3>
              </div>
              <button onClick={() => setShowOverrideModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700">✕</button>
            </div>

            {/* Member & Property Summary */}
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Guest:</span>
                <span className="font-bold text-slate-800">{overrideBooking.bookedBy} ({overrideBooking.phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Property:</span>
                <span className="font-bold text-slate-800">{overrideBooking.dharmashala?.name || 'Dharmashala'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Dates:</span>
                <span className="font-bold text-indigo-600">{new Date(overrideBooking.checkIn).toLocaleDateString()} - {new Date(overrideBooking.checkOut).toLocaleDateString()} ({overrideBooking.nights} Nights)</span>
              </div>
              {overrideBooking.guestCount && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Guests & Purpose:</span>
                  <span className="font-bold text-slate-800">{overrideBooking.guestCount} Guests • {overrideBooking.purpose || 'Personal Stay'}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleApplyOverride} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Action / Status</label>
                <select 
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="approved">Approve (Awaiting Payment)</option>
                  <option value="confirmed">Confirmed (Force Paid)</option>
                  <option value="rejected">Decline / Reject Request</option>
                  <option value="cancelled">Cancel Booking</option>
                </select>
              </div>

              {/* Pricing Breakdown for Approval */}
              {overrideStatus === 'approved' && (
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl space-y-3">
                  <p className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wider">Pricing Calculator</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Base Amount</label>
                      <input 
                        type="number"
                        value={baseAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setBaseAmount(val);
                          setFinalAmount(val + additionalCharges - discount);
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Additional</label>
                      <input 
                        type="number"
                        value={additionalCharges}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setAdditionalCharges(val);
                          setFinalAmount(baseAmount + val - discount);
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Discount</label>
                      <input 
                        type="number"
                        value={discount}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setDiscount(val);
                          setFinalAmount(baseAmount + additionalCharges - val);
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Final Payable Amount (₹)</label>
                    <input 
                      type="number"
                      value={finalAmount}
                      onChange={(e) => setFinalAmount(Number(e.target.value) || 0)}
                      className="w-full p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-black outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Pricing Explanation / Note</label>
                    <input 
                      type="text"
                      placeholder="e.g. ₹1000/night + ₹200 maintenance"
                      value={pricingNote}
                      onChange={(e) => setPricingNote(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Remarks / Audit Note</label>
                <textarea 
                  rows="2" 
                  value={overrideRemarks}
                  onChange={(e) => setOverrideRemarks(e.target.value)}
                  placeholder="Reason / note for this action..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20"
                >
                  Submit Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL / OFFLINE BOOKING MODAL */}
      {showManualBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Any Community</span>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><ClipboardList size={18} className="text-indigo-600" /> Create Manual / Offline Booking</h3>
                <p className="text-[11px] text-slate-450 font-semibold mt-1">For a walk-in or phone booking — confirms the booking immediately.</p>
              </div>
              <button onClick={() => setShowManualBookingModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700"><X size={16} /></button>
            </div>

            <form onSubmit={handleManualBookingSubmit} className="space-y-4 text-xs font-bold text-slate-600">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Dharmashala / Property *</label>
                  <select
                    required
                    value={manualBookingForm.dharmashalaId}
                    onChange={(e) => {
                      const propId = e.target.value;
                      setManualBookingForm(prev => ({ ...prev, dharmashalaId: propId }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="">Select property</option>
                    {properties.map(p => <option key={p._id} value={p._id}>{p.name} ({p.city}) — {p.communityId?.name || p.community || 'General'}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Customer Name *</label>
                  <input required type="text" value={manualBookingForm.bookedBy}
                    onChange={(e) => setManualBookingForm(prev => ({ ...prev, bookedBy: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Contact Number *</label>
                  <input required type="tel" maxLength={10} value={manualBookingForm.phone}
                    onChange={(e) => setManualBookingForm(prev => ({ ...prev, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Check-in Date *</label>
                  <input required type="date" value={manualBookingForm.checkIn}
                    onChange={(e) => setManualBookingForm(prev => ({ ...prev, checkIn: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Check-out Date *</label>
                  <input required type="date" value={manualBookingForm.checkOut}
                    onChange={(e) => setManualBookingForm(prev => ({ ...prev, checkOut: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Number of Guests</label>
                  <input type="number" min="1" value={manualBookingForm.guestCount}
                    onChange={(e) => setManualBookingForm(prev => ({ ...prev, guestCount: Number(e.target.value) || 1 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Booking Amount (₹) *</label>
                  <input required type="number" min="0" value={manualBookingForm.totalAmount}
                    onChange={(e) => setManualBookingForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-black" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Advance Payment Received (₹)</label>
                  <input type="number" min="0" value={manualBookingForm.advanceAmount}
                    onChange={(e) => setManualBookingForm(prev => ({ ...prev, advanceAmount: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500" />
                  <p className="text-[9px] text-slate-400 font-medium mt-1 normal-case">
                    Remaining: ₹{Math.max(0, Number(manualBookingForm.totalAmount || 0) - Number(manualBookingForm.advanceAmount || 0))}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Payment Mode</label>
                  <select value={manualBookingForm.paymentMode}
                    onChange={(e) => setManualBookingForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500">
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Additional Notes (internal)</label>
                  <textarea rows="2" value={manualBookingForm.staffNotes}
                    onChange={(e) => setManualBookingForm(prev => ({ ...prev, staffNotes: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowManualBookingModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs">Cancel</button>
                <button type="submit" disabled={manualBookingSaving} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20">
                  {manualBookingSaving ? 'Creating Booking...' : 'Create Booking & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showRecordPaymentModal && recordPaymentBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Wallet size={18} className="text-amber-600" /> Record Payment</h3>
              <button onClick={() => setShowRecordPaymentModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700"><X size={16} /></button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3.5 text-xs font-bold text-slate-600">
              <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                <p className="text-slate-800">{recordPaymentBooking.bookedBy} — {recordPaymentBooking.bookingId}</p>
                <p className="text-[10px] text-slate-450 font-medium normal-case">
                  Total ₹{recordPaymentBooking.totalAmount} · Received ₹{recordPaymentBooking.amountReceived || 0} · Remaining ₹{Math.max(0, (recordPaymentBooking.totalAmount || 0) - (recordPaymentBooking.amountReceived || 0))}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Amount Received Now (₹) *</label>
                <input required type="number" min="1" value={recordPaymentForm.amount}
                  onChange={(e) => setRecordPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-black" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Payment Mode</label>
                <select value={recordPaymentForm.paymentMode}
                  onChange={(e) => setRecordPaymentForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500">
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Note (optional)</label>
                <input type="text" value={recordPaymentForm.notes}
                  onChange={(e) => setRecordPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRecordPaymentModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs">Cancel</button>
                <button type="submit" disabled={recordPaymentSaving} className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md">
                  {recordPaymentSaving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
