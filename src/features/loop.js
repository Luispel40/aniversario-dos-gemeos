// Monta a faixa de rolagem infinita das camadas com class "loop":
// [A][A espelhada][A][A espelhada]. A animação desloca metade da faixa e recomeça sem salto.
export function initLoops() {
  document.querySelectorAll(".loop").forEach((layer) => {
    const img = layer.querySelector("img");
    if (!img) return;
    const track = document.createElement("div");
    track.className = "track";
    for (let i = 0; i < 4; i++) {
      const c = img.cloneNode();
      c.decoding = "async";
      track.appendChild(c);
    }
    img.replaceWith(track);
  });
}
