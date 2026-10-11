import { prisma } from "@/lib/prisma";

// "Nueva venta" messages to the owner's Telegram. The bot is created by the owner with @BotFather; its token and the chats it
// talks to are kept in the database (AppSecret: server-only, never sent to the browser). TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
// environment variables work too. In Telegram the owner can give that chat any notification sound.
const API = "https://api.telegram.org";

export type TelegramChat = { id: string; name: string };

async function secret(key: string): Promise<string> {
  return (await prisma.appSecret.findUnique({ where: { key } }))?.value ?? "";
}
async function setSecret(key: string, value: string) {
  await prisma.appSecret.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function getTelegramConfig(): Promise<{ token: string; chats: TelegramChat[] }> {
  const token = (await secret("telegram.token")) || process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  let chats: TelegramChat[] = [];
  try {
    chats = JSON.parse((await secret("telegram.chats")) || "[]");
  } catch {
    chats = [];
  }
  const envChat = process.env.TELEGRAM_CHAT_ID?.trim();
  if (envChat && !chats.some((c) => c.id === envChat)) chats.push({ id: envChat, name: "Chat configurado" });
  return { token, chats };
}

async function call<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!res.ok || !json.ok) throw new Error(json.description || `Telegram respondió ${res.status}`);
  return json.result as T;
}

// Checks the token with Telegram and stores it. Returns the bot's @username.
export async function saveTelegramToken(token: string): Promise<{ username: string }> {
  const me = await call<{ username: string }>(token, "getMe");
  await setSecret("telegram.token", token);
  await setSecret("telegram.chats", "[]");
  return { username: me.username };
}

export async function telegramBotName(): Promise<string | null> {
  const { token } = await getTelegramConfig();
  if (!token) return null;
  try {
    return (await call<{ username: string }>(token, "getMe")).username;
  } catch {
    return null;
  }
}

// The owner writes to the bot ("hola"/Start); this finds who did and remembers those chats.
export async function connectTelegramChats(): Promise<TelegramChat[]> {
  const { token } = await getTelegramConfig();
  if (!token) throw new Error("Primero guarda el token del bot.");
  const updates = await call<{ message?: { chat: { id: number; type: string; first_name?: string; last_name?: string; username?: string; title?: string } } }[]>(token, "getUpdates", {
    limit: 100,
    allowed_updates: ["message"],
  });
  const found = new Map<string, TelegramChat>();
  for (const u of updates) {
    const c = u.message?.chat;
    if (!c || c.type !== "private") continue;
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.username || String(c.id);
    found.set(String(c.id), { id: String(c.id), name });
  }
  if (found.size === 0) throw new Error("Todavía no le escribiste al bot. Ábrelo en Telegram, toca Iniciar (Start) y vuelve a intentar.");
  const chats = [...found.values()];
  await setSecret("telegram.chats", JSON.stringify(chats));
  return chats;
}

export async function disconnectTelegram() {
  await prisma.appSecret.deleteMany({ where: { key: { in: ["telegram.token", "telegram.chats"] } } });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Sends an HTML-formatted message (b, i and a tags only) to every connected chat. Returns how many chats got it.
export async function sendTelegram(html: string): Promise<number> {
  const { token, chats } = await getTelegramConfig();
  if (!token || chats.length === 0) return 0;
  let sent = 0;
  await Promise.all(
    chats.map(async (c) => {
      try {
        await call(token, "sendMessage", { chat_id: c.id, text: html, parse_mode: "HTML", disable_web_page_preview: true });
        sent++;
      } catch (e) {
        console.error("[telegram] could not send:", e instanceof Error ? e.message : e);
      }
    }),
  );
  return sent;
}

export { esc as telegramEscape };
