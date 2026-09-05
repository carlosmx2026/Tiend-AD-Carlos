import {createHmac,randomBytes} from "node:crypto";

export type PaymentMethod="binance"|"bep20"|"trc20";
export type Verification={state:"confirmed";received:number;ageMs:number}|{state:"not_found"|"too_old"|"wrong_receiver"|"failed"|"api_error";message:string};
type Settings=(key:string)=>Promise<string>;

const USDT_BSC="0x55d398326f99059ff775485246999027b3197955";
const USDT_TRON="TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";
const hour=60*60*1000;
const json=async(url:string,init?:RequestInit)=>{const r=await fetch(url,{...init,signal:AbortSignal.timeout(8000)});const raw=await r.text();let data:any;try{data=raw?JSON.parse(raw):{}}catch{data={message:raw.slice(0,180)}}if(!r.ok||data?.success===false||data?.code&&String(data.code)!=="000000"&&Number(data.code)<0)throw new Error(`${r.status}:${data?.code||"API"}:${data?.msg||data?.message||"request failed"}`);return data};
const hexInt=(v:string)=>Number.parseInt(v||"0",16);

async function verifyBep20(txid:string,get:Gettings):Promise<Verification>{
  const key=await get("bscscan_api_key"),wallet=(await get("bsc_wallet")).toLowerCase();
  if(!key||!wallet)return{state:"api_error",message:"BEP20 verification is not configured by admin."};
  if(!/^0x[0-9a-f]{64}$/i.test(txid))return{state:"not_found",message:"Invalid BEP20 transaction hash."};
  try{
    const base="https://api.bscscan.com/api";
    const query=(action:string,extra:string)=>json(`${base}?module=proxy&action=${action}&${extra}&apikey=${encodeURIComponent(key)}`);
    const [txj,receiptj]=await Promise.all([query("eth_getTransactionByHash",`txhash=${txid}`),query("eth_getTransactionReceipt",`txhash=${txid}`)]);
    const tx=txj.result,receipt=receiptj.result;if(!tx||!receipt)return{state:"not_found",message:"Payment not received yet. Wait for confirmation and recheck."};
    if(receipt.status!=="0x1")return{state:"failed",message:"Blockchain transaction failed."};
    if(String(tx.to).toLowerCase()!==USDT_BSC)return{state:"wrong_receiver",message:"This is not a USDT BEP20 transfer."};
    const input=String(tx.input||"").toLowerCase();if(!input.startsWith("0xa9059cbb")||input.length<138)return{state:"failed",message:"USDT transfer data is invalid."};
    const receiver=`0x${input.slice(34,74)}`;if(receiver!==wallet)return{state:"wrong_receiver",message:"Payment was sent to another wallet."};
    const raw=BigInt(`0x${input.slice(74,138)}`),received=Number(raw)/1e18;
    const block=await query("eth_getBlockByNumber",`tag=${tx.blockNumber}&boolean=false`),ageMs=Date.now()-hexInt(block.result?.timestamp)*1000;
    if(ageMs>hour)return{state:"too_old",message:"This transaction is older than 1 hour."};
    return{state:"confirmed",received,ageMs};
  }catch{return{state:"api_error",message:"BEP20 API could not verify this transaction. Recheck shortly."}}
}

type Gettings=Settings;
async function verifyTrc20(txid:string,get:Gettings):Promise<Verification>{
  const key=await get("trongrid_api_key"),wallet=await get("tron_wallet");
  if(!key||!wallet)return{state:"api_error",message:"TRC20 verification needs the TRON API key in Payment Settings."};
  if(!/^[0-9a-f]{64}$/i.test(txid))return{state:"not_found",message:"Invalid TRC20 transaction ID."};
  try{
    const headers={"Content-Type":"application/json","TRON-PRO-API-KEY":key};
    const [info,events]=await Promise.all([
      json("https://api.trongrid.io/walletsolidity/gettransactioninfobyid",{method:"POST",headers,body:JSON.stringify({value:txid})}),
      json(`https://api.trongrid.io/v1/transactions/${txid}/events?only_confirmed=true`,{headers})
    ]);
    if(!info?.id)return{state:"not_found",message:"Payment not received yet. Wait for confirmation and recheck."};
    if(info.result&&info.result!=="SUCCESS")return{state:"failed",message:"Blockchain transaction failed."};
    const transfer=(events.data||[]).find((e:any)=>e.event_name==="Transfer"&&e.contract_address===USDT_TRON&&String(e.result?.to||e.result?.[1])===wallet);
    if(!transfer)return{state:"wrong_receiver",message:"No USDT TRC20 payment to the configured wallet was found."};
    const received=Number(transfer.result?.value||transfer.result?.[2]||0)/1e6,ageMs=Date.now()-Number(info.blockTimeStamp||0);
    if(ageMs>hour)return{state:"too_old",message:"This transaction is older than 1 hour."};
    return{state:"confirmed",received,ageMs};
  }catch{return{state:"api_error",message:"TRC20 API could not verify this transaction. Recheck shortly."}}
}

