
  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import "./styles/index.css";
  // KaTeX CSS for math rendering
  import "katex/dist/katex.min.css";

  createRoot(document.getElementById("root")!).render(<App />);
  