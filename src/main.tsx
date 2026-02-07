import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { DatasetProvider } from "./state/dataset-context";


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DatasetProvider>
      <App />
    </DatasetProvider>
  </React.StrictMode>
);
