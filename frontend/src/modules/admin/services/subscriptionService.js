// Mock data for Enterprise Subscription Management

const MOCK_PLANS = [
  {
    id: 'plan_1',
    name: 'Basic Edition',
    description: 'Perfect for small communities starting their digital journey.',
    monthlyPrice: 999,
    quarterlyPrice: 2700,
    yearlyPrice: 9999,
    currency: 'INR',
    billingCycle: 'monthly',
    trialDays: 14,
    status: 'active',
    badge: 'Popular',
    displayOrder: 1,
    features: {
      maxMembers: 500,
      maxHeads: 3,
      maxEvents: 5,
      professionalDirectory: false,
      matrimonial: false,
      announcements: true,
      notifications: true,
      broadcast: false,
      reports: 'basic',
      analytics: false,
      storage: '5GB',
      apiAccess: false,
      prioritySupport: false,
      customBranding: false,
    }
  },
  {
    id: 'plan_2',
    name: 'Premium Edition',
    description: 'Advanced features for growing and active communities.',
    monthlyPrice: 2499,
    quarterlyPrice: 6999,
    yearlyPrice: 24999,
    currency: 'INR',
    billingCycle: 'monthly',
    trialDays: 14,
    status: 'active',
    badge: 'Recommended',
    displayOrder: 2,
    features: {
      maxMembers: 2000,
      maxHeads: 10,
      maxEvents: 'unlimited',
      professionalDirectory: true,
      matrimonial: true,
      announcements: true,
      notifications: true,
      broadcast: true,
      reports: 'advanced',
      analytics: true,
      storage: '25GB',
      apiAccess: false,
      prioritySupport: true,
      customBranding: false,
    }
  },
  {
    id: 'plan_3',
    name: 'Enterprise Edition',
    description: 'Unlimited scale and dedicated support for large organizations.',
    monthlyPrice: 5999,
    quarterlyPrice: 16999,
    yearlyPrice: 59999,
    currency: 'INR',
    billingCycle: 'yearly',
    trialDays: 30,
    status: 'active',
    badge: 'Enterprise',
    displayOrder: 3,
    features: {
      maxMembers: 'unlimited',
      maxHeads: 'unlimited',
      maxEvents: 'unlimited',
      professionalDirectory: true,
      matrimonial: true,
      announcements: true,
      notifications: true,
      broadcast: true,
      reports: 'custom',
      analytics: true,
      storage: '100GB',
      apiAccess: true,
      prioritySupport: true,
      customBranding: true,
    }
  }
];

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
    return new Promise(resolve => setTimeout(() => resolve([...MOCK_PLANS]), 600));
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

  // Future API mutation hooks
  async createPlan(data) {
    return new Promise(resolve => setTimeout(() => resolve({ success: true, data }), 1000));
  }
  
  async updatePlan(id, data) {
    return new Promise(resolve => setTimeout(() => resolve({ success: true, data }), 1000));
  }
}

export const subscriptionService = new SubscriptionService();
