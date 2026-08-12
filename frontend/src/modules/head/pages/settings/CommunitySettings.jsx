import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Palette, LayoutTemplate, Link, UserPlus, FileSpreadsheet, Users, Heart, Calendar, Briefcase, Award, Bell, Mail, MessageSquare, Phone, FileText, Network, Zap, ShieldCheck, ShieldAlert, HardDrive, History, Clock, Settings, Save, Wallet, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommunitySettings } from './hooks/useCommunitySettings';
import { useData } from '../../../member/context/DataProvider';

import { GeneralInfoTab } from './components/GeneralInfoTab';
import { BrandingTab } from './components/BrandingTab';
import { ThemeSettings } from './components/ThemeSettings';
import { HomepageSettings } from './components/HomepageSettings';
import { BankAccountSettings } from './components/BankAccountSettings';
import { RegistrationSettings } from './components/RegistrationSettings';
import { RegistrationFormBuilder } from './components/RegistrationFormBuilder';
import { DirectorySettings } from './components/DirectorySettings';
import { MatrimonialSettings } from './components/MatrimonialSettings';
import { EventSettings } from './components/EventSettings';
import { ProfessionalSettings } from './components/ProfessionalSettings';
import { ObituarySettings } from './components/ObituarySettings';
import { GroupSettings } from './components/GroupSettings';
import { NotificationSettings } from './components/NotificationSettings';
import { EmailTemplates } from './components/EmailTemplates';
import { SmsTemplates } from './components/SmsTemplates';
import { WhatsAppTemplates } from './components/WhatsAppTemplates';
import { CommunityDocuments } from './components/CommunityDocuments';
import { CommitteeStructure } from './components/CommitteeStructure';
import { AutomationRules } from './components/AutomationRules';
import { PermissionMatrix } from './components/PermissionMatrix';
import { SecuritySettings } from './components/SecuritySettings';
import { BackupSettings } from './components/BackupSettings';
import { VersionHistory } from './components/VersionHistory';
import { AuditTimeline } from './components/AuditTimeline';

const NAV_SECTIONS = [
  {
    group: 'Platform Configuration',
    items: [
      { id: 'general', label: 'General Information', icon: Building2, component: GeneralInfoTab },
      { id: 'branding', label: 'Branding', icon: Palette, component: BrandingTab },
      { id: 'theme', label: 'Theme Customization', icon: LayoutTemplate, component: ThemeSettings },
      { id: 'homepage', label: 'Homepage Content', icon: Link, component: HomepageSettings },
      { id: 'bank', label: 'Bank Account Details', icon: Wallet, component: BankAccountSettings }
    ]
  },
  {
    group: 'Member Modules',
    items: [
      { id: 'registration', label: 'Registration Rules', icon: UserPlus, component: RegistrationSettings },
      { id: 'form_builder', label: 'Registration Form', icon: FileSpreadsheet, component: RegistrationFormBuilder },
      { id: 'directory', label: 'Member Directory', icon: Users, component: DirectorySettings },
      { id: 'groups', label: 'Community Groups', icon: Users, component: GroupSettings },
      { id: 'matrimonial', label: 'Matrimonial', icon: Heart, component: MatrimonialSettings },
      { id: 'events', label: 'Events Settings', icon: Calendar, component: EventSettings },
      { id: 'professional', label: 'Professional Directory', icon: Briefcase, component: ProfessionalSettings },
      { id: 'obituary', label: 'Obituaries Settings', icon: Award, component: ObituarySettings }
    ]
  },
  {
    group: 'Communications',
    items: [
      { id: 'notifications', label: 'Notification Preferences', icon: Bell, component: NotificationSettings },
      { id: 'email_tpl', label: 'Email Templates', icon: Mail, component: EmailTemplates },
      { id: 'sms_tpl', label: 'SMS Templates', icon: MessageSquare, component: SmsTemplates },
      { id: 'wa_tpl', label: 'WhatsApp Templates', icon: Phone, component: WhatsAppTemplates }
    ]
  },
  {
    group: 'Governance & Operations',
    items: [
      { id: 'documents', label: 'Community Documents', icon: FileText, component: CommunityDocuments },
      { id: 'committee', label: 'Committee Structure', icon: Network, component: CommitteeStructure },
      { id: 'automation', label: 'Automation Rules', icon: Zap, component: AutomationRules },
      { id: 'permissions', label: 'Permissions & Roles', icon: ShieldCheck, component: PermissionMatrix }
    ]
  },
  {
    group: 'System & Security',
    items: [
      { id: 'security', label: 'Security', icon: ShieldAlert, component: SecuritySettings },
      { id: 'backup', label: 'Backup & Restore', icon: HardDrive, component: BackupSettings },
      { id: 'version', label: 'Version History', icon: History, component: VersionHistory },
      { id: 'audit', label: 'Audit Timeline', icon: Clock, component: AuditTimeline }
    ]
  }
];

