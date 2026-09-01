/**
 * TIENDA DC Premium / Custom Emoji configuration.
 *
 * Keep all Telegram custom emoji IDs in one place so they can be changed
 * without hunting through the bot source.
 */
export const PREMIUM_EMOJIS = {
  welcome: '5310228579009699834',
  premium: '5309958691854754293',
  instant: '5312016608254762256',
  trusted: '5296369303661067030',
  gift: '5431782999664392737',
  announcement: '4967957395331351254',
  below: '5301038027601098171',
  success: '5237699328843200968',
  shop: '5895288113537748673',
  money: '5350452584119279096',
  rocket: '5188481279963715781',
  support: '5238025132177369293',
  earnings: '5309929258443874898',
  welcomeBack: '5190875290439525089',
  quality: '5451636889717062286',
  wallet: '5328093108930360096',
  userId: '5418115271267197333',
  membership: '5357107601584693888',
  referral: '5192977767125259291',
} as const;

export type PremiumEmojiKey = keyof typeof PREMIUM_EMOJIS;

/**
 * Returns a Telegram HTML custom-emoji entity with a Unicode fallback.
 * Use together with parse_mode: 'HTML'.
 */
export function customEmoji(key: PremiumEmojiKey, fallback: string): string {
  const id = PREMIUM_EMOJIS[key];
  return `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
}
