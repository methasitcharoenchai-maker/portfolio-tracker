import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Trash2, LineChart } from 'lucide-react';
import { convertAmount } from '../api/prices';
import { Badge } from './Shared';

export default function HoldingRow({ holding, onDelete, onUpdateManualPrice, onViewHistory, displayCurrency, usdToThb }) {
  const [editing, setEditing] = useState(false);
  // Must be kept in sync with holding.manualPrice — useState only runs once at
  // mount, so when Firestore pushes an update and holding.manualPrice changes,
  // draft would stay stale without this effect.
  const [draft, setDraft] = useState(holding.manualPrice ?? '');
  useEffect(() => {
    if (!editing) setDraft(holding.manualPrice ?? '');
  }, [holding.manualPrice, editing]);

  const nativeCurr = holding.currency || 'USD';
  const costCurr   = holding.costCurrency || nativeCurr;

  const displayPrice   = convertAmount(holding.currentPrice, nativeCurr, displayCurrency, usdToThb);
  const displayAvgCost = convertAmount(holding.avgCost, costCurr, displayCurrency, usdToThb);

  const value  = displayPrice    != null ? displayPrice    * holding.shares : null;
  const cost   = displayAvgCost  != null ? displayAvgCost  * holding.shares : null;
  const pnl    = value != null && cost != null ? value - cost : null;
  const pnlPct = cost  != null && cost > 0 && pnl != null ? (pnl / cost) * 100 : null;
  const isUp   = pnl != null ? pnl >= 0 : null;

  // Plain formatter — for price, value, cost (never adds a sign)
  const fmt = n => {
    if (n == null) return '—';
    const sym = displayCurrency === 'THB' ? '฿' : '$';
    return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  // Signed formatter — for P&L only
  const fmtPnl = n => {
    if (n == null) return '—';
    const sym = displayCurrency === 'THB' ? '฿' : '$';
    return `${n >= 0 ? '+' : '-'}${sym}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const saveManual = () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && val > 0) onUpdateManualPrice(holding.id, val);
    setEditing(false);
  };

  const canShowHistory = holding.type !== 'thfund';

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 rounded-xl px-4 py-3 transition-all group">
      <div className="grid grid-cols-[140px_1fr_1fr_1fr_1fr] items-center gap-3 min-w-0 overflow-x-auto">

        {/* Name / Symbol */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-white text-sm">{holding.symbol}</span>
            <Badge type={holding.type} />
          </div>
          <span className="text-xs text-gray-500">
            {holding.shares} {holding.type === 'thfund' ? 'units' : holding.type === 'crypto' ? 'coins' : 'shares'}
          </span>
          {nativeCurr !== displayCurrency && (
            <span className="text-[10px] text-gray-600">native: {nativeCurr}</span>
          )}
        </div>

        {/* Price (or manual NAV entry) */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            Price
            {holding.manual && !editing && (
              <span className="text-[9px] bg-amber-900/40 text-amber-400 px-1 rounded">manual</span>
            )}
          </span>
          {holding.manual ? (
            editing ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus type="number" value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveManual()}
                  placeholder="NAV ฿"
                  className="w-16 bg-gray-900 border border-amber-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                />
                <button onClick={saveManual} className="text-emerald-400 text-xs font-bold">✓</button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)}
                className="text-left text-amber-400 text-[11px] hover:text-amber-300 underline decoration-dotted">
                {holding.manualPrice != null ? fmt(displayPrice) : 'Enter NAV →'}
              </button>
            )
          ) : (
            <span className="text-white font-medium text-sm">{fmt(displayPrice)}</span>
          )}
        </div>

        {/* Market Value */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Mkt Value</span>
          <span className="text-white font-medium text-sm">{fmt(value)}</span>
        </div>

        {/* Avg Cost */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Avg Cost</span>
          <span className="text-gray-300 text-sm">{fmt(displayAvgCost ?? holding.avgCost)}</span>
        </div>

        {/* P&L */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">P&L</span>
          {pnl != null ? (
            <span className={`text-sm font-semibold flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {fmtPnl(pnl)} ({pnlPct?.toFixed(2)}%)
            </span>
          ) : (
            <span className="text-gray-500 text-sm italic">
              {holding.currentPrice == null ? (holding.manual ? 'Enter NAV' : 'Loading…') : '—'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all self-center pl-1">
        {canShowHistory && (
          <button onClick={() => onViewHistory(holding)}
            className="text-gray-600 hover:text-indigo-400 transition-all p-1" title="View price history">
            <LineChart size={15} />
          </button>
        )}
        <button onClick={() => onDelete(holding.id)}
          className="text-gray-600 hover:text-red-400 transition-all p-1" title="Delete holding">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
