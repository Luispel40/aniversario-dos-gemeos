// Lido das variáveis VITE_* do arquivo .env (veja .env.example).
const env = import.meta.env;

export const API_URL = (env.VITE_API_URL || "").trim();

export const EVENTO = {
  data: env.VITE_EVENTO_DATA || "",
  hora: env.VITE_EVENTO_HORA || "",
  local: env.VITE_EVENTO_LOCAL || "",
  endereco: env.VITE_EVENTO_ENDERECO || "",
  mapa: env.VITE_EVENTO_MAPA || "",
  obs: env.VITE_EVENTO_OBS || "",
};
