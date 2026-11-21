import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";
import DashboardHeader from "../components/Shop/Layout/DashboardHeader";
import ProductDetails from "../components/Products/ProductDetails";
import SuggestedProduct from "../components/Products/SuggestedProduct";
import { server } from "../server";

const ProductDetailsPage = ({ sellerPreview = false }) => {
  const { allEvents } = useSelector((state) => state.events);
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEvent = !sellerPreview && searchParams.has("isEvent");
  const requestKey = `${sellerPreview ? "seller" : "public"}:${id}`;
  const [result, setResult] = useState({ key: null, data: null, loading: true, error: null });

  useEffect(() => {
    window.scrollTo(0, 0);
    if (isEvent) return;

    let active = true;
    const controller = new AbortController();
    setResult({ key: requestKey, data: null, loading: true, error: null });
    const endpoint = sellerPreview ? "get-shop-product" : "get-product";
    axios.get(`${server}/product/${endpoint}/${id}`, {
      withCredentials: sellerPreview,
      signal: controller.signal,
    }).then(({ data }) => {
      if (!data?.success || data.product?._id !== id) throw new Error("Invalid product response");
      if (active) setResult({ key: requestKey, data: data.product, loading: false, error: null });
    }).catch((error) => {
      if (active) setResult({ key: requestKey, data: null, loading: false,
        error: error.response?.data?.message || "Unable to load this product. Please try again." });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [id, isEvent, requestKey, sellerPreview]);

  // Never reuse an earlier ID's or seller-only response on a different route.
  const data = isEvent ? allEvents?.find((event) => event._id === id)
    : result.key === requestKey ? result.data : null;
  const loading = !isEvent && (result.key !== requestKey || result.loading);
  const error = !isEvent && result.key === requestKey ? result.error : null;

  return (
    <div>
      {sellerPreview ? <DashboardHeader /> : <Header />}
      {loading ? <div role="status" className="p-8 text-center">Loading product...</div>
        : error ? <div role="alert" className="p-8 text-center">
          <p>{error}</p>
          <Link to={sellerPreview ? "/dashboard-products" : "/products"}>Back to Products</Link>
        </div> : <>
          {sellerPreview && data && <div className="max-w-7xl mx-auto px-6 pt-6">
            <h2 className="text-xl font-semibold">Seller Product Preview</h2>
            <p className="mt-2 text-sm font-medium">
              {data.approvalStatus === "pending" ? "Pending Approval"
                : data.approvalStatus === "rejected" ? "Rejected" : "Approved"}
              {data.isActive === false && " · Hidden"}
            </p>
          </div>}
          <ProductDetails data={data} isSellerPreview={sellerPreview} />
          {!sellerPreview && !isEvent && data && <SuggestedProduct data={data} />}
        </>}
      {!sellerPreview && <Footer />}
    </div>
  );
};

export default ProductDetailsPage;
