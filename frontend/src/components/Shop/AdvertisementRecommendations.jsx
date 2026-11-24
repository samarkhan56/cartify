import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Country, State, City } from "country-state-city";
import { server } from "../../server";
import { productTaxonomy } from "../../static/data";

const supportedTypes = new Set(["smartphone", "laptop", "cookware", "running_shoes"]);
const isSupported = (product) => supportedTypes.has(product.productType) &&
  Array.isArray(productTaxonomy[product.category]) && productTaxonomy[product.category].some((type) =>
    type.productType === product.productType && type.subcategory === product.subcategory);
const messages = {
  INSUFFICIENT_HISTORY: "Not enough marketplace demand history yet. Recommendations will become available as more completed orders are recorded.",
  UNSUPPORTED_CATEGORY: "Advertisement recommendations are not available for this product category yet.",
  NO_ELIGIBLE_INVENTORY: "Your shop has no matching active, approved, in-stock products in the supported categories.",
  ML_UNAVAILABLE: "AI recommendations are temporarily unavailable. Please try again later.",
  HISTORY_UNAVAILABLE: "Marketplace demand history is temporarily unavailable. Please try again later.",
  FORBIDDEN: "You can only request recommendations for your own products.",
  PRODUCT_NOT_FOUND: "This product is no longer available. Refresh your product list and try again.",
};
const inputClass = "mt-1 w-full border border-gray-300 p-2 rounded-[5px] bg-white disabled:bg-gray-100";

