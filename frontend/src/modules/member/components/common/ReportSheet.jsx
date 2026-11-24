import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag, Loader2, ShieldAlert, X } from 'lucide-react';
import { safetyReportService } from '../../../../core/api/safetyReportService';

// Reasons a member can pick. Values must match SafetyReport.REASONS on the server;
// child_safety / underage are urgent: the content is hidden at once for review.
const REASONS = [
  ['child_safety', 'Child safety concern', 'Sexual content involving a minor, grooming, or a child at risk'],
  ['underage', 'Person is under 18', 'This account or content belongs to a child'],
  ['sexual_content', 'Nudity or sexual content', ''],
  ['harassment', 'Harassment or bullying', ''],
  ['hate', 'Hate speech', ''],
  ['violence', 'Violence or threats', ''],
  ['spam', 'Spam or scam', ''],
  ['fake_profile', 'Fake account', ''],
  ['other', 'Something else', '']
];

const TITLES = { post: 'Report post', comment: 'Report comment', story: 'Report story', message: 'Report message', user: 'Report member' };

/**
 * Bottom sheet to report a post, comment, story, chat message or member.
 * <ReportSheet open targetType="post" targetId={id} onClose={...} onDone={reason => ...} />
 * Shows its own confirmation; onDone runs after the member closes it (e.g. to hide the item).
 */
export const ReportSheet = ({ open, targetType, targetId, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [doneMessage, setDoneMessage] = useState('');
  const [sentReason, setSentReason] = useState('');

  if (!open) return null;

  const close = () => {
    if (sending) return;
    const wasSent = !!doneMessage;
    setReason(''); setDetails(''); setError(''); setDoneMessage('');
    onClose?.();
    if (wasSent) onDone?.(sentReason);
  };

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await safetyReportService.report({ targetType, targetId, reason, details });
      setSentReason(reason);
      setDoneMessage(res?.message || 'Thank you. Our team will review this report.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send the report. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const urgent = reason === 'child_safety' || reason === 'underage';

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="relative bg-white w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] max-h-[90dvh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[15px] font-black text-slate-800 flex items-center gap-2"><Flag size={16} className="text-rose-500" /> {TITLES[targetType] || 'Report'}</h3>
          <button onClick={close} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {doneMessage ? (
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3"><Flag size={20} /></div>
            <p className="text-[13px] font-bold text-slate-700 leading-relaxed mb-4">{doneMessage}</p>
            <button onClick={close} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[13px] font-bold">Done</button>
          </div>
        ) : (<>
        <p className="text-[11.5px] font-semibold text-slate-500 mb-3">Your report is private. The person will not know who reported them.</p>

        <div className="space-y-1.5 mb-3">
          {REASONS.map(([value, label, hint]) => (
            <button key={value} type="button" onClick={() => setReason(value)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all ${
                reason === value ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100'
              }`}>
              <span className="block text-[13px] font-bold">{label}</span>
              {hint && <span className="block text-[11px] font-semibold text-slate-400 mt-0.5">{hint}</span>}
            </button>
          ))}
        </div>

        {urgent && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-3 flex gap-2.5">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11.5px] font-semibold text-amber-800 leading-relaxed">
              If a child is in danger right now, call <b>112</b> or Childline <b>1098</b>. Do not download or share abusive images — your report is enough.
            </p>
          </div>
        )}

        <textarea
          value={details}
          onChange={e => setDetails(e.target.value.slice(0, 1000))}
          placeholder="Add details (optional)"
          rows={2}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-[13px] text-slate-800 outline-none focus:border-rose-300 resize-none mb-3"
        />

        {error && <p role="alert" className="text-[11.5px] font-bold text-rose-500 mb-2">{error}</p>}

        <button onClick={submit} disabled={!reason || sending}
          className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {sending && <Loader2 size={15} className="animate-spin" />} Submit report
        </button>
        <a href="/child-safety" target="_blank" rel="noreferrer" className="block text-center text-[11px] font-bold text-slate-400 hover:text-rose-500 mt-3">
          Read our Child Safety Policy
        </a>
        </>)}
      </div>
    </div>,
    document.body
  );
};

export default ReportSheet;
