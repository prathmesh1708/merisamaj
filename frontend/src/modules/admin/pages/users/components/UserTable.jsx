import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical, Eye, ShieldAlert, CheckCircle2, ShieldBan, Trash2, RotateCcw, Clock,
  ChevronLeft, ChevronRight, User, ShieldCheck, Crown, AlertCircle, Building2
} from 'lucide-react';
import { Avatar } from '../../../../member/components/common/Avatar';
import { StatusChangeModal } from './StatusChangeModal';
import { AssignHeadModal } from './AssignHeadModal';
import { EditUserCommunityModal } from './EditUserCommunityModal';

const statusColors = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-amber-50 text-amber-700 border-amber-200',
  blocked: 'bg-rose-50 text-rose-700 border-rose-200',
  deleted: 'bg-gray-100 text-gray-500 border-gray-200',
  'pending verification': 'bg-blue-50 text-blue-700 border-blue-200',
};

const verifyColors = {
  verified: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const UserTable = ({
  users,
  pagination,
  page,
  onPageChange,
  actionLoading,
  onViewProfile,
  onVerify,
  onSuspend,
  onBlock,
  onActivate,
  onDelete,
  onRefresh,
}) => {
  // ── Dropdown state ──────────────────────────────────────────────────────────
  const [openRow, setOpenRow] = useState(null);       // user object of open row
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);
  const btnRefs = useRef({});                         // map userId → button el

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [modal, setModal] = useState({ open: false, type: null, userId: null, userName: '' });
  const [assignHeadUser, setAssignHeadUser] = useState(null);
  const [editCommunityUser, setEditCommunityUser] = useState(null);

  // ── Close dropdown on outside click ─────────────────────────────────────────
  useEffect(() => {
    if (!openRow) return;
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        !btnRefs.current[openRow.id]?.contains(e.target)
      ) {
        setOpenRow(null);
      }
    };
    // Use setTimeout so this listener doesn't catch the same click that opened it
    const t = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', handler);
    };
  }, [openRow]);

  const handleToggle = useCallback((user) => {
    if (openRow?.id === user.id) {
      setOpenRow(null);
      return;
    }
    const btn = btnRefs.current[user.id];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpenRow(user);
  }, [openRow]);

  const openModal = (type, user) => {
    setOpenRow(null);
    setModal({ open: true, type, userId: user.id, userName: user.name });
  };
  const closeModal = () => setModal({ open: false, type: null, userId: null, userName: '' });

  const handleConfirm = async (reason) => {
    const { type, userId } = modal;
    let result;
    if (type === 'verify') result = await onVerify(userId);
    else if (type === 'suspend') result = await onSuspend(userId, reason);
    else if (type === 'block') result = await onBlock(userId, reason);
    else if (type === 'activate') result = await onActivate(userId);
    else if (type === 'delete') result = await onDelete(userId);
    if (result?.success) closeModal();
  };

  // ── Shared dropdown rendered via portal (outside overflow containers) ────────
  const DropdownMenu = openRow ? createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropPos.top,
        right: dropPos.right,
        zIndex: 9999,
        minWidth: '13rem',
      }}
      className="bg-white border border-gray-100 shadow-2xl rounded-xl overflow-hidden"
    >
      <div className="py-1">
        <button
          onClick={() => { onViewProfile(openRow); setOpenRow(null); }}
          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-brand-primary/5 hover:text-brand-primary flex items-center gap-2 transition-colors"
        >
          <Eye size={14} /> View Profile
        </button>

        <button
          onClick={() => { setEditCommunityUser(openRow); setOpenRow(null); }}
          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
        >
          <Building2 size={14} /> Edit Samaj (समाज बदलें)
        </button>

        <button
          onClick={() => { setAssignHeadUser(openRow); setOpenRow(null); }}
          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 flex items-center gap-2 transition-colors"
        >
          <Crown size={14} /> Assign / Promote Head
        </button>

        {openRow.verificationStatus !== 'verified' && (
          <button
            onClick={() => openModal('verify', openRow)}
            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
          >
            <CheckCircle2 size={14} /> Verify User
          </button>
        )}

        {openRow.accountStatus !== 'active' && (
          <button
            onClick={() => openModal('activate', openRow)}
            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 transition-colors"
          >
            <RotateCcw size={14} /> Activate Account
          </button>
        )}

        {openRow.accountStatus === 'active' && (
          <button
            onClick={() => openModal('suspend', openRow)}
            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 flex items-center gap-2 transition-colors"
          >
            <ShieldAlert size={14} /> Suspend Account
          </button>
        )}

        {openRow.accountStatus !== 'blocked' && (
          <button
            onClick={() => openModal('block', openRow)}
            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
          >
            <ShieldBan size={14} /> Block Account
          </button>
        )}

        <div className="my-1 border-t border-gray-100" />

        <button
          onClick={() => openModal('delete', openRow)}
          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors"
        >
          <Trash2 size={14} /> Delete Account
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Community &amp; Location</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <User size={24} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-semibold">No users found</p>
                      <p className="text-gray-400 text-xs">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Member */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          initials={user.name?.charAt(0) || '?'}
                          imageUrl={user.avatar}
                          size="md"
                          color="bg-purple-100 text-purple-600"
                        />
                        <div>
                          <p className="font-bold text-gray-800">{user.name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{String(user.id).slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-700">{user.phone}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{user.email || '—'}</p>
                    </td>

                    {/* Community & Location */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{user.community || '—'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[user.city, user.state].filter(Boolean).join(', ') || '—'}
                      </p>
                      {user.headStatus === 'unassigned' ? (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            🔴 Head Pending
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setAssignHeadUser(user); }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full transition-all shadow-xs"
                            title="Assign a community head for this member's city"
                          >
                            <Crown size={11} className="text-amber-500" /> Assign
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            🟢 Head: {user.headName || 'Assigned'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Verification */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${verifyColors[user.verificationStatus] || verifyColors.pending}`}>
                        {user.verificationStatus === 'verified'
                          ? <><ShieldCheck size={11} /> Verified</>
                          : user.verificationStatus === 'rejected'
                          ? <><ShieldBan size={11} /> Rejected</>
                          : <><Clock size={11} /> Pending</>
                        }
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wide ${statusColors[user.accountStatus] || statusColors.active}`}>
                        {user.accountStatus}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <button
                        ref={el => { btnRefs.current[user.id] = el; }}
                        onClick={() => handleToggle(user)}
                        className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-700">{((page - 1) * pagination.limit) + 1}–{Math.min(page * pagination.limit, pagination.totalCount)}</span> of <span className="font-bold text-gray-700">{pagination.totalCount}</span> users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={!pagination.hasPrevPage}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-gray-700 px-2">{page} / {pagination.totalPages}</span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={!pagination.hasNextPage}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shared portal dropdown — rendered at document.body, outside all overflow containers */}
      {DropdownMenu}

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={modal.open}
        onClose={closeModal}
        onConfirm={handleConfirm}
        type={modal.type}
        userName={modal.userName}
        loading={actionLoading}
      />

      {/* Assign Head to User / Community Modal */}
      <AssignHeadModal
        user={assignHeadUser}
        isOpen={Boolean(assignHeadUser)}
        onClose={() => setAssignHeadUser(null)}
        onSuccess={() => {
          setAssignHeadUser(null);
          if (onRefresh) onRefresh();
        }}
      />

      {/* Edit User Community / Samaj Modal */}
      <EditUserCommunityModal
        user={editCommunityUser}
        isOpen={Boolean(editCommunityUser)}
        onClose={() => setEditCommunityUser(null)}
        onSuccess={() => {
          setEditCommunityUser(null);
          if (onRefresh) onRefresh();
        }}
      />
    </>
  );
};
