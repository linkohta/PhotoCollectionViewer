import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Imported after App on purpose: App pulls in App.css, so global.css comes
// last in the built stylesheet. Swapping these lines would change which rule
// wins wherever the two files style the same elements.
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
