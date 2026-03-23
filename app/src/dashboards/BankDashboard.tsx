import {
  QrCode,
  CheckCircle2,
  Filter,
  Download,
  Search,
  Landmark,
  Activity,
  Eye,
  Send,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useApiFetch, useApiPolling, useApiMutation } from '../hooks/useApi';
import { statsApi, loansApi } from '../lib/api';
import { toast } from 'sonner';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-surface animate-pulse rounded-lg ${className}`} />
);

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
  return `${Math.floor(diff / 3600000)}+ hours ago`;
}

export default function BankDashboard({ isReadOnly = false }: { isReadOnly?: boolean }) {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const { data: stats, loading: loadingStats } = useApiFetch(() => statsApi.getInstitutional());
  const { data: shgDirectory, loading: loadingDirectory } = useApiFetch(() => statsApi.getSHGDirectory());
  const { data: ledger } = useApiPolling(() => statsApi.getLedger(), 6000);
  const { data: bankQueue, loading: loadingQueue, refetch: refetchBankQueue } = useApiPolling(() => loansApi.getBankQueue(), 5000);
  const { mutate: processBankQueue, loading: processingQueue } = useApiMutation((id: string) => loansApi.processBankQueue(id, 'BANK_DASHBOARD'));

  useEffect(() => {
    if (!loadingStats) {
      const ctx = gsap.context(() => {
        gsap.from('.dashboard-card', { y: 40, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' });
      }, dashboardRef);
      return () => ctx.revert();
    }
  }, [loadingStats]);

  const chartMonths = [
    { month: 'Jan', pct: 40 }, { month: 'Feb', pct: 55 }, { month: 'Mar', pct: 45 },
    { month: 'Apr', pct: 70 }, { month: 'May', pct: 85 }, { month: 'Jun', pct: 95 },
  ];

  const handleProcessDisbursement = async (id: string) => {
    try {
      const res = await processBankQueue(id);
      toast.success(res.message || 'Bank payout processed');
      refetchBankQueue();
    } catch {
      toast.error('Could not process bank payout');
    }
  };

  return (
    <div ref={dashboardRef} className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold text-shg-primary uppercase tracking-widest mb-2 block">
              Institutional Dashboard
            </span>
            <h1 className="text-3xl lg:text-4xl font-black font-headline text-on-surface tracking-tight">
              Financial Oversight
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm">
              Monitor, audit, and provide liquidity to regional SHGs with real-time on-chain transparency.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white px-6 py-4 rounded-xl border border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Regional Liquidity</span>
              {loadingStats ? <Skeleton className="h-7 w-24" /> : (
                <span className="text-2xl font-black font-headline text-shg-secondary">
                  ₹{((stats?.regionalLiquidity || 0) / 10000000).toFixed(1)} Cr
                </span>
              )}
            </div>
            <div className="bg-white px-6 py-4 rounded-xl border border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Active Grants</span>
              {loadingStats ? <Skeleton className="h-7 w-16" /> : (
                <span className="text-2xl font-black font-headline text-shg-primary">{stats?.activeGrants}</span>
              )}
            </div>
          </div>
        </div>
        {isReadOnly && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-semibold">
            <Eye className="w-4 h-4" />
            Leader read-only mode: editing and approval actions are disabled on this dashboard.
          </div>
        )}
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* QR Scanner */}
        <div className="lg:col-span-4 dashboard-card bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden border border-border/50">
          <div className="absolute inset-0 bg-shg-primary/5 opacity-40 pointer-events-none" />
          <div className="relative z-10">
            <div className="w-28 h-28 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-5 mx-auto group cursor-pointer hover:scale-105 transition-transform">
              <QrCode className="w-14 h-14 text-shg-primary" />
            </div>
            <h3 className="text-lg font-bold font-headline mb-2">Offline Verification</h3>
            <p className="text-sm text-muted-foreground mb-5 px-2">
              Scan the member's Physical d-SBT card to fetch immutable credit history from the ledger.
            </p>
            <button
              disabled={isReadOnly}
              className="px-6 py-2.5 bg-shg-primary text-white rounded-full font-bold text-sm hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Launch Scanner
            </button>
          </div>
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-shg-secondary/30 blur-[2px]" />
        </div>

        {/* Analytics Chart */}
        <div className="lg:col-span-8 dashboard-card bg-white rounded-2xl p-6 border border-border/50">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold font-headline">Yield & Repayment Dynamics</h3>
              <p className="text-sm text-muted-foreground">Real-time cross-regional performance data</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-shg-secondary bg-shg-secondary/10 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-shg-secondary animate-pulse" />
              {loadingStats ? '...' : `${stats?.repaymentRate}%`} Repayment
            </div>
          </div>
          <div className="h-48 flex items-end justify-between gap-3 px-2 mb-6">
            {chartMonths.map((bar, i) => (
              <div key={i} className="flex-1 bg-surface rounded-t-lg relative group h-full flex items-end">
                <div
                  className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-300 group-hover:bg-shg-primary ${
                    i === chartMonths.length - 1 ? 'bg-shg-secondary/40' : 'bg-shg-primary/20'
                  }`}
                  style={{ height: `${bar.pct}%` }}
                />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.month}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-border/50 gap-4">
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Locked Liquidity</p>
                {loadingStats ? <Skeleton className="h-7 w-24 mt-1" /> : (
                  <p className="text-lg font-bold font-headline">
                    ₹{((stats?.lockedLiquidity || 0) / 10000000).toFixed(2)} Cr
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">On-Chain Audit Frequency</p>
                {loadingStats ? <Skeleton className="h-7 w-24 mt-1" /> : (
                  <p className="text-lg font-bold font-headline">{stats?.auditFrequency}</p>
                )}
              </div>
            </div>
            <button
              disabled={isReadOnly}
              className="bg-shg-secondary text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              1-Click Grant Approval
            </button>
          </div>
        </div>

        {/* SHG Directory */}
        <div className="lg:col-span-12 dashboard-card bg-white rounded-2xl overflow-hidden border border-border/50">
          <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center">
            <h3 className="text-lg font-bold font-headline">
              SHG Directory — Regional Ranking
              {!loadingDirectory && shgDirectory && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">({shgDirectory.length} groups)</span>
              )}
            </h3>
            <div className="flex gap-2">
              <button
                disabled={isReadOnly}
                className="p-2 hover:bg-surface rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Filter className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                disabled={isReadOnly}
                className="p-2 hover:bg-surface rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface">
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase">Group Name</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase">d-SBT Score</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase">Active Loans</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase">Yield/mo</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase">Audit Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loadingDirectory ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6].map(j => (
                        <td key={j} className="px-6 py-4"><Skeleton className="h-6 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : (shgDirectory || []).map((shg: any, i: number) => (
                  <tr key={shg.id} className="hover:bg-surface/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          i === 0 ? 'bg-shg-tertiary/10 text-shg-tertiary' :
                          i === 1 ? 'bg-shg-primary/10 text-shg-primary' :
                          'bg-surface text-muted-foreground'
                        }`}>
                          {shg.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">{shg.name}</p>
                          <p className="text-xs text-muted-foreground">Reg: {shg.registrationId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${shg.trustScore >= 900 ? 'bg-shg-secondary' : shg.trustScore >= 800 ? 'bg-shg-primary' : 'bg-shg-tertiary'}`}
                            style={{ width: `${shg.trustScore / 10}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${shg.trustScore >= 900 ? 'text-shg-secondary' : shg.trustScore >= 800 ? 'text-shg-primary' : 'text-shg-tertiary'}`}>
                          {shg.trustScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-headline font-semibold text-shg-primary text-sm">{shg.activeLoans}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-shg-secondary">+{shg.yieldThisMonth}%</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        shg.auditStatus === 'IMMUTABLE_OK' ? 'bg-shg-secondary/10 text-shg-secondary' :
                        shg.auditStatus === 'PENDING_AUDIT' ? 'bg-shg-tertiary/10 text-shg-tertiary' :
                        'bg-shg-error/10 text-shg-error'
                      }`}>
                        {shg.auditStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        disabled={isReadOnly}
                        className="text-shg-primary font-bold text-sm hover:underline flex items-center gap-1 ml-auto disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        <Search className="w-3 h-3" />
                        Review Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aggregate Trust Index */}
        <div className="lg:col-span-4 dashboard-card bg-white rounded-2xl p-6 flex flex-col items-center justify-center border border-border/50">
          <h3 className="text-sm font-bold text-muted-foreground uppercase mb-6">Aggregate Trust Index</h3>
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-shg-secondary/20" cx="80" cy="80" fill="transparent" r="65" stroke="currentColor" strokeWidth="10" />
              <circle
                className="text-shg-secondary"
                cx="80" cy="80" fill="transparent" r="65"
                stroke="currentColor" strokeWidth="10" strokeLinecap="round"
                strokeDasharray="408"
                strokeDashoffset={loadingStats ? 408 : 408 - (408 * (stats?.aggregateTrustIndex || 0) / 100)}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black font-headline text-on-surface">
                {loadingStats ? '...' : stats?.aggregateTrustIndex}
              </span>
              <span className="text-[10px] font-bold text-shg-secondary uppercase tracking-tighter">Excellent</span>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Regional SHGs performing 14% better than national institutional averages.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 w-full">
            <div className="bg-surface rounded-lg p-3 text-center">
              <Landmark className="w-4 h-4 text-shg-primary mx-auto mb-1" />
              <p className="text-xs font-bold">{loadingStats ? '...' : stats?.shgsMonitored}</p>
              <p className="text-[10px] text-muted-foreground">SHGs Monitored</p>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center">
              <Activity className="w-4 h-4 text-shg-secondary mx-auto mb-1" />
              <p className="text-xs font-bold">{loadingStats ? '...' : `${stats?.repaymentRate}%`}</p>
              <p className="text-[10px] text-muted-foreground">Repayment Rate</p>
            </div>
          </div>
        </div>

        {/* Real-Time Ledger Stream */}
        <div className="lg:col-span-8 dashboard-card bg-white rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold font-headline">Real-Time Ledger Stream</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-shg-secondary">
              <span className="w-2 h-2 rounded-full bg-shg-secondary animate-pulse" />
              Live · 6s/block
            </div>
          </div>
          <div className="space-y-3">
            {(ledger || []).slice(0, 5).map((entry: any) => (
              <div key={entry.id} className="flex gap-4 items-start p-3 rounded-lg hover:bg-surface transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  entry.type === 'credit' ? 'bg-shg-secondary' :
                  entry.type === 'debit' ? 'bg-shg-primary' :
                  entry.type === 'mint' ? 'bg-shg-tertiary' :
                  'bg-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{entry.event}</p>
                  <p className="text-xs text-muted-foreground">TX: {entry.txId} · {timeAgo(entry.timestamp)}</p>
                </div>
                {entry.amount !== 0 && (
                  <div className={`text-sm font-bold flex-shrink-0 ${entry.amount > 0 ? 'text-shg-secondary' : 'text-shg-error'}`}>
                    {entry.amount > 0 ? '+' : ''}₹{Math.abs(entry.amount).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bank Disbursement Queue */}
        <div className="lg:col-span-12 dashboard-card bg-white rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold font-headline">Bank Disbursement Queue</h3>
              <p className="text-xs text-muted-foreground">Leader-approved loans forwarded for payout</p>
            </div>
            {!loadingQueue && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-shg-primary/10 text-shg-primary">
                {(bankQueue || []).filter((q: any) => q.status === 'pending').length} pending
              </span>
            )}
          </div>

          {loadingQueue ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (bankQueue || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No disbursements in queue.</p>
          ) : (
            <div className="space-y-3">
              {(bankQueue || []).slice(0, 8).map((item: any) => (
                <div key={item._id} className="p-4 rounded-xl border border-border/50 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-on-surface truncate">
                      {item.user?.name || item.loan?.user?.name || 'Member'} · ₹{item.amount?.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Loan #{String(item.loan?._id || item.loan).slice(-6).toUpperCase()} · queued {timeAgo(item.queuedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      item.status === 'approved'
                        ? 'bg-shg-secondary/10 text-shg-secondary'
                        : item.status === 'rejected'
                          ? 'bg-shg-error/10 text-shg-error'
                          : 'bg-shg-tertiary/10 text-shg-tertiary'
                    }`}>
                      {String(item.status).toUpperCase()}
                    </span>
                    <button
                      disabled={isReadOnly || processingQueue || item.status !== 'pending'}
                      onClick={() => handleProcessDisbursement(item._id)}
                      className="px-3 py-2 rounded-lg bg-shg-primary text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Process Payout
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
