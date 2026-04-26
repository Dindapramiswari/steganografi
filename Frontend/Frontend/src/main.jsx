import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // Ini harus mengarah ke App.jsx yang isinya kode steganografi
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)