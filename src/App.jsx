import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, RefreshCw, PieChart, BarChart2, Wallet, DollarSign,
  Download, LogOut, Cloud, CloudOff, Landmark, Loader2,
} from 'lucide-react';
import {
  PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';

import { useAuth } from './contexts/AuthContext';
import { useCloudPortfolio } from './hooks/useCloudPortfolio';
import {
  fetchStockPrice, fetchThaiMutualFund, fetchCryptoPrice, fetchUSDTHB,
  fmtCurrency, convertAmount,
} from './api/prices';
import { exportPortfolioCsv } from './utils/csvExport';

import LoginScreen from './components/LoginScreen';
import { CurrencyToggle, StatCard } from './components/Shared';
import AddHoldingModal from './components/AddHoldingModal';
import HoldingRow from './components/HoldingRow';
import HistoryModal from './components/HistoryModal';
import AddBankModal from './components/AddBankModal';
import BankRow from './components/BankRow';

const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();

  // Not logged in — show login screen (but app still works locally if they skip)
  const [skipLogin, setSkipLogin] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user && !skipLogin) {
    return <LoginScreenWithSkip onSkip={() => setSkipLogin(true)} />;
  }

  return <PortfolioApp user={user} onLogout={logout} />;
}

// Wraps LoginScreen with a "continue without account" option
function LoginScreenWithSkip({ onSkip }) {
  return (
    <div className="relative">
      <LoginScreen />
      <button onClick={onSkip}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500 hover:text-gray-300 underline z-10">
        Continue without an account (data saved on this device only)
      </button>
    </div>
  );
}

