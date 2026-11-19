import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, Lock, Image as ImageIcon, EyeOff, AlertCircle } from 'lucide-react';
import { userService } from '../../../services/userService';

const Field = ({ label, value, mono = false }) => (
  <div>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono tracking-wide' : ''}`}>{value || '—'}</p>
  </div>
);

const formatDate = (value, withTime = false) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value; // UIDAI DOB may come as DD-MM-YYYY text
  return withTime
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Admin-only "Aadhaar Details" (GET /admin/users/:id/aadhaar). Opening this tab and
 * loading the photo are both recorded in the server's Aadhaar access log.
 */
export const AadhaarDetailsPanel = ({ userId }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    let cancelled = false;
    userService.getUserAadhaar(userId)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => {
        if (cancelled) return;
        setError(e.response?.status === 403
          ? 'Only Admins can view Aadhaar details.'
          : (e.response?.data?.message || 'Failed to load Aadhaar details.'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  // Never keep the decrypted photo around after leaving the tab
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const loadPhoto = async () => {
    setPhotoLoading(true);
    setPhotoError('');
    try {
      setPhotoUrl(await userService.getUserAadhaarPhotoUrl(userId));
    } catch (e) {
      setPhotoError(e.response?.status === 403 ? 'Only Admins can view the Aadhaar photo.' : 'Could not load the Aadhaar photo.');
    } finally {
      setPhotoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-sm font-semibold text-rose-700">
        <Lock size={16} /> {error}
      </div>
    );
  }

  const verified = data?.isAadhaarVerified;

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${verified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        {verified ? <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" /> : <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />}
        <div>
          <p className={`text-sm font-black ${verified ? 'text-emerald-800' : 'text-amber-800'}`}>
            {verified ? '✔ Aadhaar Verified' : 'Aadhaar Not Verified'}
          </p>
          <p className={`text-[11px] font-medium mt-0.5 ${verified ? 'text-emerald-700' : 'text-amber-700'}`}>
            {data?.source === 'uidai_otp' && `Verified with ${data.method || 'Aadhaar OTP'} on ${formatDate(data.verifiedAt, true) || '—'}`}
            {data?.source === 'manual' && 'Marked verified by a Community Head (no UIDAI check), so no Aadhaar details exist.'}
            {!verified && 'This member has not completed Aadhaar verification.'}
          </p>
        </div>
      </div>

      {verified && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Full Name (as on Aadhaar)" value={data.aadhaarVerifiedName} />
              <Field label="Aadhaar Number" value={data.aadhaarMasked} mono />
              <Field label="Date of Birth" value={formatDate(data.dob)} />
              <Field label="Gender" value={data.gender} />
              <Field label="Verified On" value={formatDate(data.verifiedAt, true)} />
              <Field label="Method" value={data.method} />
              <Field label="Reference ID" value={data.referenceId} mono />
              <Field label="Provider" value={data.provider ? `${data.provider}${data.mode && data.mode !== 'live' ? ` (${data.mode})` : ''}` : null} />
            </div>

            {/* UIDAI photo — loaded on request through the authenticated endpoint */}
            <div className="w-36 shrink-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Aadhaar Photo</p>
              <div className="w-36 h-44 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                {photoUrl ? (
                  <img src={photoUrl} alt="Aadhaar holder" className="w-full h-full object-cover" />
                ) : data.hasPhoto ? (
                  <button
                    type="button"
                    onClick={loadPhoto}
                    disabled={photoLoading}
                    className="flex flex-col items-center gap-1.5 text-xs font-bold text-brand-primary disabled:opacity-60 cursor-pointer"
                  >
                    {photoLoading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={22} />}
                    {photoLoading ? 'Loading…' : 'Show photo'}
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-400 font-semibold text-center px-3">No photo stored</span>
                )}
              </div>
              {photoError && <p className="text-[11px] text-rose-600 font-semibold mt-1.5">{photoError}</p>}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Address (as on Aadhaar)</p>
            <p className="text-sm font-medium text-gray-700">{data.address || '—'}</p>
          </div>

          {!data.detailsStored && data.source === 'uidai_otp' && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2 text-[11px] font-semibold text-blue-800">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              Verified before Aadhaar details were stored — only the name and last 4 digits are available.
            </div>
          )}
          {data.detailsReadable === false && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-semibold text-rose-700">
              Stored details could not be decrypted. Check the server's AADHAAR_DATA_KEY.
            </div>
          )}
        </>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
        <EyeOff size={12} /> The full Aadhaar number is never stored. Every view of this tab and of the photo is logged.
      </p>
    </div>
  );
};

export default AadhaarDetailsPanel;
