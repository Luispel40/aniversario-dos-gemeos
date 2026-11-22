import { API_URL } from "../config.js";
import { demo } from "./demo.js";

export const isDemo = !/^https:\/\//.test(API_URL);

/** Chama o backend (Apps Script) ou o modo demonstração. Rejeita com { code, message }. */
export async function call(action, payload = {}) {
  const body = { action, ...payload };
  if (isDemo) return demo(action, JSON.parse(JSON.stringify(body)));

  let json;
  try {
    // text/plain evita a pré-verificação CORS, que o Apps Script não responde.
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
    });
    json = await r.json();
  } catch {
    throw { code: "rede", message: "Não foi possível conectar. Verifique sua internet e tente de novo." };
  }
  if (!json || json.ok === false) {
    throw { code: json?.code || "erro", message: json?.message || "Algo deu errado. Tente de novo." };
  }
  return json;
}
