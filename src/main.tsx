import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { DatasetProvider } from "./state/dataset-context";
import { AuthProvider } from "./state/auth-context";
import { ThemeProvider } from "./state/use-theme";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <DatasetProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </DatasetProvider>
    </ThemeProvider>
  </React.StrictMode>
);
