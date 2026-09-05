export type State=null
|{step:"add_product_name"}|{step:"add_product_price";name:string}|{step:"add_product_warranty";name:string;price:number}|{step:"add_product_desc";name:string;price:number;warranty:string}
|{step:"add_stock";productId:string}|{step:"remove_stock";productId:string}|{step:"field";productId:string;field:string;numeric?:boolean}
|{step:"balance_user";action:"add"|"remove"|"check"}|{step:"balance_amount";action:"add"|"remove";userId:number}
|{step:"track_order"}|{step:"broadcast"}|{step:"coupon_code"}|{step:"coupon_percent";code:string}
|{step:"help_title"}|{step:"help_content";id:string;title:string}|{step:"buy_qty";productId:string}
|{step:"admin_add"}|{step:"admin_remove"}|{step:"binance_uid"}|{step:"binance_name"}
|{step:"deposit_amount"}|{step:"deposit_txid";amount:number}|{step:"setting_value";key:string;back:"admin_payment"|"admin_settings"};
const states=new Map<number,State>();
export const setState=(id:number,s:State)=>states.set(id,s);
export const getState=(id:number)=>states.get(id)??null;
export const clearState=(id:number)=>states.delete(id);
