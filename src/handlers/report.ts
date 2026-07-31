import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { notifyAdmin, reportText } from "../admin.js";
import { rememberUser } from "../conversation.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "🚩 Report a problem", data: "report:start", order: 30 });

const composer = new Composer<Ctx>();
const reportKeyboard = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

async function beginReport(ctx: Ctx, edit = false): Promise<void> {
  rememberUser(ctx);
  ctx.session.awaitingReport = true;
  const text = "Tell me what happened in one message, and I’ll send it to the bot owner.";
  if (edit) await ctx.editMessageText(text, { reply_markup: reportKeyboard });
  else await ctx.reply(text, { reply_markup: reportKeyboard });
}

composer.command("report", async (ctx) => {
  await beginReport(ctx);
});

composer.callbackQuery("report:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  await beginReport(ctx, true);
});

export async function submitReport(ctx: Ctx, details: string): Promise<void> {
  ctx.session.awaitingReport = false;
  const sent = await notifyAdmin(ctx, reportText(ctx, details));
  if (sent) await ctx.reply("Thanks — I sent your report to the bot owner.");
  else await ctx.reply("Reports aren’t set up yet. Please try again later.");
}

export default composer;
