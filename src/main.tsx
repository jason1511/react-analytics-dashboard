import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { DatasetProvider } from "./state/dataset-context";
import { ThemeProvider } from "./state/use-theme"; // <-- add this

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <DatasetProvider>
        <App />
      </DatasetProvider>
    </ThemeProvider>
  </React.StrictMode>
);
