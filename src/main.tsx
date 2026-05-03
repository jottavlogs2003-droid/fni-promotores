import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startAutoSync } from "./lib/offlineQueue";

startAutoSync();

createRoot(document.getElementById("root")!).render(<App />);
