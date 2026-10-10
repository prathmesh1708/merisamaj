// Banner Management Service

const initialBanners = [
  {
    id: 'b-1',
    type: 'hero',
    title: 'Welcome to ApniSamaj Community',
    subtitle: 'Connecting hearts and minds of our community globally.',
    description: 'Join today and participate in exclusive events, matrimonial connections, and localized directory listings.',
    ctaText: 'Register Now',
    ctaLink: '/member/register',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=60',
    mobileImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=60',
    startDate: '2026-07-01',
    endDate: '2027-07-01',
    status: 'Published',
    priority: 10,
    targetAudience: 'All',
    displayOrder: 1,
    createdAt: '2026-07-01T12:00:00Z',
    updatedAt: '2026-07-01T12:00:00Z'
  },
  {
    id: 'b-2',
    type: 'home',
    title: 'Annual Youth Festival 2026',
    subtitle: 'Celebrating talent, career, and culture',
    description: 'Participate in the upcoming talent showcases and educational awards on September 15th.',
    ctaText: 'View Details',
    ctaLink: '/member/events',
    imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=60',
    mobileImageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=60',
    startDate: '2026-07-10',
    endDate: '2026-09-16',
    status: 'Scheduled',
    priority: 8,
    targetAudience: 'Members',
    displayOrder: 2,
    createdAt: '2026-07-05T09:30:00Z',
    updatedAt: '2026-07-05T09:30:00Z'
  },
  {
    id: 'b-3',
    type: 'promo',
    title: 'Premium Matrimony Support',
    subtitle: 'Find your perfect life partner today',
    description: 'Upgrade to our Premium Matrimony Plan and get access to hand-picked verified profiles.',
    ctaText: 'Upgrade Now',
    ctaLink: '/member/matrimonial',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=60',
    mobileImageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=60',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    status: 'Published',
    priority: 5,
    targetAudience: 'Members',
    displayOrder: 3,
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z'
  }
];

class BannerService {
  constructor() {
    this.banners = [...initialBanners];
  }

  async getAllBanners() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...this.banners].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async createBanner(bannerData) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newBanner = {
      ...bannerData,
      id: `b-${Date.now()}`,
      displayOrder: this.banners.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: Number(bannerData.priority) || 1
    };
    this.banners.push(newBanner);
    return newBanner;
  }

  async updateBanner(id, updatedData) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = this.banners.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Banner not found');
    
    this.banners[index] = {
      ...this.banners[index],
      ...updatedData,
      updatedAt: new Date().toISOString(),
      priority: Number(updatedData.priority) || this.banners[index].priority
    };
    return this.banners[index];
  }

  async deleteBanner(id) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = this.banners.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Banner not found');
    const deleted = this.banners[index];
    this.banners.splice(index, 1);
    
    // Reset order
    this.banners.forEach((b, idx) => {
      b.displayOrder = idx + 1;
    });
    
    return deleted;
  }

  async duplicateBanner(id) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const banner = this.banners.find(b => b.id === id);
    if (!banner) throw new Error('Banner not found');
    
    const newBanner = {
      ...banner,
      id: `b-${Date.now()}`,
      title: `${banner.title} (Copy)`,
      displayOrder: this.banners.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.banners.push(newBanner);
    return newBanner;
  }

  async toggleBannerStatus(id) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const index = this.banners.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Banner not found');
    
    const currentStatus = this.banners[index].status;
    this.banners[index].status = currentStatus === 'Published' ? 'Archived' : 'Published';
    this.banners[index].updatedAt = new Date().toISOString();
    return this.banners[index];
  }

  async reorderBanners(orderedIds) {
    await new Promise(resolve => setTimeout(resolve, 300));
    orderedIds.forEach((id, index) => {
      const banner = this.banners.find(b => b.id === id);
      if (banner) {
        banner.displayOrder = index + 1;
      }
    });
    return [...this.banners].sort((a, b) => a.displayOrder - b.displayOrder);
  }
}

export const bannerService = new BannerService();
