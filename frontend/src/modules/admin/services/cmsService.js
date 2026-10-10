// CMS Master Service
import { bannerService } from './bannerService';
import { faqService } from './faqService';
import { pageService } from './pageService';

const initialContactInfo = {
  address: '102-105, Crystal IT Park, Indore, MP, India',
  phone: '+91 731 400 9000',
  email: 'support@merisamaj.com',
  workingHours: 'Mon - Sat: 10:00 AM - 07:00 PM IST',
  googleMapsLink: 'https://maps.google.com'
};

const initialFooterContent = {
  copyright: '© 2026 ApniSamaj. All Rights Reserved.',
  tagline: 'Fostering unity, bridging families, digitizing heritage.',
  socialLinks: {
    facebook: 'https://facebook.com/merisamaj',
    twitter: 'https://twitter.com/merisamaj',
    instagram: 'https://instagram.com/merisamaj',
    linkedin: 'https://linkedin.com/company/merisamaj'
  },
  usefulLinks: [
    { title: 'About Us', link: '/about' },
    { title: 'Terms of Use', link: '/terms' },
    { title: 'Privacy Policy', link: '/privacy' },
    { title: 'Support Desk', link: '/contact' }
  ]
};

const initialAuditLogs = [
  {
    id: 'log-1',
    action: 'Published',
    module: 'Banners',
    itemId: 'b-1',
    details: 'Published Main Hero Banner "Welcome to ApniSamaj Community"',
    timestamp: '2026-07-01T12:00:00Z',
    user: 'Council Admin'
  },
  {
    id: 'log-2',
    action: 'Created',
    module: 'Pages',
    itemId: 'privacy',
    details: 'Created first version of "Privacy Policy"',
    timestamp: '2026-07-06T15:30:00Z',
    user: 'Master Admin'
  },
  {
    id: 'log-3',
    action: 'Updated',
    module: 'Announcements',
    itemId: 'a-2',
    details: 'Updated schedule for Maintenance Notice',
    timestamp: '2026-07-07T14:00:00Z',
    user: 'Master Admin'
  }
];

class CMSService {
  constructor() {
    this.contactInfo = { ...initialContactInfo };
    this.footerContent = { ...initialFooterContent };
    this.auditLogs = [...initialAuditLogs];
  }

  async getContactInfo() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...this.contactInfo };
  }

  async updateContactInfo(info) {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.contactInfo = { ...this.contactInfo, ...info };
    this.addAuditLog('Updated', 'Contact Settings', 'contact', 'Updated platform contact and support details');
    return this.contactInfo;
  }

  async getFooterContent() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...this.footerContent };
  }

  async updateFooterContent(footer) {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.footerContent = { ...this.footerContent, ...footer };
    this.addAuditLog('Updated', 'Footer Content', 'footer', 'Updated general copyright and footer links');
    return this.footerContent;
  }

  async getAuditLogs() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [...this.auditLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  addAuditLog(action, module, itemId, details) {
    const newLog = {
      id: `log-${Date.now()}`,
      action,
      module,
      itemId,
      details,
      timestamp: new Date().toISOString(),
      user: 'Master Admin'
    };
    this.auditLogs.unshift(newLog);
    return newLog;
  }

  async globalSearch(query) {
    await new Promise(resolve => setTimeout(resolve, 400));
    if (!query) return { banners: [], pages: [], announcements: [], faqs: [] };

    const q = query.toLowerCase();

    const allBanners = await bannerService.getAllBanners();
    const matchedBanners = allBanners.filter(b => 
      b.title.toLowerCase().includes(q) || 
      (b.subtitle && b.subtitle.toLowerCase().includes(q)) || 
      (b.description && b.description.toLowerCase().includes(q))
    );

    const allPages = await pageService.getAllPages();
    const matchedPages = allPages.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.content.toLowerCase().includes(q)
    );

    const allFAQs = await faqService.getFAQs();
    const matchedFAQs = allFAQs.filter(f => 
      f.question.toLowerCase().includes(q) || 
      f.answer.toLowerCase().includes(q)
    );

    return {
      banners: matchedBanners,
      pages: matchedPages,
      announcements: [],
      faqs: matchedFAQs
    };
  }

  async exportData(format, moduleName) {
    await new Promise(resolve => setTimeout(resolve, 500));
    let rawData = [];
    
    if (moduleName === 'Banners') {
      rawData = await bannerService.getAllBanners();
    } else if (moduleName === 'Announcements') {
      rawData = [];
    } else if (moduleName === 'Pages') {
      rawData = await pageService.getAllPages();
    } else if (moduleName === 'FAQs') {
      rawData = await faqService.getFAQs();
    } else {
      rawData = {
        banners: await bannerService.getAllBanners(),
        announcements: [],
        pages: await pageService.getAllPages(),
        faqs: await faqService.getFAQs(),
        contact: this.contactInfo,
        footer: this.footerContent
      };
    }

    if (format === 'JSON') {
      return {
        filename: `cms_${moduleName.toLowerCase()}_export.json`,
        mimeType: 'application/json',
        data: JSON.stringify(rawData, null, 2)
      };
    }

    if (format === 'CSV') {
      // Basic CSV serializer
      let csvContent = '';
      if (Array.isArray(rawData) && rawData.length > 0) {
        const headers = Object.keys(rawData[0]).filter(k => typeof rawData[0][k] !== 'object');
        csvContent += headers.join(',') + '\n';
        rawData.forEach(row => {
          const line = headers.map(h => {
            let cell = row[h] === null || row[h] === undefined ? '' : String(row[h]);
            // escape quotes and commas
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
            return cell;
          });
          csvContent += line.join(',') + '\n';
        });
      } else {
        csvContent = 'No array-based data found for CSV export';
      }

      return {
        filename: `cms_${moduleName.toLowerCase()}_export.csv`,
        mimeType: 'text/csv',
        data: csvContent
      };
    }

    // PDF format (Mock return file descriptor)
    return {
      filename: `cms_${moduleName.toLowerCase()}_export.pdf`,
      mimeType: 'application/pdf',
      data: `[PDF EXPORT FILE STUB - ${moduleName} - ${new Date().toLocaleDateString()}]`
    };
  }
}

export const cmsService = new CMSService();
