import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Home, GraduationCap, Heart, Users, Award, 
  MapPin, ChevronDown, Smartphone, CreditCard, Landmark, Check
} from 'lucide-react';
import { useDonation } from './DonationContext';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import donationService from '../../../../core/api/donationService';

const DonationCampaignDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { purposes } = useDonation();

  const purpose = purposes.find(p => p.id === id);
  const [donorsList, setDonorsList] = useState([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState(true);

  useEffect(() => {
    const fetchRecentDonors = async () => {
      if (id) {
        setIsLoadingDonors(true);
        try {
          const res = await donationService.getRecentDonors(id);
          if (res.status === 'success') {
            setDonorsList(res.data);
          }
        } catch (error) {
          console.error("Failed to fetch recent donors", error);
        } finally {
          setIsLoadingDonors(false);
        }
      }
    };
    fetchRecentDonors();
  }, [id]);

  // Sort donors by date descending (newest first)
  const sortedDonors = [...donorsList].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const [showAllDonors, setShowAllDonors] = useState(false);
  const displayedDonors = showAllDonors ? sortedDonors : sortedDonors.slice(0, 3);
  
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  
  // Setup State
  const [selectedAmountPreset, setSelectedAmountPreset] = useState(500);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [donationType, setDonationType] = useState('One-time');
  const [paymentMethod, setPaymentMethod] = useState('UPI / Google Pay / PhonePe');

  if (!purpose) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center flex-col gap-4">
        <p className="text-sm font-bold text-text-secondary">Campaign not found.</p>
        <button onClick={() => navigate('/member/donation')} className="btn-primary px-4 py-2 text-xs">Back</button>
      </div>
    );
  }

  const getPurposeIcon = (pid) => {
    switch (pid) {
      case 'p1': return <Home size={24} className="text-amber-600" />;
      case 'p2': return <GraduationCap size={24} className="text-purple-600" />;
      case 'p3': return <Heart size={24} className="text-rose-500" fill="currentColor" />;
      case 'p4': return <Users size={24} className="text-emerald-600" />;
      default: return <Award size={24} className="text-blue-600" />;
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
  };

  const amountPresets = [100, 500, 1000, 2100, 5100];

  const handleAmountSelect = (preset) => {
    setIsCustom(false);
    setSelectedAmountPreset(preset);
  };

  const handleCustomAmountChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setCustomAmount(val);
      setIsCustom(true);
      setSelectedAmountPreset(null);
    }
  };

  const finalAmount = isCustom ? Number(customAmount) : selectedAmountPreset;

  const handleProceed = () => {
    if (!finalAmount || finalAmount <= 0) return;
    navigate('/member/donation/payment', {
      state: {
        purposeId: purpose.id,
        amount: finalAmount,
        type: donationType,
        method: paymentMethod
      }
    });
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('hi-IN', options);
  };

  return (
    <div className="min-h-screen bg-surface pb-24 relative">
      {/* Header */}
      <div className="bg-card border-b border-gray-100 flex items-center justify-between px-4 h-14 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/member/donation')} className="p-1 -ml-1 press-scale">
            <ArrowLeft size={22} className="text-text-primary" />
          </button>
          <h1 className="text-base font-bold text-text-primary truncate max-w-[200px]">{purpose.title}</h1>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-xl mx-auto space-y-6">
        
        {/* Campaign Info Card */}
        <div className="bg-card rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {purpose.bannerImage && (
            <div className="h-48 w-full overflow-hidden relative shrink-0">
              <img src={purpose.bannerImage} alt={purpose.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          )}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-4">
              {!purpose.bannerImage && (
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 mt-1">
                  {getPurposeIcon(purpose.id)}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-text-primary leading-tight">{purpose.title}</h2>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge variant="warning" className="text-[10px] font-bold px-2 py-0.5">{purpose.percentage}%</Badge>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded w-fit">
                    <MapPin size={10} /> {purpose.city || 'General'}
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-text-secondary leading-relaxed border-t border-gray-50 pt-4">
              {purpose.desc}
            </p>

            <div className="space-y-2 bg-gray-50 p-4 rounded-2xl">
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-bold text-text-primary">
                  ₹{formatCurrency(purpose.raised)} <span className="text-[11px] font-normal text-text-secondary">Raised</span>
                </span>
                <span className="text-[11px] font-bold text-text-secondary">Goal: ₹{formatCurrency(purpose.target)}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 rounded-full" 
                  style={{ width: `${purpose.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Donors List */}
        <div className="bg-card rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Recent Donors</h3>
          
          {isLoadingDonors ? (
            <p className="text-xs text-text-secondary text-center py-4">Loading donors...</p>
          ) : sortedDonors.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-4">No donors yet. Be the first to donate!</p>
          ) : (
            <>
              <div className="space-y-3">
                {displayedDonors.map((donor) => (
                  <div 
                    key={donor.id} 
                    onClick={() => {
                      if (donor.userId) {
                        navigate(`/member/directory/${donor.userId}`);
                      } else {
                        navigate('/member/directory');
                      }
                    }}
                    className="flex justify-between items-center text-[11px] border-b border-gray-50 pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-purple-50/40 p-1.5 -mx-1.5 rounded-xl transition-all group/donor"
                  >
                    <div className="flex items-center gap-3">
                      {donor.avatar ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-purple-100 p-0.5 group-hover/donor:border-[#FF2162]/50 transition-colors">
                          <img src={donor.avatar} alt={donor.name} className="w-full h-full object-cover rounded-full group-hover/donor:scale-105 transition-transform" />
                        </div>
                      ) : (
                        <Avatar initials={donor.initials} size="md" />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-text-primary group-hover/donor:text-purple-700 block text-xs transition-colors">{donor.name}</span>
                          <span className="text-[9px] font-bold text-purple-600/70 opacity-0 group-hover/donor:opacity-100 transition-opacity flex items-center">
                            Profile <ChevronRight size={10} strokeWidth={3} />
                          </span>
                        </div>
                        <span className="text-text-secondary text-[10px] mt-0.5 block">{formatDate(donor.date)}</span>
                      </div>
                    </div>
                    <span className="text-purple-700 font-extrabold text-xs">₹{formatCurrency(donor.amount)}</span>
                  </div>
                ))}
              </div>

              {sortedDonors.length > 3 && (
                <button 
                  onClick={() => setShowAllDonors(!showAllDonors)}
                  className="w-full py-2.5 text-xs font-bold text-purple-700 bg-purple-50 rounded-xl press-scale border border-purple-100 mt-2"
                >
                  {showAllDonors ? 'Show Less' : `View All (${sortedDonors.length})`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Inline Payment Form */}
        {showPaymentSetup && (
          <div className="space-y-6 bg-card border border-purple-200 shadow-lg rounded-3xl p-5 animate-slide-in">
            <h3 className="text-sm font-bold text-text-primary">Donation Amount and Details</h3>
            
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">Select Donation Amount</label>
              
              <div className="grid grid-cols-3 gap-2.5">
                {amountPresets.map(preset => {
                  const isSelected = selectedAmountPreset === preset && !isCustom;
                  return (
                    <button
                      key={preset}
                      onClick={() => handleAmountSelect(preset)}
                      className={`py-3.5 px-2 text-xs font-bold rounded-2xl border transition-all ${
                        isSelected 
                          ? 'border-purple-600 bg-purple-50 text-purple-950 font-extrabold shadow-sm' 
                          : 'border-gray-100 bg-surface text-text-secondary hover:border-gray-200'
                      }`}
                    >
                      ₹{preset}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setIsCustom(true)}
                  className={`py-3.5 px-2 text-xs font-bold rounded-2xl border transition-all ${
                    isCustom 
                      ? 'border-purple-600 bg-purple-50 text-purple-950 font-extrabold shadow-sm' 
                      : 'border-gray-100 bg-surface text-text-secondary'
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustom && (
                <div className="relative mt-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-secondary">₹</span>
                  <input
                    type="text"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    className="w-full bg-surface border border-purple-600 rounded-2xl py-3.5 pl-8 pr-4 text-xs font-bold text-text-primary outline-none"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">Donation Type</label>
              <div className="grid grid-cols-2 gap-3">
                {['One-time', 'Regular'].map(type => {
                  const isSelected = donationType === type;
                  return (
                    <div
                      key={type}
                      onClick={() => setDonationType(type)}
                      className={`rounded-2xl border p-4 flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected ? 'border-purple-600 bg-purple-50' : 'border-gray-100 bg-surface hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? 'text-purple-950' : 'text-text-primary'}`}>{type} Donation</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">Select Payment Method</label>
              <div className="space-y-2.5">
                {[
                  { id: 'upi', name: 'UPI / Google Pay', icon: Smartphone, color: 'text-purple-600 bg-purple-50' },
                  { id: 'card', name: 'Debit / Credit Card', icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
                  { id: 'netbank', name: 'Net Banking', icon: Landmark, color: 'text-amber-600 bg-amber-50' }
                ].map(method => {
                  const isSelected = paymentMethod === method.name;
                  const Icon = method.icon;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setPaymentMethod(method.name)}
                      className={`rounded-2xl border p-3 flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected ? 'border-purple-600 bg-purple-50' : 'border-gray-100 bg-surface hover:border-purple-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${method.color}`}>
                        <Icon size={16} strokeWidth={2.5} />
                      </div>
                      <h4 className="text-xs font-bold text-text-primary flex-1">{method.name}</h4>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <button 
              onClick={handleProceed}
              disabled={!finalAmount || finalAmount <= 0}
              className={`w-full py-4 text-sm font-bold rounded-2xl press-scale shadow-md flex items-center justify-center transition-colors ${
                (finalAmount && finalAmount > 0)
                  ? 'bg-purple-700 hover:bg-purple-800 text-white' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              Proceed to Pay ₹{formatCurrency(finalAmount)}
            </button>
          </div>
        )}

      </div>

      {/* Floating Donate Button (hidden when form is open) */}
      {!showPaymentSetup && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-md border-t border-gray-100 z-40">
          <div className="max-w-xl mx-auto">
            <button 
              onClick={() => {
                setShowPaymentSetup(true);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
              className="w-full py-3.5 bg-purple-700 text-white text-sm font-bold rounded-2xl shadow-lg press-scale hover:bg-purple-800 transition-colors flex justify-center items-center gap-2"
            >
              Donate Now <Heart size={16} fill="currentColor" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationCampaignDetailPage;
