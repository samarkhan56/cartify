// Manual local tool. Only real authenticated order APIs write orders/stock/earnings.
const fs=require("fs"), path=require("path"), {spawn}=require("child_process");
const {definitions,sellers}=require("./fyp-product-plan");
const {normalize,capture}=require("./import-fyp-products");
const {fingerprint,parseWorkbook,readWorkbook}=require("./import-fyp-accounts");
const p=require("./fyp-presentation-plan");
const backend=path.resolve(__dirname,".."), directory=path.join(backend,"demo/presentation-orders");
const check=(ok,message)=>{if(!ok)throw new Error(message);};

function prepare(shops,customers,products,orders,now=new Date()) {
  check(p.november(now),"This approved plan may only run during November 2026; do not backdate orders.");
  const chosenShops=new Map();
  for(const [label,email] of sellers){
    const matches=shops.filter(s=>normalize(s.email)===email);
    check(matches.length===1&&matches[0].accountStatus==="active"&&matches[0].verificationStatus==="approved",`Seller unavailable: ${label}`);
    check(normalize(matches[0].name)===normalize(label)||(label==="Maple & Main Home"&&normalize(matches[0].name)==="ava mitchell"),`Seller identity mismatch: ${label}`);
    chosenShops.set(label,matches[0]);
  }
  const rows=p.GROUPS.map((numbers,i)=>{
    const number=i+1,email=`customer${String(p.CUSTOMERS[i]).padStart(2,"0")}@example.com`;
    const users=customers.filter(u=>normalize(u.email)===email);
    check(users.length===1&&!users[0].name.startsWith("[DEMO]")&&users[0].role!=="Admin",`Normal customer missing: ${email}`);
    const user=users[0];
    const items=numbers.map(n=>{
      const [label,title]=definitions[n-1],shop=chosenShops.get(label);
      const matches=products.filter(x=>normalize(x.name)===normalize(title)&&String(x.shopId)===String(shop._id));
      check(matches.length===1,`Missing/duplicate planned product #${n}`);
      const product=matches[0];
      check(product.approvalStatus==="approved"&&product.isActive!==false&&product.images?.length,`Product #${n} must remain approved, active and imaged.`);
      const discount=Number(product.discountPrice),original=Number(product.originalPrice);
      const price=p.round(Number.isFinite(discount)&&discount>0?discount:original);
      check(Number.isFinite(price)&&price>0,`Invalid live sale price for #${n}`);
      return {number:n,id:String(product._id),name:product.name,shopId:String(shop._id),seller:label,qty:1,price};
    });
    check(new Set(items.map(x=>x.shopId)).size===1,`Basket ${number} would split into multiple seller orders.`);
    const existing=orders.filter(o=>o.shippingAddress?.address2===p.marker(number));
    check(existing.length<=1,`Duplicate marker for order ${number}`);
    if(existing.length){
      const order=existing[0];
      check(String(order.user?._id)===String(user._id)&&p.november(order.createdAt)&&
        fingerprint(order.cart.map(x=>[String(x._id),Number(x.qty)]).sort())===fingerprint(items.map(x=>[x.id,x.qty]).sort()),`Existing presentation order ${number} conflicts with plan.`);
    }
    return {number,customerId:String(user._id),customerEmail:email,seller:items[0].seller,shopId:items[0].shopId,
      items,status:p.statusFor(number),shippingAddress:p.addressFor(number,user),totals:p.totals(items),existingId:existing[0]?String(existing[0]._id):null};
  });
  const tagged=orders.filter(o=>String(o.shippingAddress?.address2||"").startsWith(p.PREFIX));
  check(tagged.length===rows.filter(r=>r.existingId).length,"Unexpected presentation markers exist.");
  const count=rows.filter(r=>r.existingId).length;
  check(count===0||count===18,"Partial presentation dataset detected. Inspect its manifest and lifecycle side effects before any further writes.");
  if(!count){
    const units=new Map();for(const row of rows)for(const item of row.items)units.set(item.id,(units.get(item.id)||0)+item.qty);
    for(const [id,qty] of units)check(products.find(x=>String(x._id)===id).stock>=qty,`Insufficient aggregate stock for ${id}`);
  }
  return rows;
}

function credentials(parsed,email,kind){
  const matches=parsed.accounts.filter(a=>a.kind===kind&&normalize(a.email)===normalize(email));
  check(matches.length===1&&matches[0].fields.Password,"Missing approved workbook credential; no credentials logged.");
  return matches[0].fields.Password;
}

