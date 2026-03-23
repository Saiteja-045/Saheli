import { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Toaster } from 'sonner';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import MemberDashboard from './dashboards/MemberDashboard';
import LeaderDashboard from './dashboards/LeaderDashboard';
import BankDashboard from './dashboards/BankDashboard';
import AuthPage from './components/AuthPage';
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
import { useAuth } from './contexts/AuthContext';

gsap.registerPlugin(ScrollTrigger);

type UserRole = 'member' | 'leader' | 'bank';
type AppView = 'landing' | 'auth' | 'dashboard';

function App() {
  const { user, loading, logout } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>('member');
  const [view, setView] = useState<AppView>('landing');
  const [showWhatsAppDemo, setShowWhatsAppDemo] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      // Authenticated — go straight to their dashboard
      setCurrentRole(user.role as UserRole);
      setView('dashboard');
    } else {
      // No JWT session → always show auth page
      setView('auth');
    }
  }, [user, loading]);

  useEffect(() => {
    if (view !== 'dashboard') ScrollTrigger.refresh();
  }, [view]);

  const handleAuthSuccess = (role: UserRole) => {
    setCurrentRole(role);
    setView('dashboard');
  };

  const handleRoleSelectFromHero = (_role: UserRole) => {
    setView('auth');
  };

  const handleSwitchPersona = () => {
    logout();
    localStorage.removeItem('shg-role');
    setView('landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Restoring session…</p>
        </div>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <>
        <Toaster position="top-right" richColors />
        <AuthPage onSuccess={handleAuthSuccess} />
      </>
    );
  }

  if (view === 'dashboard') {
    const authRole = user?.role as 'member' | 'leader' | 'bank' | undefined;
    // Members cannot access bank dashboard at all
    const safeRole = authRole === 'member' && currentRole === 'bank' ? 'member' : currentRole;
    const isReadOnly = authRole === 'member' && safeRole === 'leader';

    return (
      <div className="min-h-screen bg-surface">
        <Toaster position="top-right" richColors />
        <TopNav
          currentRole={safeRole}
          authRole={authRole}
          onRoleChange={setCurrentRole}
          onSwitchPersona={handleSwitchPersona}
        />
        <Sidebar currentRole={safeRole} />
        <main className="lg:ml-64 pt-16 min-h-screen">
          {safeRole === 'member' && <MemberDashboard />}
          {safeRole === 'leader' && <LeaderDashboard isReadOnly={isReadOnly} />}
          {safeRole === 'bank' && authRole !== 'member' && <BankDashboard />}
        </main>
        {showWhatsAppDemo && <WhatsAppDemo onClose={() => setShowWhatsAppDemo(false)} />}
      </div>
    );
  }

  // Landing
  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" richColors />
      <TopNav />
      <HeroSection onRoleSelect={handleRoleSelectFromHero} onOpenWhatsApp={() => setShowWhatsAppDemo(true)} />
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

export default App;