export default function AdvertisementRecommendations() {
  const { seller } = useSelector((state) => state.seller);
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState("");
  const [inventoryAuthError, setInventoryAuthError] = useState(false);
  const [reload, setReload] = useState(0);
  const [mode, setMode] = useState("product");
  const [productId, setProductId] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const requestState = useRef({ id: 0 });
  const sellerId = seller?._id;

  const invalidate = () => {
    requestState.current.id++;
    setLoading(false);
    setResult(null);
  };

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const requests = requestState.current;
    requests.id++;
    setLoading(false);
    setResult(null);
    setProductId("");
    setInventory([]);
    setInventoryLoading(Boolean(sellerId));
    setInventoryError("");
    setInventoryAuthError(false);
    if (sellerId) axios.get(`${server}/product/get-all-products-shop-dashboard/${sellerId}`, {
      withCredentials: true, signal: controller.signal, timeout: 15000,
    }).then(({ data }) => {
      if (active) setInventory((Array.isArray(data.products) ? data.products : [])
        .filter((product) => String(product.shopId) === String(sellerId)));
    }).catch((error) => {
      if (!active) return;
      const expired = [401, 403].includes(error?.response?.status);
      setInventoryAuthError(expired);
      setInventoryError(expired ? "Your seller session needs attention. Please sign in again."
        : "Your products could not be loaded. Please try again.");
    }).finally(() => { if (active) setInventoryLoading(false); });
    return () => { active = false; controller.abort(); requests.id++; };
  }, [sellerId, reload]);

  const eligible = inventory.filter((product) => isSupported(product) && product.isActive !== false &&
    (!product.approvalStatus || product.approvalStatus === "approved") && product.stock > 0);
  const states = country ? State.getStatesOfCountry(country) : [];
  const cities = country && province ? City.getCitiesOfState(country, province) : [];
  const ready = mode === "product" ? Boolean(productId) : Boolean(country && province && city.trim());

  const recommend = async (event) => {
    event.preventDefault();
    if (!ready || loading) return;
    const currentRequest = ++requestState.current.id;
    setResult(null);
    setLoading(true);
    try {
      const endpoint = mode === "product" ? `/advertising/recommend-regions/${encodeURIComponent(productId)}`
        : "/advertising/recommend-products";
      const { data } = await axios.get(`${server}${endpoint}`, { withCredentials: true, timeout: 120000,
        ...(mode === "region" ? { params: { country: Country.getCountryByCode(country)?.name || country,
          state: State.getStateByCodeAndCountry(province, country)?.name || province, city: city.trim() } } : {}) });
      if (currentRequest !== requestState.current.id) return;
      if (data.available === false) {
        setResult({ message: messages[data.reason] || "Recommendations are unavailable for this selection. Please try again later." });
      } else if (data.available === true && Array.isArray(data.recommendations) && data.recommendations.every((row) =>
        Number.isInteger(row.rank) && ["High", "Low"].includes(row.confidence) && (mode === "product"
          ? typeof row.region === "string" && row.region.split(", ").length === 3
          : typeof row.category === "string" && Array.isArray(row.products) && row.products.every((product) =>
            typeof product.id === "string" && typeof product.name === "string")))) {
        setResult({ rows: data.recommendations });
      } else {
        setResult({ message: "Recommendations could not be loaded. Please try again later." });
      }
    } catch (error) {
      if (currentRequest !== requestState.current.id) return;
      const expired = error?.response?.status === 401;
      setResult({ auth: expired, message: expired ? "Your seller session has expired. Please sign in again."
        : error?.response?.status === 403 ? messages.FORBIDDEN
          : "AI recommendations are temporarily unavailable. Please try again later." });
    } finally { if (currentRequest === requestState.current.id) setLoading(false); }
  };

  return <section className="w-full min-w-0 p-4 800px:p-8" aria-labelledby="advertisement-heading">
    <div className="bg-white rounded-lg shadow-sm p-4 800px:p-6">
      <h1 id="advertisement-heading" className="text-[24px] font-[600] text-[#333]">AI Advertisement Recommendation</h1>
      <p className="text-gray-600 mt-2 mb-5">Plan where to advertise using completed marketplace purchases. This tool suggests opportunities; it does not publish ads.</p>
      <div className="flex flex-wrap gap-3 mb-6" role="group" aria-label="Recommendation mode">
        {[['product', 'By Product'], ['region', 'By Region']].map(([value, label]) => <button key={value}
          type="button" aria-pressed={mode === value} onClick={() => { invalidate(); setMode(value); }}
          className={`px-4 py-2 rounded-[5px] border ${mode === value ? 'bg-black text-white' : 'bg-white text-[#555]'}`}>{label}</button>)}
      </div>
      {inventoryLoading && <p role="status">Loading your products...</p>}
      {inventoryError && <div role="alert"><p>{inventoryError}</p>{inventoryAuthError
        ? <Link className="text-[crimson] underline" to="/shop-login">Seller sign in</Link>
        : <button className="text-[crimson] underline" onClick={() => setReload((value) => value + 1)}>Retry loading products</button>}</div>}
      {!inventoryLoading && !inventoryError && <form onSubmit={recommend}>
        {!eligible.length && <p className="text-gray-600 mb-4">{messages.NO_ELIGIBLE_INVENTORY} Supported categories: Mobile Phones, Laptops, Cookware Sets, and Adult Performance Running Shoes.</p>}
        {mode === "product" ? <label className="block max-w-xl">Your product
          <select className={inputClass} required value={productId} onChange={(event) => { invalidate(); setProductId(event.target.value); }}>
            <option value="">Select a product</option>
            {eligible.map((product) => <option key={product._id} value={product._id}>{product.name} — {product.subcategory}</option>)}
          </select>
        </label> : <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label>Country<select className={inputClass} required value={country} onChange={(event) => {
            invalidate(); setCountry(event.target.value); setProvince(""); setCity("");
          }}><option value="">Select country</option>{Country.getAllCountries().map((entry) =>
            <option key={entry.isoCode} value={entry.isoCode}>{entry.name}</option>)}</select></label>
          <label>State / Province{states.length || !country ? <select className={inputClass} required disabled={!country}
            value={province} onChange={(event) => { invalidate(); setProvince(event.target.value); setCity(""); }}>
            <option value="">Select state / province</option>{states.map((entry) => <option key={entry.isoCode} value={entry.isoCode}>{entry.name}</option>)}
          </select> : <input className={inputClass} required value={province} onChange={(event) => { invalidate(); setProvince(event.target.value); setCity(""); }} />}</label>
          <label>City{cities.length ? <select className={inputClass} required value={city} onChange={(event) => { invalidate(); setCity(event.target.value); }}>
            <option value="">Select city</option>{cities.map((entry, index) => <option key={`${entry.name}-${index}`} value={entry.name}>{entry.name}</option>)}
          </select> : <input className={inputClass} required disabled={!province} value={city}
            onChange={(event) => { invalidate(); setCity(event.target.value); }} />}</label>
        </div>}
        <button type="submit" disabled={!ready || loading || !eligible.length}
          className="mt-5 px-5 py-3 bg-black text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? "Finding recommendations..." : mode === "product" ? "Find Best Regions" : "Find Best Products"}
        </button>
      </form>}
      <div className="mt-5" aria-live="polite" aria-busy={loading}>
        {loading && <p role="status">Analyzing completed marketplace demand...</p>}
        {result?.message && <p role="status">{result.message} {result.auth && <Link className="text-[crimson] underline" to="/shop-login">Seller sign in</Link>}</p>}
        {result?.rows?.length === 0 && <p>No recommendations are available for this selection yet.</p>}
        {Boolean(result?.rows?.length) && <>
          <h2 className="font-[600] text-lg mb-3">{mode === "product" ? "Top recommended regions" : "Recommended categories and your products"}</h2>
          {mode === "product" ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr>{["Rank", "City", "State / Province", "Country", "Demand confidence"].map((label) => <th key={label} className="p-3 border-b">{label}</th>)}</tr></thead>
            <tbody>{result.rows.map((row) => { const [regionCity, state, regionCountry] = row.region.split(", ");
              return <tr key={row.region}><td className="p-3 border-b">{row.rank}</td><td className="p-3 border-b">{regionCity}</td>
                <td className="p-3 border-b">{state}</td><td className="p-3 border-b">{regionCountry}</td><td className="p-3 border-b">{row.confidence}</td></tr>;
            })}</tbody></table></div> : <ol className="space-y-3">{result.rows.map((row) => <li key={row.category} className="border rounded-[5px] p-4">
              <h3 className="font-[600]">{row.rank}. {row.category}</h3><p className="text-gray-600">Demand confidence: {row.confidence}</p>
              <ul className="mt-2 space-y-1">{row.products.map((product) => <li key={product.id}>
                <Link className="text-[crimson] underline" to={`/dashboard-product/${product.id}`}>{product.name}</Link></li>)}</ul>
            </li>)}</ol>}
          <p className="mt-3 text-sm text-gray-500">Demand confidence describes the category opportunity. Results are guidance, not guaranteed sales.</p>
        </>}
      </div>
    </div>
  </section>;
}
