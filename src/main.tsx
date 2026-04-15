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
