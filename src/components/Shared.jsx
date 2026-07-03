import React from 'react';

export function Badge({ type }) {
  const map = {
    stock:  { label: 'Stock',   cls: 'bg-indigo-900/50 text-indigo-300 border-indigo-700' },
    etf:    { label: 'ETF',     cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' },
    fund:   { label: 'Fund',    cls: 'bg-amber-900/50 text-amber-300 border-amber-700' },
    thfund: { label: 'TH Fund', cls: 'bg-blue-900/50 text-blue-300 border-blue-700' },
    crypto: { label: 'Crypto',  cls: 'bg-purple-900/50 text-purple-300 border-purple-700' },
    bank:   { label: 'Savings', cls: 'bg-teal-900/50 text-teal-300 border-teal-700' },
  };
  const { label, cls } = map[type] || map.stock;
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${cls}`}>{label}</span>;
}

export function CurrencyToggle({ currency, onChange }) {
  return (
    <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg p-0.5">
      {['USD', 'THB'].map(c => (
        <button key={c} onClick={() => onChange(c)}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            currency === c ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}>
          {c === 'USD' ? '$ USD' : '฿ THB'}
        </button>
      ))}
    </div>
  );
}

export function StatCard({ label, value, sub, positive }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-bold text-white leading-tight">{value}</span>
      {sub !== undefined && (
        <span className={`text-xs font-medium ${
          positive === true ? 'text-emerald-400' : positive === false ? 'text-red-400' : 'text-gray-400'
        }`}>{sub}</span>
      )}
    </div>
  );
}
