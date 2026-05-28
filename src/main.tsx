import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { CompanyProvider } from "./context/CompanyContext";
import App from "./App";
import "./index.css";

// Suppress a known harmless Recharts dev-only warning. StrictMode double-mounts
// components, so the first mount happens before the parent grid lays out and
// ResponsiveContainer measures -1, logging "The width(-1) and height(-1) of
// chart should be greater than 0…". The warning fires synchronously inside the
// chart render, so props like debounce/minWidth/minHeight can't stop it. The
// chart re-measures correctly on the next paint — the warning is purely noise.
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      first.includes("width(") &&
      first.includes("of chart should be greater than 0")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <CompanyProvider>
          <AuthProvider>
            <ConfirmProvider>
              <App />
              <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
            </ConfirmProvider>
          </AuthProvider>
        </CompanyProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
