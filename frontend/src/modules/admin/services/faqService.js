// FAQ Management Service

const initialCategories = [
  { id: 'cat-1', name: 'General & Account', displayOrder: 1 },
  { id: 'cat-2', name: 'Matrimonial Desk', displayOrder: 2 },
  { id: 'cat-3', name: 'Events & RSVPs', displayOrder: 3 },
  { id: 'cat-4', name: 'Security & Verification', displayOrder: 4 }
];

const initialFAQs = [
  {
    id: 'f-1',
    categoryId: 'cat-1',
    question: 'How do I edit my profile details?',
    answer: 'You can edit your details by logging into the member portal, navigating to your Profile page, and clicking the Edit button. Some sensitive information like verification docs require admin review to change.',
    status: 'Active',
    displayOrder: 1
  },
  {
    id: 'f-2',
    categoryId: 'cat-1',
    question: 'What is a member ID code?',
    answer: 'The member ID code is a unique 8-character code assigned to each verified user in ApniSamaj. It is used to easily verify memberships, reference files, and build family trees.',
    status: 'Active',
    displayOrder: 2
  },
  {
    id: 'f-3',
    categoryId: 'cat-2',
    question: 'Who can view my Matrimony profile?',
    answer: 'Only verified members of ApniSamaj who have activated their matrimonial section can search and view profiles. Your privacy preferences can be set to hide contact numbers until request approval.',
    status: 'Active',
    displayOrder: 1
  },
  {
    id: 'f-4',
    categoryId: 'cat-3',
    question: 'How do I register RSVPs for my family members?',
    answer: 'When clicking RSVP on any community event, you will see options to select the number of accompanying family members. Enter their names and click confirm.',
    status: 'Active',
    displayOrder: 1
  },
  {
    id: 'f-5',
    categoryId: 'cat-4',
    question: 'How long does the verification process take?',
    answer: 'Moderators review verification documents within 24 to 48 hours of submission. You will receive an SMS and email notification once your profile is verified and active.',
    status: 'Active',
    displayOrder: 1
  }
];

class FAQService {
  constructor() {
    this.categories = [...initialCategories];
    this.faqs = [...initialFAQs];
  }

  async getCategories() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [...this.categories].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getFAQs(categoryId = null) {
    await new Promise(resolve => setTimeout(resolve, 300));
    let list = [...this.faqs];
    if (categoryId) {
      list = list.filter(f => f.categoryId === categoryId);
    }
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async createCategory(catData) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newCat = {
      ...catData,
      id: `cat-${Date.now()}`,
      displayOrder: this.categories.length + 1
    };
    this.categories.push(newCat);
    return newCat;
  }

  async createFAQ(faqData) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newFAQ = {
      ...faqData,
      id: `f-${Date.now()}`,
      status: faqData.status || 'Active',
      displayOrder: this.faqs.filter(f => f.categoryId === faqData.categoryId).length + 1
    };
    this.faqs.push(newFAQ);
    return newFAQ;
  }

  async updateFAQ(id, updatedData) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = this.faqs.findIndex(f => f.id === id);
    if (index === -1) throw new Error('FAQ not found');
    
    this.faqs[index] = {
      ...this.faqs[index],
      ...updatedData
    };
    return this.faqs[index];
  }

  async deleteFAQ(id) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const index = this.faqs.findIndex(f => f.id === id);
    if (index === -1) throw new Error('FAQ not found');
    const deleted = this.faqs[index];
    this.faqs.splice(index, 1);
    return deleted;
  }

  async reorderFAQs(categoryId, orderedIds) {
    await new Promise(resolve => setTimeout(resolve, 300));
    orderedIds.forEach((id, index) => {
      const faq = this.faqs.find(f => f.id === id);
      if (faq) {
        faq.displayOrder = index + 1;
      }
    });
    return [...this.faqs]
      .filter(f => f.categoryId === categoryId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }
}

export const faqService = new FAQService();
