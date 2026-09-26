import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users, Camera, Trash2, Edit3, Phone, Calendar, Heart, Briefcase, Network, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { useData } from '../../context/DataProvider';
import { t } from '../../utils/translations';
import { PageHeader } from '../../components/layout/PageHeader';
import InteractiveFamilyTree from '../../components/family/InteractiveFamilyTree';

const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative mt-1.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between premium-input text-left font-semibold"
      >
        <span>{value}</span>
        <span className={`text-[10px] text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-[56px] left-0 right-0 bg-white border border-purple-100/20 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto py-1 divide-y divide-purple-50 animate-fade-in">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3.5 hover:bg-purple-50/40 text-xs font-bold text-text-primary flex items-center justify-between transition-colors"
            >
              <span className={value === option ? 'text-brand-primary font-black' : ''}>{option}</span>
              {value === option && <span className="text-brand-primary text-xs font-black">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FamilyPage = () => {
  const navigate = useNavigate();
  const { currentUser, addFamilyMember, deleteFamilyMember, updateFamilyMember, language, setLanguage } = useData();
  const [activeTab, setActiveTab] = useState('tree'); // tree | list | add
  const [editingMember, setEditingMember] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const handleSave = (member) => {
    if (editingMember) {
      updateFamilyMember(editingMember.id, member);
      setEditingMember(null);
    } else {
      addFamilyMember(member);
    }
    setActiveTab('list');
  };

  const handleCancel = () => {
    setEditingMember(null);
    setActiveTab('list');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-6 animate-fade-in">
      {/* Header */}
      <PageHeader 
        title="Family Details" 
        subtitle="Manage family members" 
        rightContent={
          <button 
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="w-10 h-10 rounded-[14px] flex items-center justify-center text-brand-primary text-[11px] font-black uppercase press-scale"
            style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}
          >
            {language === 'en' ? 'HI' : 'EN'}
          </button>
        }
      />

      <div className="flex-1 px-5 pt-24 pb-20 max-w-md mx-auto w-full">
        <div className="flex flex-col h-full gap-4">
          {/* Tab Switcher */}
          <div className="flex bg-[#7C3AED]/5 p-1 rounded-2xl border border-purple-100/30 shrink-0">
            <button 
              onClick={() => {
                setActiveTab('tree');
                setEditingMember(null);
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-black rounded-xl transition-all duration-200 press-scale ${activeTab === 'tree' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-text-secondary hover:bg-white/50'}`}
            >
              <Network size={16} className="mb-0.5" />
              Family Tree
            </button>
            <button 
              onClick={() => {
                setActiveTab('add');
                setEditingMember(null);
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-black rounded-xl transition-all duration-200 press-scale ${activeTab === 'add' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-text-secondary hover:bg-white/50'}`}
            >
              <UserPlus size={16} className="mb-0.5" />
              {editingMember ? 'Edit' : 'Add Member'}
            </button>
            <button 
              onClick={() => {
                setActiveTab('list');
                setEditingMember(null);
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-black rounded-xl transition-all duration-200 press-scale ${activeTab === 'list' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-text-secondary hover:bg-white/50'}`}
            >
              <Users size={16} className="mb-0.5" />
              List View
            </button>
          </div>

          {activeTab === 'tree' ? (
            <InteractiveFamilyTree 
              members={currentUser.familyMembers} 
              currentUser={currentUser} 
              onEditMember={(member) => { setEditingMember(member); setActiveTab('add'); }}
            />
          ) : activeTab === 'list' ? (
            <FamilyListView 
              members={currentUser.familyMembers} 
              onEdit={(member) => { setEditingMember(member); setActiveTab('add'); }}
              onDelete={(member) => setMemberToDelete(member)}
              language={language}
            />
          ) : (
            <FamilyMemberForm 
              initialMember={editingMember} 
              onCancel={handleCancel} 
              onSave={handleSave} 
              language={language} 
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal inside Mobile Frame */}
      {memberToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-6 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-xl border border-gray-100 animate-zoom-in text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Trash2 size={22} className="text-red-500 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-black text-slate-800">Delete Family Member?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Are you sure you want to remove <span className="text-slate-700 font-bold">"{memberToDelete.name}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button 
                onClick={() => setMemberToDelete(null)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold rounded-2xl border border-slate-200 transition-all press-scale"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteFamilyMember(memberToDelete.id);
                  setMemberToDelete(null);
                }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-2xl transition-all press-scale shadow-md shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FamilyMemberForm = ({ initialMember, onCancel, onSave, language }) => {
  const [form, setForm] = useState({ 
    name: initialMember?.name || '', 
    relation: initialMember?.relation || 'Spouse', 
    dob: initialMember?.dob || '', 
    phone: initialMember?.phone || '',
    avatar: initialMember?.avatar || null,
    maritalStatus: initialMember?.maritalStatus || 'Single',
    occupation: initialMember?.occupation || ''
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => {
    const parts = (initialMember?.dob || '1995-08-15').split('-');
    const y = parts[0] ? Number(parts[0]) : 1995;
    const m = parts[1] ? Number(parts[1]) - 1 : 7;
    const d = parts[2] ? Number(parts[2]) : 15;
    return { year: y, month: m, day: d };
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 2027 - 1940 }, (_, i) => 2026 - i);

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(pickerDate.year, pickerDate.month + 1, 0).getDate();
    const firstDay = new Date(pickerDate.year, pickerDate.month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [pickerDate.year, pickerDate.month]);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'dd-mm-yyyy';
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  };

  return (
    <div className="animate-fade-in-up bg-white rounded-[28px] p-5 border border-purple-100/20 shadow-[0_4px_20px_rgba(109,40,217,0.02)] pb-24">
      <h2 className="text-[17px] font-black text-text-primary mb-5 tracking-tight border-b border-purple-50 pb-3">
        {initialMember ? t('Edit', language) + ' ' + t('Family Member', language) : t('Add Family Member', language)}
      </h2>
      <div className="space-y-4">
        {/* Photo Picker */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {form.avatar ? (
              <img src={form.avatar} alt="Member Avatar" className="w-20 h-20 rounded-[24px] object-cover border-2 border-brand-primary/50 shadow-md" />
            ) : (
              <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center border border-dashed border-purple-200/50 text-purple-300 font-extrabold text-lg">
                {form.name ? form.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : '+'}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-br from-brand-primary to-purple-600 rounded-xl flex items-center justify-center shadow-md press-scale cursor-pointer border-2 border-white">
              <Camera size={13} className="text-white" />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setForm(prev => ({ ...prev, avatar: event.target.result }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">{t('Full Name', language)}</label>
          <input 
            type="text" 
            placeholder="Enter full name" 
            value={form.name} 
            onChange={(e) => setForm({...form, name: e.target.value})} 
            className="w-full premium-input font-semibold" 
          />
        </div>

        <div>
          <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">{t('Relation', language)}</label>
          <CustomSelect 
            value={form.relation} 
            onChange={(val) => setForm({...form, relation: val})} 
            options={['Grandfather', 'Grandmother', 'Father', 'Mother', 'Uncle', 'Aunt', 'Spouse', 'Brother', 'Sister', 'Son', 'Daughter', 'Nephew', 'Niece', 'Grandson', 'Granddaughter']}
          />
        </div>

        <div>
          <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">Mobile Number</label>
          <input 
            type="tel" 
            placeholder="Enter mobile number" 
            value={form.phone} 
            maxLength={10}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
              setForm({...form, phone: val});
            }}
            className="w-full premium-input font-semibold" 
          />
        </div>

        <div className="relative">
          <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">Date of Birth</label>
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="w-full premium-input font-semibold text-text-primary text-left flex items-center justify-between"
          >
            <span>{formatDateDisplay(form.dob)}</span>
            <Calendar size={14} className="text-text-secondary" />
          </button>
          
          {showDatePicker && (
            <>
              <div className="fixed inset-0 z-[45]" onClick={() => setShowDatePicker(false)} />
              <div className="absolute top-[72px] right-0 bg-white border border-purple-100/30 rounded-2xl shadow-[0_8px_30px_rgba(109,40,217,0.12)] p-4 z-[50] w-[270px] animate-fade-in-up">
                <div className="flex items-center justify-between mb-3 border-b border-purple-50 pb-2">
                  <button type="button" onClick={() => setPickerDate(p => ({ ...p, month: p.month - 1 < 0 ? 11 : p.month - 1, year: p.month - 1 < 0 ? p.year - 1 : p.year }))} className="p-1 hover:bg-purple-50 rounded-lg"><ChevronLeft size={16} /></button>
                  <div className="flex gap-1">
                    <select value={pickerDate.month} onChange={(e) => setPickerDate(p => ({ ...p, month: Number(e.target.value) }))} className="text-xs font-bold text-brand-primary outline-none cursor-pointer bg-transparent">
                      {months.map((m, i) => <option key={i} value={i}>{m.substring(0,3)}</option>)}
                    </select>
                    <select value={pickerDate.year} onChange={(e) => setPickerDate(p => ({ ...p, year: Number(e.target.value) }))} className="text-xs font-bold text-brand-primary outline-none cursor-pointer bg-transparent">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => setPickerDate(p => ({ ...p, month: p.month + 1 > 11 ? 0 : p.month + 1, year: p.month + 1 > 11 ? p.year + 1 : p.year }))} className="p-1 hover:bg-purple-50 rounded-lg"><ChevronRight size={16} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-2">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="font-bold text-slate-400 py-0.5">{d}</div>)}
                  {calendarDays.map((day, idx) => (
                    <div key={idx} className="flex justify-center items-center">
                      {day && (
                        <button
                          type="button"
                          onClick={() => {
                            const dateStr = `${pickerDate.year}-${String(pickerDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            setForm(f => ({ ...f, dob: dateStr }));
                            setShowDatePicker(false);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                            form.dob === `${pickerDate.year}-${String(pickerDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                              ? 'bg-brand-primary text-white shadow-md'
                              : 'hover:bg-purple-50 text-slate-700'
                          }`}
                        >
                          {day}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div>
          <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">Marital Status</label>
          <CustomSelect 
            value={form.maritalStatus} 
            onChange={(val) => setForm({...form, maritalStatus: val})} 
            options={['Single', 'Married', 'Divorced', 'Widowed']}
          />
        </div>

        <div>
          <label className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest block mb-1.5 px-0.5">Occupation / Profession</label>
          <input 
            type="text" 
            placeholder="e.g. Student, Software Engineer, Homemaker" 
            value={form.occupation} 
            onChange={(e) => setForm({...form, occupation: e.target.value})} 
            className="w-full premium-input font-semibold" 
          />
        </div>

        <div className="flex gap-3 mt-14">
          <button onClick={onCancel} className="flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-100 hover:bg-slate-100 press-scale transition-all duration-200">
            Cancel
          </button>
          <button 
            onClick={() => onSave({
              ...form, 
              id: initialMember?.id || Date.now().toString(), 
              initials: form.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() || 'UN'
            })} 
            className="flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-brand-primary to-purple-600 hover:from-purple-600 hover:to-brand-primary shadow-lg shadow-purple-500/25 press-scale transition-all duration-300"
            disabled={!form.name}
          >
            Save Member
          </button>
        </div>
      </div>
    </div>
  );
};

export default FamilyPage;

const FamilyListView = ({ members, onEdit, onDelete, language }) => {
  const [filterRelation, setFilterRelation] = useState('All');
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const relations = ['All', ...new Set(members.map(m => m.relation))];
  
  const filteredMembers = filterRelation === 'All' 
    ? members 
    : members.filter(m => m.relation === filterRelation);

  return (
    <div className="animate-fade-in-up space-y-4 pb-24">
      <div className="flex items-center justify-between mb-2 px-1 relative">
        <h2 className="text-[15px] font-black text-slate-800">Family Members <span className="text-brand-primary text-xs ml-1 bg-purple-100/50 px-2 py-0.5 rounded-full">{filteredMembers.length}</span></h2>
        
        <div className="relative z-20">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-white border border-purple-100/50 text-slate-700 text-[11px] font-bold rounded-xl px-3 py-1.5 shadow-sm hover:border-brand-primary transition-colors"
          >
            {filterRelation}
            <ChevronRight size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-90' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-purple-100/50 rounded-2xl shadow-xl py-1.5 max-h-48 overflow-y-auto animate-fade-in divide-y divide-purple-50">
              {relations.map(rel => (
                <button
                  key={rel}
                  onClick={() => {
                    setFilterRelation(rel);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-[11px] font-bold transition-colors ${filterRelation === rel ? 'text-brand-primary bg-purple-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {rel}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-purple-100/20 shadow-sm flex flex-col items-center justify-center h-48">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-3">
            <Users size={24} className="text-brand-primary/40" />
          </div>
          <p className="text-slate-500 text-sm font-semibold">No family members found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-[20px] p-4 border border-purple-100/20 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.01]">
              <Avatar src={member.avatar} initials={member.name} size="lg" className="border-2 border-purple-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-slate-800 truncate">{member.name}</h3>
                <div className="flex items-center gap-2 mt-1 mb-1.5 flex-wrap">
                  <span className="inline-block px-2 py-0.5 bg-purple-50 text-brand-primary text-[10px] font-bold rounded-md uppercase tracking-wider">{member.relation}</span>
                  {member.maritalStatus && member.maritalStatus !== 'Single' && (
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-wider">{member.maritalStatus}</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-medium space-y-1">
                  {member.dob && <p className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /> {member.dob}</p>}
                  {member.phone && <p className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {member.phone}</p>}
                  {member.occupation && <p className="flex items-center gap-1.5"><Briefcase size={12} className="text-slate-400" /> {member.occupation}</p>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onEdit(member)} className="w-9 h-9 rounded-[14px] bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-white hover:text-brand-primary hover:shadow-sm border border-transparent hover:border-purple-100 transition-all active:scale-95">
                  <Edit3 size={15} />
                </button>
                <button onClick={() => onDelete(member)} className="w-9 h-9 rounded-[14px] bg-red-50 flex items-center justify-center text-red-400 hover:bg-white hover:text-red-500 hover:shadow-sm border border-transparent hover:border-red-100 transition-all active:scale-95">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

