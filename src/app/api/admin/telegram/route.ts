import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin-session";
import { connectTelegramChats, disconnectTelegram, getTelegramConfig, saveTelegramToken, sendTelegram, telegramBotName } from "@/lib/telegram";

// Only the owner connects the bot (its token is a secret).
async function ownerOnly() {
  const access = await getAdminAccess();
  return access?.kind === "owner";
}

export async function GET() {
  if (!(await ownerOnly())) return NextResponse.json({ error: "Solo la dueña puede configurar esto." }, { status: 403 });
  const { token, chats } = await getTelegramConfig();
  return NextResponse.json({ hasToken: Boolean(token), bot: token ? await telegramBotName() : null, chats });
}

export async function POST(request: Request) {
  if (!(await ownerOnly())) return NextResponse.json({ error: "Solo la dueña puede configurar esto." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; token?: string };
  try {
    if (body.action === "token") {
      const token = (body.token ?? "").trim();
      if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) throw new Error("Ese token no tiene el formato correcto (se ve así: 123456789:AAH…).");
      const { username } = await saveTelegramToken(token);
      return NextResponse.json({ ok: true, bot: username });
    }
    if (body.action === "connect") {
      const chats = await connectTelegramChats();
      await sendTelegram("🔔 <b>Avisos de POPE conectados</b>\nAsí te va a llegar cada venta nueva.");
      return NextResponse.json({ ok: true, chats });
    }
    if (body.action === "test") {
      const sent = await sendTelegram("💸 <b>Nueva venta POPE00 (prueba)</b>\n$18.999 · Retiro en tienda\nCliente de prueba · 1× Musculosa BTS");
      return NextResponse.json({ ok: sent > 0, sent });
    }
    if (body.action === "disconnect") {
      await disconnectTelegram();
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo completar." }, { status: 400 });
  }
}
