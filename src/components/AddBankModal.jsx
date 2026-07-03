import React, { useState } from 'react';
import { X, AlertCircle, Landmark } from 'lucide-react';

export default function AddBankModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ bankName: '', balance: '', currency: 'THB' });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.bankName.trim()) return setError('Bank name is required');
    if (!form.balance || isNaN(form.balance) || +form.balance < 0) return setError('Enter a valid balance');

    onAdd({
      id: Date.now(),
      bankName: form.bankName.trim(),
      balance: parseFloat(form.balance),
      currency: form.currency,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Landmark size={18} className="text-emerald-400" /> Add Bank Savings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Bank Name</label>
            <input
              type="text" value={form.bankName}
              onChange={e => set('bankName', e.target.value)}
              placeholder="e.g. SCB, Kasikorn, Bangkok Bank"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-[1fr_90px] gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Balance</label>
              <input
                type="number" value={form.balance}
                onChange={e => set('balance', e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2.5 text-white focus:outline-none focus:border-emerald-500">
                <option value="THB">THB</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all text-sm">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all text-sm">
            Add Account
          </button>
        </div>
      </div>
    </div>
  );
}
