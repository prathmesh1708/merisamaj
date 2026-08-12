import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosPublic } from '../../../../core/api/axiosConfig';
import { ArrowLeft, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { Avatar } from '../../components/common/Avatar';

const DEFAULT_INDIAN_STATES_AND_CITIES = {
  'Madhya Pradesh': [],
  'Rajasthan': [],
  'Maharashtra': [],
  'Gujarat': [],
  'Delhi': [],
  'Uttar Pradesh': [],
  'Karnataka': [],
  'Tamil Nadu': [],
  'Telangana': [],
  'Andhra Pradesh': []
};

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser, updateProfile } = useData();
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    gender: currentUser?.gender || '',
    dob: currentUser?.dob || '',
    profession: currentUser?.profession || '',
    company: currentUser?.company || '',
    state: currentUser?.state || '',
    city: currentUser?.city || '',
    address: currentUser?.detailedAddress || currentUser?.address || ''
  });

  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dynamicStatesAndCities, setDynamicStatesAndCities] = useState(DEFAULT_INDIAN_STATES_AND_CITIES);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const res = await axiosPublic.get('/auth/cities');
        if (res.data.success) {
          const grouped = {};
          res.data.data.forEach(city => {
            const state = city.state || 'Madhya Pradesh';
            if (!grouped[state]) grouped[state] = [];
            grouped[state].push(city.name);
          });
          setDynamicStatesAndCities(grouped);
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
      }
    };
    loadCities();
  }, []);

  // Parse date string 'YYYY-MM-DD'
  const [pickerDate, setPickerDate] = useState(() => {
    const parts = (formData.dob || '1995-08-15').split('-');
    const y = parts[0] ? Number(parts[0]) : 1995;
    const m = parts[1] ? Number(parts[1]) - 1 : 7;
    const d = parts[2] ? Number(parts[2]) : 15;
    return { year: y, month: m, day: d };
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Years range from 1940 to 2026
  const years = Array.from({ length: 2027 - 1940 }, (_, i) => 2026 - i);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(pickerDate.year, pickerDate.month);
  const firstDay = getFirstDayOfMonth(pickerDate.year, pickerDate.month);
  const calendarDays = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleStateChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => {
      const allowedCities = dynamicStatesAndCities[val] || [];
      const isCityValid = allowedCities.includes(prev.city);
      return {
        ...prev,
        state: val,
        city: isCityValid ? prev.city : (allowedCities[0] || '')
      };
    });
  };

  const handleSelectState = (stateVal) => {
    setFormData((prev) => {
      const allowedCities = dynamicStatesAndCities[stateVal] || [];
      const isCityValid = allowedCities.includes(prev.city);
      return {
        ...prev,
        state: stateVal,
        city: isCityValid ? prev.city : (allowedCities[0] || ''),
      };
    });
  };

  const handleCityChange = (e) => {
    const cityVal = e.target.value;
    setFormData((prev) => {
      let stateVal = prev.state;
      const allowedCities = dynamicStatesAndCities[stateVal] || [];
      const isCityValid = allowedCities.includes(cityVal);
      return {
        ...prev,
        city: cityVal,
        state: isCityValid ? stateVal : prev.state
      };
    });
  };

  const handleSelectCity = (cityVal) => {
    setFormData((prev) => {
      let newState = prev.state;
      const allowedCities = dynamicStatesAndCities[newState] || [];
      const isCityValid = allowedCities.includes(cityVal);
      
      // Auto-detect state if city doesn't match current state
      if (!isCityValid) {
        const foundState = Object.keys(dynamicStatesAndCities).find(st => 
          dynamicStatesAndCities[st].includes(cityVal)
        );
        if (foundState) {
          newState = foundState;
        }
      }
      return {
        ...prev,
        city: cityVal,
        state: newState
      };
    });
  };

  const handleSave = () => {
    // Basic validation
    if (!formData.name || !formData.phone) return;
    
    // update the central store
    updateProfile(formData);
    
    // Navigate back to profile
    navigate(-1);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY format
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-6">
      {/* Header */}
      <div className="bg-card border-b border-gray-100 flex items-center justify-between px-4 h-14 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 press-scale">
            <ArrowLeft size={22} className="text-text-primary" />
          </button>
          <h1 className="text-base font-semibold text-text-primary">Edit Profile</h1>
        </div>
        <button onClick={handleSave} className="text-brand-primary text-sm font-semibold flex items-center gap-1 press-scale">
          <Check size={16} /> Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-20">
        {/* Photo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Avatar initials={currentUser.initials} src={currentUser.avatar} size="xl" color="bg-brand-primary/10 text-brand-primary border-2 border-brand-primary/20 text-3xl" />
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-md press-scale border-2 border-white cursor-pointer">
              <Camera size={14} />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      updateProfile({ avatar: event.target.result });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <InputField label="Full Name" name="name" value={formData.name} onChange={handleChange} />
          
          <div className="grid grid-cols-2 gap-3">
            {/* Custom Gender Select */}
            <div className="relative">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Gender</label>
              <button
                type="button"
                onClick={() => {
                  setShowGenderDropdown(!showGenderDropdown);
                  setShowDatePicker(false);
                }}
                className="w-full mt-1.5 flex items-center justify-between bg-card border border-gray-200 rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-brand-primary transition-all text-left"
              >
                <span>{formData.gender}</span>
                <ChevronDown size={16} className="text-text-secondary shrink-0" />
              </button>
              
              {showGenderDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowGenderDropdown(false)} />
                  <div className="absolute top-[72px] left-0 right-0 bg-card border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-slide-up">
                    {['Male', 'Female'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, gender: g }));
                          setShowGenderDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-xs font-semibold text-text-primary flex items-center justify-between border-b border-gray-50 last:border-0"
                      >
                        <span className={formData.gender === g ? 'text-brand-primary' : ''}>{g}</span>
                        {formData.gender === g && <Check size={14} className="text-brand-primary" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Custom Date Picker */}
            <div className="relative">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Date of Birth</label>
              <button
                type="button"
                onClick={() => {
                  setShowDatePicker(!showDatePicker);
                  setShowGenderDropdown(false);
                }}
                className="w-full mt-1.5 flex items-center justify-between bg-card border border-gray-200 rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-brand-primary transition-all text-left"
              >
                <span>{formatDateDisplay(formData.dob)}</span>
                <CalendarIcon size={16} className="text-text-secondary shrink-0" />
              </button>
              
              {showDatePicker && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setShowDatePicker(false)} />
                  <div className="absolute top-[72px] right-0 bg-card border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 w-[270px] animate-slide-up">
                    {/* Header: Month & Year Selector */}
                    <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPickerDate(prev => {
                            let newMonth = prev.month - 1;
                            let newYear = prev.year;
                            if (newMonth < 0) {
                              newMonth = 11;
                              newYear -= 1;
                            }
                            return { ...prev, month: newMonth, year: newYear };
                          });
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <ChevronLeft size={16} className="text-text-primary" />
                      </button>
                      
                      <div className="flex gap-1">
                        <select
                          value={pickerDate.month}
                          onChange={(e) => setPickerDate(prev => ({ ...prev, month: Number(e.target.value) }))}
                          className="text-xs font-bold bg-transparent outline-none cursor-pointer text-brand-primary"
                        >
                          {months.map((m, idx) => (
                            <option key={idx} value={idx}>{m.slice(0, 3)}</option>
                          ))}
                        </select>
                        <select
                          value={pickerDate.year}
                          onChange={(e) => setPickerDate(prev => ({ ...prev, year: Number(e.target.value) }))}
                          className="text-xs font-bold bg-transparent outline-none cursor-pointer text-brand-primary"
                        >
                          {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPickerDate(prev => {
                            let newMonth = prev.month + 1;
                            let newYear = prev.year;
                            if (newMonth > 11) {
                              newMonth = 0;
                              newYear += 1;
                            }
                            return { ...prev, month: newMonth, year: newYear };
                          });
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <ChevronRight size={16} className="text-text-primary" />
                      </button>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} className="font-bold text-text-secondary py-0.5">{d}</div>
                      ))}
                      {calendarDays.map((day, idx) => (
                        <div key={idx} className="flex justify-center items-center">
                          {day ? (
                            <button
                              type="button"
                              onClick={() => {
                                const formattedDob = `${pickerDate.year}-${String(pickerDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                setFormData(prev => ({ ...prev, dob: formattedDob }));
                                setPickerDate(prev => ({ ...prev, day }));
                                setShowDatePicker(false);
                              }}
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-all ${
                                pickerDate.day === day
                                  ? 'bg-brand-primary text-white shadow-md'
                                  : 'hover:bg-purple-50 text-text-primary'
                              }`}
                            >
                              {day}
                            </button>
                          ) : (
                            <div className="w-7 h-7" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <InputField label="Mobile Number" name="phone" value={formData.phone} onChange={handleChange} disabled />
          
          <InputField label="Email Address" name="email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} />
          
          <InputField label="Profession" name="profession" value={formData.profession} onChange={handleChange} />
          
          <InputField label="Company / Business Name" name="company" value={formData.company} onChange={handleChange} />
          
          <div className="grid grid-cols-2 gap-3">
            <AutocompleteField
              label="State"
              name="state"
              value={formData.state}
              onChange={handleStateChange}
              suggestions={Object.keys(dynamicStatesAndCities)}
              placeholder="Search / select state"
              onSelect={handleSelectState}
            />
            <AutocompleteField
              label="City"
              name="city"
              value={formData.city}
              onChange={handleCityChange}
              suggestions={
                formData.state
                  ? dynamicStatesAndCities[formData.state] || []
                  : Object.values(dynamicStatesAndCities).flat()
              }
              placeholder={formData.state ? "Search / select city" : "Select state first"}
              onSelect={handleSelectCity}
            />
          </div>
          
          <InputField label="Detailed Address" name="address" value={formData.address} placeholder="Enter your home address" onChange={handleChange} />
        </div>
      </div>
    </div>
  );
};

const AutocompleteField = ({ label, name, value, onChange, suggestions, placeholder, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  useEffect(() => {
    if (!value) {
      setFilteredSuggestions(suggestions);
    } else {
      const query = value.toLowerCase();
      setFilteredSuggestions(
        suggestions.filter((item) => item.toLowerCase().includes(query))
      );
    }
  }, [value, suggestions]);

  return (
    <div className="relative">
      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        className="w-full mt-1.5 bg-card border border-gray-200 rounded-xl px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder-gray-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
      />
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1.5 bg-card border border-gray-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto py-1 divide-y divide-gray-55">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-purple-50/50 text-xs font-semibold text-text-primary transition-colors flex items-center justify-between"
                >
                  <span className={value === item ? 'text-brand-primary font-bold' : ''}>{item}</span>
                  {value === item && <Check size={14} className="text-brand-primary shrink-0" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-text-secondary italic">
                No matches found.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const InputField = ({ label, disabled, ...props }) => (
  <div>
    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</label>
    <input
      className={`w-full mt-1.5 bg-card border border-gray-200 rounded-xl px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder-gray-400 ${
        disabled ? 'opacity-60 bg-gray-50 cursor-not-allowed' : 'focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10'
      }`}
      disabled={disabled}
      {...props}
    />
  </div>
);

export default EditProfilePage;
