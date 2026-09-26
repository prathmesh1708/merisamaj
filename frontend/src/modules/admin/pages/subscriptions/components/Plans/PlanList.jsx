import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, Edit2, Trash2 } from 'lucide-react';

export const PlanList = ({ data }) => {
  const { plans } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Subscription Plans</h2>
          <p className="text-xs text-gray-400">Manage available plans and feature matrices</p>
        </div>
        <button className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
          <Plus size={16} /> Create Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-neo p-6 relative group"
          >
            {plan.badge && (
              <div className="absolute -top-3 -right-3 px-3 py-1 bg-brand-primary text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg shadow-brand-primary/30">
                {plan.badge}
              </div>
            )}
            
            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
            <p className="text-xs text-gray-400 mb-6 min-h-[32px]">{plan.description}</p>
            
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-black text-white">₹{plan.monthlyPrice}</span>
              <span className="text-xs text-gray-500 font-medium">/month</span>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3">
                <Check size={14} className="text-brand-primary" />
                <span className="text-sm text-gray-300">Max Members: <strong className="text-white">{plan.features.maxMembers}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <Check size={14} className="text-brand-primary" />
                <span className="text-sm text-gray-300">Storage: <strong className="text-white">{plan.features.storage}</strong></span>
              </div>
              {plan.features.professionalDirectory && (
                <div className="flex items-center gap-3">
                  <Check size={14} className="text-brand-primary" />
                  <span className="text-sm text-gray-300">Professional Directory</span>
                </div>
              )}
              {plan.features.matrimonial && (
                <div className="flex items-center gap-3">
                  <Check size={14} className="text-brand-primary" />
                  <span className="text-sm text-gray-300">Matrimonial Module</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/5">
              <button className="flex-1 btn-secondary py-2 text-xs flex items-center justify-center gap-2">
                <Edit2 size={14} /> Edit Plan
              </button>
              <button className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PlanList;
