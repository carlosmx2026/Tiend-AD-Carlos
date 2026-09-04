import { Markup } from "telegraf";
export const PREMIUM_EMOJI = {
  back:"5255703720078879038", next:"5253767677670862169", money:"5224257782013769471",
  user:"5332729706515017202", done:"4987757216040747796", reseller:"5287480366330816274",
  referral:"5255835635704408236", binance:"5888561507557447441", orders:"5877618313139327986",
  track:"5397782960512444700", shop:"5406683434124859552", support:"5238025132177369293",
  error:"5465665476971471368", help:"5238025132177369293", home:"5255703720078879038",
  sparkle:"5472164874886846699", warning:"5467928559664242360", contact:"5465169893580086142"
} as const;
function icon(text:string){const t=text.toLowerCase(); if(/back|home/.test(t))return PREMIUM_EMOJI.back;if(/wallet|balance|price|payment|deposit/.test(t))return PREMIUM_EMOJI.money;if(/shop|tool|product|stock|buy/.test(t))return PREMIUM_EMOJI.shop;if(/order|delivery/.test(t))return PREMIUM_EMOJI.orders;if(/track/.test(t))return PREMIUM_EMOJI.track;if(/support|help|ticket/.test(t))return PREMIUM_EMOJI.support;if(/remove|delete|disable|cancel|reject/.test(t))return PREMIUM_EMOJI.error;if(/confirm|done|success|enable|approve|add/.test(t))return PREMIUM_EMOJI.done;if(/user|profile/.test(t))return PREMIUM_EMOJI.user;return PREMIUM_EMOJI.sparkle;}
function style(text:string):"primary"|"success"|"danger"{const t=text.toLowerCase();if(/remove|delete|disable|cancel|reject/.test(t))return"danger";if(/buy|add|confirm|done|success|enable|approve|open/.test(t))return"success";return"primary";}
function strip(s:string){return s.replace(/^[^\p{L}\p{N}]+/u,"").trimStart();}
export function cb(text:string,data:string):any{const b:any=Markup.button.callback(strip(text),data);b.icon_custom_emoji_id=icon(text);b.style=style(text);return b;}
export function urlBtn(text:string,url:string):any{const b:any=Markup.button.url(strip(text),url);b.icon_custom_emoji_id=icon(text);b.style=style(text);return b;}
export function box(title:string,body=""){return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${title}\n┃ 𝑺𝑻𝑶𝑹𝑬 𝑫𝑵 𝑪𝑨𝑹\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${body}${body?"\n":""}━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;}
