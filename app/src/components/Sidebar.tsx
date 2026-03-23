import { 
  Badge, 
  Wallet, 
  ShieldCheck, 
  Brain, 
  Settings, 
  HelpCircle, 
  ArrowRightLeft 
} from 'lucide-react';

interface SidebarProps {
  currentRole?: 'member' | 'leader' | 'bank';
}

const menuItems = [
  { id: 'passport', label: 'Financial Passport', icon: Badge },
  { id: 'treasury', label: 'Treasury Management', icon: Wallet },
  { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
  { id: 'ai', label: 'AI Insights', icon: Brain },
];

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'support', label: 'Support', icon: HelpCircle },
];

export default function Sidebar({ currentRole }: SidebarProps) {
  const activeItem = currentRole === 'member' ? 'passport' : 'treasury';

  return (
    <aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 border-r border-border/50 bg-white flex-col py-6 z-40">
      {/* Logo Area */}
      <div className="px-6 mb-8 pt-16">
        <h2 className="font-headline text-2xl font-black text-shg-primary">SHG Chain</h2>
        <p className="text-xs font-medium text-muted-foreground mt-1">Empowering Rural Finance</p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItem;
          return (
            <a
              key={item.id}
              href="#"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-shg-primary/10 text-shg-primary font-semibold'
                  : 'text-muted-foreground hover:bg-surface hover:text-on-surface'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-shg-primary' : 'text-muted-foreground group-hover:text-on-surface'}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 mt-auto space-y-4">
        {/* Switch Persona Button */}
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-shg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Switch Persona
        </button>

        {/* Bottom Links */}
        <div className="pt-4 border-t border-border/50 space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href="#"
                className="flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-shg-primary transition-colors"
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
