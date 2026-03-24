import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type AppLanguage = 'English' | 'Hindi' | 'Telugu';

type TranslationMap = Record<string, string>;

const translations: Record<AppLanguage, TranslationMap> = {
  English: {
    settings: 'Settings',
    preferences: 'Preferences',
    preferredLanguage: 'Preferred Language',
    whatsappAlerts: 'WhatsApp Alerts',
    weeklyDigest: 'Weekly Financial Digest',
    savePreferences: 'Save Preferences',
    institutionSettings: 'Institution Settings',
    autoAuditAlerts: 'Auto Audit Alerts',
    grantApproval2FA: 'Grant Approval 2FA',
    saveSettings: 'Save Settings',
    languageUpdated: 'Language updated',
  },
  Hindi: {
    settings: 'सेटिंग्स',
    preferences: 'प्राथमिकताएं',
    preferredLanguage: 'पसंदीदा भाषा',
    whatsappAlerts: 'व्हाट्सऐप अलर्ट',
    weeklyDigest: 'साप्ताहिक वित्तीय सारांश',
    savePreferences: 'प्राथमिकताएं सहेजें',
    institutionSettings: 'संस्था सेटिंग्स',
    autoAuditAlerts: 'ऑटो ऑडिट अलर्ट',
    grantApproval2FA: 'ग्रांट अप्रूवल 2FA',
    saveSettings: 'सेटिंग्स सहेजें',
    languageUpdated: 'भाषा अपडेट हो गई',
  },
  Telugu: {
    settings: 'సెట్టింగ్స్',
    preferences: 'అభిరుచులు',
    preferredLanguage: 'ఇష్టమైన భాష',
    whatsappAlerts: 'వాట్సాప్ అలర్ట్స్',
    weeklyDigest: 'వారాంత ఆర్థిక సారాంశం',
    savePreferences: 'అభిరుచులను సేవ్ చేయండి',
    institutionSettings: 'సంస్థ సెట్టింగ్స్',
    autoAuditAlerts: 'ఆటో ఆడిట్ అలర్ట్స్',
    grantApproval2FA: 'గ్రాంట్ ఆమోదం 2FA',
    saveSettings: 'సెట్టింగ్స్ సేవ్ చేయండి',
    languageUpdated: 'భాష నవీకరించబడింది',
  },
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLanguage(): AppLanguage {
  const saved = localStorage.getItem('saheli-language');
  if (saved === 'Hindi' || saved === 'Telugu' || saved === 'English') {
    return saved;
  }
  return 'English';
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(getInitialLanguage);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('saheli-language', lang);
    document.documentElement.lang = lang.toLowerCase();
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string, fallback?: string) => translations[language][key] || fallback || key,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
};
