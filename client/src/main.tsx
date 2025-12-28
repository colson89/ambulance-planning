import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, initInstallPrompt } from "./utils/pwa";

// Register PWA service worker
registerServiceWorker();

// Initialize install prompt
initInstallPrompt();

createRoot(document.getElementById("root")!).render(<App />);
