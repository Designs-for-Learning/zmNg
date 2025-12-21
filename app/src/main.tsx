import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'

// Show native splash screen on app startup
(async () => {
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.show({
      showDuration: 0,
      autoHide: false,
    });
  } catch (error) {
    // Gracefully fails on web platform
    console.debug('SplashScreen not available (web platform)', error);
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
