import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import Loader from "../components/Layout/Loader";
import ProductCard from "../components/Route/ProductCard/ProductCard";
import { getAllProducts } from "../redux/actions/product";
import { backend_url } from "../server";
import { categoriesData } from "../static/data";
import styles from "../styles/styles";

const defaultFilters = {
  search: "",
  category: "",
  minPrice: "",
  maxPrice: "",
  minRating: "",
  inStock: "",
  sort: "latest",
};

const sortLabels = {
  latest: "Latest",
  popular: "Most sold",
  rating: "Top rated",
  price_low: "Price: low to high",
  price_high: "Price: high to low",
};

const toCleanParams = (values) =>
  Object.entries(values).reduce((params, [key, value]) => {
    if (value && !(key === "sort" && value === "latest")) {
      params[key] = value;
    }

    return params;
  }, {});

const ProductsPage = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { allProducts, isLoading } = useSelector((state) => state.products);

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      minRating: searchParams.get("minRating") || "",
      inStock: searchParams.get("inStock") || "",
      sort: searchParams.get("sort") || "latest",
    }),
    [searchParams]
  );

  const [localFilters, setLocalFilters] = useState(filters);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);

  useEffect(() => {
    setLocalFilters(filters);
    dispatch(getAllProducts(filters));
    window.scrollTo(0, 0);
  }, [dispatch, filters]);

  useEffect(() => {
    try {
      const storedProducts = JSON.parse(
        localStorage.getItem("recentlyViewedProducts") || "[]"
      );
      setRecentlyViewedProducts(Array.isArray(storedProducts) ? storedProducts : []);
    } catch (error) {
      setRecentlyViewedProducts([]);
    }
  }, []);

  const searchSuggestions = useMemo(() => {
    const query = localFilters.search.trim().toLowerCase();

    if (!query || query.length < 2 || !allProducts) {
      return [];
    }

    return allProducts
      .filter((product) =>
        [product.name, product.brand, product.category]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query))
      )
      .slice(0, 5);
  }, [allProducts, localFilters.search]);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (filters.search) {
      chips.push({ key: "search", label: `Search: ${filters.search}` });
    }
    if (filters.category) {
      chips.push({ key: "category", label: filters.category });
    }
    if (filters.minPrice || filters.maxPrice) {
      chips.push({
        key: "price",
        label: `$${filters.minPrice || 0} - ${
          filters.maxPrice ? `$${filters.maxPrice}` : "Any"
        }`,
      });
    }
    if (filters.minRating) {
      chips.push({ key: "minRating", label: `${filters.minRating}+ stars` });
    }
    if (filters.inStock === "true") {
      chips.push({ key: "inStock", label: "In stock" });
    }
    if (filters.sort !== "latest") {
      chips.push({ key: "sort", label: sortLabels[filters.sort] || filters.sort });
    }

    return chips;
  }, [filters]);

  const updateLocalFilter = (key, value) => {
    setLocalFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setSearchParams(toCleanParams(localFilters));
    setShowSuggestions(false);
  };

  const clearFilters = () => {
    setLocalFilters(defaultFilters);
    setSearchParams({});
  };

  const removeFilter = (key) => {
    const nextFilters = { ...filters };

    if (key === "price") {
      nextFilters.minPrice = "";
      nextFilters.maxPrice = "";
    } else if (key === "sort") {
      nextFilters.sort = "latest";
    } else {
      nextFilters[key] = "";
    }

    setLocalFilters(nextFilters);
    setSearchParams(toCleanParams(nextFilters));
  };

  const applySuggestion = (product) => {
    const nextFilters = {
      ...localFilters,
      search: product.name,
    };

    setLocalFilters(nextFilters);
    setSearchParams(toCleanParams(nextFilters));
    setShowSuggestions(false);
  };

  const resultTitle = filters.search
    ? `Results for "${filters.search}"`
    : filters.category || "Products";

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <div>
          <Header activeHeading={3} />
          <div className={`${styles.section} py-8`}>
            <form
              onSubmit={applyFilters}
              className="mb-8 bg-white border border-border-gray rounded-xl p-4 shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <input
                    value={localFilters.search}
                    onChange={(event) =>
                      updateLocalFilter("search", event.target.value)
                    }
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                    placeholder="Search products, brands, categories"
                    className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                  />
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[46px] z-20 bg-white border border-border-gray rounded-lg shadow-lg overflow-hidden">
                      {searchSuggestions.map((product) => (
                        <button
                          type="button"
                          key={product._id}
                          onMouseDown={() => applySuggestion(product)}
                          className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-orange-50"
                        >
                          <img
                            src={`${backend_url}${product.images?.[0] || ""}`}
                            alt={product.name}
                            className="w-10 h-10 rounded-md object-contain bg-gray-50"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-text-primary truncate">
                              {product.name}
                            </span>
                            <span className="block text-xs text-text-secondary truncate">
                              {product.brand || product.category || "Product"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <select
                  value={localFilters.category}
                  onChange={(event) =>
                    updateLocalFilter("category", event.target.value)
                  }
                  className="px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                >
                  <option value="">All categories</option>
                  {categoriesData.map((category) => (
                    <option key={category.title} value={category.title}>
                      {category.title}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={localFilters.minPrice}
                    onChange={(event) =>
                      updateLocalFilter("minPrice", event.target.value)
                    }
                    placeholder="Min price"
                    className="px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    value={localFilters.maxPrice}
                    onChange={(event) =>
                      updateLocalFilter("maxPrice", event.target.value)
                    }
                    placeholder="Max price"
                    className="px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                  />
                </div>

                <select
                  value={localFilters.sort}
                  onChange={(event) =>
                    updateLocalFilter("sort", event.target.value)
                  }
                  className="px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                >
                  <option value="latest">Latest</option>
                  <option value="popular">Most sold</option>
                  <option value="rating">Top rated</option>
                  <option value="price_low">Price: low to high</option>
                  <option value="price_high">Price: high to low</option>
                </select>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={localFilters.inStock === "true"}
                      onChange={(event) =>
                        updateLocalFilter(
                          "inStock",
                          event.target.checked ? "true" : ""
                        )
                      }
                      className="w-4 h-4 accent-orange-500"
                    />
                    In stock only
                  </label>

                  <select
                    value={localFilters.minRating}
                    onChange={(event) =>
                      updateLocalFilter("minRating", event.target.value)
                    }
                    className="px-3 py-2 border border-border-gray rounded-lg text-sm focus:border-brand-orange focus:outline-none"
                  >
                    <option value="">Any rating</option>
                    <option value="4">4 stars and up</option>
                    <option value="3">3 stars and up</option>
                    <option value="2">2 stars and up</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-4 py-2 border border-border-gray rounded-lg text-text-secondary hover:text-brand-orange hover:border-brand-orange"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-orange text-white rounded-lg font-medium hover:bg-orange-hover"
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            </form>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-text-primary">
                  {resultTitle}
                </h1>
                <span className="text-sm text-text-secondary">
                  {allProducts?.length || 0} products available
                </span>
              </div>
              {activeFilterChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeFilterChips.map((chip) => (
                    <button
                      type="button"
                      key={chip.key}
                      onClick={() => removeFilter(chip.key)}
                      className="px-3 py-1 rounded-full border border-orange-200 bg-orange-50 text-sm text-brand-orange hover:bg-orange-100"
                    >
                      {chip.label} x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {allProducts && allProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2 md:gap-[25px] lg:grid-cols-4 lg:gap-[25px] xl:grid-cols-5 xl:gap-[30px] mb-12">
                {allProducts.map((product) => (
                  <ProductCard data={product} key={product._id} />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-border-gray rounded-xl py-14 px-4 text-center mb-12">
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  No matching products found
                </h2>
                <p className="text-text-secondary mb-5">
                  Try a different search term, category, price range, or rating.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-5 py-2 bg-brand-orange text-white rounded-lg font-medium hover:bg-orange-hover"
                >
                  Clear filters
                </button>
              </div>
            )}

            {recentlyViewedProducts.length > 0 && (
              <section className="mb-12">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-text-primary">
                    Recently viewed
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {recentlyViewedProducts.slice(0, 6).map((product) => (
                    <Link
                      key={product._id}
                      to={`/product/${product._id}`}
                      className="bg-white border border-border-gray rounded-lg p-3 hover:border-brand-orange hover:shadow-sm transition"
                    >
                      <img
                        src={`${backend_url}${product.images?.[0] || ""}`}
                        alt={product.name}
                        className="w-full h-24 object-contain bg-gray-50 rounded-md mb-3"
                      />
                      <h3 className="text-sm font-medium text-text-primary line-clamp-2 min-h-[40px]">
                        {product.name}
                      </h3>
                      <p className="text-sm font-semibold text-brand-orange mt-1">
                        ${product.discountPrice}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
          <Footer />
        </div>
      )}
    </>
  );
};

export default ProductsPage;
