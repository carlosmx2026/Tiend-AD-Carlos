import "dotenv/config";
export const config={token:process.env.BOT_TOKEN||process.env.TELEGRAM_BOT_TOKEN||"",adminId:Number(process.env.ADMIN_ID||0),databaseUrl:process.env.DATABASE_URL||"",storeName:process.env.STORE_NAME||"STORE DN CAR",supportUsername:process.env.SUPPORT_USERNAME||"@STORE_DN_CAR_SUPPORT",channelUrl:process.env.CHANNEL_URL||"https://t.me/STORE_DN_CAR"};
if(!config.token)throw new Error("BOT_TOKEN is required");
if(!config.adminId)throw new Error("ADMIN_ID is required");
if(!config.databaseUrl)throw new Error("DATABASE_URL is required");