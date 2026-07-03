// ─── CSV Export ──────────────────────────────────────────────────────────────
function escapeCsvField(field) {
  const str = String(field ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename, rows) {
  const csvContent = rows.map(row => row.map(escapeCsvField).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPortfolioCsv(enrichedHoldings, bankAccounts, displayCurrency, convertFn) {
  const date = new Date().toISOString().split('T')[0];
  const rows = [];

  rows.push(['Portfolio Export', `Generated ${new Date().toLocaleString()}`, `Currency: ${displayCurrency}`]);
  rows.push([]);

  // Holdings section
  rows.push(['HOLDINGS']);
  rows.push([
    'Symbol', 'Name', 'Type', 'Shares/Units', 'Avg Cost', 'Current Price',
    'Market Value', 'Cost Basis', 'P&L', 'P&L %', 'Native Currency',
  ]);

  enrichedHoldings.forEach(h => {
    const nativeCurr = h.currency || 'USD';
    const costCurr = h.costCurrency || nativeCurr;
    const displayPrice = convertFn(h.currentPrice, nativeCurr);
    const displayAvgCost = convertFn(h.avgCost, costCurr);
    const value = displayPrice != null ? displayPrice * h.shares : null;
    const cost = displayAvgCost != null ? displayAvgCost * h.shares : null;
    const pnl = value != null && cost != null ? value - cost : null;
    const pnlPct = cost > 0 && pnl != null ? (pnl / cost) * 100 : null;

    rows.push([
      h.symbol,
      h.name || h.symbol,
      h.type,
      h.shares,
      displayAvgCost?.toFixed(2) ?? '',
      displayPrice?.toFixed(2) ?? '',
      value?.toFixed(2) ?? '',
      cost?.toFixed(2) ?? '',
      pnl?.toFixed(2) ?? '',
      pnlPct?.toFixed(2) ?? '',
      nativeCurr,
    ]);
  });

  // Bank accounts section
  if (bankAccounts && bankAccounts.length > 0) {
    rows.push([]);
    rows.push(['BANK SAVINGS']);
    rows.push(['Bank Name', 'Balance', 'Currency', 'Balance (' + displayCurrency + ')']);
    bankAccounts.forEach(b => {
      const converted = convertFn(b.balance, b.currency);
      rows.push([b.bankName, b.balance.toFixed(2), b.currency, converted?.toFixed(2) ?? '']);
    });
  }

  // Summary
  const totalValue = enrichedHoldings.reduce((s, h) => {
    if (h.currentPrice == null) return s;
    return s + convertFn(h.currentPrice * h.shares, h.currency || 'USD');
  }, 0);
  const totalCost = enrichedHoldings.reduce((s, h) =>
    s + convertFn(h.avgCost * h.shares, h.costCurrency || h.currency || 'USD'), 0);
  const totalBankBalance = (bankAccounts || []).reduce((s, b) =>
    s + (convertFn(b.balance, b.currency) || 0), 0);

  rows.push([]);
  rows.push(['SUMMARY']);
  rows.push(['Total Investment Value', totalValue.toFixed(2), displayCurrency]);
  rows.push(['Total Cost Basis', totalCost.toFixed(2), displayCurrency]);
  rows.push(['Total P&L', (totalValue - totalCost).toFixed(2), displayCurrency]);
  rows.push(['Total Bank Savings', totalBankBalance.toFixed(2), displayCurrency]);
  rows.push(['Net Worth (Investments + Savings)', (totalValue + totalBankBalance).toFixed(2), displayCurrency]);

  downloadCsv(`portfolio_export_${date}.csv`, rows);
}
