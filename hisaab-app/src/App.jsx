import { useState, useRef } from "react";
import "./App.css";

const CATEGORIES = ["🍽️ Khana", "🚗 Safar", "🛒 Khareedari", "💊 Dawai", "📱 Recharge", "🏠 Ghar", "📚 Padhai", "🎉 Manoranjan", "Other"];

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function getTodayLabel() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [showBill, setShowBill] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shake, setShake] = useState(false);
  const billRef = useRef(null);
  const reasonRef = useRef(null);

  const total = entries.reduce((s, e) => s + e.amount, 0);

  function addEntry(e) {
    e.preventDefault();
    if (!reason.trim() || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setEntries(prev => [...prev, {
      id: Date.now(),
      reason: reason.trim(),
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      category,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    }]);
    setReason("");
    setAmount("");
    setTimeout(() => reasonRef.current?.focus(), 50);
  }

  function removeEntry(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function generateShareText() {
    const lines = [
      `📒 HISAAB — ${getTodayLabel()}`,
      `${"─".repeat(36)}`,
      ...entries.map((e, i) => `${String(i + 1).padStart(2, "0")}. ${e.category} ${e.reason.padEnd(20).slice(0, 20)}  ${formatINR(e.amount)}`),
      `${"─".repeat(36)}`,
      `TOTAL: ${formatINR(total)}`,
      `${"─".repeat(36)}`,
      `Powered by Hisaab App ✦`
    ];
    return lines.join("\n");
  }

  async function shareOrCopy() {
    const text = generateShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Aaj ka Hisaab", text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const categoryGroups = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="app">
      <div className="grain" />

      <header className="header">
        <div className="header-badge">ROZNAMA</div>
        <h1 className="title">ہساب <span className="title-sub">Hisaab</span></h1>
        <p className="subtitle">{getTodayLabel()}</p>
      </header>

      <main className="main">
        {/* Entry Form */}
        <section className="card form-card">
          <div className="card-label">Naya Kharcha ✦ نیا خرچہ</div>
          <form onSubmit={addEntry} className={`form ${shake ? "shake" : ""}`}>
            <div className="form-row">
              <div className="field field-reason">
                <label className="field-label">Wajah (Reason)</label>
                <input
                  ref={reasonRef}
                  className="input"
                  placeholder="e.g. Chai, Petrol, Sabzi..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="field field-amount">
                <label className="field-label">Raqam (₹)</label>
                <input
                  className="input input-amount"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="category-row">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`cat-btn ${category === c ? "cat-btn--active" : ""}`}
                  onClick={() => setCategory(c)}
                >{c}</button>
              ))}
            </div>
            <button className="btn-add" type="submit">
              <span className="btn-add-icon">+</span> Darj Karo
            </button>
          </form>
        </section>

        {/* Entries List */}
        {entries.length > 0 && (
          <section className="card entries-card">
            <div className="card-label">Aaj Ka Hisaab ✦ آج کا حساب</div>
            <div className="entries-list">
              {entries.map((entry, i) => (
                <div key={entry.id} className="entry-row" style={{ "--i": i }}>
                  <span className="entry-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="entry-cat">{entry.category.split(" ")[0]}</span>
                  <div className="entry-info">
                    <span className="entry-reason">{entry.reason}</span>
                    <span className="entry-time">{entry.time}</span>
                  </div>
                  <span className="entry-amount">{formatINR(entry.amount)}</span>
                  <button className="btn-remove" onClick={() => removeEntry(entry.id)} title="Hatao">×</button>
                </div>
              ))}
            </div>

            {/* Category Breakdown */}
            {Object.keys(categoryGroups).length > 1 && (
              <div className="breakdown">
                <div className="breakdown-title">Category Breakdown</div>
                <div className="breakdown-grid">
                  {Object.entries(categoryGroups).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className="breakdown-item">
                      <span>{cat}</span>
                      <span className="breakdown-amt">{formatINR(amt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="total-row">
              <span className="total-label">Kul Jama <span className="total-urdu">کل جمع</span></span>
              <span className="total-amount">{formatINR(total)}</span>
            </div>

            <div className="action-row">
              <button className="btn-bill" onClick={() => setShowBill(true)}>
                📄 Bill Dekho
              </button>
              <button className="btn-share" onClick={shareOrCopy}>
                {copied ? "✓ Copied!" : "↑ Share / Copy"}
              </button>
            </div>
          </section>
        )}

        {entries.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📒</div>
            <p>Aaj koi kharcha nahi<br /><span>No expenses yet today</span></p>
          </div>
        )}
      </main>

      {/* Bill Modal */}
      {showBill && (
        <div className="modal-overlay" onClick={() => setShowBill(false)}>
          <div className="modal" ref={billRef} onClick={e => e.stopPropagation()}>
            <div className="bill">
              <div className="bill-header">
                <div className="bill-logo">ہساب</div>
                <div className="bill-title">HISAAB BILL</div>
                <div className="bill-date">{getTodayLabel()}</div>
                <div className="bill-divider">✦ ✦ ✦</div>
              </div>
              <table className="bill-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Wajah</th>
                    <th>Cat.</th>
                    <th>Raqam</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={entry.id}>
                      <td className="bill-num">{String(i + 1).padStart(2, "0")}</td>
                      <td className="bill-reason">{entry.reason}</td>
                      <td className="bill-cat">{entry.category.split(" ")[0]}</td>
                      <td className="bill-amt">{formatINR(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bill-divider">─────────────────────</div>
              <div className="bill-total">
                <span>KUL JAMA</span>
                <span>{formatINR(total)}</span>
              </div>
              <div className="bill-footer">
                <div className="bill-divider">✦ ✦ ✦</div>
                <p>Shukriya! شکریہ</p>
                <p className="bill-powered">Hisaab App</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-share" onClick={shareOrCopy}>
                {copied ? "✓ Copied!" : "↑ Share / Copy"}
              </button>
              <button className="btn-close" onClick={() => setShowBill(false)}>Band Karo ×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
