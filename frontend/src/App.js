import React, { useState, useEffect, useRef } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";
import "./App.css";

const API = "http://127.0.0.1:5000";

function authFetch(token, url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

// ------------------------------
// Login / Sign-up Page
// ------------------------------
function LoginPage({ onLogin, theme }) {
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setUsername(""); setEmail(""); setPassword(""); setPassword2(""); setError("");
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) onLogin(data.token, data.username, data.role);
      else setError(data.error || "Login failed");
    } catch { setError("Could not reach server. Is Flask running?"); }
    finally { setLoading(false); }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== password2) { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (res.ok) onLogin(data.token, data.username, data.role);
      else setError(data.error || "Registration failed");
    } catch { setError("Could not reach server. Is Flask running?"); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 16px",
    fontSize: "0.95rem",
    fontFamily: '"Fira Code", monospace',
    borderRadius: "20px",
    border: `1px solid ${theme.selectBorder}`,
    backgroundColor: theme.selectBg,
    color: theme.selectColor,
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backgroundColor: theme.bg, color: theme.text,
      padding: "2rem",
    }}>
      <img src="/deotterlogo1.png" alt="DeOtter" style={{ width: "380px", marginBottom: "1.2rem" }} />

      {/* Sign In / Sign Up toggle */}
      <div style={{ display: "flex", marginBottom: "1.5rem", border: `1px solid ${theme.selectBorder}`, borderRadius: "24px", overflow: "hidden" }}>
        <button
          onClick={() => switchMode("signin")}
          className="deotter-btn"
          style={{ borderRadius: "24px 0 0 24px", margin: 0, opacity: mode === "signin" ? 1 : 0.5, border: "none" }}
        >Sign In</button>
        <button
          onClick={() => switchMode("signup")}
          className="deotter-btn"
          style={{ borderRadius: "0 24px 24px 0", margin: 0, opacity: mode === "signup" ? 1 : 0.5, border: "none", borderLeft: `1px solid ${theme.selectBorder}` }}
        >Sign Up</button>
      </div>

      <form
        onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
        style={{ display: "flex", flexDirection: "column", gap: "0.7rem", width: "100%", maxWidth: "320px" }}
      >
        <input style={inputStyle} type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoFocus autoComplete="username" />
        {mode === "signup" && (
          <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        )}
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        {mode === "signup" && (
          <input style={inputStyle} type="password" placeholder="Confirm password" value={password2} onChange={e => setPassword2(e.target.value)} autoComplete="new-password" />
        )}
        {error && (
          <p style={{ color: "#dc3545", margin: 0, fontSize: "0.82rem", fontFamily: '"Fira Code", monospace' }}>{error}</p>
        )}
        <button type="submit" disabled={loading} className="deotter-btn" style={{ margin: 0, width: "100%" }}>
          {loading
            ? (mode === "signin" ? "Signing in…" : "Signing up…")
            : (mode === "signin" ? "Sign In" : "Sign Up")}
        </button>
      </form>
    </div>
  );
}

