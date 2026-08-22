import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Home, Heart, Search, Filter, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import memberDonationApi from '../../api/memberDonationApi';
import DonationCard from '../../components/member/DonationCard';
import DonateModal from '../../components/member/DonateModal';
import { useData } from '../../modules/member/context/DataProvider';
import { useAuth } from '../../core/auth/useAuth';
import { loadRazorpayScript } from '../../core/utils/razorpayLoader';

export const MemberDonations = () => {
  const navigate = useNavigate();
  const { setMobileMenuOpen, currentUser } = useData();
  const { user: authUser } = useAuth();
  const activeUser = currentUser || authUser;
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  const fetchActiveDonations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (search.trim()) params.search = search.trim();

      const res = await memberDonationApi.getActiveDonations(params);
      if (res.success || res.status === 'success') {
        setDonations(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load donation drives');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => {
    fetchActiveDonations();
  }, [fetchActiveDonations]);

  const handleOpenDonateModal = (donation) => {
    setSelectedDonation(donation);
    setIsDonateModalOpen(true);
  };

  const handleConfirmDonation = async (donationId, payload) => {
    try {
      setIsSubmitting(true);

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert('Razorpay Payment Gateway SDK failed to load. Please check your internet connection.');
        setIsSubmitting(false);
        return;
      }

      const orderRes = await memberDonationApi.createRazorpayOrder(donationId, {
        amount: payload.amount,
        donorName: payload.donorName
      });

      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || 'Failed to create payment order.');
      }

      const { order_id, amount, currency, key } = orderRes.data;

      const options = {
        key: key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency || 'INR',
        name: 'Meri Samaj Donation',
        description: `Donation for ${selectedDonation?.title || 'Noble Cause'}`,
        order_id: order_id,
        prefill: {
          name: payload.donorName || activeUser?.name || '',
          email: activeUser?.email || '',
          contact: activeUser?.phone || activeUser?.mobile || ''
        },
        theme: {
          color: '#4F46E5'
        },
        handler: async (response) => {
          try {
            const verifyRes = await memberDonationApi.verifyRazorpayPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              donationId,
              amount: payload.amount,
              donorName: payload.donorName
            });

            if (verifyRes.success || verifyRes.status === 'success') {
              setIsDonateModalOpen(false);
              setSelectedDonation(null);
              setSuccessToast(`Thank you! Your donation of ₹${payload.amount.toLocaleString()} was processed successfully.`);
              setTimeout(() => setSuccessToast(null), 5000);
              await fetchActiveDonations();
            } else {
              alert(verifyRes.message || 'Payment verification failed.');
            }
          } catch (verifyErr) {
            alert(verifyErr.response?.data?.message || verifyErr.message || 'Payment verification failed.');
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setSuccessToast(null);
            alert('Payment cancelled.');
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (response) => {
        setIsSubmitting(false);
        alert(response.error?.description || 'Payment failed. Please try again.');
      });
      razorpayInstance.open();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Payment initiation failed.');
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Causes' },
    { id: 'General', label: 'General Relief' },
    { id: 'Health', label: 'Health & Medical' },
    { id: 'Education', label: 'Education' },
    { id: 'Temple', label: 'Temple' },
    { id: 'Social', label: 'Social Welfare' }
  ];

  const filteredDonations = donations.filter((item) => {
    if (selectedCategory !== 'all') {
      const itemCat = (item.category || '').toLowerCase();
      const selCat = selectedCategory.toLowerCase();
      
      const matchesCategory = 
        itemCat.includes(selCat) ||
        selCat.includes(itemCat) ||
        (selCat === 'health' && (itemCat.includes('health') || itemCat.includes('medical'))) ||
        (selCat === 'social' && (itemCat.includes('social') || itemCat.includes('welfare'))) ||
        (selCat === 'general' && (itemCat.includes('general') || itemCat.includes('relief')));

      if (!matchesCategory) return false;
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const titleMatch = (item.title || '').toLowerCase().includes(q);
      const descMatch = (item.description || item.desc || item.shortDescription || '').toLowerCase().includes(q);
      if (!titleMatch && !descMatch) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col pb-24 font-sans select-none">
      {/* Header Bar with Hamburger Menu & Home */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-purple-100/30 px-4 h-14 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_12px_rgba(124,58,237,0.03)] shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale"
            title="Open Menu"
          >
            <Menu size={20} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Heart size={18} strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <h1 className="text-[17px] font-extrabold text-slate-800 tracking-tight leading-tight">Donations & Daan</h1>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Community Welfare</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/member/home')}
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale"
            title="Go to Home"
          >
            <Home size={19} />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5 w-full flex-1">
      {/* Hero Banner — Royal Glass Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2A0E5C] via-[#3B1578] to-[#5B21B6] rounded-[24px] p-4.5 sm:p-6 text-white shadow-[0_8px_25px_rgba(59,21,120,0.2)] text-left">
        {/* Ambient Glow Effects */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-purple-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 max-w-xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/15 border border-white/20 backdrop-blur-md text-amber-300">
            <Sparkles size={11} className="text-amber-300" /> Community Welfare
          </div>
          <h1 className="text-[17px] sm:text-xl font-extrabold tracking-tight leading-snug">Empower & Support Community Causes</h1>
          <p className="text-purple-100/90 text-[11px] sm:text-xs font-medium leading-relaxed">
            Your generous contributions directly fund medical emergencies, education scholarships, temple development, and social welfare initiatives.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between font-bold text-xs animate-in slide-in-from-top duration-300">
          <span>{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="text-white hover:opacity-80">Dismiss</button>
        </div>
      )}

      {/* Filter Category Tabs & Search */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-[24px] border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search donation drives..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-[13px] font-bold text-slate-800 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all placeholder-slate-400"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-[11.5px] font-bold whitespace-nowrap transition-all cursor-pointer border press-scale ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-purple-50/50 hover:border-purple-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Donation Cards */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-extrabold text-slate-700">Loading active donation drives...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200/80 rounded-[28px] text-center text-rose-600 shadow-xs">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-extrabold text-sm">{error}</p>
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-slate-200/80 p-12 text-center text-slate-400 shadow-xs">
          <Heart className="w-12 h-12 mx-auto text-purple-300 mb-3" />
          <h3 className="text-base font-extrabold text-slate-800">No Active Donation Drives</h3>
          <p className="text-xs font-medium text-slate-400 mt-1">Check back later or try selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDonations.map((item) => (
            <DonationCard
              key={item._id}
              donation={item}
              onDonateClick={handleOpenDonateModal}
              onCardClick={(id) => navigate(`/member/donation/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Donate Modal */}
      <DonateModal
        isOpen={isDonateModalOpen}
        onClose={() => { setIsDonateModalOpen(false); setSelectedDonation(null); }}
        donation={selectedDonation}
        onConfirmDonation={handleConfirmDonation}
        isSubmitting={isSubmitting}
      />
    </div>
  </div>
  );
};

export default MemberDonations;
