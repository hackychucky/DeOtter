import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';
import './App.css';

function App() {
  const [code, setCode] = useState('');
  const [report, setReport] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  // función para aplicar resaltado con prism
  const highlight = (code) => Prism.highlight(code, Prism.languages.javascript, 'javascript');

  // Fetch modelos disponibles al iniciar (no intenta cargar ninguno)
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/available-models");
        const data = await res.json();
        if (res.ok) setAvailableModels(data.models);
      } catch (err) {
        console.warn("No se pudo cargar lista de modelos:", err.message);
      }
    };
    fetchModels();
  }, []);

  // ------------------------------
  // HANDLERS
  // ------------------------------

  // Generate report
  const handleGenerateReport = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      setReport(response.ok ? data.report : `Error: ${data.error}`);
    } catch (error) {
      setReport(`Request failed: ${error.message}`);
    }
  };

  // Deobfuscate
  const handleDeobfuscate = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/deobfuscate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      setReport(response.ok ? data.deobfuscated : `Error: ${data.error}`);
    } catch (error) {
      setReport(`Request failed: ${error.message}`);
    }
  };

  // AI Deobfuscate
  const handleAIDeobfuscate = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/ai-deobfuscate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      setReport(response.ok ? `AI Embeddings generated! Vector size: ${data.embeddings.length}` : `Error: ${data.error}`);
    } catch (error) {
      setReport(`Request failed: ${error.message}`);
    }
  };

  // Load selected model
  const handleLoadModel = async () => {
    if (!selectedModel) {
      alert("Please select a model first!");
      return;
    }

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
  // RENDER
  // ------------------------------
  return (
    <div className="App" style={{ textAlign: 'center', padding: '2rem' }}>
      <img src="/deotterlogo1.png" alt="Logo" style={{ width: '600px', marginBottom: '2rem' }} />
      <p style={{ fontFamily: '"Fira Code", monospace', fontSize: '1.2rem' }}>
        DeObfuscation tool for Cyber Security Analysts <br />
        Developed with ❤ from Spain by <strong>@HackyChucky</strong>
      </p>

      {/* Editor */}
      <div
        style={{
          margin: '2rem auto',
          width: '100%',
          maxWidth: '700px',
          textAlign: 'left',
          fontFamily: '"Fira Code", monospace',
          fontSize: 16,
          borderRadius: 4,
          border: '1px solid #ccc',
          backgroundColor: '#2d2d2d',
          padding: '10px',
          minHeight: '200px',
        }}
      >
        <Editor
          value={code}
          onValueChange={setCode}
          highlight={highlight}
          padding={10}
          style={{
            outline: 0,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            color: '#f8f8f2',
            minHeight: '180px',
          }}
          placeholder="Insert Javascript code to deobfuscate"
        />
      </div>

      {/* Botones */}
      <div style={{ marginTop: '1rem' }}>
        <button style={buttonStyle} onClick={handleDeobfuscate}>Deobfuscate</button>
        <button style={buttonStyle} onClick={handleGenerateReport}>Create Obfuscation Report</button>
        <button style={buttonStyle} onClick={handleAIDeobfuscate}>Deobfuscate using DeOtter AI</button>

        {/* Selector y botón de modelo en la misma línea */}
        <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '10px' }}>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{ padding: '10px', fontSize: '1rem', marginRight: '10px' }}
          >
            <option value="">Select a model</option>
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          <button style={buttonStyle} onClick={handleLoadModel}>Load Selected Model</button>
        </div>
      </div>

      {/* Reporte */}
      {report && (
        <div
          style={{
            marginTop: '2rem',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'left',
            backgroundColor: '#1e1e1e',
            color: '#f8f8f2',
            padding: '1rem',
            borderRadius: '5px',
            whiteSpace: 'pre-wrap',
            fontFamily: '"Fira Code", monospace',
            fontSize: '0.9rem',
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

const buttonStyle = {
  margin: '0 10px',
  padding: '10px 20px',
  fontSize: '1rem',
  cursor: 'pointer',
  borderRadius: '4px',
  border: '1px solid #007BFF',
  backgroundColor: '#007BFF',
  color: 'white',
  transition: 'background-color 0.3s ease',
};

export default App;
