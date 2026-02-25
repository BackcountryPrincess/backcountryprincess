import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Only keep this line if you actually have src/style.css
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
