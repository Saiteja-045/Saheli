import { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Toaster } from 'sonner';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import MemberDashboard from './dashboards/MemberDashboard';
import LeaderDashboard from './dashboards/LeaderDashboard';
import BankDashboard from './dashboards/BankDashboard';
import HeroSection from './sections/HeroSection';
import HowItWorks from './sections/HowItWorks';
import AIAgentSection from './sections/AIAgentSection';
import DSBTSection from './sections/DSBTSection';
import OfflineProofSection from './sections/OfflineProofSection';
import MultiSigSection from './sections/MultiSigSection';
import WhatsAppSection from './sections/WhatsAppSection';
import ImpactMetrics from './sections/ImpactMetrics';
import ContactSection from './sections/ContactSection';
import WhatsAppDemo from './components/WhatsAppDemo';

gsap.registerPlugin(ScrollTrigger);

type UserRole = 'member' | 'leader' | 'bank';

function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('member');
  const [showLanding, setShowLanding] = useState(true);
  const [showWhatsAppDemo, setShowWhatsAppDemo] = useState(false);

  useEffect(() => {
    // Check if user has already selected a role
    const savedRole = localStorage.getItem('shg-role');
    if (savedRole) {
      setCurrentRole(savedRole as UserRole);
      setShowLanding(false);
    }
  }, []);

  useEffect(() => {
    if (!showLanding) {
      // Refresh ScrollTrigger when switching to dashboard view
      ScrollTrigger.refresh();
    }
  }, [showLanding]);

  const handleRoleSelect = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('shg-role', role);
    setShowLanding(false);
  };

  const handleSwitchPersona = () => {
    setShowLanding(true);
    localStorage.removeItem('shg-role');
  };

  if (showLanding) {
    return (
      <div className="min-h-screen bg-surface">
        <Toaster position="top-right" richColors />
        <TopNav />
        <HeroSection onRoleSelect={handleRoleSelect} onOpenWhatsApp={() => setShowWhatsAppDemo(true)} />
        <HowItWorks />
        <AIAgentSection />
        <DSBTSection />
        <OfflineProofSection />
        <MultiSigSection />
        <WhatsAppSection onTryDemo={() => setShowWhatsAppDemo(true)} />
        <ImpactMetrics />
        <ContactSection />
        {showWhatsAppDemo && <WhatsAppDemo onClose={() => setShowWhatsAppDemo(false)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" richColors />
      <TopNav
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onSwitchPersona={handleSwitchPersona}
      />
      <Sidebar currentRole={currentRole} />
      <main className="lg:ml-64 pt-16 min-h-screen">
        {currentRole === 'member' && <MemberDashboard />}
        {currentRole === 'leader' && <LeaderDashboard />}
        {currentRole === 'bank' && <BankDashboard />}
      </main>
      {showWhatsAppDemo && <WhatsAppDemo onClose={() => setShowWhatsAppDemo(false)} />}
    </div>
  );
}

export default App;