import { useHeadAuth } from '../../auth/useHeadAuth';
import './settings-theme.css';

export const CommunitySettings = () => {
  const { currentUser } = useData();
  const { headAuth } = useHeadAuth();
  const headUser = headAuth?.headUser;

  const communityId = useMemo(() => {
    const comName = currentUser?.community || headUser?.community;
    if (comName) {
      return comName.toLowerCase().replace(/\s/g, '_');
    }
    return 'cm_123';
  }, [currentUser, headUser]);
  const {
    settings,
    loading,
    saving,
    hasUnsavedChanges,
    updateDraft,
    saveSettings,
    discardChanges
  } = useCommunitySettings(communityId);

  const [activeTab, setActiveTab] = useState('general');

  // Find active component safely
  const ActiveComponent = useMemo(() => {
    for (const group of NAV_SECTIONS) {
      const found = group.items.find(i => i.id === activeTab);
      if (found) return found.component;
    }
    return GeneralInfoTab;
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative enterprise-settings-wrapper">
      
      {/* ─── STICKY UNSAVED CHANGES BAR ─── */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-50 m-4 px-6 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-xl shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Save className="text-amber-400" size={20} />
              </div>
              <div>
                <h4 className="text-amber-400 font-bold text-sm tracking-wide">You have unsaved changes</h4>
                <p className="text-amber-400/70 text-xs">Please save your configuration to apply them to the community.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={discardChanges}
                className="px-4 py-2 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-bold transition-all"
              >
                Discard
              </button>
              <button 
                onClick={saveSettings}
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-amber-500 text-amber-950 text-xs font-bold hover:bg-amber-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MAIN LAYOUT ─── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT STICKY NAVIGATION */}
        <aside className="w-[280px] shrink-0 h-full overflow-y-auto no-scrollbar border-r border-gray-200 bg-white py-6 px-4">
          <div className="mb-6 px-2">
            <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Settings className="text-brand-primary" />
              Settings
            </h2>
            <p className="text-xs text-gray-500 mt-1">Enterprise Configuration</p>
          </div>

          <div className="space-y-6">
            {NAV_SECTIONS.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">
                  {section.group}
                </h3>
                <nav className="space-y-1">
                  {section.items.map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative overflow-hidden ${
                          isActive 
                            ? 'bg-brand-primary/10' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="activeTabAccent" 
                            className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary rounded-r-full"
                          />
                        )}
                        <Icon size={18} className={isActive ? 'text-brand-primary' : 'text-gray-400 group-hover:text-gray-600 transition-colors'} />
                        <span className={`tracking-wide ${isActive ? 'text-brand-primary font-bold' : 'text-gray-600 group-hover:text-gray-900'}`}>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT CONTENT PANEL */}
        <main className="flex-1 h-full overflow-y-auto no-scrollbar relative bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-6 md:p-8 max-w-5xl mx-auto min-h-full pb-32"
            >
              {/* Header for the current tab */}
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 mb-1">
                    {NAV_SECTIONS.flatMap(g => g.items).find(i => i.id === activeTab)?.label}
                  </h1>
                  <p className="text-sm text-gray-500">Manage configurations for your community</p>
                </div>
                {/* Export Button Example */}
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-sm">
                  <Download size={14} className="text-gray-700" /> 
                  <span className="text-xs font-bold text-gray-700">Export JSON</span>
                </button>
              </div>

              {/* The Active Component */}
              <div className="card-neo">
                {settings && (
                  <ActiveComponent 
                    settings={settings} 
                    updateDraft={updateDraft} 
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default CommunitySettings;
