import React, { useState, useEffect } from 'react';

type Tab = 'dashboard' | 'calculator' | 'compare';

interface Transaction {
  id: string;
  paymentRequest: { id: string; amount: { amount: number; currency: string }; method: string };
  routingDecision: { selectedProcessor: string; reason: string; estimatedSuccessRate: number; estimatedCost: { amount: number }; fallbackProcessors: string[] };
  primaryResult?: { processor: string; success: boolean; processingTimeMs: number; fee: { amount: number } };
  finalStatus: string;
  totalFee: { amount: number; currency: string };
  createdAt: string;
}

const fees = {
  stripe: { rate: 0.029, fixed: 0.30, label: 'Stripe' },
  paypal: { rate: 0.0349, fixed: 0.49, label: 'PayPal' },
  square: { rate: 0.026, fixed: 0.15, label: 'Square' },
  adyen: { rate: 0.025, fixed: 0.25, label: 'Adyen' },
  braintree: { rate: 0.0259, fixed: 0.49, label: 'Braintree' },
  payflow: { rate: 0.020, fixed: 0.20, label: 'PayFlow' },
};

const tierLabels = ['stripe', 'paypal', 'square', 'adyen', 'braintree', 'payflow'] as const;

function calcFee(rate: number, fixed: number, amount: number): number {
  return amount * rate + fixed;
}

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchantId, setMerchantId] = useState('merchant_1');
  const [amount, setAmount] = useState('50.00');
  const [status, setStatus] = useState('');
  const [monthlyVolume, setMonthlyVolume] = useState('50000');
  const [avgTicket, setAvgTicket] = useState('75');

  const loadTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json() as Transaction[];
      setTransactions(data);
    } catch { /* server may not be running */ }
  };

  useEffect(() => {
    loadTransactions();
    const interval = setInterval(loadTransactions, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePayment = async () => {
    setStatus('Processing...');
    try {
      const res = await fetch('/api/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `req_${Date.now()}`,
          merchantId,
          amount: { amount: parseFloat(amount), currency: 'USD' },
          method: 'card',
        }),
      });
      const data = await res.json() as Transaction;
      setStatus(
        data.finalStatus === 'succeeded' || data.finalStatus === 'processing'
          ? `✓ ${data.routingDecision.selectedProcessor} — ${data.finalStatus} (fee: $${data.totalFee.amount.toFixed(2)})`
          : `✗ Failed`
      );
      loadTransactions();
    } catch {
      setStatus('Error processing payment');
    }
  };

  const volume = parseFloat(monthlyVolume) || 0;
  const ticket = parseFloat(avgTicket) || 1;
  const txCount = volume / ticket;
  const savings: Array<{ key: string; label: string; cost: number; vsPayflow: number }> = [];

  for (const key of tierLabels) {
    const f = fees[key];
    const cost = txCount * calcFee(f.rate, f.fixed, ticket);
    const pfCost = txCount * calcFee(fees.payflow.rate, fees.payflow.fixed, ticket);
    savings.push({ key, label: f.label, cost, vsPayflow: cost - pfCost });
  }

  const bestSaving = Math.max(...savings.map(s => s.vsPayflow));

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusColor = (st: string) =>
    st === 'succeeded' ? '#22c55e' : st === 'processing' ? '#f59e0b' : st === 'failed' ? '#ef4444' : '#6b7280';

  const tabStyle = (t: Tab) => ({
    padding: '0.5rem 1rem',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    background: tab === t ? '#3b82f6' : 'transparent',
    color: tab === t ? 'white' : '#94a3b8',
  });

  const card = { background: '#1e293b', borderRadius: 12, padding: '1.5rem' };
  const input = {
    width: '100%' as const,
    padding: '0.5rem',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 1200, margin: '0 auto', background: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>PayFlow</h1>
          <p style={{ color: '#94a3b8', margin: '0.15rem 0 0 0', fontSize: '0.9rem' }}>Smart Payment Orchestration</p>
        </div>
        <nav style={{ display: 'flex', gap: '0.5rem' }}>
          {(['dashboard', 'calculator', 'compare'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
              {t === 'dashboard' ? 'Dashboard' : t === 'calculator' ? 'Savings Calculator' : 'Compare'}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem' }}>
          <div style={card}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0', color: '#f1f5f9' }}>New Payment</h2>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Merchant ID</label>
              <input value={merchantId} onChange={e => setMerchantId(e.target.value)} style={input} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Amount (USD)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} style={input} />
            </div>
            <button onClick={handlePayment} style={{ width: '100%', padding: '0.65rem', borderRadius: 6, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
              Process Payment
            </button>
            {status && <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>{status}</p>}
          </div>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={card}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Total Transactions</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', margin: '0.25rem 0 0 0' }}>{transactions.length}</p>
              </div>
              <div style={card}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Success Rate</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 700, color: '#22c55e', margin: '0.25rem 0 0 0' }}>
                  {transactions.length > 0 ? `${(transactions.filter(t => t.finalStatus !== 'failed').length / transactions.length * 100).toFixed(0)}%` : '—'}
                </p>
              </div>
              <div style={card}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Total Fees</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b', margin: '0.25rem 0 0 0' }}>
                  ${transactions.reduce((sum, t) => sum + t.totalFee.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #334155' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#f1f5f9' }}>Transaction Log</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>ID</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Router</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Fee</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{tx.id.slice(0, 16)}...</td>
                        <td style={{ padding: '0.75rem 1rem' }}>${tx.paymentRequest.amount.amount.toFixed(2)}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ background: '#334155', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 500 }}>
                            {tx.routingDecision.selectedProcessor}
                          </span>
                          {tx.routingDecision.fallbackProcessors.length > 0 && (
                            <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.35rem' }}>
                              +{tx.routingDecision.fallbackProcessors.join(', ')}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ color: statusColor(tx.finalStatus), fontWeight: 600, fontSize: '0.8rem' }}>{tx.finalStatus}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>${tx.totalFee.amount.toFixed(2)}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>{new Date(tx.createdAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No transactions yet. Process a payment to get started.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
          <div style={card}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0', color: '#f1f5f9' }}>Your Business</h2>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Monthly Volume (USD)</label>
              <input value={monthlyVolume} onChange={e => setMonthlyVolume(e.target.value)} style={input} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Avg Ticket Size (USD)</label>
              <input value={avgTicket} onChange={e => setAvgTicket(e.target.value)} style={input} />
            </div>
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.25rem 0' }}>Monthly Transactions</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{Math.round(txCount).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ ...card, borderLeft: '4px solid #22c55e' }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>PayFlow Estimated Cost</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 700, color: '#22c55e', margin: '0.25rem 0 0 0' }}>
                  ${fmt(savings.find(x => x.key === 'payflow')?.cost ?? 0)}
                </p>
              </div>
              <div style={{ ...card, borderLeft: '4px solid #f59e0b' }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Max Savings vs Others</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b', margin: '0.25rem 0 0 0' }}>
                  ${fmt(bestSaving)}
                  <span style={{ fontSize: '0.9rem', color: '#64748b', marginLeft: '0.5rem' }}>/mo</span>
                </p>
              </div>
            </div>

            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #334155' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#f1f5f9' }}>Fee Comparison</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Processor</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Rate</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Est. Monthly Cost</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>vs PayFlow</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Annual Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savings.map(s => {
                      const isPayflow = s.key === 'payflow';
                      return (
                        <tr key={s.key} style={{ borderBottom: '1px solid #1e293b', background: isPayflow ? '#1a3a5c' : 'transparent' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: isPayflow ? 700 : 400 }}>{s.label}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>{`${(fees[s.key as keyof typeof fees].rate * 100).toFixed(1)}% + $${fees[s.key as keyof typeof fees].fixed.toFixed(2)}`}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>${fmt(s.cost)}</td>
                          <td style={{ padding: '0.75rem 1rem', color: isPayflow ? '#22c55e' : s.vsPayflow > 0 ? '#22c55e' : '#ef4444' }}>
                            {isPayflow ? '—' : s.vsPayflow > 0 ? `-$${fmt(s.vsPayflow)}` : `+$${fmt(-s.vsPayflow)}`}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#f59e0b' }}>
                            {isPayflow ? '—' : `$${fmt(s.vsPayflow * 12)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'compare' && (
        <div>
          <div style={{ ...card, marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: '#f1f5f9' }}>PayFlow vs. The Market</h2>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>
              PayFlow no compite con Stripe o PayPal — los mejora. Actuamos como una capa de orquestación inteligente que conecta múltiples procesadores y rutas cada transacción al más óptimo.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Processors', value: '5+', sub: 'Stripe, PayPal, Adyen, Square, Braintree' },
              { label: 'Smart Routing', value: '✓', sub: 'ML-based cost optimization' },
              { label: 'Fallback Recovery', value: '+3-8%', sub: 'Revenue recovered from false declines' },
              { label: 'Avg Savings', value: '10-30%', sub: 'vs single processor fees' },
            ].map(s => (
              <div key={s.label} style={card}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6', margin: '0.25rem 0' }}>{s.value}</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #334155' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#f1f5f9' }}>Feature Comparison</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Feature</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>PayFlow</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>Stripe</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>PayPal</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>Square</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Multi-processor routing', '✅', '❌', '❌', '❌'],
                    ['Auto fallback on failure', '✅', '❌', '❌', '❌'],
                    ['Fee optimization (ML)', '✅', '❌', '❌', '❌'],
                    ['False decline recovery', '✅', '❌', '❌', '❌'],
                    ['Instant settlement', '✅ (opt)', '❌', '❌', '❌'],
                    ['PCI DSS Level 1', '✅', '✅', '✅', '✅'],
                    ['Unified checkout SDK', '✅', '❌', '❌', '❌'],
                    ['Unified dashboard', '✅', '❌', '❌', '❌'],
                    ['Plugins (Shopify, etc.)', '✅', '✅', '✅', '✅'],
                  ].map(([feature, pf, s, p, sq]) => (
                    <tr key={feature} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{feature}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>{pf}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>{s}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>{p}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>{sq}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