function PortfolioApp({ user, onLogout }) {
  const {
    holdings, addHolding, deleteHolding, updateManualPrice,
    bankAccounts, addBankAccount, deleteBankAccount, updateBankBalance,
    syncing, cloudEnabled,
  } = useCloudPortfolio(user);

  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [historyHolding, setHistoryHolding] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('portfolio');
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [usdToThb, setUsdToThb] = useState(36.5);

  useEffect(() => { fetchUSDTHB().then(setUsdToThb); }, []);

  const fetchPrices = useCallback(async () => {
    if (holdings.length === 0) return;
    setLoading(true);
    const results = {};
    await Promise.all(holdings.map(async h => {
      let data = null;
      if      (h.type === 'thfund') data = await fetchThaiMutualFund(h.symbol);
      else if (h.type === 'crypto') data = await fetchCryptoPrice(h.coinId || h.symbol.toLowerCase());
      else                          data = await fetchStockPrice(h.symbol);
      if (data) results[h.id] = data;
    }));
    setPrices(results);
    setLastUpdated(new Date());
    setLoading(false);
  }, [holdings]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  // Enrich holdings with price data
  const enriched = holdings.map(h => {
    const p = prices[h.id];
    // Derive canonical currencies — also fixes old records saved before
    // costCurrency field existed by inferring the correct default.
    const baseCurrency   = h.type === 'thfund' ? 'THB' : 'USD';
    const costCurrency   = h.costCurrency || (h.type === 'thfund' ? 'THB' : 'USD');

    if (!p) return {
      ...h, costCurrency,
      currentPrice: h.manualPrice ?? null,
      currency: baseCurrency,
      manual: h.type === 'thfund',
    };

    let price = p.price, currency = p.currency || baseCurrency;
    if (h.type === 'crypto') { price = p.priceUSD ?? p.price; currency = 'USD'; }

    const isManual = !!p.manual && price == null;
    if (isManual && h.manualPrice != null) price = h.manualPrice;

    return { ...h, costCurrency, currentPrice: price, currency, change: p.change, changePct: p.changePct, manual: isManual };
  });

  // Aggregate stats (all converted to display currency)
  const conv = (amt, from) => convertAmount(amt, from, displayCurrency, usdToThb) ?? 0;

  // Only include holdings that have a live/manual price in BOTH value and cost
  // so P&L is never distorted by holdings still loading or pending manual NAV.
  const pricedHoldings = enriched.filter(h => h.currentPrice != null);

  const totalValue = pricedHoldings.reduce((s, h) =>
    s + conv(h.currentPrice * h.shares, h.currency || 'USD'), 0);

  const totalCost = pricedHoldings.reduce((s, h) =>
    s + conv(h.avgCost * h.shares, h.costCurrency || h.currency || 'USD'), 0);

  const totalPnL    = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const dayChange   = pricedHoldings.reduce((s, h) =>
    s + (h.change != null ? conv(h.change * h.shares, h.currency || 'USD') : 0), 0);

  const totalBankBalance = bankAccounts.reduce((s, b) => s + conv(b.balance, b.currency), 0);
  const netWorth = totalValue + totalBankBalance;

  const fmt = n => fmtCurrency(n, displayCurrency);
  const sign = n => (n >= 0 ? '+' : '') + fmt(n);

  // Chart data
  const pieData = enriched
    .filter(h => h.currentPrice != null)
    .map(h => ({ name: h.symbol, value: parseFloat(conv(h.currentPrice * h.shares, h.currency || 'USD').toFixed(2)) }));

  if (totalBankBalance > 0) {
    pieData.push({ name: 'Savings', value: parseFloat(totalBankBalance.toFixed(2)) });
  }

  const byType = [
    ['stock',  'Stock',   '#6366f1'],
    ['etf',    'ETF',     '#10b981'],
    ['fund',   'Fund',    '#f59e0b'],
    ['thfund', 'TH Fund', '#06b6d4'],
    ['crypto', 'Crypto',  '#8b5cf6'],
  ].map(([type, label, color]) => ({
    label, color,
    value: enriched.filter(h => h.type === type && h.currentPrice != null)
      .reduce((s, h) => s + conv(h.currentPrice * h.shares, h.currency || 'USD'), 0),
  })).filter(d => d.value > 0);

  if (totalBankBalance > 0) {
    byType.push({ label: 'Savings', color: '#14b8a6', value: totalBankBalance });
  }

  const pnlChartData = enriched
    .filter(h => h.currentPrice != null)
    .map(h => {
      const val  = conv(h.currentPrice * h.shares, h.currency || 'USD');
      const cost = conv(h.avgCost * h.shares, h.costCurrency || h.currency || 'USD');
      return { name: h.symbol, pnl: parseFloat((val - cost).toFixed(2)) };
    });

  const handleExportCsv = () => {
    exportPortfolioCsv(enriched, bankAccounts, displayCurrency, (amt, from) => conv(amt, from));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">

      {/* ── Header ── */}
      <header className="border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Wallet size={15} />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm sm:text-base tracking-tight">PortfolioTracker</div>
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              {cloudEnabled ? (
                <><Cloud size={10} className="text-emerald-500" /> {syncing ? 'Syncing…' : `Synced · ${user.email || user.displayName}`}</>
              ) : (
                <><CloudOff size={10} /> Local device only</>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <CurrencyToggle currency={displayCurrency} onChange={setDisplayCurrency} />
          {lastUpdated && (
            <span className="text-xs text-gray-500 hidden md:block">{lastUpdated.toLocaleTimeString()}</span>
          )}
          <button onClick={fetchPrices} disabled={loading}
            className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={handleExportCsv}
            className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-all">
            <Download size={13} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg font-semibold transition-all">
            <Plus size={13} /> Add
          </button>
          {cloudEnabled ? (
            <button onClick={onLogout} title="Log out"
              className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-red-900/40 hover:text-red-300 border border-gray-700 px-2.5 py-1.5 rounded-lg transition-all">
              <LogOut size={13} />
            </button>
          ) : (
            <a href="/" onClick={e => { e.preventDefault(); window.location.reload(); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline ml-1">
              Log in to sync
            </a>
          )}
        </div>
      </header>

      {/* ── Rate Banner ── */}
      <div className="bg-gray-900/60 border-b border-gray-800/60 px-4 sm:px-6 py-1.5 flex items-center gap-3 text-[11px] text-gray-500 overflow-x-auto">
        <DollarSign size={11} className="shrink-0" />
        <span>1 USD = {usdToThb.toFixed(2)} THB</span>
        <span>·</span>
        <span>Display: <strong className="text-indigo-400">{displayCurrency}</strong></span>
        <span>·</span>
        <span>TH Funds: FINNOMENA (auto) / manual fallback</span>
        <span>·</span>
        <span>Stocks/ETFs/Crypto: Yahoo Finance + CoinGecko</span>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Net Worth" value={fmt(netWorth)} sub="investments + savings" />
          <StatCard label="Investment P&L" value={sign(totalPnL)}
            sub={`${totalPnLPct >= 0 ? '+' : ''}${totalPnLPct.toFixed(2)}% all time`}
            positive={totalPnL >= 0} />
          <StatCard label="Day Change" value={sign(dayChange)}
            sub={dayChange >= 0 ? 'Gaining today' : 'Losing today'}
            positive={dayChange >= 0} />
          <StatCard label="Bank Savings" value={fmt(totalBankBalance)} sub={`${bankAccounts.length} account(s)`} />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-800/50 p-1 rounded-xl w-fit">
          {[['portfolio','Holdings'],['savings','Savings'],['charts','Charts']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}>{label}</button>
          ))}
        </div>

        {/* ── Holdings Tab ── */}
        {activeTab === 'portfolio' && (
          <div className="space-y-2">
            {enriched.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <BarChart2 size={24} className="text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">No holdings yet</p>
                <p className="text-gray-600 text-sm mt-1">Click "Add" to start tracking</p>
                <div className="mt-4 bg-blue-900/20 border border-blue-800 rounded-lg p-4 text-left max-w-sm">
                  <p className="text-xs text-blue-300 font-semibold mb-1">🇹🇭 Thailand Mutual Funds</p>
                  <p className="text-xs text-gray-400">Select "TH Fund" and enter codes like SCBUSAA or MEGA10-A. NAV auto-fetches when available — otherwise click "Enter NAV →" to type it in yourself.</p>
                </div>
              </div>
            ) : (
              enriched.map(h => (
                <HoldingRow key={h.id} holding={h} onDelete={deleteHolding}
                  onUpdateManualPrice={updateManualPrice} onViewHistory={setHistoryHolding}
                  displayCurrency={displayCurrency} usdToThb={usdToThb} />
              ))
            )}
          </div>
        )}

        {/* ── Savings Tab ── */}
        {activeTab === 'savings' && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button onClick={() => setShowAddBank(true)}
                className="flex items-center gap-1.5 text-sm bg-teal-700 hover:bg-teal-600 px-3 py-1.5 rounded-lg font-semibold transition-all">
                <Plus size={13} /> Add Bank Account
              </button>
            </div>
            {bankAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Landmark size={24} className="text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">No bank accounts yet</p>
                <p className="text-gray-600 text-sm mt-1">Track cash savings alongside your investments</p>
              </div>
            ) : (
              bankAccounts.map(b => (
                <BankRow key={b.id} bank={b} onDelete={deleteBankAccount}
                  onUpdateBalance={updateBankBalance}
                  displayCurrency={displayCurrency} usdToThb={usdToThb} />
              ))
            )}
          </div>
        )}

        {/* ── Charts Tab ── */}
        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Allocation Pie */}
            <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <PieChart size={15} /> Allocation ({displayCurrency})
              </h3>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPie>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => [fmt(v), 'Value']}
                        contentStyle={{ background:'#1f2937', border:'1px solid #374151', borderRadius:8 }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs text-gray-400">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-gray-500 text-sm text-center py-10">Add holdings to see chart</p>}
            </div>

            {/* By Type */}
            <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <BarChart2 size={15} /> By Asset Type ({displayCurrency})
              </h3>
              {byType.length > 0 ? (
                <div className="space-y-3 mt-2">
                  {byType.map((t, i) => {
                    const pct = (totalValue + totalBankBalance) > 0 ? (t.value / (totalValue + totalBankBalance)) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300 font-medium">{t.label}</span>
                          <span className="text-gray-400">{pct.toFixed(1)}% · {fmt(t.value)}</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width:`${pct}%`, background: t.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-gray-500 text-sm text-center py-10">Add holdings to see breakdown</p>}
            </div>

            {/* P&L bar */}
            <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5 md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">P&L per Holding ({displayCurrency})</h3>
              {pnlChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={pnlChartData} margin={{ top:5, right:10, left:10, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false}
                      tickFormatter={v => displayCurrency === 'THB' ? `฿${v}` : `$${v}`} />
                    <Tooltip formatter={v => [fmt(v), 'P&L']}
                      contentStyle={{ background:'#1f2937', border:'1px solid #374151', borderRadius:8 }} />
                    <Area type="monotone" dataKey="pnl" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-500 text-sm text-center py-10">Prices loading…</p>}
            </div>
          </div>
        )}
      </main>

      {showAdd && <AddHoldingModal onAdd={addHolding} onClose={() => setShowAdd(false)} displayCurrency={displayCurrency} />}
      {showAddBank && <AddBankModal onAdd={addBankAccount} onClose={() => setShowAddBank(false)} />}
      {historyHolding && <HistoryModal holding={historyHolding} onClose={() => setHistoryHolding(null)} />}
    </div>
  );
}
