import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import ProductCard from "../ProductCard/ProductCard";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";

const FeaturedProduct = () => {
  const { allProducts } = useSelector((state) => state.products);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    if (allProducts && allProducts.length > 0) {
      // Get top-rated products or random selection for featured
      const sortedByRating = [...allProducts].sort((a, b) => {
        const ratingA = a.ratings?.length || 0;
        const ratingB = b.ratings?.length || 0;
        return ratingB - ratingA;
      });
      // Take first 8 products as featured
      setFeaturedProducts(sortedByRating.slice(0, 8));
    }
  }, [allProducts]);

  const loadMore = () => {
    setVisibleCount(prev => prev + 4);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Section Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-sm font-semibold mb-3 animate-fadeInUp">
          <AiFillStar size={14} />
          <span>HAND-PICKED FOR YOU</span>
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3 animate-fadeInUp">
          Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-orange-hover">Products</span>
        </h2>
        <p className="text-text-secondary max-w-2xl mx-auto animate-fadeInUp">
          Discover our hand-picked selection of premium products just for you
        </p>
      </div>

      {allProducts && allProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, visibleCount).map((product, index) => (
              <div
                key={product._id || index}
                className="animate-fadeInUp"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ProductCard data={product} />
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {featuredProducts.length > visibleCount && (
            <div className="text-center mt-10">
              <button
                onClick={loadMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white rounded-lg font-medium transition-all duration-300 hover:scale-105"
              >
                Load More Products
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </>
      ) : (
        // Loading or Empty State
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-96 animate-pulse"></div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedProduct;