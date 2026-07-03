import React, { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchStockHistory, fetchCryptoHistory } from '../api/history';

const RANGES = [
  ['1mo', '1M'], ['3mo', '3M'], ['6mo', '6M'], ['1y', '1Y'], ['5y', '5Y'],
];

export default function HistoryModal({ holding, onClose }) {
  const [range, setRange] = useState('3mo');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);

  const load = useCallback(async (r) => {
    setLoading(true);
    setUnsupported(false);

    if (holding.type === 'thfund') {
      setUnsupported(true);
      setLoading(false);
      return;
    }

    let points = null;
    if (holding.type === 'crypto') {
      points = await fetchCryptoHistory(holding.coinId || holding.symbol.toLowerCase(), r);
    } else {
      points = await fetchStockHistory(holding.symbol, r);
    }
    setData(points);
    setLoading(false);
  }, [holding]);

  useEffect(() => { load(range); }, [range, load]);

  const first = data?.[0]?.price;
  const last = data?.[data.length - 1]?.price;
  const periodChange = first && last ? ((last - first) / first) * 100 : null;
  const isUp = periodChange != null ? periodChange >= 0 : null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{holding.symbol}</h2>
              <span className="text-xs text-gray-500 uppercase">{holding.type}</span>
            </div>
            {periodChange != null && (
              <p className={`text-sm font-medium flex items-center gap-1 mt-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                <TrendingUp size={13} className={isUp ? '' : 'rotate-180'} />
                {isUp ? '+' : ''}{periodChange.toFixed(2)}% over period
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Range selector */}
        <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg w-fit mb-4">
          {RANGES.map(([id, label]) => (
            <button key={id} onClick={() => setRange(id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                range === id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-gray-800/30 rounded-xl p-4 min-h-[280px] flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs">Loading history…</span>
            </div>
          ) : unsupported ? (
            <div className="text-center px-6">
              <p className="text-gray-400 text-sm font-medium">Historical NAV not available</p>
              <p className="text-gray-600 text-xs mt-1">
                Thai mutual funds don't have a free historical NAV API yet. Price history works for Stocks, ETFs, and Crypto.
              </p>
            </div>
          ) : !data || data.length === 0 ? (
            <p className="text-gray-500 text-sm">No historical data available for this range</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isUp === false ? '#ef4444' : '#10b981'} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={isUp === false ? '#ef4444' : '#10b981'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false}
                  interval="preserveStartEnd" minTickGap={40} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false}
                  domain={['auto', 'auto']} tickFormatter={v => `$${v}`} />
                <Tooltip
                  formatter={v => [`$${v.toLocaleString()}`, 'Price']}
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Area type="monotone" dataKey="price"
                  stroke={isUp === false ? '#ef4444' : '#10b981'}
                  fill="url(#histGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
