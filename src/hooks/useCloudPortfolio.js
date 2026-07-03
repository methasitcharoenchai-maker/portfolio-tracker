import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc, setDoc, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const LOCAL_KEY = 'portfolio_holdings_v3';
const LOCAL_BANKS_KEY = 'portfolio_banks_v1';

/**
 * Syncs `holdings` and `bankAccounts` arrays to Firestore under
 * users/{uid} when logged in. When logged out, falls back to localStorage
 * only (so the app still works without an account).
 *
 * Firestore doc shape: users/{uid} = { holdings: [...], bankAccounts: [...], updatedAt }
 */
export function useCloudPortfolio(user) {
  const [holdings, setHoldings] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
    catch { return []; }
  });
  const [bankAccounts, setBankAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_BANKS_KEY)) || []; }
    catch { return []; }
  });
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  // Separate "just received from Firestore, don't write it back" flags per
  // data stream — sharing one flag between holdings and bankAccounts caused
  // writes to silently get skipped (one effect would consume the flag meant
  // for the other, so genuine local edits never reached Firestore).
  const skipNextHoldingsWrite = useRef(false);
  const skipNextBanksWrite = useRef(false);

  // ── Subscribe to Firestore when logged in ──
  useEffect(() => {
    if (!user) { setSynced(false); return; }

    const ref = doc(db, 'users', user.uid);
    setSyncing(true);

    const unsub = onSnapshot(ref, (snap) => {
      setSyncing(false);
      if (snap.exists()) {
        const data = snap.data();
        skipNextHoldingsWrite.current = true;
        skipNextBanksWrite.current = true;
        setHoldings(data.holdings || []);
        setBankAccounts(data.bankAccounts || []);
      } else {
        // First login — migrate any local data up to the cloud
        const localHoldings = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        const localBanks = JSON.parse(localStorage.getItem(LOCAL_BANKS_KEY) || '[]');
        setDoc(ref, {
          holdings: localHoldings,
          bankAccounts: localBanks,
          updatedAt: serverTimestamp(),
        });
      }
      setSynced(true);
    }, (err) => {
      console.error('Firestore sync error:', err);
      setSyncing(false);
    });

    return unsub;
  }, [user]);

  // ── Persist holdings (cloud if logged in, else local) ──
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(holdings));
    if (user && synced) {
      if (skipNextHoldingsWrite.current) { skipNextHoldingsWrite.current = false; return; }
      const ref = doc(db, 'users', user.uid);
      setDoc(ref, { holdings, updatedAt: serverTimestamp() }, { merge: true })
        .catch(err => console.error('Failed to sync holdings:', err));
    }
  }, [holdings, user, synced]);

  // ── Persist bank accounts (cloud if logged in, else local) ──
  useEffect(() => {
    localStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(bankAccounts));
    if (user && synced) {
      if (skipNextBanksWrite.current) { skipNextBanksWrite.current = false; return; }
      const ref = doc(db, 'users', user.uid);
      setDoc(ref, { bankAccounts, updatedAt: serverTimestamp() }, { merge: true })
        .catch(err => console.error('Failed to sync bank accounts:', err));
    }
  }, [bankAccounts, user, synced]);

  const addHolding = useCallback(h => setHoldings(prev => [...prev, h]), []);
  const deleteHolding = useCallback(id => setHoldings(prev => prev.filter(h => h.id !== id)), []);
  const updateManualPrice = useCallback((id, price) =>
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, manualPrice: price } : h)), []);

  const addBankAccount = useCallback(b => setBankAccounts(prev => [...prev, b]), []);
  const deleteBankAccount = useCallback(id => setBankAccounts(prev => prev.filter(b => b.id !== id)), []);
  const updateBankBalance = useCallback((id, balance) =>
    setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, balance } : b)), []);

  return {
    holdings, addHolding, deleteHolding, updateManualPrice,
    bankAccounts, addBankAccount, deleteBankAccount, updateBankBalance,
    syncing, cloudEnabled: !!user,
  };
}
