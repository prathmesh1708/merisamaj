import React, { useState, useEffect } from 'react';
import { 
  Building, Plus, Edit, Trash2, Loader, Calendar, DollarSign, Check, X, 
  ChevronRight, Info, MapPin, Phone, Shield, Activity, Users, Settings, Wrench, Grid, AlertCircle,
  Upload, Image as ImageIcon, Camera
} from 'lucide-react';
import headDharmashalaService from '../../../../core/api/headDharmashalaService';
import { useData } from '../../../member/context/DataProvider';

export default function DharmashalaManagement() {
  const { addNotification } = useData();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'properties' | 'rooms' | 'bookings' | 'maintenance'

  // Loading states
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');

  // Form modals & fields
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propertyEditId, setPropertyEditId] = useState(null);
  const [propertyForm, setPropertyForm] = useState({
    name: '', description: '', address: '', city: '', state: '', pincode: '',
    googleMapsUrl: '', latitude: '', longitude: '', contactPerson: '', contactNumber: '',
    alternateContact: '', email: '', website: '', pricePerDay: 1000, status: 'Active', isFeatured: false,
    rules: '', checkInTime: '10:00', checkOutTime: '10:00', amenities: [],
    image: '',
    coverFile: null,
    galleryImages: [],
    galleryFiles: []
  });

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomEditId, setRoomEditId] = useState(null);
  const [roomForm, setRoomForm] = useState({
    dharmashala: '', roomNumber: '', roomName: '', floor: '', roomCategory: 'Standard',
    isAc: false, capacity: 2, extraMattressAllowed: true, maxGuests: 3, price: 1000,
    weekendPrice: 1200, status: 'Available'
  });

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookingRemarks, setBookingRemarks] = useState('');
  const [assignedRoomIds, setAssignedRoomIds] = useState([]);

  // Pricing Approval States
  const [baseAmount, setBaseAmount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [pricingNote, setPricingNote] = useState('');

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    dharmashalaId: '', roomId: '', startDate: '', endDate: '', reason: 'Cleaning', remarks: ''
  });

  // Predefined Amenities
  const allAmenities = [
    'Parking', 'Lift', 'WiFi', 'CCTV', 'Kitchen', 'Dining Hall', 
    'RO Water', 'Generator', 'Temple', 'Garden', 'Hot Water', 'Wheelchair Access'
  ];

  // Fetch functions
  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await headDharmashalaService.getDashboardStats();
      if (statsRes.status === 'success') setStats(statsRes.data);

      const propRes = await headDharmashalaService.getProperties();
      if (propRes.status === 'success') {
        setProperties(propRes.data);
        if (propRes.data.length > 0 && selectedPropertyId === 'all') {
          setSelectedPropertyId(propRes.data[0]._id);
        }
      }

      const bookingRes = await headDharmashalaService.getBookings();
      if (bookingRes.status === 'success') setBookings(bookingRes.data);
    } catch (err) {
      console.error("Failed to load head Dharmashala info", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (propId) => {
    if (!propId || propId === 'all') return;
    try {
      const res = await headDharmashalaService.getRooms(propId);
      if (res.status === 'success') setRooms(res.data);
    } catch (err) {
      console.error("Failed to load rooms", err);
    }
  };

  useEffect(() => {
    fetchData();

    try {
      const io = window.socketInstance || null;
      if (io) {
        const handleRefresh = () => fetchData();
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
  }, []);

  useEffect(() => {
    if (selectedPropertyId && selectedPropertyId !== 'all') {
      fetchRooms(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  // Property Submit with Phone & Email Validation
  const handlePropertySubmit = async (e) => {
    e.preventDefault();

    // 1. Phone number validation (must be exactly 10 digits)
    const cleanPhone = (propertyForm.contactNumber || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      alert('Manager Phone number must be exactly 10 digits.');
      return;
    }

    // 2. Pincode validation (must be exactly 6 digits)
    const cleanPincode = (propertyForm.pincode || '').replace(/[^0-9]/g, '');
    if (cleanPincode.length !== 6) {
      alert('Pincode must be exactly 6 digits.');
      return;
    }

    // 3. Email format validation (must contain valid email pattern with @)
    if (propertyForm.email && propertyForm.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(propertyForm.email.trim())) {
        alert('Please enter a valid Email Address containing @ (e.g. example@gmail.com).');
        return;
      }
    }

    const formData = new FormData();
    Object.keys(propertyForm).forEach(key => {
      if (key === 'amenities' || key === 'galleryImages') {
        formData.append(key, JSON.stringify(propertyForm[key] || []));
      } else if (key !== 'coverFile' && key !== 'galleryFiles') {
        formData.append(key, propertyForm[key] !== undefined && propertyForm[key] !== null ? propertyForm[key] : '');
      }
    });

    if (propertyForm.coverFile) {
      formData.append('image', propertyForm.coverFile);
    }

    if (propertyForm.galleryFiles && propertyForm.galleryFiles.length > 0) {
      propertyForm.galleryFiles.forEach(file => {
        formData.append('galleryImages', file);
      });
    }

    try {
      let res;
      if (propertyEditId) {
        res = await headDharmashalaService.updateProperty(propertyEditId, formData);
      } else {
        res = await headDharmashalaService.createProperty(formData);
      }

      if (res && res.status === 'success') {
        setShowPropertyModal(false);
        fetchData();
        addNotification?.({
          type: 'system',
          title: propertyEditId ? 'Property Updated' : 'Property Registered',
          message: `${propertyForm.name} details saved successfully.`
        });
      } else {
        alert(res?.message || 'Failed to save property. Please check all required fields.');
      }
    } catch (err) {
      console.error("Property action failed", err);
      const serverMsg = err.response?.data?.message || err.message || 'Error occurred while saving property.';
      alert(`Property Save Failed: ${serverMsg}`);
    }
  };

  const openEditProperty = (prop) => {
    setPropertyEditId(prop._id);
    setPropertyForm({
      name: prop.name || '',
      description: prop.description || '',
      address: prop.address || '',
      city: prop.city || '',
      state: prop.state || '',
      pincode: prop.pincode || '',
      googleMapsUrl: prop.googleMapsUrl || '',
      latitude: prop.latitude || '',
      longitude: prop.longitude || '',
      contactPerson: prop.contactPerson || '',
      contactNumber: prop.contactNumber || '',
      alternateContact: prop.alternateContact || '',
      email: prop.email || '',
      website: prop.website || '',
      pricePerDay: prop.pricePerDay || 1000,
      status: prop.status || 'Active',
      isFeatured: prop.isFeatured || false,
      rules: prop.rules || '',
      checkInTime: prop.checkInTime || '10:00',
      checkOutTime: prop.checkOutTime || '10:00',
      amenities: prop.amenities || [],
      image: prop.image || '',
      coverFile: null,
      galleryImages: prop.galleryImages || [],
      galleryFiles: []
    });
    setShowPropertyModal(true);
  };

  const handleDeleteProperty = async (id) => {
    if (!window.confirm("Are you sure you want to delete this property? This will also remove all rooms and bookings.")) return;
    try {
      await headDharmashalaService.deleteProperty(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Room Submission
  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(roomForm).forEach(key => {
      formData.append(key, roomForm[key]);
    });

    try {
      let res;
      if (roomEditId) {
        res = await headDharmashalaService.updateRoom(roomEditId, formData);
      } else {
        res = await headDharmashalaService.createRoom(formData);
      }

      if (res.status === 'success') {
        setShowRoomModal(false);
        fetchRooms(selectedPropertyId);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddRoom = () => {
    setRoomEditId(null);
    setRoomForm({
      dharmashala: selectedPropertyId,
      roomNumber: '', roomName: '', floor: '', roomCategory: 'Standard',
      isAc: false, capacity: 2, extraMattressAllowed: true, maxGuests: 3, price: 1000,
      weekendPrice: 1200, status: 'Available'
    });
    setShowRoomModal(true);
  };

  const openEditRoom = (room) => {
    setRoomEditId(room._id);
    setRoomForm({
      dharmashala: room.dharmashala,
      roomNumber: room.roomNumber,
      roomName: room.roomName || '',
      floor: room.floor || '',
      roomCategory: room.roomCategory || 'Standard',
      isAc: room.isAc || false,
      capacity: room.capacity || 2,
      extraMattressAllowed: room.extraMattressAllowed || true,
      maxGuests: room.maxGuests || 3,
      price: room.price || 1000,
      weekendPrice: room.weekendPrice || 1200,
      status: room.status || 'Available'
    });
    setShowRoomModal(true);
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
      await headDharmashalaService.deleteRoom(roomId);
      fetchRooms(selectedPropertyId);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Booking Update Actions
  const handleBookingAction = async (booking, nextStatus) => {
    if (nextStatus === 'approved') {
      // Load available rooms for assigning and calculate initial ref price
      setActiveBooking(booking);
      setBookingRemarks('');
      setAssignedRoomIds([]);

      const propRefPrice = booking.dharmashala?.pricePerDay || 1000;
      const calculatedBase = (booking.nights || 1) * propRefPrice;
      setBaseAmount(calculatedBase);
      setAdditionalCharges(0);
      setDiscount(0);
      setFinalAmount(calculatedBase);
      setPricingNote('');
      setShowBookingModal(true);
      return;
    }

    if (!window.confirm(`Are you sure you want to mark this booking as ${nextStatus.toUpperCase()}?`)) return;
    try {
      const res = await headDharmashalaService.updateBookingStatus(booking._id, {
        status: nextStatus,
        remarks: `Status updated to ${nextStatus}`
      });
      if (res.status === 'success') {
        fetchData();
        if (selectedPropertyId !== 'all') fetchRooms(selectedPropertyId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmApproval = async () => {
    try {
      const res = await headDharmashalaService.updateBookingStatus(activeBooking._id, {
        status: 'approved',
        rooms: assignedRoomIds,
        remarks: bookingRemarks,
        baseAmount,
        additionalCharges,
        discount,
        finalAmount,
        pricingNote
      });
      if (res.status === 'success') {
        setShowBookingModal(false);
        fetchData();
        if (selectedPropertyId !== 'all') fetchRooms(selectedPropertyId);
        
        addNotification?.({
          type: 'community',
          title: 'Booking Request Approved',
          message: `Booking approved for ${activeBooking.bookedBy} with Final Amount: ₹${finalAmount}.`
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Maintenance log submission
  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await headDharmashalaService.logMaintenance(maintenanceForm);
      if (res.status === 'success') {
        setShowMaintenanceModal(false);
        fetchData();
        if (selectedPropertyId !== 'all') fetchRooms(selectedPropertyId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openMaintenanceForm = () => {
    setMaintenanceForm({
      dharmashalaId: selectedPropertyId,
      roomId: '',
      startDate: '',
      endDate: '',
      reason: 'Cleaning',
      remarks: ''
    });
    setShowMaintenanceModal(true);
  };

  return (
    <div className="p-3 sm:p-6 bg-slate-50 min-h-screen text-slate-800 font-sans space-y-4 sm:space-y-6">
      {/* Header Banner - White Neo Style */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-4 sm:p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Building className="text-indigo-600 shrink-0" size={20} /> Dharmashala Management Desk
          </h2>
          <p className="text-slate-500 text-xs font-semibold mt-1">Manage your community properties, room inventory, guest check-ins, and bookings scheduling.</p>
        </div>
        <div className="flex w-full sm:w-auto">
          <button 
            onClick={() => {
              setPropertyEditId(null);
              setPropertyForm({
                name: '', description: '', address: '', city: '', state: '', pincode: '',
                googleMapsUrl: '', latitude: '', longitude: '', contactPerson: '', contactNumber: '',
                alternateContact: '', email: '', website: '', status: 'Active', isFeatured: false,
                rules: '', checkInTime: '10:00', checkOutTime: '10:00', amenities: [],
                image: '', coverFile: null, galleryImages: [], galleryFiles: []
              });
              setShowPropertyModal(true);
            }}
            className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-[12px] transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={15} /> Add New Property
          </button>
        </div>
      </div>

      {/* Tabs Switcher - Light style with horizontal scroll for mobile */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 bg-white p-1.5 rounded-xl shadow-sm gap-1.5 scroll-smooth">
        {[
          { id: 'overview', label: 'Overview & Statistics' },
          { id: 'properties', label: 'Properties Directory' },
          { id: 'bookings', label: 'Booking Requests' },
          { id: 'maintenance', label: 'Maintenance Locks' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-[12.5px] font-black transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader className="animate-spin text-indigo-600" size={32} />
          <p className="text-slate-450 text-xs font-semibold">Loading data, please wait...</p>
        </div>
      ) : (
        <>          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Stats Cards Grid - Light Style */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                {[
                  { label: 'Total Dharmashalas', val: stats.totalDharmashalas || 0, color: 'text-indigo-600', desc: 'Registered Properties' },
                  { label: 'Active Properties', val: stats.activeDharmashalas || 0, color: 'text-emerald-600', desc: 'Open for Bookings' },
                  { label: 'Total Rooms', val: stats.totalRooms || 0, color: 'text-blue-600', desc: 'Inventory Capacity' },
                  { label: 'Occupied Rooms', val: stats.occupiedRooms || 0, color: 'text-rose-600', desc: 'Active Guest Rooms' },
                  { label: 'Pending Requests', val: stats.pendingRequests || 0, color: 'text-amber-600', desc: 'Requires Review' },
                  { label: 'Today Arrivals', val: stats.todayCheckIns || 0, color: 'text-purple-600', desc: 'Scheduled Check-ins' },
                  { label: 'Today Departures', val: stats.todayCheckOuts || 0, color: 'text-slate-650', desc: 'Scheduled Check-outs' },
                  { label: 'Monthly Revenue', val: `₹${stats.monthlyRevenue || 0}`, color: 'text-emerald-700 font-extrabold', desc: 'Current Month Income' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 p-3.5 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider line-clamp-1">{s.label}</span>
                    <span className={`text-xl sm:text-2xl font-black block mt-1.5 sm:mt-2 ${s.color}`}>{s.val}</span>
                    <span className="text-[8.5px] sm:text-[9.5px] text-slate-450 mt-1 block font-semibold">{s.desc}</span>
                  </div>
                ))}
              </div>

              {/* Occupancy Progress Tracker */}
              <div className="bg-white border border-slate-100 p-4 sm:p-6 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black text-slate-700">Property Occupancy Rate</h3>
                  <span className="text-indigo-600 font-black text-sm">{stats.occupancyRate || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${stats.occupancyRate || 0}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-semibold">Percentage of currently booked rooms out of total room inventory.</p>
              </div>

              {/* Today's Schedule Live Desk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Check-ins */}
                <div className="bg-white border border-slate-100 p-4 sm:p-6 rounded-2xl shadow-sm space-y-3 sm:space-y-4">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2.5">
                    <Check className="text-emerald-600" size={16} /> Today's Arrivals (Check-ins)
                  </h3>
                  <div className="space-y-2.5 sm:space-y-3">
                    {bookings.filter(b => b.status === 'approved' || b.status === 'upcoming').length === 0 ? (
                      <p className="text-slate-400 text-xs font-bold py-6 text-center">No arrivals scheduled for today.</p>
                    ) : (
                      bookings.filter(b => b.status === 'approved' || b.status === 'upcoming').map(b => (
                        <div key={b._id} className="bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-xl flex justify-between items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-black text-slate-800 truncate block">{b.bookedBy}</span>
                            <span className="text-[10px] text-slate-450 block mt-0.5 truncate">ID: {b.bookingId} | Rooms: {b.rooms?.map(r=>r.roomNumber).join(', ') || 'None'}</span>
                          </div>
                          <button 
                            onClick={() => handleBookingAction(b, 'checked_in')}
                            className="shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all"
                          >
                            Check In
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Check-outs */}
                <div className="bg-white border border-slate-100 p-4 sm:p-6 rounded-2xl shadow-sm space-y-3 sm:space-y-4">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2.5">
                    <X className="text-rose-600" size={16} /> Today's Departures (Check-outs)
                  </h3>
                  <div className="space-y-2.5 sm:space-y-3">
                    {bookings.filter(b => b.status === 'checked_in').length === 0 ? (
                      <p className="text-slate-400 text-xs font-bold py-6 text-center">No departures scheduled for today.</p>
                    ) : (
                      bookings.filter(b => b.status === 'checked_in').map(b => (
                        <div key={b._id} className="bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-xl flex justify-between items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-black text-slate-800 truncate block">{b.bookedBy}</span>
                            <span className="text-[10px] text-slate-450 block mt-0.5 truncate">ID: {b.bookingId} | Rooms: {b.rooms?.map(r=>r.roomNumber).join(', ') || 'N/A'}</span>
                          </div>
                          <button 
                            onClick={() => handleBookingAction(b, 'checked_out')}
                            className="shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-xl transition-all"
                          >
                            Check Out
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROPERTIES */}
          {activeTab === 'properties' && (
            <div className="grid grid-cols-1 gap-6">
              {properties.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-4 shadow-sm">
                  <Building size={44} className="mx-auto text-slate-350" />
                  <h3 className="text-sm font-black text-slate-800">No Properties Registered</h3>
                  <p className="text-xs text-slate-450">Register a community property/Dharmashala to start receiving booking requests.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {properties.map(p => (
                    <div key={p._id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col relative">
                      <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          {p.status === 'Active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="h-44 bg-slate-100 w-full relative border-b border-slate-50">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-100">No Cover Photo</div>
                        )}
                      </div>
                      <div className="p-6 flex-1 flex flex-col space-y-4">
                        <div>
                          <h3 className="text-base font-black text-slate-800">{p.name}</h3>
                          <div className="flex items-start gap-1 mt-1 text-slate-500">
                            <MapPin size={13} className="mt-0.5 shrink-0 text-indigo-500" />
                            <p className="text-[11px] font-semibold">{p.address}, {p.city}, {p.state} - {p.pincode}</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-50 flex flex-wrap gap-1.5">
                          {p.amenities?.map(amenity => (
                            <span key={amenity} className="px-2.5 py-1 bg-slate-50 border border-slate-100 text-[10px] font-bold rounded-lg text-slate-600">{amenity}</span>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-600">
                          <div>
                            <span>Manager: {p.contactPerson}</span>
                            <span className="block mt-0.5 text-[11px] text-slate-450 font-medium">Phone: {p.contactNumber}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-50 flex gap-2 justify-end">
                          <button 
                            onClick={() => openEditProperty(p)}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all text-slate-600 flex items-center gap-1.5"
                          >
                            <Edit size={12} /> Edit Details
                          </button>
                          <button 
                            onClick={() => handleDeleteProperty(p._id)}
                            className="px-4 py-2 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROOMS INVENTORY */}
          {activeTab === 'rooms' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Property Select Dropdown */}
              <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <label className="text-xs font-bold text-slate-500 shrink-0">Select Property:</label>
                  <select 
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    {properties.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={openMaintenanceForm}
                    className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-black transition-all text-slate-700 flex items-center gap-1.5"
                  >
                    <Wrench size={14} className="text-amber-600" /> Maintenance Schedule
                  </button>
                  <button 
                    onClick={openAddRoom}
                    disabled={properties.length === 0}
                    className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} /> Add New Room
                  </button>
                </div>
              </div>

              {/* Rooms Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {rooms.length === 0 ? (
                  <div className="col-span-full bg-white p-8 sm:p-12 rounded-2xl border border-slate-100 text-center space-y-3 shadow-sm">
                    <Grid size={40} className="mx-auto text-slate-400" />
                    <h3 className="text-sm font-black text-slate-800">No rooms registered under this property</h3>
                    <p className="text-xs text-slate-450">Click 'Add New Room' to configure property inventory details.</p>
                  </div>
                ) : (
                  rooms.map(room => (
                    <div key={room._id} className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col space-y-3 sm:space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-sm font-black text-slate-800">Room No. {room.roomNumber}</span>
                          <span className="block text-[10px] font-bold text-slate-450 mt-0.5">{room.roomName} | {room.floor}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          room.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          room.status === 'Booked' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                          room.status === 'Occupied' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                          'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {room.status === 'Available' ? 'Available' : room.status === 'Booked' ? 'Reserved' : room.status === 'Occupied' ? 'Occupied' : 'Maintenance'}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-50 grid grid-cols-2 gap-y-2 text-xs font-bold text-slate-600">
                        <div>Category: <span className="text-slate-800 font-extrabold">{room.roomCategory}</span></div>
                        <div>Type: <span className="text-slate-800 font-extrabold">{room.isAc ? 'AC' : 'General'}</span></div>
                        <div>Price: <span className="text-emerald-600 font-extrabold">₹{room.price}</span></div>
                        <div>Max Guests: <span className="text-slate-800 font-extrabold">{room.maxGuests}</span></div>
                      </div>

                      <div className="pt-3 sm:pt-4 border-t border-slate-50 flex gap-2 justify-end">
                        <button 
                          onClick={() => openEditRoom(room)}
                          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-all"
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRoom(room._id)}
                          className="p-2 border border-rose-100 hover:bg-rose-50 rounded-lg text-rose-600 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BOOKINGS DESK */}
          {activeTab === 'bookings' && (
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 sm:p-5 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800">Dharmashala Guest Bookings Panel</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-xs font-semibold text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-4 sm:px-5 py-3 sm:py-4">Booking ID</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-4">Member Details</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-4">Check-in / Out</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-4">Allocated Room</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-4">Amount</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-4">Status</th>
                      <th className="px-4 sm:px-5 py-3 sm:py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-5 py-12 text-center text-slate-400 font-bold">No booking requests found.</td>
                      </tr>
                    ) : (
                      bookings.map(b => (
                        <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 sm:px-5 py-3 sm:py-4 font-black text-indigo-600">{b.bookingId}</td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <span className="text-slate-800 font-bold block">{b.bookedBy}</span>
                            <span className="text-[10px] text-slate-450 block font-medium mt-0.5">{b.phone}</span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <span>{new Date(b.checkIn).toLocaleDateString('en-US')} - {new Date(b.checkOut).toLocaleDateString('en-US')}</span>
                            <span className="text-[10px] text-slate-450 block font-medium mt-0.5">({b.nights} Nights)</span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <span className="text-slate-700 block">{b.roomType} room</span>
                            {b.rooms && b.rooms.length > 0 && (
                              <span className="text-[10px] text-emerald-600 block font-bold mt-0.5">Room No: {b.rooms.map(r=>r.roomNumber).join(', ')}</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4 text-emerald-600 font-black">₹{b.totalAmount}</td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              b.status === 'pending_approval' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              b.status === 'approved' || b.status === 'upcoming' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              b.status === 'checked_in' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                              'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {b.status === 'pending_approval' ? 'Pending' : 
                               b.status === 'approved' ? 'Approved' :
                               b.status === 'upcoming' ? 'Reserved' :
                               b.status === 'checked_in' ? 'In-House' :
                               b.status === 'checked_out' ? 'Checked-Out' : 'Completed'}
                            </span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              {b.status === 'pending_approval' && (
                                <>
                                  <button 
                                    onClick={() => handleBookingAction(b, 'approved')}
                                    className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                                  >
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => handleBookingAction(b, 'cancelled')}
                                    className="px-2.5 sm:px-3 py-1.5 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              
                              {b.status === 'approved' && (
                                <button 
                                  onClick={() => handleBookingAction(b, 'checked_in')}
                                  className="px-2.5 sm:px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold"
                                >
                                  Check In
                                </button>
                              )}

                              {b.status === 'checked_in' && (
                                <button 
                                  onClick={() => handleBookingAction(b, 'checked_out')}
                                  className="px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold"
                                >
                                  Check Out
                                </button>
                              )}
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

          {/* TAB 5: MAINTENANCE */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Maintenance &amp; Blockouts Logs</span>
                <button 
                  onClick={openMaintenanceForm}
                  className="px-3.5 sm:px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl transition-all"
                >
                  Schedule Lockout
                </button>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden p-6 sm:p-8 text-center shadow-sm">
                <AlertCircle className="mx-auto text-amber-500 mb-3" size={32} />
                <p className="text-slate-500 text-xs font-bold">Property cleaning, room repairs, and restoration lockouts scheduler records logs will appear here.</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Property Modal Form */}
      {showPropertyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-100 w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl my-4 sm:my-8 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm sm:text-base font-black text-slate-800">{propertyEditId ? 'Edit Property Details' : 'Register New Property'}</h3>
              <button onClick={() => setShowPropertyModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
            </div>
            
            <form onSubmit={handlePropertySubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-600">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-bold">
                <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Dharmashala Name</label>
                    <input 
                      type="text" required
                      value={propertyForm.name}
                      onChange={(e) => setPropertyForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Reference Price Per Day (₹)</label>
                    <input 
                      type="number" required
                      placeholder="e.g. 1000"
                      value={propertyForm.pricePerDay}
                      onChange={(e) => setPropertyForm(prev => ({ ...prev, pricePerDay: Number(e.target.value) || 0 }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">City</label>
                  <input 
                    type="text" required
                    value={propertyForm.city}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">State</label>
                  <input 
                    type="text" required
                    value={propertyForm.state}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Full Address</label>
                  <input 
                    type="text" required
                    value={propertyForm.address}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Pincode</label>
                  <input 
                    type="tel" 
                    required
                    maxLength={6}
                    placeholder="6 digit pincode"
                    value={propertyForm.pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 6) {
                        setPropertyForm(prev => ({ ...prev, pincode: val }));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Manager Name</label>
                  <input 
                    type="text" required
                    value={propertyForm.contactPerson}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Manager Phone</label>
                  <input 
                    type="tel" 
                    required
                    maxLength={10}
                    placeholder="10 digit mobile number"
                    value={propertyForm.contactNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 10) {
                        setPropertyForm(prev => ({ ...prev, contactNumber: val }));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Email Address</label>
                  <input 
                    type="email"
                    placeholder="example@gmail.com"
                    value={propertyForm.email}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Amenities List Select</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allAmenities.map(amenity => (
                      <label key={amenity} className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={propertyForm.amenities.includes(amenity)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPropertyForm(prev => ({ ...prev, amenities: [...prev.amenities, amenity] }));
                            } else {
                              setPropertyForm(prev => ({ ...prev, amenities: prev.amenities.filter(a => a !== amenity) }));
                            }
                          }}
                          className="accent-indigo-600"
                        />
                        {amenity}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Description</label>
                  <textarea 
                    rows="3"
                    value={propertyForm.description}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Single Image Upload - Property Cover Photo */}
                <div className="col-span-1 sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    Property Cover Image (Single Upload)
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-slate-50 border border-dashed border-slate-200 p-3 rounded-xl">
                    {(propertyForm.coverFile || propertyForm.image) ? (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img 
                          src={propertyForm.coverFile ? URL.createObjectURL(propertyForm.coverFile) : propertyForm.image} 
                          alt="Cover Preview" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPropertyForm(prev => ({ ...prev, coverFile: null, image: '' }))}
                          className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 shadow-sm cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                        <Camera size={20} />
                        <span className="text-[9px] font-bold mt-1">No Image</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        id="propertyCoverUpload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setPropertyForm(prev => ({ ...prev, coverFile: file }));
                          }
                        }}
                      />
                      <label 
                        htmlFor="propertyCoverUpload"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold cursor-pointer transition-all border border-indigo-100"
                      >
                        <Upload size={13} /> Select Cover Photo
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Supports JPG, PNG, WEBP (Max 5MB). Uploads via Multer / Cloudinary.</p>
                    </div>
                  </div>
                </div>

                {/* Multiple Images Upload - Property Gallery */}
                <div className="col-span-1 sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    Property Gallery Images (Multiple Upload)
                  </label>
                  <div className="bg-slate-50 border border-dashed border-slate-200 p-3 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">
                        Gallery Photos ({(propertyForm.galleryImages?.length || 0) + (propertyForm.galleryFiles?.length || 0)} uploaded)
                      </span>
                      <input 
                        type="file" 
                        accept="image/*"
                        multiple
                        id="propertyGalleryUpload"
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            setPropertyForm(prev => ({ 
                              ...prev, 
                              galleryFiles: [...(prev.galleryFiles || []), ...files] 
                            }));
                          }
                        }}
                      />
                      <label 
                        htmlFor="propertyGalleryUpload"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm"
                      >
                        <Plus size={13} /> Add Photos
                      </label>
                    </div>

                    {/* Previews grid */}
                    <div className="flex flex-wrap gap-2.5 max-h-36 overflow-y-auto p-1">
                      {/* Existing server gallery images */}
                      {propertyForm.galleryImages?.map((url, idx) => (
                        <div key={`exist-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0 group">
                          <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPropertyForm(prev => ({
                              ...prev,
                              galleryImages: prev.galleryImages.filter((_, i) => i !== idx)
                            }))}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 opacity-90 transition-opacity cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}

                      {/* Newly added file objects */}
                      {propertyForm.galleryFiles?.map((file, idx) => (
                        <div key={`new-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-indigo-300 ring-2 ring-indigo-500/20 shrink-0 group">
                          <img src={URL.createObjectURL(file)} alt={`New upload ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPropertyForm(prev => ({
                              ...prev,
                              galleryFiles: prev.galleryFiles.filter((_, i) => i !== idx)
                            }))}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 opacity-90 transition-opacity cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}

                      {(!propertyForm.galleryImages?.length && !propertyForm.galleryFiles?.length) && (
                        <p className="text-[11px] text-slate-400 font-medium py-2">No gallery images added yet. Click 'Add Photos' to select multiple images.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 sm:pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button type="button" onClick={() => setShowPropertyModal(false)} className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Modal Form */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-100 w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl my-4 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm sm:text-base font-black text-slate-800">{roomEditId ? 'Edit Room Configuration' : 'Add New Room'}</h3>
              <button onClick={() => setShowRoomModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleRoomSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-slate-600 text-xs font-bold">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Room Number</label>
                <input 
                  type="text" required
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Room Name / Label</label>
                <input 
                  type="text" placeholder="e.g. Deluxe Double Room"
                  value={roomForm.roomName}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, roomName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Room Category</label>
                  <select 
                    value={roomForm.roomCategory}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, roomCategory: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Floor</label>
                  <input 
                    type="text" placeholder="e.g. 1st Floor"
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, floor: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-4 py-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input 
                    type="checkbox"
                    checked={roomForm.isAc}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, isAc: e.target.checked }))}
                    className="accent-indigo-600"
                  />
                  Air Conditioned (AC) Room
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Price per Night (₹)</label>
                  <input 
                    type="number" required
                    value={roomForm.price}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Max Guests capacity</label>
                  <input 
                    type="number"
                    value={roomForm.maxGuests}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, maxGuests: parseInt(e.target.value) || 2 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button type="button" onClick={() => setShowRoomModal(false)} className="w-full sm:w-auto px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 font-bold">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm font-bold cursor-pointer">Save Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Acceptance Drawer/Modal */}
      {showBookingModal && activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-100 w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl my-4 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm sm:text-base font-black text-slate-800">Assign Room &amp; Approve</h3>
              <button onClick={() => setShowBookingModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-xs font-bold text-slate-600">
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Guest Profile</p>
                <p className="text-slate-800 text-sm font-bold mt-0.5">{activeBooking.bookedBy}</p>
                <p className="text-[10px] text-indigo-600 mt-1 block">Requested: <span className="font-extrabold text-slate-800">{activeBooking.roomType} room</span></p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Select Room to Assign</label>
                <select 
                  multiple
                  value={assignedRoomIds}
                  onChange={(e) => {
                    const options = [...e.target.selectedOptions].map(o => o.value);
                    setAssignedRoomIds(options);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none h-28 focus:border-indigo-500"
                >
                  {rooms.filter(r => r.status === 'Available').map(r => (
                    <option key={r._id} value={r._id}>Room {r.roomNumber} - {r.roomCategory} ({r.isAc ? 'AC' : 'Non-AC'})</option>
                  ))}
                </select>
                <span className="text-[9px] text-slate-400 mt-1 block font-semibold">Hold Ctrl key to assign multiple rooms.</span>
              </div>

              {/* Pricing & Final Amount Entry */}
              <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase">
                  <span>Pricing Approval</span>
                  <span>{activeBooking.nights || 1} Night(s)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Base Price (₹)</label>
                    <input 
                      type="number" 
                      value={baseAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setBaseAmount(val);
                        setFinalAmount((val + additionalCharges) - discount);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Extra Charges (₹)</label>
                    <input 
                      type="number" 
                      value={additionalCharges}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setAdditionalCharges(val);
                        setFinalAmount((baseAmount + val) - discount);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Discount (₹)</label>
                    <input 
                      type="number" 
                      value={discount}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setDiscount(val);
                        setFinalAmount((baseAmount + additionalCharges) - val);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-rose-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-indigo-700 uppercase block mb-1">Final Amount (₹)</label>
                    <input 
                      type="number" 
                      value={finalAmount}
                      onChange={(e) => setFinalAmount(Number(e.target.value) || 0)}
                      className="w-full bg-indigo-600 text-white font-black border border-indigo-700 rounded-lg px-2.5 py-1.5 text-sm outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Remarks / Pricing Note</label>
                <input 
                  type="text"
                  placeholder="Optional pricing explanation"
                  value={bookingRemarks}
                  onChange={(e) => setBookingRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2">
                <button onClick={() => setShowBookingModal(false)} className="w-full sm:w-auto flex-1 py-2.5 sm:py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl cursor-pointer">Cancel</button>
                <button 
                  onClick={handleConfirmApproval}
                  disabled={finalAmount <= 0}
                  className="w-full sm:w-auto flex-1 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Confirm &amp; Approve (₹{finalAmount})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Blocks Form Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-100 w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl my-4 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm sm:text-base font-black text-slate-800">Schedule Room Lockout</h3>
              <button onClick={() => setShowMaintenanceModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleMaintenanceSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-xs font-bold text-slate-600">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Select Room</label>
                <select 
                  value={maintenanceForm.roomId}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, roomId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="">Block Entire Property</option>
                  {rooms.map(r => (
                    <option key={r._id} value={r._id}>Room {r.roomNumber}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Start Date</label>
                  <input 
                    type="date" required
                    value={maintenanceForm.startDate}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">End Date</label>
                  <input 
                    type="date" required
                    value={maintenanceForm.endDate}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Reason</label>
                <select 
                  value={maintenanceForm.reason}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none"
                >
                  <option value="Cleaning">Cleaning</option>
                  <option value="Repair">Repair</option>
                  <option value="Renovation">Renovation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Internal Note</label>
                <input 
                  type="text"
                  value={maintenanceForm.remarks}
                  onChange={(e) => setMaintenanceForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2">
                <button type="button" onClick={() => setShowMaintenanceModal(false)} className="w-full sm:w-auto flex-1 py-2.5 sm:py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 font-bold cursor-pointer">Cancel</button>
                <button type="submit" className="w-full sm:w-auto flex-1 py-2.5 sm:py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm font-bold cursor-pointer">Confirm Block</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
