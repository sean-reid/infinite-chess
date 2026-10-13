import { squareName } from "../engine/square.ts";

const main = document.getElementById("main");
if (main) {
  const p = document.createElement("p");
  p.className = "notice";
  p.textContent = `Board coming. The black king sits on ${squareName({ x: 32, y: 57 })}.`;
  main.append(p);
}
