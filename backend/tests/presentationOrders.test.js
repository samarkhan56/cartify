const {test}=require("node:test");
const assert=require("node:assert/strict");
const {definitions,sellers,aiTypes}=require("../scripts/fyp-product-plan");
const {PRODUCT_TAXONOMY}=require("../utils/productTaxonomy");
const p=require("../scripts/fyp-presentation-plan");
const tool=require("../scripts/seed-fyp-presentation-orders");
const now=new Date("2026-11-22T12:00:00Z");
const id=n=>String(n).padStart(24,"0");
function fixture(){
  const shops=sellers.map(([name,email],i)=>({_id:id(i+1),name,email,verificationStatus:"approved",accountStatus:"active"}));
  const customers=Array.from({length:15},(_,i)=>({_id:id(i+101),name:`Fixture Customer ${i+2}`,email:`customer${String(i+2).padStart(2,"0")}@example.com`,role:"user"}));
  const products=definitions.map(([seller,name,category],i)=>({_id:id(i+201),name,category,shopId:shops.find(s=>s.name===seller)._id,
    originalPrice:100,discountPrice:20+i,stock:10,sold_out:0,isActive:true,approvalStatus:"approved",images:[`fixture-${i}.png`],
    ...(aiTypes[i+1]?PRODUCT_TAXONOMY.find(t=>t.productType===aiTypes[i+1]):{})}));
  return {shops,customers,products,orders:[]};
}
const prepare=f=>tool.prepare(f.shops,f.customers,f.products,f.orders,now);
function completed(f=fixture()){
  const rows=prepare(f);
  const orders=rows.map(row=>({_id:id(row.number+400),user:{_id:row.customerId},shippingAddress:{...row.shippingAddress},
    status:row.status,createdAt:new Date("2026-11-22T10:00:00Z"),stockUpdatedAt:new Date("2026-11-22T10:00:00Z"),
    ...(row.status==="Delivered"||row.number===18?{deliveredAt:new Date("2026-11-22T11:00:00Z"),paidAt:new Date("2026-11-22T11:00:00Z")}:{}),
    ...(row.number===18?{refundInfo:{status:"Processing refund",requestedAt:new Date("2026-11-22T12:00:00Z")}}:{}),
    paymentInfo:{type:"Cash On Delivery",status:row.status==="Delivered"||row.number===18?"Succeeded":"Pending"},...row.totals,
    cart:row.items.map(i=>({_id:i.id,name:i.name,shopId:row.shopId,qty:i.qty,discountPrice:i.price,lineTotal:i.price*i.qty,images:["fixture.png"]})),
    statusHistory:[{status:"Pending",changedAt:new Date("2026-11-22T10:00:00Z")}]}));
  return {rows,orders};
}

test("approved grouping gives exactly 18 single-seller records, 35 units and all 32 products",()=>{
  const rows=prepare(fixture());assert.equal(rows.length,18);
  assert.equal(rows.flatMap(r=>r.items).reduce((n,i)=>n+i.qty,0),35);
  assert.equal(new Set(rows.flatMap(r=>r.items.map(i=>i.id))).size,32);
  assert.equal(new Set(rows.map(r=>r.shopId)).size,10);
  rows.forEach(r=>assert.equal(new Set(r.items.map(i=>i.shopId)).size,1));
  const {orders}=completed();const summary=tool.verifyOrders(rows,orders);
  assert.deepEqual(summary.cities,{Lahore:4,Karachi:4,Islamabad:4,Faisalabad:3,Rawalpindi:3});
  assert.equal(summary.distinctCustomers,15);assert.deepEqual(summary.repeatCustomers,["customer02@example.com","customer05@example.com","customer08@example.com"]);
});

test("only approved supported states are planned and COD yields 9 paid / 9 pending including the refund request",()=>{
  const {rows,orders}=completed();const result=tool.verifyOrders(rows,orders);
  assert.deepEqual(result.statuses,{Delivered:8,"On the way":3,Processing:4,Pending:2,"Processing refund":1});
  assert.deepEqual(result.payments,{Succeeded:9,Pending:9});assert.equal(result.eligible,8);
  assert.ok(!rows.some(r=>r.status.toLowerCase().includes("cancel")));
});

test("live captured sale prices and the existing shipping/platform fee rules determine totals",()=>{
  const f=fixture();f.products[0].originalPrice=582;f.products[0].discountPrice=558.07;
  f.products[3].originalPrice=140;f.products[3].discountPrice=140;
  const row=prepare(f)[0];assert.equal(row.items[0].price,558.07);
  assert.deepEqual(row.totals,{subTotalPrice:698.07,shippingPrice:69.81,discountPrice:0,totalPrice:767.88,platformFee:76.79});
  f.products[0].discountPrice=0;assert.equal(prepare(f)[0].items[0].price,582);
});

test("synthetic addresses include full immutable hierarchy and deterministic existing-string markers",()=>{
  const rows=prepare(fixture());for(const row of rows){
    for(const key of ["fullName","email","phoneNumber","country","state","city","zipCode","address1","address2"])assert.ok(row.shippingAddress[key]);
    assert.equal(row.shippingAddress.country,"Pakistan");assert.match(row.shippingAddress.address1,/FYP Demo/);
    assert.equal(row.shippingAddress.address2,p.marker(row.number));
  }assert.equal(new Set(rows.map(r=>r.shippingAddress.address2)).size,18);
});

