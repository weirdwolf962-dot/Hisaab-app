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

// ── PDF generator (pure JS, no external lib) ──
function generatePDF(history, dateKeys, title = "Hisaab Bill") {
  // Build styled HTML for the PDF window
  const allDaysHTML = dateKeys.map(dateKey => {
    const entries = history[dateKey] || [];
    const dayTotal = entries.reduce((s, e) => s + e.amount, 0);
    const rows = entries.map((e, i) => `
      <tr>
        <td class="num">${String(i + 1).padStart(2, "0")}</td>
        <td class="cat">${e.category.split(" ")[0]}</td>
        <td class="reason">${e.reason}</td>
        <td class="time">${e.time || ""}</td>
        <td class="amt">${formatINR(e.amount)}</td>
      </tr>`).join("");
    return `
      <div class="day-section">
        <div class="day-header">${formatDateLabel(dateKey)}</div>
        <table>
          <thead><tr><th>#</th><th>Cat.</th><th>Wajah</th><th>Waqt</th><th>Raqam</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="day-total">
          <span>Din ka Jama</span><span>${formatINR(dayTotal)}</span>
        </div>
      </div>`;
  }).join("");

  const grandTotal = dateKeys.reduce((s, k) =>
    s + (history[k] || []).reduce((ss, e) => ss + e.amount, 0), 0);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=IBM+Plex+Mono:wght@400;600&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #1a1108; --ink-light: #4a3828; --ink-faint: #8a7060;
    --paper: #f5efe4; --paper-dark: #ede4d3;
    --accent: #b5451b; --gold: #c49a2a; --line: rgba(26,17,8,0.15);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--paper);
    color: var(--ink);
    font-family: 'Lora', Georgia, serif;
    padding: 40px 48px;
    background-image: repeating-linear-gradient(transparent, transparent 31px, rgba(180,140,80,0.1) 31px, rgba(180,140,80,0.1) 32px);
  }
  .cover {
    text-align: center;
    padding-bottom: 2rem;
    border-bottom: 2px solid var(--ink);
    margin-bottom: 2rem;
  }
  .cover-badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem; letter-spacing: 0.35em;
    color: var(--accent); border: 1.5px solid var(--accent);
    display: inline-block; padding: 3px 10px; margin-bottom: 0.75rem;
  }
  .cover-title {
    font-family: 'Playfair Display', serif;
    font-size: 3.5rem; font-weight: 900; line-height: 0.9; color: var(--ink);
  }
  .cover-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem; letter-spacing: 0.5em;
    color: var(--accent); margin-top: 0.4rem;
  }
  .cover-generated {
    font-family: 'Lora', serif; font-style: italic;
    font-size: 0.78rem; color: var(--ink-faint); margin-top: 0.75rem;
  }
  .day-section { margin-bottom: 2rem; }
  .day-header {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem; letter-spacing: 0.25em;
    text-transform: uppercase; color: var(--accent);
    border-left: 3px solid var(--accent);
    padding-left: 0.6rem; margin-bottom: 0.6rem;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; }
  th {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.58rem; letter-spacing: 0.15em;
    text-transform: uppercase; color: var(--ink-faint);
    text-align: left; padding: 0.3rem 0.4rem;
    border-bottom: 1px solid var(--line);
  }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 0.4rem 0.4rem; border-bottom: 1px dashed var(--line); font-size: 0.82rem; }
  td.num, td.cat, td.time {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.68rem; color: var(--ink-faint);
  }
  td.reason { font-family: 'Lora', serif; color: var(--ink); }
  td.amt { font-family: 'IBM Plex Mono', monospace; font-weight: 600; color: var(--ink); }
  .day-total {
    display: flex; justify-content: space-between;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.72rem; color: var(--ink-light);
    padding: 0.35rem 0.4rem;
    background: var(--paper-dark); border-radius: 2px;
  }
  .grand-total {
    margin-top: 1.5rem;
    border-top: 2px solid var(--ink);
    padding-top: 1rem;
    display: flex; justify-content: space-between; align-items: baseline;
  }
  .grand-total .label {
    font-family: 'Playfair Display', serif;
    font-size: 1.1rem; font-weight: 700;
  }
  .grand-total .amount {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 1.6rem; font-weight: 600; color: var(--accent);
  }
  .footer {
    text-align: center; margin-top: 2rem;
    font-family: 'Lora', serif; font-style: italic;
    font-size: 0.8rem; color: var(--ink-faint);
  }
  .footer .powered {
    font-family: 'IBM Plex Mono', monospace; font-style: normal;
    font-size: 0.58rem; letter-spacing: 0.2em; margin-top: 0.3rem;
  }
  .divider { text-align: center; color: var(--gold); letter-spacing: 0.5em; margin: 1rem 0; font-size: 0.75rem; }
  @media print {
    body { padding: 20px 30px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-badge">ROZNAMA</div>
    <div class="cover-title">ہساب</div>
    <div class="cover-sub">HISAAB BILL</div>
    <div class="cover-generated">Generated on ${new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div>
  </div>
  <div class="divider">✦ ✦ ✦</div>
  ${allDaysHTML}
  ${dateKeys.length > 1 ? `
  <div class="divider">─────────────────────</div>
  <div class="grand-total">
    <span class="label">Kul Jama <em style="font-family:'Lora',serif;font-weight:400;font-size:0.85rem;color:#8a7060"> کل جمع</em></span>
    <span class="amount">${formatINR(grandTotal)}</span>
  </div>` : ""}
  <div class="footer">
    <div>Shukriya! شکریہ</div>
    <div class="powered">HISAAB APP ✦</div>
  </div>
  <script>
    window.onload = () => {
      setTimeout(() => { window.print(); }, 600);
    };
  <\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export default function App() {
  const [history, setHistory] = useState(() => loadHistory());
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [showBill, setShowBill] = useState(false);
  const [billMode, setBillMode] = useState("single"); // "single" | "all"
  const [billDateKey, setBillDateKey] = useState(getTodayKey());
  const [shake, setShake] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const reasonRef = useRef(null);

  const todayKey = getTodayKey();
  const todayEntries = history[todayKey] || [];
  const todayTotal = todayEntries.reduce((s, e) => s + e.amount, 0);

  // All days sorted newest first (including today)
  const allDays = Object.keys(history).sort((a, b) => b.localeCompare(a));
  const pastDays = allDays.filter(k => k !== todayKey);

  // Grand total across all days
  const grandTotal = allDays.reduce((s, k) =>
    s + (history[k] || []).reduce((ss, e) => ss + e.amount, 0), 0);

  useEffect(() => { saveHistory(history); }, [history]);

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
    setBillMode("single");
    setBillDateKey(dateKey);
    setShowBill(true);
  }

  function openUnifiedBill() {
    setBillMode("all");
    setShowBill(true);
  }

  function handleDownloadPDF(dateKeys, title) {
    generatePDF(history, dateKeys, title);
  }

  function getCategoryGroups(entries) {
    return entries.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
  }

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

        {/* ── TODAY TAB ── */}
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
                      type="number" placeholder="0.00" min="0" step="0.01"
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
                  onPDF={() => handleDownloadPDF([todayKey], "Aaj ka Hisaab")}
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

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <>
            {allDays.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🗓️</div>
                <p>Koi purana hisaab nahi<br /><span>No history yet — come back tomorrow!</span></p>
              </div>
            ) : (
              <>
                {/* Grand Summary Card */}
                <section className="card summary-card">
                  <div className="card-label">Tamam Hisaab ✦ تمام حساب</div>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-val">{allDays.length}</span>
                      <span className="summary-key">Din</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-val">{allDays.reduce((s,k)=> s+(history[k]||[]).length, 0)}</span>
                      <span className="summary-key">Kharche</span>
                    </div>
                    <div className="summary-item summary-item--total">
                      <span className="summary-val summary-val--big">{formatINR(grandTotal)}</span>
                      <span className="summary-key">Kul Jama کل جمع</span>
                    </div>
                  </div>
                  <div className="summary-actions">
                    <button className="btn-bill" onClick={openUnifiedBill}>📄 Unified Bill</button>
                    <button className="btn-share btn-pdf" onClick={() => handleDownloadPDF(allDays, "Tamam Hisaab")}>
                      ⬇ Download PDF
                    </button>
                  </div>
                </section>

                {/* Per-day cards */}
                {allDays.map(dateKey => {
                  const entries = history[dateKey];
                  const total = entries.reduce((s, e) => s + e.amount, 0);
                  const isToday = dateKey === todayKey;
                  return (
                    <section key={dateKey} className="card history-card">
                      <div className="history-card-header">
                        <div>
                          <div className="card-label" style={{ marginBottom: "0.1rem" }}>
                            {isToday ? "📝 Aaj — " : ""}{formatDateLabel(dateKey)}
                          </div>
                          <div className="history-meta">
                            {entries.length} kharche • <span className="history-total">{formatINR(total)}</span>
                          </div>
                        </div>
                        <div className="history-actions">
                          <button className="btn-icon" onClick={() => openBill(dateKey)} title="Bill dekho">📄</button>
                          <button className="btn-icon btn-icon--share" onClick={() => handleDownloadPDF([dateKey], formatDateLabel(dateKey))} title="PDF download">⬇</button>
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
                })}
              </>
            )}
          </>
        )}
      </main>

      {/* ── Bill Modal ── */}
      {showBill && (
        <div className="modal-overlay" onClick={() => setShowBill(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="bill">
              <div className="bill-header">
                <div className="bill-logo">ہساب</div>
                <div className="bill-title">{billMode === "all" ? "TAMAM HISAAB" : "HISAAB BILL"}</div>
                <div className="bill-date">
                  {billMode === "all"
                    ? `${allDays.length} din • ${allDays.length > 0 ? formatDateLabel(allDays[allDays.length-1]) + " – " + formatDateLabel(allDays[0]) : ""}`
                    : formatDateLabel(billDateKey)}
                </div>
                <div className="bill-divider">✦ ✦ ✦</div>
              </div>

              {billMode === "all" ? (
                /* Unified bill — show each day as a section */
                allDays.map(dateKey => {
                  const entries = history[dateKey] || [];
                  const dayTotal = entries.reduce((s,e) => s+e.amount, 0);
                  return (
                    <div key={dateKey} className="bill-day-section">
                      <div className="bill-day-label">{formatDateLabel(dateKey)}</div>
                      <table className="bill-table">
                        <thead><tr><th>#</th><th>Wajah</th><th>Cat.</th><th>Raqam</th></tr></thead>
                        <tbody>
                          {entries.map((entry, i) => (
                            <tr key={entry.id}>
                              <td className="bill-num">{String(i+1).padStart(2,"0")}</td>
                              <td className="bill-reason">{entry.reason}</td>
                              <td className="bill-cat">{entry.category.split(" ")[0]}</td>
                              <td className="bill-amt">{formatINR(entry.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bill-day-subtotal">
                        <span>Din ka Jama</span><span>{formatINR(dayTotal)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Single day bill */
                <table className="bill-table">
                  <thead><tr><th>#</th><th>Wajah</th><th>Cat.</th><th>Raqam</th></tr></thead>
                  <tbody>
                    {billEntries.map((entry, i) => (
                      <tr key={entry.id}>
                        <td className="bill-num">{String(i+1).padStart(2,"0")}</td>
                        <td className="bill-reason">{entry.reason}</td>
                        <td className="bill-cat">{entry.category.split(" ")[0]}</td>
                        <td className="bill-amt">{formatINR(entry.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="bill-divider">─────────────────────</div>
              <div className="bill-total">
                <span>KUL JAMA</span>
                <span>{billMode === "all" ? formatINR(grandTotal) : formatINR(billTotal)}</span>
              </div>
              <div className="bill-footer">
                <div className="bill-divider">✦ ✦ ✦</div>
                <p>Shukriya! شکریہ</p>
                <p className="bill-powered">Hisaab App</p>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-share btn-pdf"
                onClick={() => handleDownloadPDF(
                  billMode === "all" ? allDays : [billDateKey],
                  billMode === "all" ? "Tamam Hisaab" : formatDateLabel(billDateKey)
                )}>
                ⬇ PDF
              </button>
              <button className="btn-close" onClick={() => setShowBill(false)}>Band Karo ×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EntriesList({ entries, dateKey, onRemove, categoryGroups, total, onBill, onPDF, compact }) {
  return (
    <>
      <div className="entries-list">
        {entries.map((entry, i) => (
          <div key={entry.id} className="entry-row" style={{ "--i": i }}>
            <span className="entry-num">{String(i+1).padStart(2,"0")}</span>
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
            {Object.entries(categoryGroups).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => (
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
            <button className="btn-share btn-pdf" onClick={onPDF}>⬇ PDF</button>
          </div>
        </>
      )}
    </>
  );
}
