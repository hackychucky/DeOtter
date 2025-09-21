import React, { useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";
import "./App.css";

// ------------------------------
// Training Page Component
// ------------------------------
function TrainingPage() {
  const [obfuscated, setObfuscated] = useState("");
  const [clean, setClean] = useState("");
  const [pairs, setPairs] = useState([]);

  const highlight = (code) =>
    Prism.highlight(code, Prism.languages.javascript, "javascript");

  // Añadir par
  const handleAddPair = () => {
    if (!obfuscated.trim() || !clean.trim()) {
      alert("Please provide both obfuscated and clean code");
      return;
    }
    setPairs([...pairs, { obfuscated, clean }]);
    setObfuscated("");
    setClean("");
  };

  // Enviar entrenamiento
  const handleTrain = async () => {
    if (pairs.length === 0) {
      alert("Add at least one training pair!");
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:5000/train-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs }),
      });
      const data = await res.json();
      alert(res.ok ? data.message : `Error: ${data.error}`);
    } catch (err) {
      alert(`Training failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      {/* TITLE with same font as the header */}
      <h2 style={{ fontFamily: '"Fira Code", monospace', fontSize: "1.2rem" }}>
        Train the Model
      </h2>

      {/* Editor para código ofuscado */}
      <div
        style={{
          margin: "2rem auto",
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
        }}
      >
        <Editor
          value={obfuscated}
          onValueChange={setObfuscated}
          highlight={highlight}
          padding={10}
          style={{
            outline: 0,
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            color: "#f8f8f2",
            minHeight: "180px",
          }}
          placeholder="Insert obfuscated Javascript code"
        />
      </div>

      {/* Editor para código limpio */}
      <div
        style={{
          margin: "2rem auto",
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
        }}
      >
        <Editor
          value={clean}
          onValueChange={setClean}
          highlight={highlight}
          padding={10}
          style={{
            outline: 0,
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            color: "#f8f8f2",
            minHeight: "180px",
          }}
          placeholder="Insert clean Javascript code"
        />
      </div>

      {/* Botón para añadir par */}
      <button style={buttonStyle} onClick={handleAddPair}>
        Add Training Pair
      </button>

      {/* SUBTITLE with same font as header */}
      <h3 style={{ marginTop: "2rem", fontFamily: '"Fira Code", monospace', fontSize: "1.05rem" }}>
        Training Pairs
      </h3>

      <ul style={{ textAlign: "left" }}>
        {pairs.map((p, idx) => (
          <li key={idx} style={{ marginBottom: "0.6rem" }}>
            <strong>Obfuscated:</strong> {p.obfuscated.slice(0, 60)}... <br />
            <strong>Clean:</strong> {p.clean.slice(0, 60)}...
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "1rem" }}>
        <button style={buttonStyle} onClick={handleTrain}>
          Train Model
        </button>
        <button style={buttonStyle} onClick={() => setPairs([])}>
          Clear Pairs
        </button>
      </div>
    </div>
  );
}


// ------------------------------
// Deobfuscate Page Component (lo que ya tenías)
// ------------------------------
function DeobfuscatePage({
  code,
  setCode,
  report,
  setReport,
  availableModels,
  selectedModel,
  setSelectedModel,
  handleDeobfuscate,
  handleGenerateReport,
  handleAIDeobfuscate,
  handleLoadModel,
}) {
  const highlight = (code) =>
    Prism.highlight(code, Prism.languages.javascript, "javascript");

  return (
    <div>
      <img
        src="/deotterlogo1.png"
        alt="Logo"
        style={{ width: "600px", marginBottom: "2rem" }}
      />
      <p
        style={{
          fontFamily: '"Fira Code", monospace',
          fontSize: "1.2rem",
        }}
      >
        DeObfuscation tool for Cyber Security Analysts <br />
        Developed with ❤ from Spain by <strong>@HackyChucky</strong>
      </p>

      {/* Editor */}
      <div
        style={{
          margin: "2rem auto",
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
        }}
      >
        <Editor
          value={code}
          onValueChange={setCode}
          highlight={highlight}
          padding={10}
          style={{
            outline: 0,
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            color: "#f8f8f2",
            minHeight: "180px",
          }}
          placeholder="Insert Javascript code to deobfuscate"
        />
      </div>

      {/* Botones */}
      <div style={{ marginTop: "1rem" }}>
        <button style={buttonStyle} onClick={handleDeobfuscate}>
          Deobfuscate
        </button>
        <button style={buttonStyle} onClick={handleGenerateReport}>
          Create Obfuscation Report
        </button>
        <button style={buttonStyle} onClick={handleAIDeobfuscate}>
          Deobfuscate using DeOtter AI
        </button>
      </div>

      {/* Selector de modelos */}
      <div style={{ marginTop: "1rem" }}>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{
            padding: "10px",
            fontSize: "1rem",
            marginLeft: "10px",
            marginRight: "10px",
          }}
        >
          <option value="">Select a model</option>
          {availableModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <button style={buttonStyle} onClick={handleLoadModel}>
          Load Selected Model
        </button>
      </div>

      {/* Reporte */}
      {report && (
        <div
          style={{
            marginTop: "2rem",
            maxWidth: "700px",
            marginLeft: "auto",
            marginRight: "auto",
            textAlign: "left",
            backgroundColor: "#1e1e1e",
            color: "#f8f8f2",
            padding: "1rem",
            borderRadius: "5px",
            whiteSpace: "pre-wrap",
            fontFamily: '"Fira Code", monospace',
            fontSize: "0.9rem",
          }}
        >
          <strong>Obfuscation Report:</strong>
          <br />
          {report}
        </div>
      )}
    </div>
  );
}

// ------------------------------
// Main App
// ------------------------------
function App() {
  const [tab, setTab] = useState("deobfuscate"); // pestaña activa
  const [code, setCode] = useState("");
  const [report, setReport] = useState("");
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");

  // Cargar lista de modelos desde backend
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/available-models");
        const data = await res.json();
        if (res.ok) setAvailableModels(data.models);
      } catch (err) {
        console.log("No models loaded yet");
      }
    };
    fetchModels();
  }, []);

  // Handlers
  const handleGenerateReport = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      setReport(response.ok ? data.report : `Error: ${data.error}`);
    } catch (error) {
      setReport(`Request failed: ${error.message}`);
    }
  };

  const handleDeobfuscate = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/deobfuscate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      setReport(
        response.ok
          ? data.deobfuscated
          : `Error: ${data.error}`
      );
    } catch (error) {
      setReport(`Request failed: ${error.message}`);
    }
  };

  const handleAIDeobfuscate = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/ai-deobfuscate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      setReport(
        response.ok
          ? `AI Embeddings generated! Vector size: ${data.embeddings.length}`
          : `Error: ${data.error}`
      );
    } catch (error) {
      setReport(`Request failed: ${error.message}`);
    }
  };

  const handleLoadModel = async () => {
    if (!selectedModel) return;
    try {
      const response = await fetch("http://127.0.0.1:5000/load-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: selectedModel }),
      });
      const data = await response.json();
      alert(response.ok ? data.message : `Error: ${data.error}`);
    } catch (error) {
      alert(`Request failed: ${error.message}`);
    }
  };

  // ------------------------------
  // Render
  // ------------------------------
  return (
    <div className="App" style={{ textAlign: "center", padding: "2rem" }}>
      {/* Tabs */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: tab === "deobfuscate" ? "#0056b3" : "#007BFF",
          }}
          onClick={() => setTab("deobfuscate")}
        >
          Deobfuscate
        </button>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: tab === "train" ? "#0056b3" : "#007BFF",
          }}
          onClick={() => setTab("train")}
        >
          Train
        </button>
      </div>

      {/* Contenido según pestaña */}
      {tab === "deobfuscate" ? (
        <DeobfuscatePage
          code={code}
          setCode={setCode}
          report={report}
          setReport={setReport}
          availableModels={availableModels}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          handleDeobfuscate={handleDeobfuscate}
          handleGenerateReport={handleGenerateReport}
          handleAIDeobfuscate={handleAIDeobfuscate}
          handleLoadModel={handleLoadModel}
        />
      ) : (
        <TrainingPage />
      )}
    </div>
  );
}

// Estilo botones
const buttonStyle = {
  margin: "0 10px",
  padding: "10px 20px",
  fontSize: "1rem",
  cursor: "pointer",
  borderRadius: "4px",
  border: "1px solid #007BFF",
  backgroundColor: "#007BFF",
  color: "white",
  transition: "background-color 0.3s ease",
};

export default App;
