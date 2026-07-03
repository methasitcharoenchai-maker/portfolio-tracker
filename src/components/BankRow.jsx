import React, { useState } from 'react';
import { Trash2, Landmark } from 'lucide-react';
import { convertAmount } from '../api/prices';

export default function BankRow({ bank, onDelete, onUpdateBalance, displayCurrency, usdToThb }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bank.balance);

  const displayBalance = convertAmount(bank.balance, bank.currency, displayCurrency, usdToThb);

  const fmt = n => {
    if (n == null) return '—';
    const sym = displayCurrency === 'THB' ? '฿' : '$';
    return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const save = () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && val >= 0) onUpdateBalance(bank.id, val);
    setEditing(false);
  };

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 rounded-xl px-4 py-3 transition-all group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-teal-900/40 rounded-lg flex items-center justify-center shrink-0">
          <Landmark size={14} className="text-teal-400" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white text-sm">{bank.bankName}</span>
          <span className="text-xs text-gray-500">Savings · {bank.currency}</span>
        </div>
        <div className="ml-auto flex flex-col items-end">
          <span className="text-xs text-gray-500">Balance</span>
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus type="number" value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && save()}
                className="w-24 bg-gray-900 border border-teal-700 rounded px-1.5 py-0.5 text-xs text-white text-right focus:outline-none"
              />
              <button onClick={save} className="text-emerald-400 text-xs font-bold">✓</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)}
              className="text-white font-medium text-sm hover:text-teal-300 underline decoration-dotted decoration-gray-600">
              {fmt(displayBalance)}
            </button>
          )}
        </div>
      </div>

      <button onClick={() => onDelete(bank.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all self-center pl-1">
        <Trash2 size={15} />
      </button>
    </div>
  );
}
