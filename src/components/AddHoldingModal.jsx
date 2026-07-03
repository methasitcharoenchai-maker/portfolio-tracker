import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

const TH_EXAMPLES = ['SCBUSAA', 'MEGA10-A', 'KFLTFDIV-A', 'SCBSET', 'BCARE', 'TMBGQG'];

export default function AddHoldingModal({ onAdd, onClose, displayCurrency }) {
  const [form, setForm] = useState({ symbol: '', type: 'stock', shares: '', avgCost: '', coinId: '' });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    const sym = form.symbol.trim().toUpperCase();
    if (!sym) return setError('Symbol / fund code is required');
    if (!form.shares || isNaN(form.shares) || +form.shares <= 0) return setError('Enter valid quantity');
    if (!form.avgCost || isNaN(form.avgCost) || +form.avgCost <= 0) return setError('Enter valid average cost');
    onAdd({
      id: Date.now(),
      symbol: sym,
      type: form.type,
      shares: parseFloat(form.shares),
      avgCost: parseFloat(form.avgCost),
      costCurrency: form.type === 'thfund' ? 'THB' : form.type === 'crypto' ? 'USD' : displayCurrency,
      coinId: form.type === 'crypto' ? (form.coinId.trim().toLowerCase() || sym.toLowerCase()) : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">Add Holding</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Asset Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                ['stock',  'Stock'],
                ['etf',    'ETF'],
                ['fund',   'Fund'],
                ['thfund', '🇹🇭 TH Fund'],
                ['crypto', 'Crypto'],
              ].map(([t, label]) => (
                <button key={t} onClick={() => set('type', t)}
                  className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${
                    form.type === t
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Thai Fund extras */}
          {form.type === 'thfund' && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 space-y-2">
              <p className="text-xs text-blue-300 font-semibold">📋 Popular TH Funds (click to fill)</p>
              <div className="flex flex-wrap gap-1.5">
                {TH_EXAMPLES.map(f => (
                  <button key={f} onClick={() => set('symbol', f)}
                    className="text-[11px] bg-blue-900/40 hover:bg-blue-700/60 text-blue-300 px-2 py-0.5 rounded border border-blue-700 transition-all">
                    {f}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500">NAV auto-fetches when available, otherwise enter manually</p>
            </div>
          )}

          {/* Symbol input */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              {form.type === 'thfund' ? 'Fund Code (e.g. SCBUSAA)'
               : form.type === 'crypto' ? 'Ticker (e.g. BTC)'
               : 'Ticker Symbol (e.g. AAPL, SPY, PTT.BK)'}
            </label>
            <input
              type="text"
              value={form.symbol}
              onChange={e => set('symbol', e.target.value.toUpperCase())}
              placeholder={
                form.type === 'thfund' ? 'MEGA10-A' :
                form.type === 'crypto' ? 'BTC' : 'AAPL'
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            {form.type === 'stock' && (
              <p className="text-[11px] text-gray-500 mt-1">Thai stocks on SET: add .BK suffix (e.g. PTT.BK, ADVANC.BK)</p>
            )}
          </div>

          {/* CoinGecko ID for crypto */}
          {form.type === 'crypto' && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">CoinGecko ID (e.g. bitcoin, ethereum, solana)</label>
              <input
                type="text"
                value={form.coinId}
                onChange={e => set('coinId', e.target.value.toLowerCase())}
                placeholder="bitcoin"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">Look up exact ID at coingecko.com</p>
            </div>
          )}

          {/* Shares + Avg Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                {form.type === 'thfund' ? 'Units' : form.type === 'crypto' ? 'Quantity' : 'Shares'}
              </label>
              <input
                type="number" value={form.shares}
                onChange={e => set('shares', e.target.value)}
                placeholder="0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Avg Cost ({form.type === 'thfund' ? '฿ THB/unit' : form.type === 'crypto' ? '$ USD/coin' : `${displayCurrency}/share`})
              </label>
              <input
                type="number" value={form.avgCost}
                onChange={e => set('avgCost', e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all text-sm">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all text-sm">
            Add Holding
          </button>
        </div>
      </div>
    </div>
  );
}