async function authenticatedCookie(Model,email,password,seller=false){
  // Same existing password comparison/token model methods as normal login; no keys or sessions are persisted.
  const document=await Model.findOne({email}).select("+password");
  check(document&&await document.comparePassword(password),"Existing account password verification failed; no records changed by authentication.");
  if(seller)check(document.accountStatus==="active"&&document.verificationStatus==="approved","Seller approval changed.");
  return `${seller?"seller_token":"token"}=${document.getJwtToken()}`;
}

async function request(base,route,cookie,method="GET",body){
  const response=await fetch(`${base}/api/v2${route}`,{method,redirect:"error",signal:AbortSignal.timeout(30000),
    headers:{Origin:"http://localhost:3000",Cookie:cookie,...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  check(response.ok&&data.success!==false,`Real API ${method} ${route} failed (HTTP ${response.status}); inspect the manifest before retrying.`);
  return data;
}

async function startWorker(){
  // Real server/routes/DB/auth, process-local mail-disabled configuration, no mocks or application changes.
  try{const r=await fetch("http://localhost:8003/test",{signal:AbortSignal.timeout(1000)});if(r)throw new Error("Port 8003 is already occupied; it will not be reused or stopped.");}
  catch(e){if(e.message?.startsWith("Port 8003"))throw e;}
  const child=spawn(process.execPath,[path.join(backend,"server.js")],{cwd:backend,windowsHide:true,stdio:["ignore","pipe","pipe"],
    env:{...process.env,PORT:"8003",EMAIL_USER:"",EMAIL_PASS:"",SMPT_MAIL:"",SMPT_PASSWORD:""}});
  let logs="";child.stdout.on("data",b=>{logs=(logs+b.toString()).slice(-12000);});child.stderr.on("data",b=>{logs=(logs+b.toString()).slice(-12000);});
  try{
    for(let i=0;i<100;i++){
      if(child.exitCode!==null)throw new Error("Temporary real backend exited during startup.");
      try{const r=await fetch("http://localhost:8003/test",{signal:AbortSignal.timeout(500)});if(r.ok)return {child,base:"http://localhost:8003",logs:()=>logs};}catch{}
      await new Promise(r=>setTimeout(r,200));
    }
    throw new Error("Temporary real backend did not become ready.");
  }catch(e){child.kill();throw e;}
}

async function stopWorker(worker){if(!worker||worker.child.exitCode!==null)return;await new Promise(resolve=>{worker.child.once("exit",resolve);worker.child.kill();});}

async function protectedSnapshot(db,createdIds=[]){
  const ids=createdIds.map(id=>new(require("mongoose").Types.ObjectId)(id));
  const all=await capture(db,[]);
  const originalOrders=await db.collection("orders").find(ids.length?{_id:{$nin:ids}}:{}).sort({_id:1}).toArray();
  const products=await db.collection("products").find().sort({_id:1}).toArray();
  const shops=await db.collection("shops").find().sort({_id:1}).toArray();
  return {orders:{count:originalOrders.length,sha256:fingerprint(originalOrders)},users:all.users,
    products:products.map(x=>({id:String(x._id),stock:x.stock,sold_out:x.sold_out||0,
      immutable:fingerprint(Object.fromEntries(Object.entries(x).filter(([k])=>!["stock","sold_out"].includes(k))))})),
    shops:shops.map(x=>({id:String(x._id),balance:Number(x.availableBalance||0),
      immutable:fingerprint(Object.fromEntries(Object.entries(x).filter(([k])=>k!=="availableBalance")))}))};
}

function preservation(before,after,rows){
  check(fingerprint(before.orders)===fingerprint(after.orders),"An existing historical/genuine order changed.");
  check(fingerprint(before.users)===fingerprint(after.users),"A customer record or credential changed.");
  check(before.products.length===after.products.length&&before.shops.length===after.shops.length,"Unexpected product/seller creation or deletion.");
  const consumed=new Map(),earned=new Map();
  for(const row of rows){for(const item of row.items)consumed.set(item.id,(consumed.get(item.id)||0)+item.qty);
    if(["Delivered","Processing refund"].includes(row.status))earned.set(row.shopId,p.round((earned.get(row.shopId)||0)+p.round(row.totals.totalPrice-row.totals.platformFee)));}
  for(const x of before.products){const y=after.products.find(y=>y.id===x.id),qty=consumed.get(x.id)||0;
    check(y&&x.immutable===y.immutable&&y.stock===x.stock-qty&&y.sold_out===x.sold_out+qty&&y.stock>=0,`Unexpected product/stock change: ${x.id}`);}
  for(const x of before.shops){const y=after.shops.find(y=>y.id===x.id);
    check(y&&x.immutable===y.immutable&&Math.abs(p.round(y.balance-x.balance)-(earned.get(x.id)||0))<0.001,`Unexpected seller/credential/earnings change: ${x.id}`);}
  return Object.fromEntries(earned);
}

function verifyOrders(rows,orders){
  check(rows.length===18&&orders.length===18,"Exactly 18 presentation records are required.");
  const cities={},statuses={},payments={},customers=new Map(),sellersUsed=new Set();let eligible=0,units=0;
  for(const row of rows){
    const order=orders.find(o=>o.shippingAddress?.address2===p.marker(row.number));
    check(order&&order.status===row.status&&p.november(order.createdAt)&&String(order.user?._id)===row.customerId,`Order ${row.number} identity/month/status differs.`);
    check(fingerprint(Object.fromEntries(Object.keys(row.shippingAddress).map(k=>[k,order.shippingAddress[k]])))===fingerprint(row.shippingAddress),`Shipping snapshot mismatch ${row.number}`);
    check(new Set(order.cart.map(i=>i.shopId)).size===1&&order.cart[0].shopId===row.shopId,`Seller split/ownership mismatch ${row.number}`);
    check(order.cart.length===row.items.length,`Wrong item count for ${row.number}`);
    for(const item of row.items){const line=order.cart.find(i=>String(i._id)===item.id);
      check(line&&line.qty===item.qty&&line.discountPrice===item.price&&line.lineTotal===p.round(item.qty*item.price)&&line.images?.length,`Captured price/quantity/image mismatch ${row.number}`);units+=line.qty;}
    for(const [k,v] of Object.entries(row.totals))check(Math.abs(order[k]-v)<0.001,`Order calculation mismatch ${row.number}: ${k}`);
    check(order.paymentInfo.type==="Cash On Delivery","Only real COD is approved for this local plan.");
    const succeeded=["Delivered","Processing refund"].includes(row.status);
    check(order.paymentInfo.status===(succeeded?"Succeeded":"Pending"),`Wrong COD payment status for ${row.number}`);
    if(succeeded)check(order.deliveredAt&&order.paidAt&&new Date(order.deliveredAt)>=new Date(order.createdAt),`Invalid delivery chronology ${row.number}`);
    if(row.number===18)check(order.refundInfo?.status==="Processing refund"&&new Date(order.refundInfo.requestedAt)>=new Date(order.deliveredAt),"Refund must follow genuine delivery.");
    check(order.stockUpdatedAt&&new Date(order.stockUpdatedAt)>=new Date(order.createdAt).getTime()-1000,"Missing stock reservation timestamp.");
    let last=new Date(order.createdAt).getTime()-1000;
    for(const entry of order.statusHistory||[]){const date=new Date(entry.changedAt).getTime();check(date>=last&&p.november(date),"Invalid lifecycle history chronology/month");last=date;}
    cities[order.shippingAddress.city]=(cities[order.shippingAddress.city]||0)+1;statuses[order.status]=(statuses[order.status]||0)+1;
    payments[order.paymentInfo.status]=(payments[order.paymentInfo.status]||0)+1;customers.set(row.customerEmail,(customers.get(row.customerEmail)||0)+1);
    sellersUsed.add(row.shopId);if(p.eligible(order))eligible++;
  }
  check(fingerprint(cities)===fingerprint({Lahore:4,Karachi:4,Islamabad:4,Rawalpindi:3,Faisalabad:3}),"City allocation mismatch");
  check(fingerprint(statuses)===fingerprint({Delivered:8,"On the way":3,Processing:4,Pending:2,"Processing refund":1}),"Status allocation mismatch");
  check(customers.size===15&&[...customers.values()].filter(n=>n===2).length===3&&sellersUsed.size===10&&units===35&&eligible===8,"Coverage/eligibility mismatch");
  return {orders:18,cities,statuses,payments,distinctCustomers:customers.size,repeatCustomers:[...customers].filter(([,n])=>n===2).map(([email])=>email),sellers:10,units,eligible};
}

async function rankings(base,cookie,rows){
  const result={};
  const selected=[1,2,3,4];
  for(const number of selected){
    const item=rows.flatMap(r=>r.items).find(i=>i.number===number);
    const data=await request(base,`/advertising/recommend-regions/${item.id}`,cookie);
    check(data.available&&data.history.featureMonth==="2026-10"&&data.recommendations.length===5,`Current October-based advertisement history is unavailable (${data.reason||"unexpected response"}).`);
    result[number]=data.recommendations.map(r=>r.region);
  }
  return result;
}

async function main(args){
  const opt={};for(let i=0;i<args.length;i++){const k=args[i];check(["--apply","--confirm","--accounts-workbook"].includes(k)&&opt[k]===undefined,"Unknown/repeated option");opt[k]=k==="--apply"?true:args[++i];check(opt[k],"Missing option value");}
  require("dotenv").config({path:path.join(backend,".env")});require("dotenv").config({path:path.join(backend,"config/.env"),override:false});
  const m=require("mongoose"),User=require("../model/user"),Shop=require("../model/shop");
  fs.mkdirSync(directory,{recursive:true});let lock,worker;
  const manifestPath=path.join(directory,"manifest.json"),previewPath=path.join(directory,"preview.json");
  try{
    lock=fs.openSync(path.join(directory,"session.lock"),"wx");
    await m.connect(process.env.MONGO_URI||"mongodb://localhost:27017/cartify");check(["localhost","127.0.0.1","::1"].includes(m.connection.host),"Local MongoDB is required.");
    const db=m.connection.db;
    const [shops,customers,products,orders]=await Promise.all([db.collection("shops").find().toArray(),db.collection("users").find().toArray(),db.collection("products").find().toArray(),db.collection("orders").find().toArray()]);
    const rows=prepare(shops,customers,products,orders),existing=rows.filter(r=>r.existingId).length;
    if(existing===18){
      const manifest=JSON.parse(fs.readFileSync(manifestPath));
      const tagged=orders.filter(o=>String(o.shippingAddress?.address2||"").startsWith(p.PREFIX));
      const result=verifyOrders(rows,tagged);
      preservation(manifest.before,await protectedSnapshot(db,tagged.map(o=>String(o._id))),manifest.rows);
      console.log(JSON.stringify({mode:"IDEMPOTENCY",existing:18,new:0,duplicates:0,...result},null,2));return;
    }
    check(!fs.existsSync(manifestPath),"A previous presentation manifest exists without a complete dataset; inspect before proceeding.");
    const before=await protectedSnapshot(db);
    const confirm=fingerprint({rows,before});
    fs.writeFileSync(previewPath,JSON.stringify({rows,before,confirm,proposed:18,existing:0},null,2)+"\n");
    if(!opt["--apply"]){console.log(JSON.stringify({mode:"DRY_RUN",proposed:18,existing:0,units:35,sellers:10,customers:15,confirm,previewPath},null,2));return;}
    check(opt["--confirm"]===confirm&&opt["--accounts-workbook"],"Apply requires the reviewed confirmation and account workbook.");
    const workbookPath=path.resolve(opt["--accounts-workbook"]),workbookBefore=require("crypto").createHash("sha256").update(fs.readFileSync(workbookPath)).digest("hex");
    const parsed=parseWorkbook(readWorkbook(workbookPath));check(!parsed.errors.length,"Account workbook failed validation.");
    const customerCookies=new Map(),sellerCookies=new Map();
    for(const email of new Set(rows.map(r=>r.customerEmail)))customerCookies.set(email,await authenticatedCookie(User,email,credentials(parsed,email,"customers")));
    for(const id of new Set(rows.map(r=>r.shopId))){const shop=shops.find(s=>String(s._id)===id);sellerCookies.set(id,await authenticatedCookie(Shop,shop.email,credentials(parsed,shop.email,"sellers"),true));}
    const admin=customers.find(u=>u.role==="Admin"&&normalize(u.email)==="admin01@example.com");check(admin,"Existing FYP admin is required for verification.");
    const adminCookie=await authenticatedCookie(User,admin.email,credentials(parsed,admin.email,"customers"));
    worker=await startWorker();
    const maple=rows[0].shopId;
    const rankingBefore=await rankings(worker.base,sellerCookies.get(maple),rows);
    const {loadMarketplaceHistory}=require("../services/advertisingFeatures");const historyBefore=await loadMarketplaceHistory();
    check(historyBefore.available&&historyBefore.history.featureMonth==="2026-10","Unexpected feature window");
    const features=h=>Object.fromEntries([...h.regions.keys()].sort().flatMap(region=>[...h.categories].sort().map(category=>[JSON.stringify([region,category]),h.features(region,category)])));
    const featureBefore=fingerprint(features(historyBefore));
    const manifest={version:1,createdAt:new Date().toISOString(),before,rows,rankingBefore,featureBefore,results:[]};
    fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n",{flag:"wx"});
    for(const row of rows){
      check(p.november(new Date()),"Calendar month changed; stop without backdating.");
      check(await db.collection("orders").countDocuments({"shippingAddress.address2":row.shippingAddress.address2})===0,"Order marker appeared before creation.");
      const user=customers.find(u=>String(u._id)===row.customerId);
      const body={cart:row.items.map(i=>({_id:i.id,qty:i.qty})),user:{_id:row.customerId,name:user.name,email:user.email,avatar:user.avatar},
        shippingAddress:row.shippingAddress,paymentInfo:{type:"Cash On Delivery",status:"Pending"}};
      const created=await request(worker.base,"/order/create-order",customerCookies.get(row.customerEmail),"POST",body);
      check(created.orders?.length===1,"Unexpected order split: stop immediately.");const order=created.orders[0];
      manifest.results.push({number:row.number,id:order._id,initialStatus:order.status});fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");
      for(const status of p.transitions(order.status,row.status)){
        if(status==="Processing refund")await request(worker.base,`/order/order-refund/${order._id}`,customerCookies.get(row.customerEmail),"PUT",{status});
        else await request(worker.base,`/order/update-order-status/${order._id}`,sellerCookies.get(row.shopId),"PUT",{status});
      }
      manifest.results[manifest.results.length-1].finalStatus=row.status;fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");
      console.log(`Presentation order ${row.number}/18: ${row.status}`);
    }
    const tagged=await db.collection("orders").find({"shippingAddress.address2":{$regex:`^${p.PREFIX}`}}).toArray();
    const verified=verifyOrders(rows,tagged);
    const after=await protectedSnapshot(db,tagged.map(o=>String(o._id)));
    const earnings=preservation(before,after,rows);
    const rankingAfter=await rankings(worker.base,sellerCookies.get(maple),rows);
    check(fingerprint(rankingBefore)===fingerprint(rankingAfter),"Current advertisement rank order changed.");
    const historyAfter=await loadMarketplaceHistory();check(fingerprint(features(historyAfter))===featureBefore,"October feature values changed.");
    const adminOrders=await request(worker.base,"/order/admin-all-orders",adminCookie);
    const adminIds=new Set(adminOrders.orders.map(o=>o._id));check(tagged.every(o=>adminIds.has(String(o._id))),"Admin list is missing an order.");
    for(const email of customerCookies.keys()){
      const id=rows.find(r=>r.customerEmail===email).customerId;const list=await request(worker.base,`/order/get-all-orders/${id}`,customerCookies.get(email));
      check(rows.filter(r=>r.customerId===id).every(r=>list.orders.some(o=>o.shippingAddress.address2===p.marker(r.number))),"Customer history missing presentation order");
    }
    for(const [id,cookie] of sellerCookies){const list=await request(worker.base,`/order/get-seller-all-orders/${id}`,cookie);
      check(rows.filter(r=>r.shopId===id).every(r=>list.orders.some(o=>o.shippingAddress.address2===p.marker(r.number))),"Seller management missing presentation order");}
    const workbookAfter=require("crypto").createHash("sha256").update(fs.readFileSync(workbookPath)).digest("hex");check(workbookAfter===workbookBefore,"Account workbook changed.");
    check(worker.logs().includes("Email skipped: mail credentials are not configured."),"Expected mail-disabled real transport path was not observed.");
    const report={...verified,earnings:Object.entries(earnings).map(([id,amount])=>({seller:rows.find(r=>r.shopId===id).seller,amount})),
      totalDatabaseOrders:await db.collection("orders").countDocuments(),originalRecordsPreserved:true,rankingPreserved:true,octoberFeaturesPreserved:true,
      adminCustomerSellerApiVisibility:true,workbookUnchanged:true,mailDisabledForWorkerOnly:true,rankingBefore,rankingAfter,orders:tagged};
    fs.writeFileSync(path.join(directory,"verification.json"),JSON.stringify(report,null,2)+"\n");
    manifest.complete=true;fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");
    console.log(JSON.stringify({...report,orders:undefined},null,2));
  }finally{await stopWorker(worker);await m.disconnect();if(lock!==undefined){fs.closeSync(lock);fs.unlinkSync(path.join(directory,"session.lock"));}}
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={prepare,credentials,authenticatedCookie,preservation,verifyOrders,main};
