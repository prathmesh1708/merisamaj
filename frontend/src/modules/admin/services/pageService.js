// Page Management Service

const initialPages = [
  {
    id: 'about',
    title: 'About Us',
    slug: 'about-us',
    type: 'static',
    content: `# About ApniSamaj\n\nApniSamaj is a global community platform designed to bridge connections and foster unity. Our vision is to digitize and empower families by providing robust directory, matrimonial, and event systems.\n\n### Our Mission\n- Preserve cultural heritage in the digital age.\n- Simplify event coordination and member directories.\n- Enable safe and verified match-making.\n\nThank you for being part of this initiative!`,
    status: 'Published',
    updatedAt: '2026-07-01T10:00:00Z',
    updatedBy: 'Council Admin',
    versions: [
      {
        versionId: 1,
        title: 'About Us (V1)',
        content: '# About ApniSamaj\n\nInitial draft of the community about page.',
        updatedAt: '2026-06-15T09:00:00Z',
        updatedBy: 'Council Admin'
      },
      {
        versionId: 2,
        title: 'About Us',
        content: `# About ApniSamaj\n\nApniSamaj is a global community platform designed to bridge connections and foster unity. Our vision is to digitize and empower families by providing robust directory, matrimonial, and event systems.\n\n### Our Mission\n- Preserve cultural heritage in the digital age.\n- Simplify event coordination and member directories.\n- Enable safe and verified match-making.\n\nThank you for being part of this initiative!`,
        updatedAt: '2026-07-01T10:00:00Z',
        updatedBy: 'Council Admin'
      }
    ]
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    slug: 'terms-and-conditions',
    type: 'static',
    content: `# Terms and Conditions\n\nWelcome to ApniSamaj. By accessing or using our services, you agree to comply with the terms set forth in this document.\n\n### 1. Membership Eligibility\nOnly members of approved community clusters may create verified accounts. False profiles will be suspended immediately.\n\n### 2. Code of Conduct\nUsers are expected to communicate respectfully in matrimonial chats and community forums. Bulk-messaging or data-scraping is strictly forbidden.\n\n*Last updated: July 2026*`,
    status: 'Published',
    updatedAt: '2026-07-05T12:00:00Z',
    updatedBy: 'Master Admin',
    versions: [
      {
        versionId: 1,
        title: 'Terms & Conditions',
        content: '# Terms and Conditions\n\nInitial draft of Terms and Conditions.',
        updatedAt: '2026-07-05T12:00:00Z',
        updatedBy: 'Master Admin'
      }
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    type: 'static',
    content: `# Privacy Policy\n\nYour privacy is of utmost importance to us. This privacy policy describes what information we collect and how we utilize it.\n\n### 1. Information Collection\nWe collect verification documents (ID proof), address logs, and profile pictures to ensure community safety. These documents are stored securely and are never shared with third parties.\n\n### 2. Matrimonial Profile Privacy\nYou can choose to show or hide your contact numbers in matrimonial settings. All chats inside the platform are encrypted.`,
    status: 'Published',
    updatedAt: '2026-07-06T15:30:00Z',
    updatedBy: 'Master Admin',
    versions: [
      {
        versionId: 1,
        title: 'Privacy Policy',
        content: '# Privacy Policy\n\nInitial privacy policy draft.',
        updatedAt: '2026-07-06T15:30:00Z',
        updatedBy: 'Master Admin'
      }
    ]
  },
  {
    id: 'refund',
    title: 'Refund Policy',
    slug: 'refund-policy',
    type: 'static',
    content: `# Subscription Refund Policy\n\nWe strive to provide premium value to our subscribers. Below are terms regarding financial transactions and refunds.\n\n### 1. Premium Memberships\nRefunds for premium matrimonial and community badges can be requested within 3 business days of activation, provided no profiles have been unlocked during that period.`,
    status: 'Published',
    updatedAt: '2026-07-02T11:00:00Z',
    updatedBy: 'Moderator Desk',
    versions: [
      {
        versionId: 1,
        title: 'Refund Policy',
        content: '# Refund Policy draft.',
        updatedAt: '2026-07-02T11:00:00Z',
        updatedBy: 'Moderator Desk'
      }
    ]
  },
  {
    id: 'rules',
    title: 'Community Guidelines',
    slug: 'community-guidelines',
    type: 'static',
    content: `# ApniSamaj Community Guidelines\n\nTo ensure a peaceful and beneficial community environment, all members must abide by the following guidelines:\n\n1. **Authenticity First**: Use your real name, photo, and verifiable credentials.\n2. **No Harassment**: Matrimonial inquiries must be respectful. Harassment will lead to permanent IP bans.\n3. **Local News Verification**: Do not spread unverified rumors or forward political/sectarian posts.`,
    status: 'Published',
    updatedAt: '2026-07-03T16:00:00Z',
    updatedBy: 'Moderator Desk',
    versions: [
      {
        versionId: 1,
        title: 'Community Guidelines Draft',
        content: '# Guidelines draft.',
        updatedAt: '2026-07-03T16:00:00Z',
        updatedBy: 'Moderator Desk'
      }
    ]
  }
];

class PageService {
  constructor() {
    this.pages = [...initialPages];
  }

  async getAllPages() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...this.pages];
  }

  async getPage(id) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const page = this.pages.find(p => p.id === id);
    if (!page) throw new Error('Page not found');
    return page;
  }

  async createPage(pageData) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newPage = {
      id: pageData.slug || `custom-${Date.now()}`,
      title: pageData.title,
      slug: pageData.slug || `custom-${Date.now()}`,
      type: pageData.type || 'dynamic',
      content: pageData.content || '',
      status: pageData.status || 'Draft',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Master Admin',
      versions: [
        {
          versionId: 1,
          title: pageData.title,
          content: pageData.content || '',
          updatedAt: new Date().toISOString(),
          updatedBy: 'Master Admin'
        }
      ]
    };
    this.pages.push(newPage);
    return newPage;
  }

  async updatePage(id, updatedData) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = this.pages.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Page not found');
    
    const page = this.pages[index];
    const newVersionId = page.versions.length + 1;
    const newVersion = {
      versionId: newVersionId,
      title: updatedData.title || page.title,
      content: updatedData.content || page.content,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Master Admin'
    };
    
    this.pages[index] = {
      ...page,
      ...updatedData,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Master Admin',
      versions: [...page.versions, newVersion]
    };
    return this.pages[index];
  }

  async deletePage(id) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = this.pages.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Page not found');
    const deleted = this.pages[index];
    this.pages.splice(index, 1);
    return deleted;
  }

  async restoreVersion(id, versionId) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = this.pages.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Page not found');
    
    const page = this.pages[index];
    const versionToRestore = page.versions.find(v => v.versionId === versionId);
    if (!versionToRestore) throw new Error('Version not found');
    
    // Add restored version as a new current state version
    const nextVersionId = page.versions.length + 1;
    const newVersionObj = {
      versionId: nextVersionId,
      title: versionToRestore.title,
      content: versionToRestore.content,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Master Admin (Restored)'
    };
    
    this.pages[index] = {
      ...page,
      title: versionToRestore.title,
      content: versionToRestore.content,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Master Admin (Restored)',
      versions: [...page.versions, newVersionObj]
    };
    
    return this.pages[index];
  }
}

export const pageService = new PageService();
