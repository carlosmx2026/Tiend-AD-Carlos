export type SupplierProduct={id:string;name:string;price:number;stock:number;description:string;emojiId:string};

const BASE="https://elite-tools-store.up.railway.app/api";
const timeout=()=>AbortSignal.timeout(12000);
const apiKey=()=>String(process.env.ELITE_SUPPLIER_API_KEY||"").trim();

async function request(path:string,init:RequestInit={}){
  const key=apiKey();
  if(!key)throw new Error("Elite supplier API key is not configured in Railway.");
  const response=await fetch(`${BASE}${path}`,{...init,headers:{"Content-Type":"application/json","X-API-Key":key,...(init.headers||{})},signal:timeout()});
  const raw=await response.text();let data:any;
  try{data=raw?JSON.parse(raw):{}}catch{data={message:raw}}
  if(!response.ok||data?.success===false)throw new Error(String(data?.error||data?.message||`Supplier API ${response.status}`).slice(0,220));
  return data;
}

const list=(data:any):any[]=>Array.isArray(data)?data:Array.isArray(data?.products)?data.products:Array.isArray(data?.data)?data.data:Array.isArray(data?.data?.products)?data.data.products:[];

let productCache:{at:number;items:SupplierProduct[]}|null=null;
export async function eliteProducts():Promise<SupplierProduct[]>{
  if(productCache&&Date.now()-productCache.at<15000)return productCache.items;
  const items=list(await request("/products")).map((p:any)=>({
    id:String(p.id??p.productId??p.product_id??""),
    name:String(p.name??p.title??p.productName??"Unnamed product"),
    price:Number(p.price??p.unitPrice??0),
    stock:Number(p.stock??p.quantity??p.availableStock??p.available??0),
    description:String(p.description??""),
    emojiId:String(p.premiumEmojiId??p.premium_emoji_id??p.emojiId??p.icon_custom_emoji_id??"")
  })).filter(p=>p.id);productCache={at:Date.now(),items};return items;
}

export async function eliteProduct(id:string){return (await eliteProducts()).find(p=>p.id===id)||null}

function deliveries(data:any):string[]{
  const root=data?.data??data;
  const value=root?.delivery??root?.delivered??root?.accounts??root?.codes??root?.items??root?.products;
  if(Array.isArray(value))return value.map((x:any)=>typeof x==="string"?x:String(x?.value??x?.code??x?.account??x?.email??JSON.stringify(x)));
  if(typeof value==="string")return value.split(/\r?\n/).map((x:string)=>x.trim()).filter(Boolean);
  return [];
}

export async function eliteOrder(productId:string,quantity:number){
  const data=await request("/order",{method:"POST",body:JSON.stringify({productId,quantity})});
  productCache=null;
  const items=deliveries(data);
  if(items.length<quantity)throw new Error("Supplier accepted the order but did not return enough delivery items.");
  return {items:items.slice(0,quantity),supplierOrderId:String(data?.orderId??data?.data?.orderId??data?.id??"")};
}

export const eliteConfigured=()=>Boolean(apiKey());
