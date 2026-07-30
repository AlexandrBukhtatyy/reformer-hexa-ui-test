import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// provide theme color to css vars
import { GlobalStyle } from '@kaspersky/hexa-ui/design-system/global-style'

// provide base css
import '@kaspersky/hexa-ui/design-system/global-style/styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalStyle />
    <App />
  </StrictMode>,
)
