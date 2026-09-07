import React from 'react';
import { Eye, Edit2, Lock, Trash2, Heart, CheckCircle2, AlertCircle, Globe, Building2 } from 'lucide-react';

export const DonationTable = ({
  donations = [],
  loading = false,
  onView,
  onEdit,
  onClose,
  onDelete
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold">Loading donation campaigns...</p>
      </div>
    );
  }

  if (!donations || donations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
        <Heart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <h3 className="text-base font-bold text-slate-700">No Donations Found</h3>
        <p className="text-xs text-slate-500 mt-1">No donation campaigns match your filter selection.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-slate-700">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Campaign</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Target Scope</th>
              <th className="py-3.5 px-4">Goal & Raised</th>
              <th className="py-3.5 px-4">Donors</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-xs">
            {donations.map((item) => {
              const raised = item.raisedAmount || 0;
              const target = item.targetAmount || 1;
              const percentage = Math.min(100, Math.round((raised / target) * 100));

              const isGlobal = item.isGlobalCampaign === true || item.visibility === 'All Members';
              const targetedList = Array.isArray(item.targetedCommunities) ? item.targetedCommunities : [];

              return (
                <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        {item.coverImage ? (
                          <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Heart className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{item.description || item.shortDescription || 'No description'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100">
                      {item.category || 'General'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {isGlobal ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                        <Globe size={12} /> All Communities
                      </span>
                    ) : targetedList.length > 0 ? (
                      <span
                        title={targetedList.map(c => typeof c === 'object' ? c.name : c).join(', ')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200 cursor-help"
                      >
                        <Building2 size={12} />
                        {targetedList.length === 1
                          ? (typeof targetedList[0] === 'object' ? targetedList[0].name : '1 Community')
                          : `${targetedList.length} Communities`}
                      </span>
                    ) : item.communityId ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                        <Building2 size={12} /> {typeof item.communityId === 'object' ? item.communityId.name : 'Single Community'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 font-medium text-[11px]">
                        Unspecified
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="w-36 space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-800">₹{raised.toLocaleString()}</span>
                        <span className="text-slate-400">₹{target.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {item.donorCount || 0} Donors
                  </td>
                  <td className="py-3.5 px-4">
                    {['Active', 'Published', 'Approved'].includes(item.status) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <CheckCircle2 size={10} /> {item.status === 'Published' ? 'Published' : 'Active'}
                      </span>
                    ) : item.status === 'Draft' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        <AlertCircle size={10} /> {item.status || 'Closed'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onView(item)}
                        title="View Details"
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        title="Edit Details"
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                      {['Active', 'Published', 'Approved'].includes(item.status) && (
                        <button
                          onClick={() => onClose(item._id, item.source)}
                          title="Close Donation Drive"
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-600 transition-colors cursor-pointer"
                        >
                          <Lock size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(item._id, item.source)}
                        title="Delete Donation"
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DonationTable;
