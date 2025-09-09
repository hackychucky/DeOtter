import React, { useState } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript'; // para JS
import 'prismjs/themes/prism-tomorrow.css'; // tema oscuro, puedes cambiarlo

import './App.css';

function App() {
  const [code, setCode] = useState('');
  // State for report:
  const [report, setReport] = useState('');


  // función para aplicar resaltado con prism
  const highlight = (code) => {
    return Prism.highlight(code, Prism.languages.javascript, 'javascript');
  };

  // Handler "Generate Report" button:
  const handleGenerateReport = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setReport(data.report);
      } else {
        setReport(`Error: ${data.error}`);
      }
    } catch (error) {
      setReport(`Request failed: ${error.message}`);
    }
  };
  

  // Handler "Load base model":
  const handleLoadModel = async () => {
    const modelPath = prompt("Introduce la ruta completa del modelo local:");
  
    if (!modelPath) return;
  
    try {
      const response = await fetch("http://127.0.0.1:5000/load-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model_path: modelPath }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        alert(data.message); // Puedes cambiar esto por un mensaje bonito en la UI
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Request failed: ${error.message}`);
    }
  };
  


  // Handler "Deobfuscate" button:
  const handleDeobfuscate = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/deobfuscate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setReport(data.deobfuscated); // reutilizamos el mismo div para mostrarlo
      } else {
        setReport(`Error: ${data.error}`);
      }
    } catch (error) {
      setReport(`Request failed: ${error.message}`);
    }
  };


  

  return (
    <div className="App" style={{ textAlign: 'center', padding: '2rem' }}>
      <img src="/deotterlogo1.png" alt="Logo" style={{ width: '600px', marginBottom: '2rem' }} />
      <p style={{ fontFamily: '"Fira Code", monospace', fontSize: '1.2rem' }}>
        DeObfuscation tool for Cyber Security Analysts <br />
        Developed with ❤ from Spain by <strong>@HackyChucky</strong>
      </p>

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
          backgroundColor: '#2d2d2d', // fondo oscuro para contraste
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
            color: '#f8f8f2', // texto claro para contraste
            minHeight: '180px',
          }}
          placeholder="Insert Javascript code to deobfuscate"
        />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button style={buttonStyle} onClick={handleDeobfuscate}>Deobfuscate</button>
        <button style={buttonStyle} onClick={handleGenerateReport}>Create Obfuscation Report</button>
        <button style={buttonStyle} onClick={handleLoadModel}>Load Base Model</button>
        <button style={buttonStyle}>Deobfuscate using DeOtter AI</button>

      </div>

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