test("Delivered and refund use forward real lifecycle paths; Pending never delivers and unsupported/backward transitions fail",()=>{
  assert.deepEqual(p.transitions("Pending","Processing"),["Processing"]);
  assert.deepEqual(p.transitions("Pending","Pending"),[]);
  assert.equal(p.transitions("Pending","Delivered").at(-1),"Delivered");
  assert.deepEqual(p.transitions("On the way","Processing refund"),["Delivered","Processing refund"]);
  assert.deepEqual(p.transitions("Delivered","Delivered"),[]);
  for(const [from,to] of [["Delivered","Processing"],["Pending","Cancelled"],["Processing refund","Delivered"]])assert.throws(()=>p.transitions(from,to));
});

test("November-only guard rejects earlier/later months without backdating",()=>{
  const f=fixture();for(const date of ["2026-10-31","2026-12-01","2027-11-22"])assert.throws(()=>tool.prepare(f.shops,f.customers,f.products,[],new Date(date)),/November 2026/);
});

test("pending/suspended sellers, hidden products, duplicate products and aggregate stock shortages block writes",()=>{
  for(const change of [f=>{f.shops[0].verificationStatus="pending";},f=>{f.shops[0].accountStatus="suspended";},
    f=>{f.products[0].isActive=false;},f=>{f.products.push({...f.products[0],_id:id(999)});},f=>{f.products[3].stock=1;}]){
    const f=fixture();change(f);assert.throws(()=>prepare(f));
  }
});

test("historical demo or admin customers cannot replace normal FYP customers",()=>{
  for(const change of [f=>{f.customers[0].name="[DEMO] Advertisement";},f=>{f.customers[0].role="Admin";},f=>{f.customers.pop();}]){
    const f=fixture();change(f);assert.throws(()=>prepare(f),/Normal customer missing/);
  }
});

test("rerun detects 18 markers, while partial, duplicate and conflicting marker sets stop without automatic retries",()=>{
  const f=fixture(),{orders}=completed(f);f.orders=orders;
  assert.equal(prepare(f).filter(r=>r.existingId).length,18);
  f.orders=orders.slice(0,1);assert.throws(()=>prepare(f),/Partial presentation/);
  f.orders=[...orders,{...orders[0],_id:id(999)}];assert.throws(()=>prepare(f),/Duplicate marker/);
  f.orders=orders.map(o=>({...o}));f.orders[0].user={_id:id(999)};assert.throws(()=>prepare(f),/conflicts with plan/);
});

test("verification rejects altered shipping, stale captured price, unsupported refund state and impossible chronology",()=>{
  for(const change of [o=>{o[0].shippingAddress.state="";},o=>{o[0].cart[0].discountPrice=999;},
    o=>{o[17].refundInfo.status="Invented refund";},o=>{o[0].deliveredAt=new Date("2026-11-01");},o=>{o[0].createdAt=new Date("2026-10-22");}]){
    const {rows,orders}=completed();change(orders);assert.throws(()=>tool.verifyOrders(rows,orders));
  }
});

test("credential lookup never accepts missing/duplicate accounts; eligibility excludes pending, refunds and failed payments",()=>{
  assert.throws(()=>tool.credentials({accounts:[]},"fixture@example.invalid","customers"));
  const a={email:"fixture@example.invalid",kind:"customers",fields:{Password:"isolated-fixture-only"}};
  assert.throws(()=>tool.credentials({accounts:[a,a]},a.email,a.kind));
  assert.equal(p.eligible({status:"Delivered",paymentInfo:{status:"Succeeded"}}),true);
  for(const o of [{status:"Pending",paymentInfo:{status:"Succeeded"}},{status:"Delivered",paymentInfo:{status:"Failed"}},
    {status:"Delivered",paymentInfo:{status:"Succeeded"},refundInfo:{status:"Processing refund"}}])assert.equal(p.eligible(o),false);
});

test("preservation allows only exact stock reservations and real delivery earnings, rejecting credential/history/extra-credit changes",()=>{
  const f=fixture(),rows=prepare(f),used=new Map(),earned=new Map();
  for(const row of rows){for(const i of row.items)used.set(i.id,(used.get(i.id)||0)+i.qty);
    if(["Delivered","Processing refund"].includes(row.status))earned.set(row.shopId,p.round((earned.get(row.shopId)||0)+p.round(row.totals.totalPrice-row.totals.platformFee)));}
  const before={orders:{count:1098,sha256:"fixture-old-orders"},users:{count:201,sha256:"fixture-old-customers"},
    products:f.products.map(x=>({id:x._id,stock:x.stock,sold_out:0,immutable:"fixture-unchanged-product"})),
    shops:f.shops.map(s=>({id:s._id,balance:10,immutable:"fixture-unchanged-credentials"}))};
  const after={...before,products:before.products.map(x=>({...x,stock:x.stock-(used.get(x.id)||0),sold_out:used.get(x.id)||0})),
    shops:before.shops.map(s=>({...s,balance:s.balance+(earned.get(s.id)||0)}))};
  assert.deepEqual(tool.preservation(before,after,rows),Object.fromEntries(earned));
  for(const change of [a=>{a.orders.sha256="changed";},a=>{a.users.sha256="changed";},a=>{a.products[0].stock--;},
    a=>{a.shops[0].balance+=1;},a=>{a.shops[0].immutable="credential-changed";},a=>{a.products.push({...a.products[0],id:id(999)});}]){
    const copy=JSON.parse(JSON.stringify(after));change(copy);assert.throws(()=>tool.preservation(before,copy,rows));
  }
});
