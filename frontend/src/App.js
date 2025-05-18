import React, { useState } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript'; // para JS
import 'prismjs/themes/prism-tomorrow.css'; // tema oscuro, puedes cambiarlo

import './App.css';

function App() {
  const [code, setCode] = useState('');

  // función para aplicar resaltado con prism
  const highlight = (code) => {
    return Prism.highlight(code, Prism.languages.javascript, 'javascript');
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
        <button style={buttonStyle}>Deobfuscate</button>
        <button style={buttonStyle}>Create Obfuscation Report</button>
        <button style={buttonStyle}>Deobfuscate using DeOtter AI</button>
      </div>
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
