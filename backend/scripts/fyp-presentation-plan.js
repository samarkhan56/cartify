// Explicitly approved regrouping: every basket belongs to exactly one seller.
const GROUPS = [[1,4],[8,9,10],[5,6],[25,26],[2,3],[18,19],[28,29,30],[24,22],[14,15],
  [11,12,13],[20,21],[27],[23],[7,5],[32,31],[16,17],[15],[4]];
const CUSTOMERS = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,2,5,8];
const CITIES = ["Lahore","Lahore","Karachi","Karachi","Islamabad","Islamabad","Faisalabad","Rawalpindi",
  "Lahore","Karachi","Islamabad","Rawalpindi","Faisalabad","Lahore","Islamabad","Karachi","Rawalpindi","Faisalabad"];
const REGIONS = { Lahore: ["Punjab","54000"], Karachi: ["Sindh","74000"],
  Islamabad: ["Islamabad Capital Territory","44000"], Rawalpindi: ["Punjab","46000"], Faisalabad: ["Punjab","38000"] };
const PREFIX = "cartify-fyp-presentation-v1:";
const STEPS = ["Pending","Processing","Transferred to delivery partner","Shipping","Received","On the way","Delivered"];
const marker = (number) => `${PREFIX}${String(number).padStart(2,"0")} (synthetic address)`;
const statusFor = (number) => number <= 8 ? "Delivered" : number <= 11 ? "On the way" :
  [14,15].includes(number) ? "Pending" : number === 18 ? "Processing refund" : "Processing";
const round = (value) => Math.round(Number(value) * 100) / 100;
const eligible = (order) => order.status === "Delivered" && order.paymentInfo?.status === "Succeeded" &&
  !["Processing refund","Refund Success"].includes(order.refundInfo?.status);
const november = (value) => { const d = new Date(value); return Number.isFinite(d.getTime()) && d.getUTCFullYear() === 2026 && d.getUTCMonth() === 10; };

function addressFor(number, customer) {
  const city = CITIES[number-1], [state,zipCode] = REGIONS[city];
  return { fullName: customer.name, email: customer.email, phoneNumber: `+92000000${String(number).padStart(4,"0")}`,
    country: "Pakistan", state, city, zipCode, address1: `FYP Demo Unit ${String(number).padStart(2,"0")}, Synthetic Market`, address2: marker(number) };
}

function totals(items) {
  const subTotalPrice = round(items.reduce((n,p) => n + p.price * p.qty, 0));
  const shippingPrice = round(subTotalPrice * 0.1);
  const totalPrice = round(subTotalPrice + shippingPrice);
  return { subTotalPrice, shippingPrice, discountPrice: 0, totalPrice, platformFee: round(totalPrice * 0.1) };
}

function transitions(current, target) {
  if (current === target) return [];
  if (current === "Processing refund") throw new Error("Refunding order cannot return to delivery flow.");
  const a=STEPS.indexOf(current), b=STEPS.indexOf(target === "Processing refund" ? "Delivered" : target);
  if (a<0 || b<a) throw new Error("Unsupported/backward presentation transition.");
  return [...STEPS.slice(a+1,b+1), ...(target === "Processing refund" ? ["Processing refund"] : [])];
}
module.exports = { GROUPS, CUSTOMERS, CITIES, REGIONS, PREFIX, STEPS, marker, statusFor, round, eligible, november, addressFor, totals, transitions };
