import {
  TrendingUp,
  Shield,
  Users,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Brain,
  ArrowUpRight,
  X,
  FileText,
  Plus,
  Clock,
  Cpu,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { useApiFetch, useApiPolling, useApiMutation } from '../hooks/useApi';
import { statsApi, multisigApi, aiAgentApi, agentApi } from '../lib/api';
import { toast } from 'sonner';
import AgentTerminal from '../components/AgentTerminal';
import IdleFundPanel from '../components/IdleFundPanel';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-surface animate-pulse rounded-lg ${className}`} />
);

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return `${Math.floor(diff / 86400000)} days ago`;
}

const iconMap: Record<string, typeof CheckCircle2> = {
  CheckCircle2, Zap, AlertTriangle, Clock, TrendingUp, Cpu, ShieldAlert,
};

export default function LeaderDashboard({ isReadOnly = false }: { isReadOnly?: boolean }) {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [actionMessages, setActionMessages] = useState<Record<string, string>>({});
  const [investing, setInvesting] = useState(false);
  const [harvesting, setHarvesting] = useState(false);

  const { data: treasury, loading: loadingTreasury } = useApiFetch(() => statsApi.getTreasury());
  const { data: pendingActions, loading: loadingActions, refetch: refetchActions } = useApiPolling(() => multisigApi.getPending(), 4000);
  const { data: aiLog, loading: loadingLog } = useApiPolling(() => aiAgentApi.getLog(), 8000);
  const { data: agentLog, refetch: refetchAgentLog } = useApiPolling(() => agentApi.getLog(), 6000);
  const { data: vaultData, loading: loadingVaults, refetch: refetchVaults } = useApiFetch(() => agentApi.getVaults());

  const { mutate: signAction, loading: signing } = useApiMutation((id: string) => multisigApi.sign(id, 'leader_current'));
  const { mutate: rejectAction } = useApiMutation((id: string) => multisigApi.reject(id));

  useEffect(() => {
    if (!loadingTreasury) {
      const ctx = gsap.context(() => {
        gsap.from('.dashboard-card', { y: 40, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' });
      }, dashboardRef);
      return () => ctx.revert();
    }
  }, [loadingTreasury]);

  const handleApprove = async (id: string) => {
    try {
      const res = await signAction(id);
      setActionMessages(prev => ({ ...prev, [id]: res.message }));
      toast.success(res.message);
      refetchActions();
    } catch {
      toast.error('Could not sign — is the API running?');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await rejectAction(id);
      setActionMessages(prev => ({ ...prev, [id]: res.message }));
      toast.error(res.message);
      refetchActions();
    } catch {
      toast.error('Could not reject action');
    }
  };

  const handleInvest = useCallback(async () => {
    setInvesting(true);
    try {
      const res = await agentApi.invest();
      toast.success(res.message);
      refetchVaults();
      refetchAgentLog();
    } catch {
      toast.error('Could not deploy funds — is the API running?');
    }
    setInvesting(false);
  }, [refetchVaults, refetchAgentLog]);

  const handleHarvest = useCallback(async () => {
    setHarvesting(true);
    try {
      const res = await agentApi.harvest();
      toast.success(res.message);
      refetchVaults();
      refetchAgentLog();
    } catch {
      toast.error('Could not harvest yield — is the API running?');
    }
    setHarvesting(false);
  }, [refetchVaults, refetchAgentLog]);

  return (
    <div ref={dashboardRef} className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-shg-secondary font-semibold uppercase tracking-widest text-[10px] mb-2">
              Command Center
            </p>
            <h1 className="text-3xl lg:text-4xl font-black text-on-surface tracking-tight font-headline">
              Treasury Overview
            </h1>
          </div>
          {isReadOnly ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-semibold">
              <Eye className="w-4 h-4" />
              Read-only view — Leader actions are restricted to SHG Leaders
            </div>
          ) : (
            <div className="flex gap-3">
              <button className="px-5 py-2.5 bg-surface text-on-surface rounded-full font-semibold text-sm hover:bg-surface-container transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Export Report
              </button>
              <button className="px-5 py-2.5 bg-shg-primary text-white rounded-full font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-shg-primary/20">
                <Plus className="w-4 h-4" />
                New Transaction
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="dashboard-card bg-white p-6 rounded-2xl border border-border/50">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Liquidity</span>
            <div className="w-10 h-10 bg-shg-secondary/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-shg-secondary" />
            </div>
          </div>
          {loadingTreasury ? <Skeleton className="h-9 w-36 mb-2" /> : (
            <div className="text-3xl font-black font-headline text-on-surface">
              ₹{treasury?.totalLiquidity?.toLocaleString('en-IN')}
            </div>
          )}
          <div className="flex items-center gap-1 text-shg-secondary text-sm font-semibold mt-2">
            <ArrowUpRight className="w-4 h-4" />
            +{loadingTreasury ? '...' : treasury?.yieldThisMonth}% yield this month
          </div>
        </div>

        <div className="dashboard-card bg-white p-6 rounded-2xl border border-border/50">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Trust Score</span>
            <div className="w-10 h-10 bg-shg-tertiary/10 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-shg-tertiary" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-black font-headline text-on-surface">
              {loadingTreasury ? '...' : treasury?.trustScore}
            </div>
            <div className="flex-1 h-3 bg-shg-secondary/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-shg-secondary rounded-full transition-all duration-1000"
                style={{ width: `${treasury?.trustScoreValue || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="dashboard-card bg-white p-6 rounded-2xl border border-border/50">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Members</span>
            <div className="w-10 h-10 bg-shg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-shg-primary" />
            </div>
          </div>
          {loadingTreasury ? <Skeleton className="h-9 w-28 mb-2" /> : (
            <div className="text-3xl font-black font-headline text-on-surface">
              {treasury?.activeMembers} / {treasury?.totalMembers}
            </div>
          )}
          <p className="text-muted-foreground text-sm mt-2">
            {loadingTreasury ? '...' : `${(treasury?.totalMembers || 0) - (treasury?.activeMembers || 0)} members offline ready`}
          </p>
        </div>
      </div>

      {/* Main Content Grid — Multi-Sig + Classic AI Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Multi-Sig Pending Actions */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
              <Shield className="w-5 h-5 text-shg-primary" />
              Multi-Sig Pending Actions
            </h3>
            {!loadingActions && (
              <span className="px-3 py-1 bg-shg-tertiary/10 text-shg-tertiary rounded-full text-xs font-bold">
                {pendingActions?.length || 0} REQUIRES APPROVAL
              </span>
            )}
          </div>

          {loadingActions ? (
            <div className="space-y-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
            </div>
          ) : (pendingActions || []).length === 0 ? (
            <div className="bg-white rounded-2xl border border-border/50 p-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-shg-secondary mx-auto mb-3" />
              <p className="font-bold text-on-surface">All clear! No pending approvals.</p>
            </div>
          ) : (
            (pendingActions || []).map((action: any) => (
              <div key={action.id} className={`dashboard-card bg-white p-6 rounded-2xl border-l-4 border border-border/50 ${action.isEmergency ? 'border-l-red-500' : 'border-l-shg-primary'}`}>
                {action.isEmergency && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg w-fit">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Emergency Override · 1-of-3 Threshold</span>
                  </div>
                )}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface font-headline">{action.description}</span>
                      <span className="text-xs px-2 py-0.5 bg-surface rounded text-muted-foreground">
                        ID: #{action.id.slice(0, 4).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested by <span className="font-semibold">{action.requestedBy}</span>
                    </p>
                    <div className="text-xl font-black font-headline text-shg-primary mt-2">
                      ₹{action.amount?.toLocaleString('en-IN')}
                    </div>
                    {actionMessages[action.id] && (
                      <p className="text-xs font-semibold text-shg-secondary bg-shg-secondary/10 px-3 py-1 rounded-lg mt-2">
                        {actionMessages[action.id]}
                      </p>
                    )}
                    <div className="w-full md:w-64 space-y-3">
                      <div className="flex justify-between text-xs font-bold text-muted-foreground">
                        <span>APPROVAL PROGRESS</span>
                        <span>{action.signatures.length}/{action.signaturesRequired} APPROVED</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-shg-primary rounded-full transition-all duration-500"
                          style={{ width: `${(action.signatures.length / action.signaturesRequired) * 100}%` }}
                        />
                      </div>
                      {isReadOnly ? (
                        <p className="text-xs text-muted-foreground italic text-center py-1">Approval requires Leader role</p>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(action.id)}
                            disabled={signing}
                            className="flex-1 py-2 bg-shg-primary text-white rounded-lg text-sm font-bold active:scale-95 transition-transform hover:opacity-90 disabled:opacity-60"
                          >
                            {signing ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(action.id)}
                            className="px-3 py-2 border border-border text-shg-error rounded-lg text-sm font-bold hover:bg-shg-error/10 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Classic AI Treasury Log */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
              <Brain className="w-5 h-5 text-shg-primary" />
              AI Log
            </h3>
            <div className="w-2 h-2 bg-shg-secondary rounded-full animate-pulse" />
          </div>
          <div className="dashboard-card bg-surface flex-1 rounded-2xl p-5 relative overflow-hidden border border-border/50">
            {loadingLog ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-1" />
                    <Skeleton className="flex-1 h-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5 relative z-10">
                {(aiLog || []).slice(0, 5).map((entry: any) => {
                  const Icon = iconMap[entry.icon] || CheckCircle2;
                  const colorMap: Record<string, string> = {
                    yield_deploy: 'text-shg-secondary',
                    loan_auto_approve: 'text-shg-primary',
                    yield_alert: 'text-shg-tertiary',
                    rebalance: 'text-shg-secondary',
                    sync: 'text-muted-foreground',
                  };
                  return (
                    <div key={entry.id} className="flex gap-3">
                      <div className="mt-1">
                        <Icon className={`w-5 h-5 ${colorMap[entry.type] || 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-sm text-on-surface leading-relaxed">
                          <span className="font-bold">{entry.title}</span>
                          {entry.highlight && (
                            <span className="text-shg-secondary font-bold"> · {entry.highlight}</span>
                          )}
                        </p>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 block">
                          {timeAgo(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ─── AI Vault Manager Section ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black font-headline text-on-surface">AI Vault Manager</h2>
            <p className="text-xs text-muted-foreground">Autonomous idle fund deployment via Folks Finance · Tinyman · Algofi</p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: '#10b98115', color: '#059669' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Agent Active
          </div>
        </div>

        <IdleFundPanel
          vaultData={vaultData}
          loading={loadingVaults}
          onInvest={handleInvest}
          onHarvest={handleHarvest}
          investing={investing}
          harvesting={harvesting}
        />
      </section>

      {/* ─── Agent Terminal Section ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-900">
            <Cpu className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-black font-headline text-on-surface">Agent Terminal</h2>
            <p className="text-xs text-muted-foreground">Live autonomous agent activity log · Algorand testnet</p>
          </div>
          <span className="ml-auto text-[10px] font-bold text-gray-400 font-mono">
            polling every 6s
          </span>
        </div>

        <AgentTerminal entries={agentLog || []} />
      </section>

      {/* Village Ledger Banner */}
      <div className="rounded-3xl overflow-hidden h-44 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-shg-primary via-shg-primary/90 to-shg-primary/70" />
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center px-8 lg:px-12">
          <div className="max-w-lg space-y-3">
            <h2 className="text-2xl lg:text-3xl font-black text-white font-headline">Village Ledger Node #4021</h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Treasury secured by decentralized multi-sig · AI agent auto-invests idle funds · Every action immutable on Algorand.
            </p>
            <div className="flex items-center gap-2 text-shg-secondary">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {treasury?.totalYieldGenerated ? `₹${treasury.totalYieldGenerated.toLocaleString('en-IN')} yield generated` : 'Live on Algorand Testnet'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
