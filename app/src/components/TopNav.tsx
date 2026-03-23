import { Search, Bell, Bot, User, Menu, X } from 'lucide-react';
import { useState } from 'react';

type UserRole = 'member' | 'leader' | 'bank';

interface TopNavProps {
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  onSwitchPersona?: () => void;
}

export default function TopNav({ currentRole, onRoleChange, onSwitchPersona }: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const roleLabels = {
    member: 'Member',
    leader: 'Leader',
    bank: 'Bank/NGO'
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex justify-between items-center px-4 lg:px-6 py-3 w-full">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <span className="text-xl font-extrabold tracking-tight text-shg-primary font-headline">
            SHG Chain
          </span>
          
          {/* Role Switcher - Desktop */}
          {onRoleChange && (
            <div className="hidden md:flex gap-1 items-center bg-surface rounded-lg p-1">
              {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => onRoleChange(role)}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                    currentRole === role
                      ? 'bg-shg-primary text-white'
                      : 'text-muted-foreground hover:text-on-surface'
                  }`}
                >
                  {roleLabels[role]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={`hidden lg:flex items-center bg-surface rounded-lg transition-all ${searchOpen ? 'w-64' : 'w-48'}`}>
            <Search className="w-4 h-4 text-muted-foreground ml-3" />
            <input
              type="text"
              placeholder={currentRole ? "Search transactions..." : "Search SHG or d-SBT ID..."}
              className="bg-transparent border-none text-sm w-full py-2 px-2 focus:outline-none"
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
            />
          </div>

          {/* Notifications */}
          <button className="p-2 hover:bg-surface rounded-lg transition-colors relative">
            <Bell className="w-5 h-5 text-shg-primary" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-shg-secondary rounded-full" />
          </button>

          {/* AI Assistant */}
          <button className="p-2 hover:bg-surface rounded-lg transition-colors">
            <Bot className="w-5 h-5 text-shg-primary" />
          </button>

          {/* Account */}
          <button className="w-8 h-8 rounded-full bg-shg-primary/10 flex items-center justify-center hover:bg-shg-primary/20 transition-colors">
            <User className="w-4 h-4 text-shg-primary" />
          </button>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 hover:bg-surface rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && onRoleChange && (
        <div className="md:hidden border-t border-border/50 bg-white px-4 py-3">
          <div className="flex flex-col gap-2">
            {(Object.keys(roleLabels) as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => {
                  onRoleChange(role);
                  setMobileMenuOpen(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-left transition-all ${
                  currentRole === role
                    ? 'bg-shg-primary text-white'
                    : 'text-muted-foreground hover:bg-surface'
                }`}
              >
                {roleLabels[role]}
              </button>
            ))}
            {onSwitchPersona && (
              <button
                onClick={() => {
                  onSwitchPersona();
                  setMobileMenuOpen(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-left text-shg-primary hover:bg-shg-primary/5 transition-colors"
              >
                Switch Persona
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
