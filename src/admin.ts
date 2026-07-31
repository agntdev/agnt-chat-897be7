import type { Ctx } from "./bot.js";

function adminChatId(ctx: Ctx): string | undefined {
  const workerEnv = (ctx as Ctx & { env?: { ADMIN_CHAT_ID?: string } }).env;
  return workerEnv?.ADMIN_CHAT_ID ?? (typeof process === "undefined" ? undefined : process.env.ADMIN_CHAT_ID);
}

export async function notifyAdmin(ctx: Ctx, text: string): Promise<boolean> {
  const id = adminChatId(ctx);
  if (!id || !/^-?\d+$/.test(id)) return false;
  try {
    await ctx.api.sendMessage(id, text.slice(0, 4000));
    return true;
  } catch {
    // Admins can block the bot. A notification failure must not break the user's flow.
    return false;
  }
}

export function reportText(ctx: Ctx, reason: string): string {
  const user = ctx.session.user;
  const identity = user ? `${user.displayName} (Telegram user ${user.telegramUserId})` : "An unknown Telegram user";
  return `CasualChat report from ${identity}:\n${reason}`;
}
