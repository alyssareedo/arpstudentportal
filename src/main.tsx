import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNativeBridge } from "./lib/nativeBridge";

// No-op in the web build; only does anything inside the phone app.
initNativeBridge();

createRoot(document.getElementById("root")!).render(<App />);
