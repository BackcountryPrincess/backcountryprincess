import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

document.querySelector('#app').innerHTML = `
  <h1>Maple Sap Predictor</h1>
  <p>Backend connection working.</p>
`

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
