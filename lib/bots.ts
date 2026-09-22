/**
 * Automated-fetcher detection for the share-link view signal.
 *
 * When a contractor texts a quote link, the messaging app fetches it first to
 * build a preview card — iMessage, WhatsApp, Slack and the rest all do this,
 * before the customer has seen anything. Counting those as "the customer
 * opened the quote" would poison the one signal the public quote page exists
 * to collect, and would do it on literally every quote sent.
 *
 * So the rule is the cautious one: anything that looks automated is NOT
 * counted as a view. A missed real view understates the open rate, which is
 * recoverable. A counted preview fetch would tell a contractor their customer
 * read a quote they never opened, and that is the number they'd price against.
 */

const BOT_PATTERNS = [
  // Link-preview fetchers — the ones that actually matter here.
  "facebookexternalhit",
  "whatsapp",
  "telegrambot",
  "slackbot",
  "slack-imgproxy",
  "discordbot",
  "twitterbot",
  "linkedinbot",
  "skypeuripreview",
  "applebot",
  "googlebot",
  "bingbot",
  "yandex",
  "duckduckbot",
  "baiduspider",
  "redditbot",
  "embedly",
  "quora link preview",
  "pinterest",
  "vkshare",
  "tumblr",
  "nuzzel",
  "outlook",
  "microsoftpreview",
  "bitlybot",
  // Generic signatures.
  "bot",
  "crawler",
  "spider",
  "scraper",
  "preview",
  "fetcher",
  "monitor",
  "curl",
  "wget",
  "python-requests",
  "headlesschrome",
  "phantomjs",
  "lighthouse",
];

/**
 * True when the request looks automated rather than human. An empty or
 * missing user-agent counts as automated: every real browser sends one.
 */
export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((p) => ua.includes(p));
}
