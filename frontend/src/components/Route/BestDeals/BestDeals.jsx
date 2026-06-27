import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ProductCard from "../ProductCard/ProductCard";

const BestDeals = () => {
  const [data, setData] = useState([]);
  const { allProducts } = useSelector((state) => state.products);
  
  useEffect(() => {
    const allProductsData = allProducts ? [...allProducts] : [];
    const sortedData = allProductsData?.sort((a, b) => b.sold_out - a.sold_out);
    const firstEight = sortedData && sortedData.slice(0, 8);
    setData(firstEight);
  }, [allProducts]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Section Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-sm font-semibold mb-3 animate-fadeInUp">
          <span className="text-base"></span>
          <span>HOT DEALS FOR YOU</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3 animate-fadeInUp">
          Best <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-orange-hover">Deals</span> of the Week
        </h2>
        <p className="text-text-secondary max-w-2xl mx-auto animate-fadeInUp">
          Don't miss out on these amazing discounts. Limited time offers available!
        </p>
      </div>

      {/* Products Grid */}
      {data && data.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.map((product, index) => (
              <div 
                key={product._id || index}
                className="animate-fadeInUp"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ProductCard data={product} />
              </div>
            ))}
          </div>

          {/* View All Button */}
          <div className="text-center mt-12">
            <Link to="/products">
              <button className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-light-text rounded-lg font-medium transition-all duration-300 hover:scale-105">
                View All Products
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Link>
          </div>
        </>
      ) : (
        // Loading or Empty State
        <div className="text-center py-12">
          <div className="inline-block p-4 rounded-full bg-brand-orange/10 mb-4">
            <svg className="w-8 h-8 text-brand-orange animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-text-secondary">Loading best deals...</p>
        </div>
      )}
    </div>
  );
};

export default BestDeals;
