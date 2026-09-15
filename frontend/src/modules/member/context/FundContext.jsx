import React, { createContext, useContext, useState, useEffect } from 'react';
import fundService from '../../../core/api/fundService';
import { useAuth } from '../../../core/auth/useAuth';
import { loadRazorpayScript } from '../../../core/utils/razorpayLoader';

const FundContext = createContext();

export const useFund = () => useContext(FundContext);

export const FundProvider = ({ children }) => {
  const { auth } = useAuth();
  
  const [funds, setFunds] = useState([]);
  const [contributions, setContributions] = useState({});
  const [expenses, setExpenses] = useState({});
  const [mockUsers, setMockUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Resolve logged-in user dynamically from session
  const currentUserId = auth.user?.id || auth.user?._id || '';
  const isAdmin = ['admin', 'head'].includes(auth.user?.role || '');

  // User info for Razorpay prefill
  const currentUser = auth.user || null;

  const fetchFundsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fundService.getFundsData();
      if (res.success && res.data) {
        setFunds(res.data.funds || []);
        setContributions(res.data.contributions || {});
        setExpenses(res.data.expenses || {});
        setMockUsers(res.data.mockUsers || []);
      }
    } catch (err) {
      console.error('Failed to fetch funds data:', err);
      setError('Failed to load Samaj funds data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      if (typeof window !== 'undefined' && window.location.pathname.includes('/fund')) {
        fetchFundsData();
      } else {
        setLoading(false);
      }
    } else {
      // Reset state on logout
      setFunds([]);
      setContributions({});
      setExpenses({});
      setMockUsers([]);
      setLoading(false);
    }
  }, [auth.isAuthenticated, currentUserId]);

  // Get funds assigned to a specific user (or all if admin viewing global)
  const getUserFunds = (userId) => {
    return funds.filter(fund => fund.assignedMembers.includes(userId));
  };

  const getFundById = (fundId) => funds.find(f => f.id === fundId);
  const getContributionsByFund = (fundId) => contributions[fundId] || [];
  const getExpensesByFund = (fundId) => expenses[fundId] || [];

  const getUserContribution = (fundId, userId) => {
    const fundContribs = getContributionsByFund(fundId);
    return fundContribs.find(c => c.memberId === userId);
  };

  // ── Legacy makePayment (kept for backward compatibility) ─────────────────────
  const makePayment = async (fundId, userId, amount, paymentMethod) => {
    try {
      const details = { paymentMethod };
      const res = await fundService.payFund(fundId, amount, details);
      if (res.success) {
        await fetchFundsData();
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      console.error('Payment error:', err);
      return { success: false, message: 'Server error occurred during payment processing.' };
    }
  };

  /**
   * razorpayMakePayment — Production-grade Razorpay-backed fund contribution.
   *
   * Flow:
   *   1. Load Razorpay SDK
   *   2. POST /member/fund/create-order  → get order_id
   *   3. Open Razorpay Checkout
   *   4. On success → POST /member/fund/verify-payment
   *   5. On cancel  → Return { cancelled: true }
   *   6. On failure → Return { success: false, message }
   *
   * @param {string}   fundId    - MongoDB Fund _id
   * @param {number}   amount    - Amount in INR
   * @param {object}   callbacks - { onSuccess, onCancel, onFailure } — all optional
   */
  const razorpayMakePayment = async (fundId, amount, callbacks = {}) => {
    const { onSuccess, onCancel, onFailure } = callbacks;

    try {
      // 1. Load Razorpay SDK
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        const msg = 'Razorpay Payment Gateway SDK failed to load. Please check your internet connection.';
        if (onFailure) onFailure(msg);
        return { success: false, message: msg };
      }

      // 2. Create Razorpay Order on backend
      const orderRes = await fundService.createFundOrder(fundId, amount);
      if (!orderRes.success || !orderRes.data) {
        const msg = orderRes.message || 'Failed to create payment order.';
        if (onFailure) onFailure(msg);
        return { success: false, message: msg };
      }

      const { order_id, amount: orderAmount, currency, key } = orderRes.data;

      // 3. Open Razorpay Checkout — returns a promise that resolves on dismiss / error
      return new Promise((resolve) => {
        const options = {
          key:         key || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount:      orderAmount,
          currency:    currency || 'INR',
          name:        'Meri Samaj Fund',
          description: `Fund Contribution`,
          order_id,
          prefill: {
            name:    currentUser?.name    || '',
            email:   currentUser?.email   || '',
            contact: currentUser?.phone   || currentUser?.mobile || ''
          },
          theme: { color: '#4F46E5' },

          // 4. Payment success handler
          handler: async (response) => {
            try {
              const verifyRes = await fundService.verifyFundPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
                fundId,
                amount
              });

              if (verifyRes.success) {
                await fetchFundsData(); // Refresh all panels: Member + Admin + Head
                if (onSuccess) onSuccess(verifyRes.data);
                resolve({ success: true, data: verifyRes.data });
              } else {
                const msg = verifyRes.message || 'Payment verification failed.';
                if (onFailure) onFailure(msg);
                resolve({ success: false, message: msg });
              }
            } catch (verifyErr) {
              const msg = verifyErr?.response?.data?.message || verifyErr.message || 'Payment verification failed.';
              if (onFailure) onFailure(msg);
              resolve({ success: false, message: msg });
            }
          },

          // 5. Dismiss / cancel handler
          modal: {
            ondismiss: () => {
              if (onCancel) onCancel();
              resolve({ success: false, cancelled: true, message: 'Payment cancelled.' });
            }
          }
        };

        const razorpayInstance = new window.Razorpay(options);

        razorpayInstance.on('payment.failed', (response) => {
          const msg = response.error?.description || 'Payment failed. Please try again.';
          if (onFailure) onFailure(msg);
          resolve({ success: false, message: msg });
        });

        razorpayInstance.open();
      });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Payment initiation failed.';
      if (onFailure) onFailure(msg);
      return { success: false, message: msg };
    }
  };

  const addFund = async (newFundData) => {
    try {
      const res = await fundService.addFund(newFundData);
      if (res.success) {
        await fetchFundsData();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error('Failed to create fund:', err);
      return { success: false };
    }
  };

  const addExpense = async (fundId, expenseData) => {
    try {
      const res = await fundService.addExpense(fundId, expenseData);
      if (res.success) {
        await fetchFundsData();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error('Failed to add expense:', err);
      return { success: false };
    }
  };

  return (
    <FundContext.Provider value={{
      funds,
      contributions,
      expenses,
      currentUserId,
      currentUser,
      isAdmin,
      loading,
      error,
      getUserFunds,
      getFundById,
      getContributionsByFund,
      getExpensesByFund,
      getUserContribution,
      makePayment,
      razorpayMakePayment,
      addFund,
      addExpense,
      mockUsers,
      fetchFundsData
    }}>
      {children}
    </FundContext.Provider>
  );
};

