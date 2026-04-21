import { useState, useRef, useEffect } from "react";
import "./App.css";

const CATEGORIES = ["🍽️ Khana", "🚗 Safar", "🛒 Khareedari", "💊 Dawai", "📱 Recharge", "🏠 Ghar", "📚 Padhai", "🎉 Manoranjan", "Other"];
const STORAGE_KEY = "hisaab_history";

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(dateKey) {
  const [y, m, d] = dateKey.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export default function App() {
  const [history, setHistory] = useState(() => loadHistory());
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [showBill, setShowBill] = useState(false);
  const [billDateKey, setBillDateKey] = useState(getTodayKey());
  const [copied, setCopied] = useState(false);
  const [shake, setShake] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const reasonRef = useRef(null);

  const todayKey = getTodayKey();
  const todayEntries = history[todayKey] || [];
  const todayTotal = todayEntries.reduce((s, e) => s + e.amount, 0);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  function addEntry(e) {
    e.preventDefault();
    if (!reason.trim() || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const newEntry = {
      id: Date.now(),
      reason: reason.trim(),
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      category,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    };
    setHistory(prev => ({
      ...prev,
      [todayKey]: [...(prev[todayKey] || []), newEntry]
    }));
    setReason("");
    setAmount("");
    setTimeout(() => reasonRef.current?.focus(), 50);
  }

  function removeEntry(dateKey, id) {
    setHistory(prev => {
      const updated = (prev[dateKey] || []).filter(e => e.id !== id);
      if (updated.length === 0) {
        const { [dateKey]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [dateKey]: updated };
    });
  }

  function openBill(dateKey) {
    setBillDateKey(dateKey);
    setShowBill(true);
  }

  function generateShareText(dateKey) {
    const entries = history[dateKey] || [];
    const total = entries.reduce((s, e) => s + e.amount, 0);
    const lines = [
      `📒 HISAAB — ${formatDateLabel(dateKey)}`,
      `${"─".repeat(36)}`,
      ...entries.map((e, i) =>
        `${String(i + 1).padStart(2, "0")}. ${e.category.split(" ")[0]} ${e.reason.padEnd(20).slice(0, 20)}  ${formatINR(e.amount)}`
      ),
      `${"─".repeat(36)}`,
      `TOTAL: ${formatINR(total)}`,
      `${"─".repeat(36)}`,
      `Powered by Hisaab App ✦`
    ];
    return lines.join("\n");
  }

  async function shareOrCopy(dateKey) {
    const text = generateShareText(dateKey);
    if (navigator.share) {
      try { await navigator.share({ title: "Aaj ka Hisaab", text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function getCategoryGroups(entries) {
    return entries.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
  }

  const pastDays = Object.keys(history)
    .filter(k => k !== todayKey)
    .sort((a, b) => b.localeCompare(a));

  const billEntries = history[billDateKey] || [];
  const billTotal = billEntries.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="app">
      <div className="grain" />

      <header className="header">
        <div className="header-badge">ROZNAMA</div>
        <h1 className="title">ہساب <span className="title-sub">Hisaab</span></h1>
        <p className="subtitle">{formatDateLabel(todayKey)}</p>
      </header>

      <div className="tabs">
        <button className={`tab ${activeTab === "today" ? "tab--active" : ""}`} onClick={() => setActiveTab("today")}>
          📝 Aaj
        </button>
        <button className={`tab ${activeTab === "history" ? "tab--active" : ""}`} onClick={() => setActiveTab("history")}>
          📚 Taareekh {pastDays.length > 0 && <span className="tab-badge">{pastDays.length}</span>}
        </button>
      </div>

      <main className="main">
        {activeTab === "today" && (
          <>
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
                    <button key={c} type="button"
                      className={`cat-btn ${category === c ? "cat-btn--active" : ""}`}
                      onClick={() => setCategory(c)}>{c}</button>
                  ))}
                </div>
                <button className="btn-add" type="submit">
                  <span className="btn-add-icon">+</span> Darj Karo
                </button>
              </form>
            </section>

            {todayEntries.length > 0 ? (
              <section className="card entries-card">
                <div className="card-label">Aaj Ka Hisaab ✦ آج کا حساب</div>
                <EntriesList
                  entries={todayEntries}
                  dateKey={todayKey}
                  onRemove={removeEntry}
                  categoryGroups={getCategoryGroups(todayEntries)}
                  total={todayTotal}
                  onBill={() => openBill(todayKey)}
                  onShare={() => shareOrCopy(todayKey)}
                  copied={copied}
                />
              </section>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📒</div>
                <p>Aaj koi kharcha nahi<br /><span>No expenses yet today</span></p>
              </div>
            )}
          </>
        )}

        {activeTab === "history" && (
          <>
            {pastDays.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🗓️</div>
                <p>Koi purana hisaab nahi<br /><span>No history yet — come back tomorrow!</span></p>
              </div>
            ) : (
              pastDays.map(dateKey => {
                const entries = history[dateKey];
                const total = entries.reduce((s, e) => s + e.amount, 0);
                return (
                  <section key={dateKey} className="card history-card">
                    <div className="history-card-header">
                      <div>
                        <div className="card-label" style={{ marginBottom: "0.1rem" }}>{formatDateLabel(dateKey)}</div>
                        <div className="history-meta">{entries.length} kharche • <span className="history-total">{formatINR(total)}</span></div>
                      </div>
                      <div className="history-actions">
                        <button className="btn-icon" onClick={() => openBill(dateKey)} title="Bill dekho">📄</button>
                        <button className="btn-icon btn-icon--share" onClick={() => shareOrCopy(dateKey)} title="Share karo">↑</button>
                      </div>
                    </div>
                    <EntriesList
                      entries={entries}
                      dateKey={dateKey}
                      onRemove={removeEntry}
                      categoryGroups={getCategoryGroups(entries)}
                      total={total}
                      compact
                    />
                  </section>
                );
              })
            )}
          </>
        )}
      </main>

      {showBill && (
        <div className="modal-overlay" onClick={() => setShowBill(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="bill">
              <div className="bill-header">
                <div className="bill-logo">ہساب</div>
                <div className="bill-title">HISAAB BILL</div>
                <div className="bill-date">{formatDateLabel(billDateKey)}</div>
                <div className="bill-divider">✦ ✦ ✦</div>
              </div>
              <table className="bill-table">
                <thead>
                  <tr><th>#</th><th>Wajah</th><th>Cat.</th><th>Raqam</th></tr>
                </thead>
                <tbody>
                  {billEntries.map((entry, i) => (
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
                <span>{formatINR(billTotal)}</span>
              </div>
              <div className="bill-footer">
                <div className="bill-divider">✦ ✦ ✦</div>
                <p>Shukriya! شکریہ</p>
                <p className="bill-powered">Hisaab App</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-share" onClick={() => shareOrCopy(billDateKey)}>
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

function EntriesList({ entries, dateKey, onRemove, categoryGroups, total, onBill, onShare, copied, compact }) {
  return (
    <>
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
            {onRemove && (
              <button className="btn-remove" onClick={() => onRemove(dateKey, entry.id)} title="Hatao">×</button>
            )}
          </div>
        ))}
      </div>

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

      {!compact && (
        <>
          <div className="total-row">
            <span className="total-label">Kul Jama <span className="total-urdu">کل جمع</span></span>
            <span className="total-amount">{formatINR(total)}</span>
          </div>
          <div className="action-row">
            <button className="btn-bill" onClick={onBill}>📄 Bill Dekho</button>
            <button className="btn-share" onClick={onShare}>
              {copied ? "✓ Copied!" : "↑ Share / Copy"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
