import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { notifyAdmin, reportText } from "../admin.js";
import { activeHistory, addAbuseStrike, addMessage, makeConversationReply, rememberUser } from "../conversation.js";
import { submitReport } from "./report.js";

const composer = new Composer<Ctx>();

// This is a narrow safety screen for content the bot should not continue.
const DISALLOWED = /\b(?:kill yourself|make a bomb|how to build a bomb|racial slur)\b/i;

composer.on("message:text", async (ctx, next) => {
  try {
    rememberUser(ctx);
    const text = ctx.message.text.trim();
    if (ctx.message.entities?.some((entity) => entity.type === "bot_command" && entity.offset === 0)) {
      await next();
      return;
    }
    // Common keyboard mashes are not a conversation prompt; let the friendly
    // global fallback point the person toward help instead.
    if (/^(?:qwerty|asdfgh|zxcvbn)$/i.test(text)) {
      await next();
      return;
    }
    if (!text) {
      await ctx.reply("Send me a message whenever you’re ready.");
      return;
    }
    if (ctx.session.awaitingReport) {
      await submitReport(ctx, text);
      return;
    }
    if (DISALLOWED.test(text)) {
      addMessage(ctx, "user", text);
      const strikes = addAbuseStrike(ctx);
      await notifyAdmin(ctx, reportText(ctx, `Blocked message${strikes > 1 ? ` (repeat ${strikes})` : ""}: ${text}`));
      await ctx.reply("I can’t help with that. Let’s keep this chat safe and respectful.");
      return;
    }
    addMessage(ctx, "user", text);
    const reply = makeConversationReply(activeHistory(ctx));
    addMessage(ctx, "bot", reply);
    await ctx.reply(reply);
  } catch {
    await notifyAdmin(ctx, reportText(ctx, "Message processing failed."));
    await ctx.reply("I couldn’t process that message. Please try again.");
  }
});

export default composer;
