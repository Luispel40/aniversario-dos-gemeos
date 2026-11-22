import "./styles/main.css";
import { $ } from "./lib/ui.js";
import { initPublic } from "./features/convite.js";
import { initAdmin, showAdmin, stopPolling } from "./features/admin.js";
import { initParallax, requestFrame } from "./features/parallax.js";
import { initLoops } from "./features/loop.js";

// Rotas por hash: "#admin" abre o painel; qualquer outra coisa mostra o convite.
function route() {
  const admin = location.hash === "#admin";
  $("viewPublic").hidden = admin;
  $("viewAdmin").hidden = !admin;
  if (admin) { showAdmin(); scrollTo(0, 0); } else stopPolling();
  requestFrame();
}

initLoops();
initPublic();
initAdmin();
initParallax();
addEventListener("hashchange", route);
route();
