import React, { useState } from 'react';
import { useRecognition } from '../hooks/useRecognition';
import { LoadingSkeleton, EmptyState } from '../components/EmptyStates';
import { RecognitionBadge } from '../components/RecognitionBadge';
import { Award, PlusCircle } from 'lucide-react';

export const MemberRecognition = () => {
  const { recognitionData, isLoading, error, awardBadge } = useRecognition();
  const [isAwarding, setIsAwarding] = useState(false);

  const handleAward = async () => {
    setIsAwarding(true);
    // In real app: open a modal to select member and badge
    await awardBadge('dummy-id', 'helping_hand');
    setIsAwarding(false);
  };

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (error) return <EmptyState icon={Award} title="Recognition System Error" message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Member Recognition</h3>
          <p className="text-sm text-gray-500">Award badges to acknowledge community contributions</p>
        </div>
        <button 
          onClick={handleAward}
          disabled={isAwarding}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-colors"
        >
          <PlusCircle size={18} />
          {isAwarding ? 'Awarding...' : 'Award New Badge'}
        </button>
      </div>

      {!recognitionData?.length ? (
        <EmptyState icon={Award} title="No Badges Awarded" message="Start recognizing your community members' efforts!" />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[520px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[12px] uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4">Member Name</th>
                <th className="p-4">Badge</th>
                <th className="p-4">Date Awarded</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recognitionData.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-bold text-[13px] text-gray-800">{rec.memberName}</td>
                  <td className="p-4">
                    <RecognitionBadge typeId={rec.badge} />
                  </td>
                  <td className="p-4 text-[13px] text-gray-500 font-medium">{rec.dateAwarded}</td>
                  <td className="p-4 text-right">
                    <button className="text-[12px] font-bold text-rose-500 hover:text-rose-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