async function verifyBinance(reference:string,get:Gettings):Promise<Verification>{
  const key=(await get("binance_api_key")).trim(),secret=(await get("binance_secret_key")).trim();
  if(!key||!secret)return{state:"api_error",message:"Binance Pay API is not configured."};
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(reference))return{state:"not_found",message:"Invalid Binance Pay transaction ID."};
  const errors:string[]=[];
  for(const host of ["api.binance.com","api1.binance.com","api2.binance.com","api3.binance.com","api4.binance.com"]){try{
    const server=await json(`https://${host}/api/v3/time`),now=Number(server.serverTime)||Date.now();
    const params=new URLSearchParams({timestamp:String(now),startTime:String(now-hour),endTime:String(now),limit:"100",recvWindow:"60000"});
    params.set("signature",createHmac("sha256",secret).update(params.toString()).digest("hex"));
    const history=await json(`https://${host}/sapi/v1/pay/transactions?${params}`,{headers:{"X-MBX-APIKEY":key}});
    const trade=(history?.data||[]).find((x:any)=>String(x.transactionId).toLowerCase()===reference.toLowerCase());
    if(trade){const usdt=String(trade.currency).toUpperCase()==="USDT"?Number(trade.amount):(trade.fundsDetail||[]).filter((x:any)=>String(x.currency).toUpperCase()==="USDT").reduce((n:number,x:any)=>n+Number(x.amount||0),0),received=Math.abs(usdt),ageMs=Date.now()-Number(trade.transactionTime||0);if(Number(trade.amount)<0)return{state:"wrong_receiver",message:"This transaction is an outgoing payment, not money received."};if(ageMs>hour)return{state:"too_old",message:"This Binance payment is older than 1 hour."};if(received>0)return{state:"confirmed",received,ageMs}}
    return{state:"not_found",message:"Transaction was not found in this Binance account's Pay history."};
  }catch(e){errors.push(e instanceof Error?e.message:"unknown error")}}
  try{
    const body=JSON.stringify(reference.length<=19?{prepayId:reference}:{merchantTradeNo:reference});
    const timestamp=String(Date.now()),nonce=randomBytes(16).toString("hex"),payload=`${timestamp}\n${nonce}\n${body}\n`;
    const signature=createHmac("sha512",secret).update(payload).digest("hex").toUpperCase();
    const data=await json("https://bpay.binanceapi.com/binancepay/openapi/order/query",{method:"POST",headers:{"Content-Type":"application/json","BinancePay-Timestamp":timestamp,"BinancePay-Nonce":nonce,"BinancePay-Certificate-SN":key,"BinancePay-Signature":signature},body});
    if(data?.data?.status!=="PAID")return{state:"not_found",message:data?.data?.status?`Binance status: ${data.data.status}. Payment not completed.`:"Binance Pay order was not found."};
    const ageMs=Date.now()-Number(data.data.transactTime||data.data.createTime||0);if(ageMs>hour)return{state:"too_old",message:"This Binance payment is older than 1 hour."};
    return{state:"confirmed",received:Number(data.data.totalFee||0),ageMs};
  }catch(e){errors.push(e instanceof Error?e.message:"merchant API failed");const reason=errors.find(x=>x.includes("-2015"))?"Binance rejected this API key or its IP/permissions (-2015).":errors.find(x=>x.includes("-1021"))?"Binance rejected the request timestamp (-1021).":"Binance API request failed.";console.error("Binance verification failed",errors.join(" | "));return{state:"api_error",message:`${reason} ${errors.at(-1)||""}`.slice(0,300)}}
}

export async function verifyPayment(method:PaymentMethod,txid:string,get:Gettings){if(method==="bep20")return verifyBep20(txid,get);if(method==="trc20")return verifyTrc20(txid,get);return verifyBinance(txid,get)}
