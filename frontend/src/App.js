import React, { useState, useEffect, useRef } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";
import "./App.css";

const API = `http://${window.location.hostname}:5050`;

const COMPATIBLE_MODELS = [
  "Mistral 7B / Mixtral",
  "LLaMA 3 (Meta)",
  "CodeLlama",
  "DeepSeek-Coder",
  "Phi-3 (Microsoft)",
  "Qwen2.5-Coder",
  "StarCoder2",
];

async function authFetch(token, url, options = {}, onUnauthorized) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 && onUnauthorized) {
    onUnauthorized();
  }
  return res;
}

// ------------------------------
// Login / Sign-up Page
// ------------------------------
function LoginPage({ onLogin, theme, darkMode, logoOverride }) {
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setUsername(""); setPassword(""); setConfirmPassword(""); setError(""); setSuccessMsg("");
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
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setMode("signin");
        setUsername(""); setPassword(""); setConfirmPassword(""); setError("");
        setSuccessMsg("You've been registered successfully. Once an administrator approves your account, you'll be able to sign in to DeOtter.");
      } else {
        setError(data.error || "Registration failed");
      }
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.2rem" }}>
        <img
          src={logoOverride ? `/${logoOverride}` : (darkMode ? "/deotterlogo_whitecontour.png" : "/999fbba3-83ed-4298-ba83-0747b9bfd1cc-2.png")}
          alt="DeOtter"
          style={{ width: "380px" }}
        />
        <span style={{
          fontFamily: '"Fira Code", monospace', fontWeight: "bold",
          fontSize: "2rem", letterSpacing: "0.08em",
          color: darkMode ? "#ffffff" : "#1a1a1a",
          marginTop: "0.4rem",
        }}>DeOtter</span>
      </div>

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
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        {mode === "signup" && (
          <input style={inputStyle} type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        )}
        {error && (
          <p style={{ color: "#dc3545", margin: 0, fontSize: "0.82rem", fontFamily: '"Fira Code", monospace' }}>{error}</p>
        )}
        {successMsg && (
          <p style={{ color: "#28a745", margin: 0, fontSize: "0.82rem", fontFamily: '"Fira Code", monospace' }}>{successMsg}</p>
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
// Lab Page (Training + Local Model)
// ------------------------------
function LabPage({ obfuscated, setObfuscated, clean, setClean, pairs, setPairs,
                   availableModels, selectedModel, setSelectedModel,
                   token, theme, handleLogout }) {
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

  const [modelStatus, setModelStatus] = useState({ loaded: false, model: null, transformers_available: null });
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadMsg, setLoadMsg] = useState({ text: "", ok: true });
  const [localCode, setLocalCode] = useState("");
  const [localOutput, setLocalOutput] = useState("");
  const [runningLocal, setRunningLocal] = useState(false);
  const [modelPolicy, setModelPolicy] = useState({});

  useEffect(() => {
    authFetch(token, `${API}/local-model-status`, {}, handleLogout)
      .then(r => r.json()).then(d => setModelStatus(d)).catch(() => {});
    authFetch(token, `${API}/settings/model-policy`, {}, handleLogout)
      .then(r => r.json()).then(d => setModelPolicy(d.policy || {})).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleLoadModel = async () => {
    if (!selectedModel) return;
    setLoadingModel(true); setLoadMsg({ text: "", ok: true });
    try {
      const res = await authFetch(token, `${API}/load-model`, { method: "POST", body: JSON.stringify({ model_name: selectedModel }) }, handleLogout);
      const data = await res.json();
      setLoadMsg({ text: data.message || data.error, ok: res.ok });
      if (res.ok) setModelStatus({ loaded: true, model: selectedModel, transformers_available: true });
    } catch { setLoadMsg({ text: "Could not reach server.", ok: false }); }
    setLoadingModel(false);
  };

  const handleLocalDeobfuscate = async () => {
    setRunningLocal(true); setLocalOutput("");
    try {
      const res = await authFetch(token, `${API}/local-deobfuscate`, { method: "POST", body: JSON.stringify({ code: localCode }) }, handleLogout);
      const data = await res.json();
      setLocalOutput(res.ok ? data.deobfuscated : `Error: ${data.error}`);
    } catch (e) { setLocalOutput(`Request failed: ${e.message}`); }
    setRunningLocal(false);
  };

  const sectionTitle = { fontFamily: '"Fira Code", monospace', fontSize: "1rem", fontWeight: "bold", color: theme.text, margin: "0 0 0.8rem 0", textTransform: "uppercase", letterSpacing: "0.06em" };
  const divider = { borderTop: `1px solid ${theme.selectBorder}`, margin: "2rem 0" };
  const infoBox = { fontFamily: '"Fira Code", monospace', fontSize: "0.82rem", backgroundColor: theme.selectBg, border: `1px solid ${theme.selectBorder}`, borderRadius: "10px", padding: "0.8rem 1rem", marginBottom: "1rem", color: theme.subtext, textAlign: "left" };

  return (
    <div style={{ padding: "2rem" }}>

      {/* ── Local Model Section ── */}
      <h3 style={sectionTitle}>Local Model Inference</h3>

      <div style={infoBox}>
        <strong style={{ color: "#f0ad4e" }}>⚠ Requires torch + transformers (~2 GB download)</strong><br />
        Install before loading a model:<br />
        <code style={{ color: theme.text }}>pip install torch transformers</code><br /><br />
        <strong>Note:</strong> Only generative models work (e.g. CodeT5, StarCoder, Mistral). Encoder-only models like CodeBERT cannot generate text.
        {modelStatus.transformers_available === false && (
          <span style={{ color: "#dc3545", display: "block", marginTop: "0.4rem" }}>
            torch/transformers not installed. Run the command above in the backend venv.
          </span>
        )}
      </div>

      <div style={infoBox}>
        <strong style={{ color: theme.text }}>DeOtter works with the following local models:</strong>
        <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.2rem" }}>
          {COMPATIBLE_MODELS.map(m => {
            const isAllowed = modelPolicy[m] === "allowed";
            const badgeColor = isAllowed ? "#28a745" : "#dc3545";
            const badge = isAllowed ? "✓ allowed by company policy" : "✗ not allowed by company policy";
            return (
              <li key={m} style={{ color: theme.subtext, marginBottom: "0.25rem" }}>
                {m} <span style={{ fontSize: "0.75rem", color: badgeColor }}>{badge}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "0.8rem" }}>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          style={{ padding: "9px 16px", fontSize: "0.9rem", backgroundColor: theme.selectBg, color: theme.selectColor, border: `1px solid ${theme.selectBorder}`, borderRadius: "20px" }}
        >
          <option value="">— Select a model —</option>
          {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button className="deotter-btn" onClick={handleLoadModel} disabled={!selectedModel || loadingModel} style={{ margin: 0 }}>
          {loadingModel ? "Loading…" : "Load Model"}
        </button>
        {modelStatus.loaded && (
          <span style={{ fontFamily: '"Fira Code", monospace', fontSize: "0.8rem", color: "#28a745" }}>
            ● {modelStatus.model} loaded
          </span>
        )}
      </div>
      {loadMsg.text && (
        <p style={{ fontFamily: '"Fira Code", monospace', fontSize: "0.82rem", color: loadMsg.ok ? "#28a745" : "#dc3545", margin: "0 0 0.8rem" }}>{loadMsg.text}</p>
      )}

      <div style={editorContainerStyle}>
        <Editor value={localCode} onValueChange={setLocalCode} highlight={highlight} padding={10} style={editorInnerStyle} placeholder="Paste JavaScript to deobfuscate with local model" />
      </div>
      <button className="deotter-btn" onClick={handleLocalDeobfuscate} disabled={!modelStatus.loaded || !localCode.trim() || runningLocal}>
        {runningLocal ? "Running…" : "Deobfuscate with Local Model"}
      </button>
      {localOutput && (
        <div style={editorContainerStyle}>
          <div style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "6px" }}>Local Model Output</div>
          <Editor value={localOutput} onValueChange={setLocalOutput} highlight={highlight} padding={10} style={editorInnerStyle} />
        </div>
      )}

      <div style={divider} />

      {/* ── Training Pairs Section ── */}
      <h3 style={sectionTitle}>Training Pairs</h3>

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

      {pairs.length > 0 && (
        <>
          <ul style={{ textAlign: "left", marginTop: "1.2rem", fontFamily: '"Fira Code", monospace', fontSize: "0.82rem" }}>
            {pairs.map((p, idx) => (
              <li key={idx} style={{ marginBottom: "0.5rem", color: theme.subtext }}>
                <strong style={{ color: theme.text }}>#{idx + 1}</strong> &nbsp;
                {p.obfuscated.slice(0, 50)}…
              </li>
            ))}
          </ul>
          <button className="deotter-btn" onClick={() => setPairs([])}>Clear All Pairs</button>
        </>
      )}
    </div>
  );
}

// ------------------------------
// Deobfuscate Page
// ------------------------------
function DeobfuscatePage({
  code, setCode, report, setReport,
  handleDeobfuscate, handleGenerateReport, handleAIDeobfuscate,
  showFeedback, handleGood, handleBad,
  usePairs, setUsePairs, pairsCount, theme, darkMode, logoOverride,
}) {
  const highlight = (c) => Prism.highlight(c, Prism.languages.javascript, "javascript");

  return (
    <div>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", marginBottom: "0.5rem" }}>
        <img
          src={logoOverride ? `/${logoOverride}` : (darkMode ? "/deotterlogo_whitecontour.png" : "/999fbba3-83ed-4298-ba83-0747b9bfd1cc-2.png")}
          alt="DeOtter"
          style={{ width: "560px" }}
        />
        <span style={{
          fontFamily: '"Fira Code", monospace', fontWeight: "bold",
          fontSize: "2.4rem", letterSpacing: "0.08em",
          color: darkMode ? "#ffffff" : "#1a1a1a",
          marginTop: "0.3rem",
        }}>DeOtter</span>
      </div>
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
// Settings Modal
// ------------------------------
function SettingsModal({ token, currentUser, theme, onClose, onUnauth, onLogoSaved }) {
  const isAdmin = currentUser.role === "admin";
  const [provider, setProvider] = useState("anthropic");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureKey, setAzureKey] = useState("");
  const [azureDeployment, setAzureDeployment] = useState("gpt-4o");
  const [azureVersion, setAzureVersion] = useState("2024-12-01-preview");
  const [hints, setHints] = useState({ anthropic: "", azure: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [logoFiles, setLogoFiles] = useState([]);
  const [logoOverride, setLogoOverride] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ text: "", ok: true });
  const fileInputRef = useRef(null);
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [openaiHint, setOpenaiHint] = useState("");
  const [pepper, setPepper] = useState("");
  const [pepperVisible, setPepperVisible] = useState(false);
  const [pepperSaving, setPepperSaving] = useState(false);
  const [pepperMsg, setPepperMsg] = useState({ text: "", ok: true });

  useEffect(() => {
    const fetches = [
      authFetch(token, `${API}/settings/ai`, {}, onUnauth).then(r => r.json()),
      authFetch(token, `${API}/settings/logo-files`, {}, onUnauth).then(r => r.json()),
      authFetch(token, `${API}/settings/pepper`, {}, onUnauth).then(r => r.ok ? r.json() : { pepper: "" }),
    ];
    Promise.all(fetches).then(([ai, lf, pp]) => {
      setProvider(ai.provider || "anthropic");
      setAzureEndpoint(ai.azure_endpoint || "");
      setAzureDeployment(ai.azure_deployment || "gpt-4o");
      setAzureVersion(ai.azure_version || "2024-12-01-preview");
      setHints({ anthropic: ai.anthropic_key_hint || "", azure: ai.azure_key_hint || "" });
      setOpenaiHint(ai.openai_key_hint || "");
      setOpenaiModel(ai.openai_model || "gpt-4o");
      setLogoOverride(ai.logo_override || "");
      setLogoFiles(lf.files || []);
      setPepper(pp.pepper || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true); setMsg({ text: "", ok: true });
    const payload = { provider, azure_endpoint: azureEndpoint, azure_deployment: azureDeployment, azure_version: azureVersion, openai_model: openaiModel, logo_override: logoOverride };
    if (anthropicKey.trim()) payload.anthropic_key = anthropicKey.trim();
    if (azureKey.trim()) payload.azure_key = azureKey.trim();
    if (openaiKey.trim()) payload.openai_key = openaiKey.trim();
    try {
      const res = await authFetch(token, `${API}/settings/ai`, { method: "POST", body: JSON.stringify(payload) }, onUnauth);
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: "Settings saved.", ok: true });
        if (anthropicKey.trim()) { setHints(h => ({ ...h, anthropic: "..." + anthropicKey.slice(-4) })); setAnthropicKey(""); }
        if (azureKey.trim()) { setHints(h => ({ ...h, azure: "..." + azureKey.slice(-4) })); setAzureKey(""); }
        if (openaiKey.trim()) { setOpenaiHint("..." + openaiKey.slice(-4)); setOpenaiKey(""); }
        if (onLogoSaved) onLogoSaved(logoOverride);
      } else {
        setMsg({ text: data.error || "Save failed.", ok: false });
      }
    } catch { setMsg({ text: "Could not reach server.", ok: false }); }
    setSaving(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["png", "jpg", "jpeg"].includes(ext)) {
      setUploadMsg({ text: "Only PNG and JPG files are accepted.", ok: false });
      return;
    }
    setUploading(true);
    setUploadMsg({ text: "", ok: true });
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/settings/upload-logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setLogoFiles(prev => prev.includes(data.filename) ? prev : [...prev, data.filename].sort());
        setLogoOverride(data.filename);
        setUploadMsg({ text: `"${data.filename}" uploaded.`, ok: true });
      } else {
        setUploadMsg({ text: data.error || "Upload failed.", ok: false });
      }
    } catch { setUploadMsg({ text: "Could not reach server.", ok: false }); }
    setUploading(false);
  };

  const fieldStyle = (extra = {}) => ({
    width: "100%", padding: "9px 14px", fontSize: "0.88rem",
    fontFamily: '"Fira Code", monospace', borderRadius: "20px",
    border: `1px solid ${theme.selectBorder}`,
    backgroundColor: theme.selectBg, color: theme.selectColor,
    boxSizing: "border-box", outline: "none",
    opacity: isAdmin ? 1 : 0.4,
    cursor: isAdmin ? "text" : "not-allowed",
    ...extra,
  });

  const labelStyle = { fontSize: "0.78rem", color: theme.subtext, marginBottom: "2px", display: "block" };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 3000, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div style={{ backgroundColor: theme.bg, border: `1px solid ${theme.selectBorder}`, borderRadius: "14px", padding: "1.8rem", width: "100%", maxWidth: "460px", fontFamily: '"Fira Code", monospace', color: theme.text, boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Settings</h2>
          <button onClick={onClose} className="deotter-btn" style={{ padding: "4px 12px", margin: 0 }}>✕</button>
        </div>

        {loading ? <p style={{ color: theme.subtext }}>Loading…</p> : (
          <>
            {/* Section title */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.78rem", color: theme.subtext, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Provider</span>
              {!isAdmin && (
                <span style={{ fontSize: "0.75rem", color: "#dc3545", border: "1px solid #dc3545", borderRadius: "20px", padding: "1px 8px" }}>
                  admin only
                </span>
              )}
            </div>

            {/* Provider toggle */}
            <div style={{ display: "flex", marginBottom: "1.2rem", border: `1px solid ${theme.selectBorder}`, borderRadius: "24px", overflow: "hidden", opacity: isAdmin ? 1 : 0.4, pointerEvents: isAdmin ? "auto" : "none" }}>
              <button onClick={() => setProvider("anthropic")} className="deotter-btn"
                style={{ borderRadius: "24px 0 0 24px", margin: 0, flex: 1, border: "none", opacity: provider === "anthropic" ? 1 : 0.5 }}>
                Claude
              </button>
              <button onClick={() => setProvider("azure")} className="deotter-btn"
                style={{ borderRadius: 0, margin: 0, flex: 1, border: "none", borderLeft: `1px solid ${theme.selectBorder}`, opacity: provider === "azure" ? 1 : 0.5 }}>
                Azure
              </button>
              <button onClick={() => setProvider("openai")} className="deotter-btn"
                style={{ borderRadius: "0 24px 24px 0", margin: 0, flex: 1, border: "none", borderLeft: `1px solid ${theme.selectBorder}`, opacity: provider === "openai" ? 1 : 0.5 }}>
                OpenAI
              </button>
            </div>

            {/* Provider fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", pointerEvents: isAdmin ? "auto" : "none" }}>
              {provider === "anthropic" && (
                <>
                  <label style={labelStyle}>
                    API Key{hints.anthropic && <span style={{ marginLeft: 6, opacity: 0.7 }}>({hints.anthropic})</span>}
                  </label>
                  <input style={fieldStyle()} type="password"
                    placeholder={hints.anthropic ? "Leave blank to keep existing key" : "sk-..."}
                    value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} disabled={!isAdmin} />
                </>
              )}

              {provider === "azure" && (
                <>
                  <label style={labelStyle}>Endpoint</label>
                  <input style={fieldStyle()} type="text" placeholder="https://YOUR-RESOURCE.services.ai.azure.com/models"
                    value={azureEndpoint} onChange={e => setAzureEndpoint(e.target.value)} disabled={!isAdmin} />

                  <label style={labelStyle}>Deployment Name</label>
                  <input style={fieldStyle()} type="text" placeholder="my-gpt4o-deployment"
                    value={azureDeployment} onChange={e => setAzureDeployment(e.target.value)} disabled={!isAdmin} />

                  <label style={labelStyle}>
                    API Key{hints.azure && <span style={{ marginLeft: 6, opacity: 0.7 }}>({hints.azure})</span>}
                  </label>
                  <input style={fieldStyle()} type="password"
                    placeholder={hints.azure ? "Leave blank to keep existing key" : "Your Azure AI Foundry API key"}
                    value={azureKey} onChange={e => setAzureKey(e.target.value)} disabled={!isAdmin} />
                </>
              )}

              {provider === "openai" && (
                <>
                  <label style={labelStyle}>
                    API Key{openaiHint && <span style={{ marginLeft: 6, opacity: 0.7 }}>({openaiHint})</span>}
                  </label>
                  <input style={fieldStyle()} type="password"
                    placeholder={openaiHint ? "Leave blank to keep existing key" : "sk-..."}
                    value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} disabled={!isAdmin} />

                  <label style={labelStyle}>Model</label>
                  <input style={fieldStyle()} type="text" placeholder="gpt-4o"
                    value={openaiModel} onChange={e => setOpenaiModel(e.target.value)} disabled={!isAdmin} />
                </>
              )}
            </div>

            {/* Logo section */}
            <div style={{ marginTop: "1.4rem", borderTop: `1px solid ${theme.selectBorder}`, paddingTop: "1.2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.8rem" }}>
                <span style={{ fontSize: "0.78rem", color: theme.subtext, textTransform: "uppercase", letterSpacing: "0.08em" }}>Logo</span>
                {!isAdmin && (
                  <span style={{ fontSize: "0.75rem", color: "#dc3545", border: "1px solid #dc3545", borderRadius: "20px", padding: "1px 8px" }}>
                    admin only
                  </span>
                )}
              </div>
              <div style={{ pointerEvents: isAdmin ? "auto" : "none", opacity: isAdmin ? 1 : 0.4 }}>
                <label style={labelStyle}>Select logo (PNG / JPG from public folder)</label>
                <select
                  value={logoOverride}
                  onChange={e => setLogoOverride(e.target.value)}
                  disabled={!isAdmin}
                  style={{ ...fieldStyle({ cursor: isAdmin ? "pointer" : "not-allowed" }), marginBottom: "0.6rem" }}
                >
                  <option value="">— Default (dark/light mode logos) —</option>
                  {logoFiles.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>

                {logoOverride && (
                  <button
                    className="deotter-btn"
                    disabled={!isAdmin}
                    onClick={async () => {
                      await authFetch(token, `${API}/settings/clear-logo`, { method: "POST" }, onUnauth);
                      setLogoOverride("");
                      if (onLogoSaved) onLogoSaved("");
                    }}
                    style={{ margin: "0 0 0.6rem 0", width: "100%", color: "#dc3545", borderColor: "#dc3545" }}
                  >
                    Clear logo (use default)
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  onChange={handleUpload}
                />
                <button
                  className="deotter-btn"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={uploading || !isAdmin}
                  style={{ margin: "0 0 0.6rem 0", width: "100%" }}
                >
                  {uploading ? "Uploading…" : "Upload new logo…"}
                </button>

                {uploadMsg.text && (
                  <p style={{ color: uploadMsg.ok ? "#28a745" : "#dc3545", fontSize: "0.82rem", margin: "0 0 0.4rem" }}>
                    {uploadMsg.text}
                  </p>
                )}

                {logoOverride && (
                  <div style={{ textAlign: "center" }}>
                    <img
                      src={`/${logoOverride}`}
                      alt="preview"
                      style={{ maxWidth: "100%", maxHeight: "120px", objectFit: "contain", borderRadius: "8px", border: `1px solid ${theme.selectBorder}` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {msg.text && (
              <p style={{ color: msg.ok ? "#28a745" : "#dc3545", fontSize: "0.85rem", margin: "1rem 0 0" }}>{msg.text}</p>
            )}

            {isAdmin && (
              <button className="deotter-btn" onClick={handleSave} disabled={saving}
                style={{ marginTop: "1.4rem", marginLeft: 0, width: "100%" }}>
                {saving ? "Saving…" : "Save Settings"}
              </button>
            )}

            {/* Password Pepper — admin only */}
            {isAdmin && (
              <div style={{ marginTop: "1.4rem", borderTop: `1px solid ${theme.selectBorder}`, paddingTop: "1.2rem" }}>
                <span style={{ fontSize: "0.78rem", color: theme.subtext, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Password Pepper
                </span>
                <p style={{ fontSize: "0.75rem", color: "#f0ad4e", margin: "0.4rem 0 0.6rem" }}>
                  Warning: changing this will invalidate all existing user passwords.
                </p>
                <div style={{ position: "relative" }}>
                  <input
                    style={{ ...fieldStyle(), paddingRight: "44px", filter: pepperVisible ? "none" : "blur(4px)", transition: "filter 0.2s" }}
                    type="text"
                    value={pepper}
                    onChange={e => setPepper(e.target.value)}
                  />
                  <button
                    onClick={() => setPepperVisible(v => !v)}
                    title={pepperVisible ? "Hide" : "Reveal"}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: theme.subtext, fontSize: "1rem", padding: 0 }}
                  >
                    {pepperVisible ? "🙈" : "👁"}
                  </button>
                </div>
                <button
                  className="deotter-btn"
                  disabled={pepperSaving}
                  onClick={async () => {
                    setPepperSaving(true); setPepperMsg({ text: "", ok: true });
                    try {
                      const res = await authFetch(token, `${API}/settings/pepper`, { method: "POST", body: JSON.stringify({ pepper }) }, onUnauth);
                      const data = await res.json();
                      setPepperMsg({ text: data.message || data.error, ok: res.ok });
                    } catch { setPepperMsg({ text: "Could not reach server.", ok: false }); }
                    setPepperSaving(false);
                  }}
                  style={{ marginTop: "0.6rem", marginLeft: 0, width: "100%" }}
                >
                  {pepperSaving ? "Saving…" : "Save Pepper"}
                </button>
                {pepperMsg.text && (
                  <p style={{ color: pepperMsg.ok ? "#28a745" : "#dc3545", fontSize: "0.82rem", margin: "0.4rem 0 0" }}>
                    {pepperMsg.text}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------
// Notifications Bell (admin only)
// ------------------------------
function NotificationsPanel({ token, theme, onUnauth }) {
  const [open, setOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [lastSeen, setLastSeen] = useState(0);
  const ref = useRef(null);
  const lastSeenRef = useRef(0);

  const fetchNotifications = async () => {
    try {
      const res = await authFetch(token, `${API}/notifications`, {}, onUnauth);
      if (!res.ok) return;
      const data = await res.json();
      const pending = data.pending_users || [];
      setPendingUsers(pending);
      setUnseenCount(Math.max(0, pending.length - lastSeenRef.current));
    } catch {}
  };

  useEffect(() => {
    lastSeenRef.current = lastSeen;
  }, [lastSeen]);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) { setLastSeen(pendingUsers.length); setUnseenCount(0); }
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={handleOpen}
        title="Notifications"
        className="deotter-btn"
        style={{ position: "relative", width: "40px", height: "40px", borderRadius: "50%", padding: 0, margin: 0 }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unseenCount > 0 && (
          <span style={{
            position: "absolute", top: "-4px", right: "-4px",
            backgroundColor: "#f0ad4e", color: "#111",
            borderRadius: "50%", minWidth: "18px", height: "18px",
            fontSize: "0.65rem", fontFamily: '"Fira Code", monospace',
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold", padding: "0 3px",
          }}>
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "48px",
          backgroundColor: theme.selectBg, border: `1px solid ${theme.selectBorder}`,
          borderRadius: "12px", minWidth: "260px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 2000,
          fontFamily: '"Fira Code", monospace', fontSize: "0.85rem", overflow: "hidden",
        }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${theme.selectBorder}`, fontWeight: "bold", color: theme.text }}>
            Pending Approvals
          </div>
          {pendingUsers.length === 0 ? (
            <div style={{ padding: "12px 14px", color: theme.subtext }}>No pending users.</div>
          ) : pendingUsers.map(u => (
            <div key={u.username} style={{ padding: "8px 14px", borderBottom: `1px solid ${theme.selectBorder}`, color: theme.text, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{u.username}</span>
              <span style={{ fontSize: "0.72rem", color: "#f0ad4e" }}>pending</span>
            </div>
          ))}
          {pendingUsers.length > 0 && (
            <div style={{ padding: "8px 14px", color: theme.subtext, fontSize: "0.75rem" }}>
              Open Admin Panel to approve.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------
// Admin Panel Modal
// ------------------------------
function AdminPanel({ token, theme, onClose, onUnauth }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [modelPolicy, setModelPolicy] = useState({});
  const [policyMsg, setPolicyMsg] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await authFetch(token, `${API}/admin/users`, {}, onUnauth);
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch {}
    setLoading(false);
  };

  const loadPolicy = async () => {
    try {
      const res = await authFetch(token, `${API}/settings/model-policy`, {}, onUnauth);
      const data = await res.json();
      if (res.ok) setModelPolicy(data.policy || {});
    } catch {}
  };

  useEffect(() => { loadUsers(); loadPolicy(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleModel = async (modelName) => {
    const isAllowed = modelPolicy[modelName] === "allowed";
    const newPolicy = { ...modelPolicy };
    if (isAllowed) {
      delete newPolicy[modelName];
    } else {
      newPolicy[modelName] = "allowed";
    }
    setModelPolicy(newPolicy);
    setPolicyMsg("");
    try {
      const res = await authFetch(token, `${API}/settings/model-policy`, {
        method: "POST",
        body: JSON.stringify({ policy: newPolicy }),
      }, onUnauth);
      const data = await res.json();
      setPolicyMsg(data.message || data.error || "Saved.");
    } catch { setPolicyMsg("Save failed."); }
  };

  const doAction = async (url, method = "POST", body = null) => {
    setActionMsg("");
    try {
      const res = await authFetch(token, url, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      }, onUnauth);
      const data = await res.json();
      setActionMsg(data.message || data.error || "Done.");
      await loadUsers();
    } catch { setActionMsg("Request failed."); }
  };

  const btnStyle = (color) => ({
    margin: 0, padding: "3px 10px", fontSize: "0.75rem",
    ...(color ? { color, borderColor: color } : {}),
  });

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 3000, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div style={{ backgroundColor: theme.bg, border: `1px solid ${theme.selectBorder}`, borderRadius: "14px", padding: "1.8rem", width: "100%", maxWidth: "640px", fontFamily: '"Fira Code", monospace', color: theme.text, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Admin Panel</h2>
          <button onClick={onClose} className="deotter-btn" style={{ padding: "4px 12px", margin: 0 }}>✕</button>
        </div>

        <h3 style={{ margin: "0 0 0.8rem 0", fontSize: "0.85rem", color: theme.subtext, textTransform: "uppercase", letterSpacing: "0.06em" }}>Users</h3>

        {loading ? <p style={{ color: theme.subtext }}>Loading…</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.selectBorder}`, color: theme.subtext, textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Username</th>
                <th style={{ padding: "6px 8px" }}>Role</th>
                <th style={{ padding: "6px 8px" }}>Status</th>
                <th style={{ padding: "6px 8px" }}>Submissions</th>
                <th style={{ padding: "6px 8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.username} style={{ borderBottom: `1px solid ${theme.selectBorder}` }}>
                  <td style={{ padding: "8px 8px", color: theme.text }}>{u.username}</td>
                  <td style={{ padding: "8px 8px", color: theme.subtext }}>{u.role}</td>
                  <td style={{ padding: "8px 8px", color: u.status === "pending" ? "#f0ad4e" : "#28a745" }}>{u.status}</td>
                  <td style={{ padding: "8px 8px", color: theme.subtext, textAlign: "center" }}>{u.submissions || 0}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {u.status === "pending" && (
                        <button className="deotter-btn" style={{ ...btnStyle("#28a745") }}
                          onClick={() => doAction(`${API}/admin/users/${u.username}/approve`)}>
                          Approve
                        </button>
                      )}
                      <button className="deotter-btn" style={{ ...btnStyle(null) }}
                        onClick={() => doAction(`${API}/admin/users/${u.username}/role`, "POST", { role: u.role === "admin" ? "user" : "admin" })}>
                        → {u.role === "admin" ? "User" : "Admin"}
                      </button>
                      <button className="deotter-btn" style={{ ...btnStyle("#dc3545") }}
                        onClick={() => { if (window.confirm(`Delete '${u.username}'?`)) doAction(`${API}/admin/users/${u.username}`, "DELETE"); }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {actionMsg && (
          <p style={{ color: theme.subtext, fontSize: "0.82rem", marginTop: "1rem" }}>{actionMsg}</p>
        )}

        <div style={{ borderTop: `1px solid ${theme.selectBorder}`, margin: "1.6rem 0 1rem" }} />
        <h3 style={{ margin: "0 0 0.8rem 0", fontSize: "0.85rem", color: theme.subtext, textTransform: "uppercase", letterSpacing: "0.06em" }}>Model Policy</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.selectBorder}`, color: theme.subtext, textAlign: "left" }}>
              <th style={{ padding: "6px 8px" }}>Model</th>
              <th style={{ padding: "6px 8px" }}>Status</th>
              <th style={{ padding: "6px 8px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {COMPATIBLE_MODELS.map(m => {
              const isAllowed = modelPolicy[m] === "allowed";
              return (
                <tr key={m} style={{ borderBottom: `1px solid ${theme.selectBorder}` }}>
                  <td style={{ padding: "8px 8px", color: theme.text }}>{m}</td>
                  <td style={{ padding: "8px 8px", color: isAllowed ? "#28a745" : "#dc3545" }}>
                    {isAllowed ? "Allowed" : "Not Allowed"}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <button
                      className="deotter-btn"
                      style={{ margin: 0, padding: "3px 10px", fontSize: "0.75rem", color: isAllowed ? "#dc3545" : "#28a745", borderColor: isAllowed ? "#dc3545" : "#28a745" }}
                      onClick={() => toggleModel(m)}
                    >
                      {isAllowed ? "Revoke" : "Allow"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {policyMsg && (
          <p style={{ color: theme.subtext, fontSize: "0.82rem", marginTop: "0.8rem" }}>{policyMsg}</p>
        )}
      </div>
    </div>
  );
}

// ------------------------------
// Gear Dropdown
// ------------------------------
function GearMenu({ username, role, onLogout, onSettings, onAdminPanel, theme }) {
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
            onClick={() => { setOpen(false); onSettings(); }}
            style={{
              width: "100%", padding: "10px 14px",
              background: "none", border: "none",
              borderBottom: `1px solid ${theme.selectBorder}`,
              color: theme.text, cursor: "pointer",
              textAlign: "left", fontFamily: '"Fira Code", monospace',
              fontSize: "0.85rem",
            }}
          >
            Settings
          </button>
          {role === "admin" && (
            <button
              onClick={() => { setOpen(false); onAdminPanel(); }}
              style={{
                width: "100%", padding: "10px 14px",
                background: "none", border: "none",
                borderBottom: `1px solid ${theme.selectBorder}`,
                color: theme.text, cursor: "pointer",
                textAlign: "left", fontFamily: '"Fira Code", monospace',
                fontSize: "0.85rem",
              }}
            >
              Admin Panel
            </button>
          )}
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
// Instructions Modal
// ------------------------------
function InstructionsModal({ theme, onClose }) {
  const code = (s) => (
    <code style={{ backgroundColor: theme.selectBg, border: `1px solid ${theme.selectBorder}`, borderRadius: "4px", padding: "1px 6px", fontFamily: '"Fira Code", monospace', fontSize: "0.82rem", color: theme.text }}>{s}</code>
  );
  const h = (s) => <div style={{ fontWeight: "bold", fontSize: "0.85rem", color: theme.text, margin: "1.2rem 0 0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s}</div>;
  const p = (s) => <div style={{ color: theme.subtext, fontSize: "0.82rem", lineHeight: 1.6, marginBottom: "0.4rem" }}>{s}</div>;

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 4000, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ backgroundColor: theme.bg, border: `1px solid ${theme.selectBorder}`, borderRadius: "14px", padding: "1.8rem", width: "100%", maxWidth: "580px", maxHeight: "85vh", overflowY: "auto", fontFamily: '"Fira Code", monospace', color: theme.text, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Setup & Usage Guide</h2>
          <button onClick={onClose} className="deotter-btn" style={{ padding: "4px 12px", margin: 0 }}>✕</button>
        </div>

        {h("1 — Clone & install")}
        {p("Clone the repo, create a Python venv, install dependencies:")}
        <pre style={{ backgroundColor: theme.selectBg, borderRadius: "8px", padding: "0.8rem", fontSize: "0.78rem", color: theme.text, overflowX: "auto", margin: "0.4rem 0" }}>{`git clone https://github.com/hackychucky/deotter.git
cd DeOtter/backend
python3 -m venv venv && source venv/bin/activate
pip install flask flask-cors anthropic openai PyJWT werkzeug`}</pre>

        {h("2 — Start the app")}
        {p("From the frontend folder — starts both Flask (port 5001) and React (port 3000):")}
        <pre style={{ backgroundColor: theme.selectBg, borderRadius: "8px", padding: "0.8rem", fontSize: "0.78rem", color: theme.text, overflowX: "auto", margin: "0.4rem 0" }}>{`cd frontend
npm install
npm start`}</pre>

        {h("3 — AI Provider (required for AI features)")}
        {p("Configure via Settings (gear icon) in the app after logging in. Supported providers:")}

        <div style={{ marginTop: "0.4rem", marginBottom: "0.8rem" }}>
          <div style={{ color: theme.text, fontSize: "0.82rem", marginBottom: "0.3rem" }}><strong>Anthropic / Claude</strong> — get key at console.anthropic.com</div>
          <pre style={{ backgroundColor: theme.selectBg, borderRadius: "8px", padding: "0.6rem", fontSize: "0.78rem", color: theme.text, margin: "0.2rem 0" }}>{`export ANTHROPIC_API_KEY=sk-...`}</pre>

          <div style={{ color: theme.text, fontSize: "0.82rem", margin: "0.6rem 0 0.3rem" }}><strong>Azure AI Foundry</strong> — use endpoint + deployment from ai.azure.com</div>
          <pre style={{ backgroundColor: theme.selectBg, borderRadius: "8px", padding: "0.6rem", fontSize: "0.78rem", color: theme.text, margin: "0.2rem 0" }}>{`export AZURE_FOUNDRY_ENDPOINT=https://...
export AZURE_FOUNDRY_DEPLOYMENT=my-gpt4o
export AZURE_FOUNDRY_API_KEY=your-key`}</pre>

          <div style={{ color: theme.text, fontSize: "0.82rem", margin: "0.6rem 0 0.3rem" }}><strong>OpenAI</strong> — get key at platform.openai.com</div>
          <pre style={{ backgroundColor: theme.selectBg, borderRadius: "8px", padding: "0.6rem", fontSize: "0.78rem", color: theme.text, margin: "0.2rem 0" }}>{`export OPENAI_API_KEY=sk-...`}</pre>
        </div>

        {h("4 — Local Model (optional, heavy)")}
        {p("Install torch + transformers (≈2 GB). Only generative models work (CodeT5, StarCoder, Mistral — NOT CodeBERT).")}
        <pre style={{ backgroundColor: theme.selectBg, borderRadius: "8px", padding: "0.6rem", fontSize: "0.78rem", color: theme.text, margin: "0.2rem 0 0.8rem" }}>{`pip install torch transformers`}</pre>
        {p("Add model paths to backend/models_config.json, then use the Lab tab to load and run inference.")}

        {h("5 — Users & Admin")}
        {p("Default admin credentials: admin / pa$$w0rd — change immediately.")}
        <pre style={{ backgroundColor: theme.selectBg, borderRadius: "8px", padding: "0.6rem", fontSize: "0.78rem", color: theme.text, margin: "0.2rem 0" }}>{`python3 manage_users.py list
python3 manage_users.py create alice secret --role admin
python3 manage_users.py password admin newpass
python3 manage_users.py delete alice`}</pre>
        {p("New sign-ups are pending by default — approve them in the Admin Panel (bell icon).")}

        {h("6 — JWT Secret")}
        {p("Set a permanent secret to avoid token expiry on Flask restarts:")}
        <pre style={{ backgroundColor: theme.selectBg, borderRadius: "8px", padding: "0.6rem", fontSize: "0.78rem", color: theme.text, margin: "0.2rem 0" }}>{`export DEOTTER_SECRET=some-long-random-string`}</pre>

        <div style={{ marginTop: "1.4rem", borderTop: `1px solid ${theme.selectBorder}`, paddingTop: "1rem" }}>
          <a href="https://github.com/hackychucky/deotter" target="_blank" rel="noreferrer"
            style={{ color: "#4f8ef7", fontSize: "0.82rem", textDecoration: "none" }}>
            Full docs: github.com/hackychucky/deotter →
          </a>
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// Welcome Banner (first login)
// ------------------------------
function WelcomeBanner({ username, theme, onDismiss }) {
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
      zIndex: 4000, maxWidth: "480px", width: "calc(100% - 3rem)",
      backgroundColor: theme.selectBg, border: `1px solid ${theme.selectBorder}`,
      borderRadius: "14px", padding: "1.2rem 1.4rem",
      boxShadow: "0 6px 24px rgba(0,0,0,0.22)",
      fontFamily: '"Fira Code", monospace', color: theme.text,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "0.4rem" }}>Welcome to DeOtter, {username}!</div>
          <div style={{ fontSize: "0.82rem", color: theme.subtext, lineHeight: 1.5 }}>
            Enjoy deobfuscating JavaScript. If you find it useful, please consider giving it a ⭐ on GitHub!
          </div>
          <a
            href="https://github.com/hackychucky/deotter"
            target="_blank" rel="noreferrer"
            style={{ display: "inline-block", marginTop: "0.6rem", fontSize: "0.82rem", color: "#4f8ef7", textDecoration: "none" }}
          >
            github.com/hackychucky/deotter →
          </a>
        </div>
        <button onClick={onDismiss} className="deotter-btn" style={{ padding: "4px 10px", margin: 0, flexShrink: 0 }}>✕</button>
      </div>
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
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [logoOverride, setLogoOverride] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
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
    setShowWelcome(true);
  };

  const handleLogout = () => {
    setToken(""); setCurrentUser(null);
    localStorage.removeItem("deotter_token");
    localStorage.removeItem("deotter_user");
  };

  useEffect(() => {
    if (!token) return;
    authFetch(token, `${API}/available-models`, {}, handleLogout)
      .then(r => r.json())
      .then(d => { if (d.models) setAvailableModels(d.models); })
      .catch(() => {});
    authFetch(token, `${API}/settings/ai`, {}, handleLogout)
      .then(r => r.json())
      .then(d => { if (d.logo_override !== undefined) setLogoOverride(d.logo_override); })
      .catch(() => {});
    authFetch(token, `${API}/leaderboard`, {}, handleLogout)
      .then(r => r.json())
      .then(d => { if (d.top) setLeaderboard(d.top); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleGenerateReport = async () => {
    setShowFeedback(false);
    try {
      const res = await authFetch(token, `${API}/generate-report`, { method: "POST", body: JSON.stringify({ code }) }, handleLogout);
      const data = await res.json();
      setReport(res.ok ? data.report : `Error: ${data.error}`);
    } catch (err) { setReport(`Request failed: ${err.message}`); }
  };

  const handleDeobfuscate = async () => {
    setShowFeedback(false);
    try {
      const res = await authFetch(token, `${API}/deobfuscate`, { method: "POST", body: JSON.stringify({ code }) }, handleLogout);
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
      }, handleLogout);
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

  // CSS custom properties for the .deotter-btn class
  const cssVars = {
    "--btn-bg":     btnBg,
    "--btn-text":   theme.text,
    "--btn-border": theme.selectBorder,
  };

  if (!token || !currentUser) {
    return (
      <div className="App" style={{ backgroundColor: theme.bg, color: theme.text, minHeight: "100vh", ...cssVars }}>
        <LoginPage onLogin={handleLogin} theme={theme} darkMode={darkMode} logoOverride={logoOverride} />
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
        {currentUser.role === "admin" && (
          <NotificationsPanel token={token} theme={theme} onUnauth={handleLogout} />
        )}
        <button
          onClick={() => setShowInstructions(true)}
          title="Setup & Usage Guide"
          className="deotter-btn"
          style={{ width: "40px", height: "40px", borderRadius: "50%", padding: 0, margin: 0 }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </button>
        <GearMenu username={currentUser.username} role={currentUser.role} onLogout={handleLogout} onSettings={() => setShowSettings(true)} onAdminPanel={() => setShowAdminPanel(true)} theme={theme} />
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
        <button className="deotter-btn" style={{ opacity: tab === "lab" ? 1 : 0.55 }} onClick={() => setTab("lab")}>LMI</button>
      </div>

      {showSettings && (
        <SettingsModal
          token={token}
          currentUser={currentUser}
          theme={theme}
          onClose={() => setShowSettings(false)}
          onUnauth={handleLogout}
          onLogoSaved={setLogoOverride}
        />
      )}
      {showAdminPanel && (
        <AdminPanel
          token={token}
          theme={theme}
          onClose={() => setShowAdminPanel(false)}
          onUnauth={handleLogout}
        />
      )}
      {showInstructions && <InstructionsModal theme={theme} onClose={() => setShowInstructions(false)} />}
      {showWelcome && (
        <WelcomeBanner username={currentUser.username} theme={theme} onDismiss={() => setShowWelcome(false)} />
      )}

      {tab === "deobfuscate" ? (
        <DeobfuscatePage
          code={code} setCode={setCode} report={report} setReport={setReport}
          handleDeobfuscate={handleDeobfuscate} handleGenerateReport={handleGenerateReport}
          handleAIDeobfuscate={handleAIDeobfuscate}
          showFeedback={showFeedback} handleGood={handleGood} handleBad={handleBad}
          usePairs={usePairs} setUsePairs={setUsePairs} pairsCount={trainPairs.length}
          theme={theme} darkMode={darkMode} logoOverride={logoOverride}
        />
      ) : (
        <LabPage
          obfuscated={trainObfuscated} setObfuscated={setTrainObfuscated}
          clean={trainClean} setClean={setTrainClean}
          pairs={trainPairs} setPairs={setTrainPairs}
          availableModels={availableModels}
          selectedModel={selectedModel} setSelectedModel={setSelectedModel}
          token={token} theme={theme} handleLogout={handleLogout}
        />
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: `1px solid ${theme.selectBorder}`, fontFamily: '"Fira Code", monospace' }}>
          <div style={{ fontSize: "0.78rem", color: theme.subtext, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            Top Deobfuscators
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {leaderboard.map((u, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              const colors = ["#f0ad4e", "#aaaaaa", "#cd7f32"];
              return (
                <div key={u.username} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ fontSize: i === 0 ? "2rem" : "1.6rem" }}>{medals[i]}</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: colors[i] }}>{u.username}</div>
                  <div style={{ fontSize: "0.75rem", color: theme.subtext }}>{u.submissions} submission{u.submissions !== 1 ? "s" : ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Version label */}
      <div style={{
        position: "fixed", bottom: "0.6rem", left: "0.8rem",
        fontFamily: '"Fira Code", monospace', fontSize: "0.68rem",
        color: theme.subtext, opacity: 0.5, pointerEvents: "none",
      }}>
        DeOtter v2.0.1 — June 2026
      </div>
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
