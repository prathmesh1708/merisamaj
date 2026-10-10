/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import donationService from '../../../../core/api/donationService';
import { useData } from '../../context/DataProvider';
import { useAuth } from '../../../../core/auth/useAuth';
import { loadRazorpayScript } from '../../../../core/utils/razorpayLoader';

const DonationContext = createContext(null);

export const DonationProvider = ({ children }) => {
  const { currentUser } = useData();
  const { auth } = useAuth();
  const [purposes, setPurposes] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  const [topDonors, setTopDonors] = useState([]);
  const [impactStats, setImpactStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDonationData = async () => {
    try {
      setIsLoading(true);
      const [campaignsRes, historyRes, statsRes] = await Promise.all([
        donationService.getCampaigns(),
        donationService.getHistory(),
        donationService.getStats()
      ]);

      if (campaignsRes.status === 'success' || campaignsRes.success) {
        setPurposes(campaignsRes.data);
      }
      if (historyRes.status === 'success' || historyRes.success) {
        setDonationHistory(historyRes.data);
      }
      if (statsRes.status === 'success' || statsRes.success) {
        setTopDonors(statsRes.data?.topDonors || []);
        setImpactStats(statsRes.data?.impactStats || []);
      }
    } catch (error) {
      console.error("Failed to fetch donation data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const userId = auth.user?._id || auth.user?.id;

  useEffect(() => {
    if (auth.isAuthenticated && userId) {
      fetchDonationData();
    } else {
      setDonationHistory([]);
      setPurposes([]);
      setTopDonors([]);
      setImpactStats([]);
    }
  }, [auth.isAuthenticated, userId]);

  const makeDonation = async (purposeId, amount, type, donorName) => {
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert('Razorpay Payment Gateway SDK failed to load. Please check your internet connection.');
        return null;
      }

      const orderRes = await donationService.createOrder({
        purposeId,
        amount,
        type,
        donorName
      });

      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || 'Failed to create payment order.');
      }

      const { order_id, amount: orderAmount, currency, key } = orderRes.data;

      return new Promise((resolve) => {
        const options = {
          key: key || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: orderAmount,
          currency: currency || 'INR',
          name: 'Apni Samaj Donation',
          description: 'Support Noble Cause',
          order_id: order_id,
          prefill: {
            name: donorName || currentUser?.name || '',
            email: currentUser?.email || '',
            contact: currentUser?.phone || currentUser?.mobile || ''
          },
          theme: { color: '#4F46E5' },
          handler: async (response) => {
            try {
              const verifyRes = await donationService.verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                purposeId,
                amount,
                donorName,
                type
              });

              if (verifyRes.success || verifyRes.status === 'success') {
                await fetchDonationData();
                resolve(verifyRes.data);
              } else {
                alert(verifyRes.message || 'Payment verification failed.');
                resolve(null);
              }
            } catch (err) {
              alert(err.response?.data?.message || err.message || 'Payment verification failed.');
              resolve(null);
            }
          },
          modal: {
            ondismiss: () => {
              alert('Payment cancelled.');
              resolve(null);
            }
          }
        };

        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.on('payment.failed', (resp) => {
          alert(resp.error?.description || 'Payment failed.');
          resolve(null);
        });
        razorpayInstance.open();
      });
    } catch (error) {
      console.error("Failed to submit donation:", error);
      alert(error.response?.data?.message || error.message || 'Payment initiation failed.');
      return null;
    }
  };

  return (
    <DonationContext.Provider value={{ purposes, donationHistory, topDonors, impactStats, isLoading, makeDonation }}>
      {children || <Outlet />}
    </DonationContext.Provider>
  );
};

export const useDonation = () => {
  const context = useContext(DonationContext);
  if (!context) {
    throw new Error('useDonation must be used within a DonationProvider');
  }
  return context;
};
