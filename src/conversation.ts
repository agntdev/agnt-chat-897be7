import type { Ctx, ConversationMessage } from "./bot.js";

export const INACTIVITY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_HISTORY = 10;

let clock: () => number = () => new Date().getTime();

/** One clock seam for timestamps and inactivity decisions. */
export function now(): number {
  return clock();
}

/** Test hook for time-based behavior. Production code should use `now()`. */
export function setClockForTests(nextClock: () => number): void {
  clock = nextClock;
}

export function rememberUser(ctx: Ctx): void {
  if (!ctx.from) return;
  ctx.session.user = {
    telegramUserId: ctx.from.id,
    displayName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "Telegram user",
  };
}

export function activeHistory(ctx: Ctx): ConversationMessage[] {
  const current = now();
  const conversation = ctx.session.conversation;
  if (!conversation || current - conversation.lastActiveTimestamp > INACTIVITY_RETENTION_MS) {
    ctx.session.conversation = { messageHistory: [], lastActiveTimestamp: current, abuseStrikes: 0 };
  }
  return (ctx.session.conversation as NonNullable<Ctx["session"]["conversation"]>).messageHistory;
}

export function addMessage(ctx: Ctx, senderType: ConversationMessage["senderType"], text: string): void {
  const history = activeHistory(ctx);
  history.push({ text, timestamp: now(), senderType });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  ctx.session.conversation!.lastActiveTimestamp = now();
}

export function clearConversation(ctx: Ctx): void {
  ctx.session.conversation = { messageHistory: [], lastActiveTimestamp: now(), abuseStrikes: 0 };
  ctx.session.awaitingReport = false;
}

export function addAbuseStrike(ctx: Ctx): number {
  activeHistory(ctx);
  ctx.session.conversation!.abuseStrikes += 1;
  ctx.session.conversation!.lastActiveTimestamp = now();
  return ctx.session.conversation!.abuseStrikes;
}

function priorUserMessage(history: ConversationMessage[]): string | undefined {
  return [...history].reverse().find((item) => item.senderType === "user")?.text;
}

/** A small local responder: it deliberately bases its wording on retained context. */
export function makeConversationReply(history: ConversationMessage[]): string {
  const current = priorUserMessage(history)?.trim() ?? "";
  const earlier = history.slice(0, -1).filter((item) => item.senderType === "user");
  const recall = current.match(/what did i (?:say|tell you) i like\??/i);
  if (recall) {
    const liked = [...earlier].reverse().map((item) => item.text.match(/\bi like ([^.!?]+)/i)?.[1]).find(Boolean);
    if (liked) return `You said you like ${liked.trim()}.`;
    return "I don't have anything like that in our recent chat yet.";
  }
  if (/^(hi|hello|hey)[!. ]*$/i.test(current)) return "Hey! What's on your mind?";
  if (earlier.length > 0) {
    const topic = earlier[earlier.length - 1].text.replace(/\s+/g, " ").slice(0, 120);
    return `I remember you mentioned “${topic}”. How does that connect to what you're thinking now?`;
  }
  return "Got it. Tell me a little more, and I'll keep the thread with you.";
}
