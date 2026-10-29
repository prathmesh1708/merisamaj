import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, FileText, CheckCircle, ChevronDown, Check, Trash2, Image, Video, Plus, Clock } from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { PageHeader } from '../../components/layout/PageHeader';
import { professionalService } from '../../../../core/api/professionalService';
import { useAppPermissions } from '../../hooks/useAppPermissions';
import { PlanLockedNotice } from '../../components/common/PlanLockedNotice';

const ApplyProfessionalPage = () => {
  const appPermissions = useAppPermissions(); // null while loading
  const navigate = useNavigate();
  const { currentUser } = useData();
  const [submitted, setSubmitted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Controlled fields state
  const [profession, setProfession] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [experience, setExperience] = useState('');
  const [address, setAddress] = useState('');
  const [businessTiming, setBusinessTiming] = useState('09:00 AM - 08:00 PM');
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]); // array of { type: 'image' | 'video', url: string }

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await professionalService.getCategories();
        if (res.success) {
          setCategories(res.data.map(c => c.name));
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCats();
  }, []);

  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFiles(prev => [
          ...prev,
          {
            type: file.type.startsWith('video/') ? 'video' : 'image',
            url: reader.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory) {
      alert('Please select a category');
      return;
    }

    const payload = {
      category: selectedCategory,
      profession,
      companyName,
      yearsOfExperience: Number(experience),
      workAddress: address,
      businessTiming,
      about: description,
      media: mediaFiles.map(f => ({ type: f.type, url: f.url }))
    };

    try {
      const res = await professionalService.createProfessional(payload);
      if (res.success) {
        setSubmitted(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register your business listing. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <Clock size={40} className="text-[#7C3AED]" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Business Submitted Successfully</h2>
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Status: Pending Approval
        </div>

        <p className="text-xs text-text-secondary leading-relaxed mb-8 max-w-sm mx-auto">
          Your business has been submitted for approval. The request has been sent to both your **Community Head** and **Admin**. 
          <br /><br />
          Your business will appear in the Professional Directory once it is approved by either of them.
        </p>
        <button
          onClick={() => navigate('/member/professional')}
          className="w-full py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-sm font-semibold press-scale shadow-md"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  // Adding professional / business details is an App plan feature (the server enforces it too)
  if (appPermissions && !appPermissions.professionalListing) {
    return (
      <PlanLockedNotice
        title="Business listing is not in your plan"
        message="Adding your professional information, business and services is included in our membership plans. Upgrade to list your business."
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-6">
      {/* Header */}
      <PageHeader title="List Your Business" subtitle="Grow your reach" />

      <div className="flex-1 overflow-y-auto px-5 pt-6 max-w-md mx-auto w-full">
        {/* Grow your reach info card */}
        <div className="bg-[#7C3AED]/5 rounded-[24px] p-4.5 flex gap-3.5 mb-6 border border-purple-100/50 shadow-[0_4px_16px_rgba(109,40,217,0.01)]">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-purple-500/10">
            <Briefcase size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-purple-900 mb-1 tracking-tight">Grow your reach</h3>
            <p className="text-[11.5px] text-purple-700 leading-relaxed font-medium">
              Join the community's professional directory to offer your services. Verified listings build trust and attract local business.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">Category</label>
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full flex items-center justify-between premium-input text-left"
            >
              <span className={selectedCategory ? "text-text-primary font-bold" : "text-text-secondary font-semibold"}>
                {selectedCategory || 'Select Category'}
              </span>
              <ChevronDown size={16} className={`text-text-secondary transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showCategoryDropdown && (
              <div className="absolute top-[72px] left-0 right-0 bg-white border border-purple-100/20 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-purple-50/30 text-xs font-bold text-text-primary flex items-center justify-between transition-colors"
                  >
                    <span className={selectedCategory === cat ? 'text-[#7C3AED]' : ''}>{cat}</span>
                    {selectedCategory === cat && <Check size={14} className="text-[#7C3AED]" />}
                  </button>
                ))}
              </div>
            )}
            <input type="hidden" required value={selectedCategory} />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">Profession / Title</label>
            <input 
              required 
              type="text" 
              value={profession} 
              onChange={(e) => setProfession(e.target.value)} 
              placeholder="e.g. Chartered Accountant" 
              className="w-full premium-input font-semibold" 
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">Company / Business Name</label>
            <input 
              required 
              type="text" 
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)} 
              placeholder="e.g. Agrawal & Associates" 
              className="w-full premium-input font-semibold" 
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">Years of Experience</label>
            <input 
              required 
              type="number" 
              value={experience} 
              onChange={(e) => setExperience(e.target.value)} 
              placeholder="e.g. 5" 
              className="w-full premium-input font-semibold" 
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">Work Address / City</label>
            <input 
              required 
              type="text" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="e.g. MG Road, Indore" 
              className="w-full premium-input font-semibold" 
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">Business Timing / Working Hours</label>
            <input 
              required 
              type="text" 
              value={businessTiming} 
              onChange={(e) => setBusinessTiming(e.target.value)} 
              placeholder="e.g. 09:00 AM - 08:00 PM" 
              className="w-full premium-input font-semibold" 
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">About Your Service</label>
            <textarea 
              required 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Briefly describe what you do..." 
              className="w-full h-24 premium-input font-semibold resize-none" 
            />
          </div>

          {/* New Media Upload Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block px-0.5">Photos & Videos</label>
            
            {/* Horizontal preview list */}
            {mediaFiles.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {mediaFiles.map((media, idx) => (
                  <div key={idx} className="w-[100px] h-[70px] rounded-xl overflow-hidden border border-purple-100 bg-white shrink-0 relative group">
                    {media.type === 'video' ? (
                      <video src={media.url} className="w-full h-full object-cover pointer-events-none" muted />
                    ) : (
                      <img src={media.url} alt="Upload preview" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/85 text-white flex items-center justify-center rounded-full text-[10px] transition-colors"
                    >
                      ×
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/40 text-[7px] text-white px-1 rounded-sm uppercase pointer-events-none">
                      {media.type}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Custom File Upload Input */}
            <div className="relative">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                id="media-upload-input"
                className="hidden"
              />
              <label
                htmlFor="media-upload-input"
                className="w-full flex flex-col items-center justify-center border-2 border-dashed border-purple-200/60 rounded-[20px] p-5 cursor-pointer bg-purple-50/5 hover:bg-purple-50/15 hover:border-purple-300 transition-all group active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7C3AED] mb-2 group-hover:scale-110 transition-transform">
                  <Plus size={16} />
                </div>
                <span className="text-[11px] font-black text-purple-900">Add Images or Videos</span>
                <span className="text-[9px] text-text-secondary mt-0.5">Upload product photos, work videos, or certificates</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-brand-primary to-purple-600 hover:from-purple-600 hover:to-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest press-scale shadow-lg shadow-purple-500/10 active:scale-95 transition-all mt-4 flex items-center justify-center gap-1.5"
          >
            <FileText size={14} />
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplyProfessionalPage;
