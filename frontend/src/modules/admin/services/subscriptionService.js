// Plans, communities & assignment are wired to the real backend (see bottom of file).
// Subscribers/coupons/invoices/audit/overview-stats below remain mock — a separate,
// much larger billing/metering build that wasn't part of this request.
import { axiosPrivate } from '../../../core/api/axiosPrivate';

const BASE = '/admin/subscriptions';

const MOCK_SUBSCRIBERS = [
  {
    id: 'sub_1',
    communityId: 'c_1',
    communityName: 'Global Maheshwari Samaj',
    headName: 'Rajendra Maheshwari',
    planId: 'plan_3',
    planName: 'Enterprise Edition',
    status: 'active',
    autoRenewal: true,
    startDate: '2025-01-15T00:00:00Z',
    renewalDate: '2026-01-15T00:00:00Z',
    usage: {
      membersUsed: 12500,
      membersLimit: 'unlimited',
      storageUsed: '45.2GB',
      storageLimit: '100GB',
      eventsUsed: 142,
      eventsLimit: 'unlimited',
      professionalListings: 450,
      matrimonialProfiles: 1200
    }
  },
  {
    id: 'sub_2',
    communityId: 'c_2',
    communityName: 'Agrawal Vikas Trust',
    headName: 'Sunil Agrawal',
    planId: 'plan_2',
    planName: 'Premium Edition',
    status: 'active',
    autoRenewal: false,
    startDate: '2025-06-10T00:00:00Z',
    renewalDate: '2026-06-10T00:00:00Z',
    usage: {
      membersUsed: 1850,
      membersLimit: 2000,
      storageUsed: '22.1GB',
      storageLimit: '25GB',
      eventsUsed: 45,
      eventsLimit: 'unlimited',
      professionalListings: 120,
      matrimonialProfiles: 340
    }
  },
  {
    id: 'sub_3',
    communityId: 'c_3',
    communityName: 'Jain Social Group',
    headName: 'Amit Jain',
    planId: 'plan_1',
    planName: 'Basic Edition',
    status: 'grace_period',
    autoRenewal: false,
    startDate: '2024-07-05T00:00:00Z',
    renewalDate: '2025-07-05T00:00:00Z',
    usage: {
      membersUsed: 490,
      membersLimit: 500,
      storageUsed: '4.8GB',
      storageLimit: '5GB',
      eventsUsed: 5,
      eventsLimit: 5,
      professionalListings: 0,
      matrimonialProfiles: 0
    }
  }
];

const MOCK_COUPONS = [
  {
    id: 'coup_1',
    code: 'WELCOME50',
    name: 'New Community Launch',
    discountType: 'percentage',
    discountValue: 50,
    usageLimit: 100,
    remainingUses: 42,
    startDate: '2025-01-01T00:00:00Z',
    expiryDate: '2025-12-31T00:00:00Z',
    status: 'active',
    communityRestriction: null,
    planRestriction: null
  },
  {
    id: 'coup_2',
    code: 'FESTIVAL2000',
    name: 'Diwali Special Fixed',
    discountType: 'fixed',
    discountValue: 2000,
    usageLimit: 500,
    remainingUses: 0,
    startDate: '2024-10-01T00:00:00Z',
    expiryDate: '2024-11-15T00:00:00Z',
    status: 'expired',
    communityRestriction: null,
    planRestriction: ['plan_2', 'plan_3']
  }
];

const MOCK_INVOICES = [
  {
    id: 'INV-2025-001',
    communityName: 'Global Maheshwari Samaj',
    planName: 'Enterprise Edition',
    amount: 59999,
    gateway: 'Razorpay',
    status: 'paid',
    invoiceDate: '2025-01-15T10:30:00Z',
    paymentDate: '2025-01-15T10:32:00Z',
  },
  {
    id: 'INV-2025-042',
    communityName: 'Agrawal Vikas Trust',
    planName: 'Premium Edition',
    amount: 24999,
    gateway: 'Stripe',
    status: 'paid',
    invoiceDate: '2025-06-10T14:15:00Z',
    paymentDate: '2025-06-10T14:20:00Z',
  },
  {
    id: 'INV-2025-089',
    communityName: 'Jain Social Group',
    planName: 'Basic Edition',
    amount: 9999,
    gateway: 'Razorpay',
    status: 'failed',
    invoiceDate: '2025-07-05T09:00:00Z',
    paymentDate: null,
  }
];

const MOCK_AUDIT_LOGS = [
  { id: 'aud_1', action: 'Plan Created', performedBy: 'Super Admin', timestamp: '2025-01-10T09:00:00Z', details: 'Created Enterprise Edition' },
  { id: 'aud_2', action: 'Price Changed', performedBy: 'Super Admin', timestamp: '2025-02-15T14:30:00Z', details: 'Updated Basic Edition monthly price' },
  { id: 'aud_3', action: 'Subscription Renewed', performedBy: 'System (Auto)', timestamp: '2025-06-10T00:01:00Z', details: 'Agrawal Vikas Trust renewed Premium' },
  { id: 'aud_4', action: 'Coupon Created', performedBy: 'Marketing Admin', timestamp: '2025-01-01T10:00:00Z', details: 'WELCOME50 created' }
];

const MOCK_OVERVIEW_STATS = {
  totalPlans: 3,
  activeSubscribers: 142,
  expiredSubscribers: 12,
  mrr: 450000,
  arr: 5400000,
  totalRevenue: 12500000,
  renewalRate: 94.2,
  churnRate: 2.1,
  trialUsers: 28,
  enterpriseCustomers: 45,
  pendingRenewals: 18,
  revenueTrend: [
    { month: 'Jan', revenue: 380000 },
    { month: 'Feb', revenue: 410000 },
    { month: 'Mar', revenue: 425000 },
    { month: 'Apr', revenue: 400000 },
    { month: 'May', revenue: 430000 },
    { month: 'Jun', revenue: 450000 }
  ]
};

class SubscriptionService {
  async getOverviewStats() {
    return new Promise(resolve => setTimeout(() => resolve({ ...MOCK_OVERVIEW_STATS }), 800));
  }

  async getPlans() {
    const res = await axiosPrivate.get(`${BASE}/plans`);
    return res.data?.data?.plans || [];
  }

  async getCommunities() {
    const res = await axiosPrivate.get(`${BASE}/communities`);
    return res.data?.data?.communities || [];
  }

  async assignPlan(communityId, planId) {
    const res = await axiosPrivate.post(`${BASE}/assign`, { communityId, planId });
    return res.data;
  }

  async getSubscribers() {
    return new Promise(resolve => setTimeout(() => resolve([...MOCK_SUBSCRIBERS]), 700));
  }

  async getCoupons() {
    return new Promise(resolve => setTimeout(() => resolve([...MOCK_COUPONS]), 500));
  }

  async getInvoices() {
    return new Promise(resolve => setTimeout(() => resolve([...MOCK_INVOICES]), 600));
  }

  async getAuditLogs() {
    return new Promise(resolve => setTimeout(() => resolve([...MOCK_AUDIT_LOGS]), 400));
  }

  async createPlan(data) {
    const res = await axiosPrivate.post(`${BASE}/plans`, data);
    return res.data;
  }

  async updatePlan(id, data) {
    const res = await axiosPrivate.put(`${BASE}/plans/${id}`, data);
    return res.data;
  }

  async deletePlan(id) {
    const res = await axiosPrivate.delete(`${BASE}/plans/${id}`);
    return res.data;
  }
}

export const subscriptionService = new SubscriptionService();