// ------------------------------
// Training Page
// ------------------------------
function TrainingPage({ obfuscated, setObfuscated, clean, setClean, pairs, setPairs }) {
  const highlight = (code) => Prism.highlight(code, Prism.languages.javascript, "javascript");

  const handleAddPair = () => {
    if (!obfuscated.trim() || !clean.trim()) { alert("Please provide both obfuscated and clean code"); return; }
    setPairs([...pairs, { obfuscated, clean }]);
    setObfuscated(""); setClean("");
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(pairs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "training_pairs.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!Array.isArray(imported)) { alert("Invalid file: expected a JSON array."); return; }
        const valid = imported.filter(p => p.obfuscated && p.clean);
        if (valid.length === 0) { alert("No valid pairs found in file."); return; }
        setPairs(prev => [...prev, ...valid]);
        alert(`Imported ${valid.length} pair(s). Total: ${pairs.length + valid.length}.`);
      } catch { alert("Could not parse file. Make sure it is a valid JSON file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ fontFamily: '"Fira Code", monospace', fontSize: "1.2rem" }}>Train the Model</h2>

      <div style={editorContainerStyle}>
        <Editor value={obfuscated} onValueChange={setObfuscated} highlight={highlight} padding={10} style={editorInnerStyle} placeholder="Insert obfuscated Javascript code" />
      </div>

      <div style={editorContainerStyle}>
        <Editor value={clean} onValueChange={setClean} highlight={highlight} padding={10} style={editorInnerStyle} placeholder="Insert clean Javascript code" />
      </div>

      <input id="upload-pairs" type="file" accept=".json" style={{ display: "none" }} onChange={handleUpload} />
      <button className="deotter-btn" onClick={handleAddPair}>Add Training Pair</button>
      <button className="deotter-btn" onClick={handleDownload} disabled={pairs.length === 0}>Download Training Pairs</button>
      <button className="deotter-btn" onClick={() => document.getElementById("upload-pairs").click()}>Upload Training Pairs</button>

      <h3 style={{ marginTop: "2rem", fontFamily: '"Fira Code", monospace', fontSize: "1.05rem" }}>Training Pairs</h3>
      <ul style={{ textAlign: "left" }}>
        {pairs.map((p, idx) => (
          <li key={idx} style={{ marginBottom: "0.6rem" }}>
            <strong>Obfuscated:</strong> {p.obfuscated.slice(0, 60)}... <br />
            <strong>Clean:</strong> {p.clean.slice(0, 60)}...
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "1rem" }}>
        <button className="deotter-btn" onClick={() => setPairs([])}>Clear Pairs</button>
      </div>
    </div>
  );
}

// ------------------------------
// Deobfuscate Page
// ------------------------------
function DeobfuscatePage({
  code, setCode, report, setReport,
  availableModels, selectedModel, setSelectedModel,
  handleDeobfuscate, handleGenerateReport, handleAIDeobfuscate, handleLoadModel,
  showFeedback, handleGood, handleBad,
  usePairs, setUsePairs, pairsCount, theme,
}) {
  const highlight = (c) => Prism.highlight(c, Prism.languages.javascript, "javascript");

  return (
    <div>
      <img src="/deotterlogo1.png" alt="Logo" style={{ width: "560px", marginBottom: "0.5rem" }} />
      <p style={{ fontFamily: '"Fira Code", monospace', fontSize: "1.1rem", marginTop: "0.3rem", marginBottom: "0.6rem" }}>
        DeObfuscation tool for Cyber Security Analysts <br />
        Developed with ❤ from Spain by <strong>@HackyChucky</strong>
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "0.5rem" }}>
        <a href="https://github.com/hackychucky" target="_blank" rel="noreferrer" style={{ color: theme.iconColor }}>
          <svg viewBox="0 0 16 16" width="24" height="24" fill="currentColor" aria-label="GitHub">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
        <a href="https://x.com/hackychucky" target="_blank" rel="noreferrer" style={{ color: theme.iconColor }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-label="X">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
      </div>

      <div style={editorContainerStyle}>
        <Editor value={code} onValueChange={setCode} highlight={highlight} padding={10} style={editorInnerStyle} placeholder="Insert Javascript code to deobfuscate" />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button className="deotter-btn" onClick={handleDeobfuscate}>Deobfuscate</button>
        <button className="deotter-btn" onClick={handleGenerateReport}>Create Obfuscation Report</button>
        <button className="deotter-btn" onClick={handleAIDeobfuscate}>Deobfuscate using DeOtter AI</button>
        <label style={{ fontFamily: '"Fira Code", monospace', fontSize: "0.85rem", color: theme.subtext, marginLeft: "12px", cursor: "pointer" }}>
          <input type="checkbox" checked={usePairs} onChange={e => setUsePairs(e.target.checked)} style={{ marginRight: "6px" }} />
          Use training pairs {pairsCount > 0 ? `(${pairsCount})` : "(none)"}
        </label>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{
            padding: "9px 16px", fontSize: "0.95rem",
            margin: "0 6px",
            backgroundColor: theme.selectBg, color: theme.selectColor,
            border: `1px solid ${theme.selectBorder}`, borderRadius: "20px",
          }}
        >
          <option value="">Select a model</option>
          {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button className="deotter-btn" onClick={handleLoadModel}>Load Selected Model</button>
      </div>

      {report && (
        <div style={editorContainerStyle}>
          <div style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "6px" }}>Output</div>
          <Editor value={report} onValueChange={setReport} highlight={highlight} padding={10} style={editorInnerStyle} />
        </div>
      )}

      {showFeedback && (
        <div style={{ marginTop: "0.5rem" }}>
          <span style={{ fontFamily: '"Fira Code", monospace', fontSize: "0.9rem", marginRight: "12px", color: theme.subtext }}>
            Was this result good?
          </span>
          <button className="deotter-btn" style={{ backgroundColor: "#28a745", borderColor: "#28a745", color: "white" }} onClick={handleGood}>
            Good — Save as Training Pair
          </button>
          <button className="deotter-btn" style={{ backgroundColor: "#dc3545", borderColor: "#dc3545", color: "white" }} onClick={handleBad}>
            Bad — Discard
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// Gear Dropdown
// ------------------------------
function GearMenu({ username, role, onLogout, theme }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Settings"
        className="deotter-btn"
        style={{ width: "40px", height: "40px", borderRadius: "50%", padding: 0, margin: 0 }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "48px",
          backgroundColor: theme.selectBg, border: `1px solid ${theme.selectBorder}`,
          borderRadius: "12px", minWidth: "180px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 2000,
          fontFamily: '"Fira Code", monospace', fontSize: "0.85rem",
          overflow: "hidden",
        }}>
          <div style={{ padding: "10px 14px", color: theme.subtext, borderBottom: `1px solid ${theme.selectBorder}` }}>
            <div style={{ fontWeight: "bold", color: theme.text }}>{username}</div>
            <div style={{ fontSize: "0.75rem" }}>{role}</div>
          </div>
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            style={{
              width: "100%", padding: "10px 14px",
              background: "none", border: "none",
              color: "#dc3545", cursor: "pointer",
              textAlign: "left", fontFamily: '"Fira Code", monospace',
              fontSize: "0.85rem",
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// Main App
// ------------------------------
function App() {
  const [token, setToken] = useState(() => localStorage.getItem("deotter_token") || "");
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("deotter_user") || "null"); }
    catch { return null; }
  });

  const [tab, setTab] = useState("deobfuscate");
  const [code, setCode] = useState("");
  const [report, setReport] = useState("");
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [trainObfuscated, setTrainObfuscated] = useState("");
  const [trainClean, setTrainClean] = useState("");
  const [trainPairs, setTrainPairs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("deotter_pairs") || "[]"); }
    catch { return []; }
  });
  const [lastAICode, setLastAICode] = useState("");
  const [lastAIOutput, setLastAIOutput] = useState("");
  const [lastAIPatterns, setLastAIPatterns] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [usePairs, setUsePairs] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("deotter_dark") === "true"; }
    catch { return false; }
  });

  useEffect(() => { localStorage.setItem("deotter_pairs", JSON.stringify(trainPairs)); }, [trainPairs]);
  useEffect(() => { localStorage.setItem("deotter_dark", darkMode); }, [darkMode]);

  const theme = {
    bg:           darkMode ? "#111111" : "#ffffff",
    text:         darkMode ? "#f0f0f0" : "#111111",
    subtext:      darkMode ? "#aaaaaa" : "#555555",
    iconColor:    darkMode ? "#f0f0f0" : "#000000",
    selectBg:     darkMode ? "#2d2d2d" : "#ffffff",
    selectColor:  darkMode ? "#f8f8f2" : "#111111",
    selectBorder: darkMode ? "#555555" : "#cccccc",
  };

  const btnBg = darkMode ? "#2d2d2d" : "#f0f0f0";

  const handleLogin = (tok, username, role) => {
    setToken(tok);
    const user = { username, role };
    setCurrentUser(user);
    localStorage.setItem("deotter_token", tok);
    localStorage.setItem("deotter_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setToken(""); setCurrentUser(null);
    localStorage.removeItem("deotter_token");
    localStorage.removeItem("deotter_user");
  };

  useEffect(() => {
    if (!token) return;
    authFetch(token, `${API}/available-models`)
      .then(r => r.json())
      .then(d => { if (d.models) setAvailableModels(d.models); })
      .catch(() => {});
  }, [token]);

  const handleGenerateReport = async () => {
    setShowFeedback(false);
    try {
      const res = await authFetch(token, `${API}/generate-report`, { method: "POST", body: JSON.stringify({ code }) });
      const data = await res.json();
      setReport(res.ok ? data.report : `Error: ${data.error}`);
    } catch (err) { setReport(`Request failed: ${err.message}`); }
  };

  const handleDeobfuscate = async () => {
    setShowFeedback(false);
    try {
      const res = await authFetch(token, `${API}/deobfuscate`, { method: "POST", body: JSON.stringify({ code }) });
      const data = await res.json();
      if (res.ok) {
        setLastAICode(code); setLastAIOutput(data.deobfuscated); setLastAIPatterns(data.patterns || []);
        setReport(data.deobfuscated); setShowFeedback(true);
      } else { setReport(`Error: ${data.error}`); }
    } catch (err) { setReport(`Request failed: ${err.message}`); }
  };

  const handleAIDeobfuscate = async () => {
    setShowFeedback(false);
    try {
      const res = await authFetch(token, `${API}/ai-deobfuscate`, {
        method: "POST",
        body: JSON.stringify({ code, pairs: usePairs ? trainPairs.slice(-5) : [] }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastAICode(code); setLastAIOutput(data.deobfuscated); setLastAIPatterns(data.patterns || []);
        const patternNote = data.patterns?.length > 0 ? `Detected: ${data.patterns.join(", ")}` : "No specific patterns detected";
        const exampleNote = data.examples_used > 0 ? `${data.examples_used} matching training example(s) used` : "no training examples used";
        setReport(`${data.deobfuscated}\n\n--- [${patternNote} | ${exampleNote}] ---`);
        setShowFeedback(true);
      } else { setReport(`Error: ${data.error}`); }
    } catch (err) { setReport(`Request failed: ${err.message}`); }
  };

  const handleGood = () => {
    setTrainPairs(prev => [...prev, { obfuscated: lastAICode, clean: lastAIOutput, patterns: lastAIPatterns }]);
    setShowFeedback(false);
  };
  const handleBad = () => { setReport(""); setShowFeedback(false); };

  const handleLoadModel = async () => {
    if (!selectedModel) return;
    try {
      const res = await authFetch(token, `${API}/load-model`, { method: "POST", body: JSON.stringify({ model_name: selectedModel }) });
      const data = await res.json();
      alert(res.ok ? data.message : `Error: ${data.error}`);
    } catch (err) { alert(`Request failed: ${err.message}`); }
  };

  // CSS custom properties for the .deotter-btn class
  const cssVars = {
    "--btn-bg":     btnBg,
    "--btn-text":   theme.text,
    "--btn-border": theme.selectBorder,
  };

  if (!token || !currentUser) {
    return (
      <div className="App" style={{ backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", ...cssVars }}>
        <LoginPage onLogin={handleLogin} theme={theme} />
      </div>
    );
  }

  return (
    <div className="App" style={{ textAlign: "center", padding: "2rem", backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", ...cssVars }}>

      {/* Top-right: username + gear + dark mode toggle */}
      <div style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 1000, display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontFamily: '"Fira Code", monospace', fontSize: "0.85rem", color: theme.subtext }}>
          {currentUser.username}
        </span>
        <GearMenu username={currentUser.username} role={currentUser.role} onLogout={handleLogout} theme={theme} />
        <button
          onClick={() => setDarkMode(d => !d)}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="deotter-btn"
          style={{ width: "40px", height: "40px", borderRadius: "50%", padding: 0, margin: 0 }}
        >
          {darkMode ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button className="deotter-btn" style={{ opacity: tab === "deobfuscate" ? 1 : 0.55 }} onClick={() => setTab("deobfuscate")}>Deobfuscate</button>
        <button className="deotter-btn" style={{ opacity: tab === "train" ? 1 : 0.55 }} onClick={() => setTab("train")}>Train</button>
      </div>

      {tab === "deobfuscate" ? (
        <DeobfuscatePage
          code={code} setCode={setCode} report={report} setReport={setReport}
          availableModels={availableModels} selectedModel={selectedModel} setSelectedModel={setSelectedModel}
          handleDeobfuscate={handleDeobfuscate} handleGenerateReport={handleGenerateReport}
          handleAIDeobfuscate={handleAIDeobfuscate} handleLoadModel={handleLoadModel}
          showFeedback={showFeedback} handleGood={handleGood} handleBad={handleBad}
          usePairs={usePairs} setUsePairs={setUsePairs} pairsCount={trainPairs.length}
          theme={theme}
        />
      ) : (
        <TrainingPage
          obfuscated={trainObfuscated} setObfuscated={setTrainObfuscated}
          clean={trainClean} setClean={setTrainClean}
          pairs={trainPairs} setPairs={setTrainPairs}
        />
      )}
    </div>
  );
}

const editorContainerStyle = {
  margin: "1.5rem auto",
  width: "100%",
  maxWidth: "700px",
  textAlign: "left",
  fontFamily: '"Fira Code", monospace',
  fontSize: 16,
  borderRadius: 4,
  border: "1px solid #ccc",
  backgroundColor: "#2d2d2d",
  padding: "10px",
  minHeight: "200px",
};

const editorInnerStyle = {
  outline: 0,
  whiteSpace: "pre-wrap",
  overflowWrap: "break-word",
  color: "#f8f8f2",
  minHeight: "180px",
};

export default App;
