import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker for Android offline caching and background sync
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);

