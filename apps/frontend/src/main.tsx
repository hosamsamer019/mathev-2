
  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import "./styles/index.css";
  // KaTeX CSS for math rendering
  import "katex/dist/katex.min.css";

  // Global recovery handler for Vite chunk/preload errors after new deployments
window.addEventListener('vite:preloadError', (event) => {
  const PRELOAD_KEY = 'alsaden_vite_preload_retry';
  const hasRetried = sessionStorage.getItem(PRELOAD_KEY);
  if (!hasRetried) {
    sessionStorage.setItem(PRELOAD_KEY, 'true');
    window.location.reload();
  } else {
    // Already retried once; reset flag and prevent infinite reload loop
    sessionStorage.removeItem(PRELOAD_KEY);
    console.error('Vite preload chunk failure after reload retry:', event);
  }
});

// Clear retry guard upon successful load
setTimeout(() => {
  sessionStorage.removeItem('alsaden_vite_preload_retry');
}, 5000);

createRoot(document.getElementById("root")!).render(<App />);
  