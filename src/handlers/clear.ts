import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { clearConversation, rememberUser } from "../conversation.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "🧹 Clear chat", data: "chat:clear", order: 20 });

const composer = new Composer<Ctx>();
const clearedKeyboard = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

async function clear(ctx: Ctx, edit = false): Promise<void> {
  rememberUser(ctx);
  clearConversation(ctx);
  if (edit) await ctx.editMessageText("Your chat history is cleared. Start fresh whenever you like.", { reply_markup: clearedKeyboard });
  else await ctx.reply("Your chat history is cleared. Start fresh whenever you like.", { reply_markup: clearedKeyboard });
}

composer.command("clear", async (ctx) => {
  await clear(ctx);
});

composer.callbackQuery("chat:clear", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Clear your current chat history? This can’t be undone.", {
    reply_markup: inlineKeyboard([
      [inlineButton("Clear chat", "chat:clear:yes")],
      [inlineButton("Keep chatting", "menu:main")],
    ]),
  });
});

composer.callbackQuery("chat:clear:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  await clear(ctx, true);
});

export default composer;
