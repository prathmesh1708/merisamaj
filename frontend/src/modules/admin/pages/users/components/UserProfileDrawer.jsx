import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Users, Briefcase, FileText, Activity, Shield, Heart, MapPin,
  Building2, Calendar, Phone, Mail, ShieldCheck, ShieldAlert, ShieldBan,
  Loader2, CheckCircle2, Clock, Crown, AlertCircle
} from 'lucide-react';
import { Avatar } from '../../../../member/components/common/Avatar';
import { userService } from '../../../services/userService';
import { AssignHeadModal } from './AssignHeadModal';
import { EditUserCommunityModal } from './EditUserCommunityModal';

const Field = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
  </div>
);

const statusColors = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-amber-50 text-amber-700 border-amber-200',
  blocked: 'bg-rose-50 text-rose-700 border-rose-200',
  deleted: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const UserProfileDrawer = ({ userId, isOpen, onClose, onActionComplete }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAssignHeadOpen, setIsAssignHeadOpen] = useState(false);
  const [isEditCommunityOpen, setIsEditCommunityOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const load = async () => {
      setLoading(true);
      setUser(null);
      try {
        const data = await userService.getUserById(userId);
        setUser(data);
      } catch (e) {
        console.error('Failed to load user details', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, isOpen]);

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'professional', label: 'Professional', icon: Briefcase },
    { id: 'family', label: 'Family', icon: Heart },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'account', label: 'Account', icon: Shield },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-3xl bg-white z-[110] shadow-2xl flex flex-col border-l border-gray-100"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              {loading || !user ? (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-2xl animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-200 rounded-lg w-40 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded-lg w-24 animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Avatar
                    initials={user.name?.charAt(0) || '?'}
                    imageUrl={user.avatar}
                    size="xl"
                    color="bg-brand-primary text-white"
                  />
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-black text-gray-900">{user.name}</h2>
                      {user.verificationStatus === 'verified' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{user.phone} {user.email ? `· ${user.email}` : ''}</p>
                    <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wide ${statusColors[user.accountStatus] || statusColors.active}`}>
                      {user.accountStatus}
                    </span>
                  </div>
                </div>
              )}
              <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Stats Bar */}
            {user && (
              <div className="grid grid-cols-3 border-b border-gray-100 shrink-0">
                {[
                  { label: 'Posts', value: user.stats?.posts ?? 0 },
                  { label: 'Donations', value: user.stats?.donations ?? 0 },
                  { label: 'Invitations', value: user.stats?.invitations ?? 0 },
                ].map(s => (
                  <div key={s.label} className="py-3 text-center border-r border-gray-100 last:border-r-0">
                    <p className="text-xl font-black text-gray-900">{s.value}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex overflow-x-auto no-scrollbar border-b border-gray-100 shrink-0 px-4 bg-white">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-3.5 text-xs font-bold whitespace-nowrap transition-all relative ${
                      isActive ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                    {isActive && (
                      <motion.div layoutId="drawerTabBar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-brand-primary" />
                </div>
              )}
              {!loading && !user && (
                <div className="text-center py-20 text-gray-400">Failed to load user details.</div>
              )}
              {!loading && user && (
                <>
                  {/* Personal Info */}
                  {activeTab === 'personal' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                        <Field label="Full Name" value={user.name} />
                        <Field label="Gender" value={user.gender} />
                        <Field label="Date of Birth" value={user.dob ? new Date(user.dob).toLocaleDateString('en-IN') : null} />
                        <Field label="Blood Group" value={user.bloodGroup} />
                        <Field label="Marital Status" value={user.maritalStatus} />
                        <Field label="Gotra" value={user.gotra} />
                        <Field label="Phone" value={user.phone} />
                        <Field label="Email" value={user.email} />
                        <Field label="Alternate Phone" value={user.alternatePhone} />
                        <Field label="Alternate Email" value={user.alternateEmail} />
                      </div>
                      <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Address</p>
                        <p className="text-sm font-medium text-gray-700">
                          {[user.houseNumber, user.streetAddress, user.landmark, user.areaAddress, user.city, user.district, user.state, user.pincode].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Community */}
                  {activeTab === 'community' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between p-4 bg-purple-50/60 border border-purple-100 rounded-2xl">
                        <div>
                          <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                            <Building2 size={16} className="text-purple-600" /> Member Samaj / Community
                          </p>
                          <p className="text-sm font-black text-slate-800 mt-1">
                            {user.community || 'Not Assigned'} {user.subCommunity ? `(${user.subCommunity})` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditCommunityOpen(true)}
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          ✏️ Edit Samaj
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                        <Field label="Community" value={user.community} />
                        <Field label="Sub-Community" value={user.subCommunity} />
                        <Field label="City" value={user.city} />
                        <Field label="District" value={user.district} />
                        <Field label="State" value={user.state} />
                        <Field label="Registration Source" value={user.registrationSource} />
                      </div>

                      {/* Head Status Banner */}
                      {user.headStatus === 'unassigned' || !user.hasHead ? (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                              <span>🔴</span> No Community Head Assigned
                            </p>
                            <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                              This member registered in {user.city || 'unassigned city'}, where no Samaj Head is assigned yet.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAssignHeadOpen(true)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm flex items-center gap-1.5 transition-all"
                          >
                            <Crown size={14} className="text-amber-300" /> Assign Head
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                              <span>🟢</span> Community Head Assigned
                            </p>
                            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                              Active Head: <strong>{user.headName || 'Assigned'}</strong> ({user.headPhone || 'Active'})
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Professional */}
                  {activeTab === 'professional' && (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      <Field label="Profession" value={user.profession} />
                      <Field label="Company" value={user.company} />
                      <Field label="Work City" value={user.workCity} />
                      <Field label="Annual Income" value={user.annualIncome} />
                      <Field label="Qualification" value={user.qualification} />
                      <Field label="School/College" value={user.school} />
                      <Field label="Passing Year" value={user.passingYear} />
                    </div>
                  )}

                  {/* Family */}
                  {activeTab === 'family' && (
                    <div className="space-y-3">
                      {user.familyMembers?.length === 0 ? (
                        <p className="text-gray-400 text-sm italic text-center py-10">No family members added.</p>
                      ) : (
                        user.familyMembers?.map((m, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-2 gap-3">
                            <Field label="Name" value={m.name} />
                            <Field label="Relation" value={m.relation} />
                            <Field label="Age" value={m.age} />
                            <Field label="Phone" value={m.phone || m.mobile} />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Activity */}
                  {activeTab === 'activity' && (
                    <div className="space-y-3">
                      {!user.activityFeed || user.activityFeed.length === 0 ? (
                        <p className="text-gray-400 text-sm italic text-center py-10">No recent activity found.</p>
                      ) : (
                        user.activityFeed.map((item, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all">
                            <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                              <Activity size={14} className="text-brand-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-900">{item.type}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-500">{item.module}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(item.date).toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Account */}
                  {activeTab === 'account' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account Status</p>
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wide ${statusColors[user.accountStatus] || statusColors.active}`}>
                            {user.accountStatus}
                          </span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Verification Status</p>
                          <span className="text-sm font-bold text-gray-700 capitalize">{user.verificationStatus}</span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 col-span-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Member Since</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Assign Head Modal from Drawer */}
            <AssignHeadModal
              user={user}
              isOpen={isAssignHeadOpen}
              onClose={() => setIsAssignHeadOpen(false)}
              onSuccess={() => {
                setIsAssignHeadOpen(false);
                if (onActionComplete) onActionComplete();
              }}
            />

            {/* Edit Samaj / Community Modal from Drawer */}
            <EditUserCommunityModal
              user={user}
              isOpen={isEditCommunityOpen}
              onClose={() => setIsEditCommunityOpen(false)}
              onSuccess={async () => {
                setIsEditCommunityOpen(false);
                if (userId) {
                  try {
                    const data = await userService.getUserById(userId);
                    setUser(data);
                  } catch (e) {}
                }
                if (onActionComplete) onActionComplete();
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
