import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import fs from 'node:fs';
import crypto from 'node:crypto';

const TOKEN=process.env.BOT_TOKEN||'';
const ADMIN_ID=Number(process.env.ADMIN_ID||0);
const SUPPORT=process.env.SUPPORT_USERNAME||'@TIENDADC_SUPPORT';
if(!TOKEN||!ADMIN_ID) throw new Error('Set BOT_TOKEN and ADMIN_ID in .env');
const bot=new Telegraf(TOKEN);
const DB='data.json';
type Product={id:string,name:string,price:number,description:string,stock:string[],active:boolean};
type User={id:number,username?:string,balance:number,joinedAt:string};
type Order={id:string,userId:number,productId:string,productName:string,price:number,item:string,createdAt:string};
type Data={users:Record<string,User>,products:Product[],orders:Order[],settings:{storeName:string,currency:string}};
const load=():Data=>JSON.parse(fs.readFileSync(DB,'utf8'));
const save=(d:Data)=>fs.writeFileSync(DB,JSON.stringify(d,null,2));
const id=()=>crypto.randomBytes(4).toString('hex').toUpperCase();
const money=(n:number)=>`$${n.toFixed(2)}`;
const states=new Map<number,any>();
const premium=(title:string,body:string)=>`✦ ${title}\n━━━━━━━━━━━━━━━━━━\n${body}\n━━━━━━━━━━━━━━━━━━\n◆ TIENDA DC`;
const home=()=>Markup.inlineKeyboard([[Markup.button.callback('🛍 PREMIUM SHOP','shop')],[Markup.button.callback('💎 MY WALLET','wallet'),Markup.button.callback('📦 MY ORDERS','myorders')],[Markup.button.callback('🎧 SUPPORT','support')]]);
const admin=()=>Markup.inlineKeyboard([[Markup.button.callback('📊 Dashboard','a_dash')],[Markup.button.callback('🛍 Products','a_products'),Markup.button.callback('➕ Add Product','a_add')],[Markup.button.callback('📦 Stock Manager','a_stock'),Markup.button.callback('🧾 Orders','a_orders')],[Markup.button.callback('👥 Users','a_users'),Markup.button.callback('📣 Broadcast','a_broadcast')],[Markup.button.callback('⚙️ Settings','a_settings')]]);
function ensureUser(ctx:any){const d=load();const k=String(ctx.from.id);if(!d.users[k]){d.users[k]={id:ctx.from.id,username:ctx.from.username,balance:0,joinedAt:new Date().toISOString()};save(d);}return d.users[k];}
bot.start(async ctx=>{ensureUser(ctx);await ctx.reply(premium('WELCOME TO TIENDA DC','⚡ Premium Digital Store\n🛡 Fast • Clean • Reliable\n\nChoose an option below.'),home());});
bot.command('admin',async ctx=>{if(ctx.from.id!==ADMIN_ID)return;await ctx.reply(premium('ADMIN CONTROL CENTER','Everything important in one easy panel.'),admin());});
bot.action('shop',async ctx=>{const d=load();const ps=d.products.filter(p=>p.active);if(!ps.length)return ctx.editMessageText(premium('SHOP','No products available right now.'),home());const rows=ps.map(p=>[Markup.button.callback(`${p.stock.length?'🟢':'🔴'} ${p.name} • ${money(p.price)}`,`p_${p.id}`)]);rows.push([Markup.button.callback('← Home','home')]);await ctx.editMessageText(premium('PREMIUM SHOP','Select a product:'),Markup.inlineKeyboard(rows));});
bot.action(/^p_(.+)$/,async ctx=>{const d=load();const p=d.products.find(x=>x.id===ctx.match[1]);if(!p)return;await ctx.editMessageText(premium(p.name,`${p.description}\n\n💵 Price: ${money(p.price)}\n📦 Stock: ${p.stock.length}`),Markup.inlineKeyboard([[Markup.button.callback('⚡ BUY NOW',`buy_${p.id}`)],[Markup.button.callback('← Shop','shop')]]));});
bot.action(/^buy_(.+)$/,async ctx=>{const d=load();const u=d.users[String(ctx.from.id)]||ensureUser(ctx);const p=d.products.find(x=>x.id===ctx.match[1]);if(!p||!p.active)return;if(!p.stock.length)return ctx.answerCbQuery('Out of stock',{show_alert:true});if(u.balance<p.price)return ctx.answerCbQuery('Insufficient wallet balance',{show_alert:true});u.balance-=p.price;const item=p.stock.shift()!;const o={id:id(),userId:u.id,productId:p.id,productName:p.name,price:p.price,item,createdAt:new Date().toISOString()};d.orders.unshift(o);save(d);await ctx.reply(premium('ORDER DELIVERED',`🧾 Order: ${o.id}\n🛍 ${p.name}\n💵 ${money(p.price)}\n\n🔐 YOUR ITEM:\n${item}`),home());});
bot.action('wallet',async ctx=>{const u=ensureUser(ctx);await ctx.editMessageText(premium('MY WALLET',`💎 Balance: ${money(u.balance)}\n\nFor wallet top-up contact support.`),Markup.inlineKeyboard([[Markup.button.callback('🎧 Support','support')],[Markup.button.callback('← Home','home')]]));});
bot.action('myorders',async ctx=>{const d=load();const os=d.orders.filter(o=>o.userId===ctx.from.id).slice(0,10);const body=os.length?os.map(o=>`#${o.id} • ${o.productName} • ${money(o.price)}`).join('\n'):'No orders yet.';await ctx.editMessageText(premium('MY ORDERS',body),Markup.inlineKeyboard([[Markup.button.callback('← Home','home')]]));});
bot.action('support',async ctx=>ctx.editMessageText(premium('SUPPORT',`Need help? Contact ${SUPPORT}`),home()));
bot.action('home',async ctx=>ctx.editMessageText(premium('TIENDA DC','⚡ Premium Digital Store\nChoose an option below.'),home()));

bot.action('a_dash',async ctx=>{if(ctx.from.id!==ADMIN_ID)return;const d=load();const stock=d.products.reduce((a,p)=>a+p.stock.length,0);const sales=d.orders.reduce((a,o)=>a+o.price,0);await ctx.editMessageText(premium('DASHBOARD',`👥 Users: ${Object.keys(d.users).length}\n🛍 Products: ${d.products.length}\n📦 Stock: ${stock}\n🧾 Orders: ${d.orders.length}\n💰 Sales: ${money(sales)}`),admin());});
bot.action('a_add',async ctx=>{if(ctx.from.id!==ADMIN_ID)return;states.set(ctx.from.id,{step:'add_name'});await ctx.reply('➕ Send product name:');});
bot.action('a_products',async ctx=>{if(ctx.from.id!==ADMIN_ID)return;const d=load();const body=d.products.length?d.products.map((p,i)=>`${i+1}. ${p.name} | ${money(p.price)} | Stock ${p.stock.length} | ${p.active?'ON':'OFF'}`).join('\n'):'No products.';await ctx.editMessageText(premium('PRODUCTS',body),admin());});
bot.action('a_stock',async ctx=>{if(ctx.from.id!==ADMIN_ID)return;const d=load();const rows=d.products.map(p=>[Markup.button.callback(`${p.name} (${p.stock.length})`,`stock_${p.id}`)]);rows.push([Markup.button.callback('← Admin','a_dash')]);await ctx.editMessageText(premium('STOCK MANAGER','Choose product to add stock.'),Markup.inlineKeyboard(rows));});
bot.action(/^stock_(.+)$/,async ctx=>{if(ctx.from.id!==ADMIN_ID)return;const d=load();const p=d.products.find(x=>x.id===ctx.match[1]);if(!p)return;states.set(ctx.from.id,{step:'stock',productId:p.id});await ctx.reply(`📦 ${p.name}\nSend stock items, ONE PER LINE.`);});
bot.action('a_orders',async ctx=>{if(ctx.from.id!==ADMIN_ID)return;const d=load();const body=d.orders.slice(0,20).map(o=>`#${o.id} | ${o.userId} | ${o.productName} | ${money(o.price)}`).join('\n')||'No orders.';await ctx.editMessageText(premium('RECENT ORDERS',body),admin());});
bot.action('a_users',async ctx=>{if(ctx.from.id!==ADMIN_ID)return;const d=load();states.set(ctx.from.id,{step:'user_credit'});await ctx.reply(premium('USERS',`Total users: ${Object.keys(d.users).length}\n\nTo add wallet balance send:\nUSER_ID AMOUNT\nExample: 123456789 10`));});
bot.action('a_broadcast',async ctx=>{if(ctx.from.id!==ADMIN_ID)return;states.set(ctx.from.id,{step:'broadcast'});await ctx.reply('📣 Send broadcast message:');});
bot.action('a_settings',async ctx=>{if(ctx.from.id!==ADMIN_ID)return;await ctx.editMessageText(premium('SETTINGS',`Brand: TIENDA DC\nSupport: ${SUPPORT}\n\nEdit .env to change bot credentials/support.`),admin());});

bot.on('text',async ctx=>{const st=states.get(ctx.from.id);if(!st)return;const text=ctx.message.text.trim();const d=load();if(st.step==='add_name'){st.name=text;st.step='add_price';states.set(ctx.from.id,st);return ctx.reply('💵 Send price, example 0.48');}if(st.step==='add_price'){const n=Number(text);if(!Number.isFinite(n))return ctx.reply('Invalid price.');st.price=n;st.step='add_desc';states.set(ctx.from.id,st);return ctx.reply('📝 Send short product description:');}if(st.step==='add_desc'){d.products.push({id:id(),name:st.name,price:st.price,description:text,stock:[],active:true});save(d);states.delete(ctx.from.id);return ctx.reply('✅ Product created.',admin());}if(st.step==='stock'){const p=d.products.find(x=>x.id===st.productId);if(!p)return;const incoming=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const set=new Set(p.stock);let added=0;for(const x of incoming)if(!set.has(x)){p.stock.push(x);set.add(x);added++;}save(d);states.delete(ctx.from.id);return ctx.reply(`✅ Added ${added} unique item(s). Total stock: ${p.stock.length}`,admin());}if(st.step==='user_credit'){const [uidS,amtS]=text.split(/\s+/);const uid=Number(uidS),amt=Number(amtS);if(!d.users[String(uid)]||!Number.isFinite(amt))return ctx.reply('❌ Use: USER_ID AMOUNT');d.users[String(uid)].balance+=amt;save(d);states.delete(ctx.from.id);return ctx.reply(`✅ ${money(amt)} added. New balance: ${money(d.users[String(uid)].balance)}`,admin());}if(st.step==='broadcast'){states.delete(ctx.from.id);let ok=0,fail=0;for(const u of Object.values(d.users)){try{await bot.telegram.sendMessage(u.id,premium('TIENDA DC UPDATE',text));ok++;}catch{fail++;}}return ctx.reply(`📣 Broadcast done. Sent ${ok}, failed ${fail}.`,admin());}});

bot.catch(err=>console.error('Bot error',err));
bot.launch().then(()=>console.log('TIENDA DC bot running'));
process.once('SIGINT',()=>bot.stop('SIGINT'));process.once('SIGTERM',()=>bot.stop('SIGTERM'));
