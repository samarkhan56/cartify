import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AiFillHeart,
  AiOutlineHeart,
  AiOutlineMessage,
  AiOutlineShoppingCart,
  AiOutlineMinus,
  AiOutlinePlus,
  AiFillStar,
  AiOutlineCar,
  AiOutlineReload,
  AiOutlineSafetyCertificate,
  AiOutlineCheckCircle,
  AiOutlineQuestionCircle,
} from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { getAllProductsShop } from "../../redux/actions/product";
import { backend_url, server } from "../../server";
import {
  addToWishlist,
  removeFromWishlist,
} from "../../redux/actions/wishlist";
import { addTocart } from "../../redux/actions/cart";
import { toast } from "react-toastify";
import Ratings from "./Ratings";
import axios from "axios";

const ProductDetails = ({ data }) => {
  const { products } = useSelector((state) => state.products);
  const { user, isAuthenticated } = useSelector((state) => state.user);
  const { wishlist } = useSelector((state) => state.wishlist);
  const { cart } = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  const [count, setCount] = useState(1);
  const [click, setClick] = useState(false);
  const [select, setSelect] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getAllProductsShop(data?.shop?._id));
    if (wishlist && wishlist.find((i) => i._id === data?._id)) {
      setClick(true);
    } else {
      setClick(false);
    }
  }, [data, dispatch, wishlist]);

  useEffect(() => {
    if (!data?._id) {
      return;
    }

    const recentlyViewedProduct = {
      _id: data._id,
      name: data.name,
      brand: data.brand,
      category: data.category,
      discountPrice: data.discountPrice,
      originalPrice: data.originalPrice,
      images: data.images,
      stock: data.stock,
    };

    try {
      const storedProducts = JSON.parse(
        localStorage.getItem("recentlyViewedProducts") || "[]"
      );
      const safeStoredProducts = Array.isArray(storedProducts)
        ? storedProducts
        : [];
      const nextProducts = [
        recentlyViewedProduct,
        ...safeStoredProducts.filter((product) => product._id !== data._id),
      ].slice(0, 8);

      localStorage.setItem(
        "recentlyViewedProducts",
        JSON.stringify(nextProducts)
      );
    } catch (error) {
      localStorage.setItem(
        "recentlyViewedProducts",
        JSON.stringify([recentlyViewedProduct])
      );
    }
  }, [data]);

  useEffect(() => {
    setCount(1);
    setSelect(0);
    setSelectedOptions({});
  }, [data?._id]);

  const removeFromWishlistHandler = (data) => {
    setClick(!click);
    dispatch(removeFromWishlist(data));
  };

  const addToWishlistHandler = (data) => {
    setClick(!click);
    dispatch(addToWishlist(data));
  };

  const addToCartHandler = (id) => {
    const isItemExists = cart && cart.find((i) => i._id === id);
    if (isItemExists) {
      toast.error("Item already in cart!");
    } else {
      if (data.stock < 1) {
        toast.error("Product stock limited!");
      } else if (!allVariantsSelected) {
        toast.error("Please select product options first.");
      } else {
        const cartData = { ...data, qty: count, selectedOptions };
        dispatch(addTocart(cartData));
        toast.success("Item added to cart successfully!");
      }
    }
  };

  const incrementCount = () => {
    if (count < data.stock) {
      setCount(count + 1);
    } else {
      toast.error("Not enough stock!");
    }
  };
  
  const decrementCount = () => {
    if (count > 1) {
      setCount(count - 1);
    }
  };

  const totalReviewsLength =
    products &&
    products.reduce((acc, product) => acc + product.reviews.length, 0);

  const totalRatings =
    products &&
    products.reduce(
      (acc, product) =>
        acc + product.reviews.reduce((sum, review) => sum + review.rating, 0),
      0
    );

  const avg = totalRatings / totalReviewsLength || 0;
  const averageRating = avg.toFixed(2);

  const handleMessageSubmit = async () => {
    if (isAuthenticated) {
      const groupTitle = data._id + user._id;
      const userId = user._id;
      const sellerId = data.shop._id;
      await axios
        .post(`${server}/conversation/create-new-conversation`, {
          groupTitle,
          userId,
          sellerId,
        })
        .then((res) => {
          navigate(`/inbox?${res.data.conversation._id}`);
        })
        .catch((error) => {
          toast.error(error.response.data.message);
        });
    } else {
      toast.error("Please login to create a conversation");
    }
  };

  const discountPercentage = data?.originalPrice > data?.discountPrice 
    ? Math.round(((data.originalPrice - data.discountPrice) / data.originalPrice) * 100)
    : 0;
  const variants = useMemo(() => data?.variants || [], [data?.variants]);
  const allVariantsSelected = variants.every(
    (variant) => selectedOptions[variant.name]
  );
  const stockStatus =
    data?.stock < 1
      ? "Out of stock"
      : data?.stock <= 5
      ? `Only ${data.stock} left`
      : `${data?.stock || 0} available`;
  const verifiedReviewCount =
    data?.reviews?.filter((review) => review.verifiedPurchase).length || 0;

  const selectVariantOption = (variantName, option) => {
    setSelectedOptions((current) => ({
      ...current,
      [variantName]: option,
    }));
  };

  return (
    <div className="bg-background min-h-screen py-8">
      {data ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-text-secondary hover:text-brand-orange transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Products
          </button>

          <div className="bg-card rounded-2xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 lg:p-8">
              {/* Left - Image Gallery */}
              <div>
                {/* Main Image */}
                <div className="bg-gray-50 rounded-xl overflow-hidden mb-4">
                  <img
                    src={`${backend_url}${data.images[select]}`}
                    alt={data.name}
                    className="w-full h-[300px] lg:h-[400px] object-contain p-4"
                  />
                </div>
                {/* Thumbnails */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {data.images.map((img, index) => (
                    <div
                      key={index}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        select === index ? "border-brand-orange" : "border-transparent"
                      }`}
                      onClick={() => setSelect(index)}
                    >
                      <img
                        src={`${backend_url}${img}`}
                        alt=""
                        className="w-20 h-20 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right - Product Info */}
              <div className="flex flex-col">
                {/* Discount Badge */}
                {discountPercentage > 0 && (
                  <div className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full w-fit mb-3">
                    <AiFillStar size={12} />
                    <span>-{discountPercentage}% OFF</span>
                  </div>
                )}

                {/* Title */}
                <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-3">
                  {data.name}
                </h1>
                {(data.brand || data.sku) && (
                  <div className="flex flex-wrap gap-2 mb-3 text-sm text-text-secondary">
                    {data.brand && (
                      <span className="bg-gray-100 px-3 py-1 rounded-full">
                        Brand: {data.brand}
                      </span>
                    )}
                    {data.sku && (
                      <span className="bg-gray-100 px-3 py-1 rounded-full">
                        SKU: {data.sku}
                      </span>
                    )}
                  </div>
                )}

                {/* Rating */}
                <div className="flex items-center gap-3 mb-4">
                  <Ratings rating={data?.ratings} />
                  <span className="text-text-secondary text-sm">
                    ({data?.reviews?.length || 0} reviews)
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-brand-orange">
                    ${data.discountPrice}
                  </span>
                  {data.originalPrice > data.discountPrice && (
                    <span className="text-lg text-text-secondary line-through">
                      ${data.originalPrice}
                    </span>
                  )}
                  <span
                    className={`text-sm font-medium ${
                      data.stock < 1 || data.stock <= 5
                        ? "text-red-500"
                        : "text-success"
                    }`}
                  >
                    {stockStatus}
                  </span>
                </div>
                <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border-gray bg-gray-50 p-3">
                    <p className="text-xs text-text-secondary">Verified reviews</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {verifiedReviewCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border-gray bg-gray-50 p-3">
                    <p className="text-xs text-text-secondary">Sold by</p>
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {data.shop?.name || "Cartify seller"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border-gray bg-gray-50 p-3">
                    <p className="text-xs text-text-secondary">Protection</p>
                    <p className="text-sm font-semibold text-text-primary">
                      Secure checkout
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-text-secondary mb-6 leading-relaxed">
                  {data.description}
                </p>

                {data.variants && data.variants.length > 0 && (
                  <div className="mb-6 space-y-3">
                    {data.variants.map((variant) => (
                      <div key={variant.name}>
                        <span className="text-text-primary font-medium">
                          {variant.name}:
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {variant.options.map((option) => (
                            <button
                              type="button"
                              key={option}
                              onClick={() => selectVariantOption(variant.name, option)}
                              className={`px-3 py-1 border rounded-full text-sm transition-colors ${
                                selectedOptions[variant.name] === option
                                  ? "border-brand-orange bg-brand-orange text-white"
                                  : "border-border-gray text-text-secondary hover:border-brand-orange hover:text-brand-orange"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 mb-6">
                  <span className="text-text-primary font-medium">Quantity:</span>
                  <div className="flex items-center border border-border-gray rounded-lg">
                    <button
                      onClick={decrementCount}
                      className="px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <AiOutlineMinus size={16} />
                    </button>
                    <span className="px-4 py-2 text-text-primary min-w-[50px] text-center">
                      {count}
                    </span>
                    <button
                      onClick={incrementCount}
                      className="px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <AiOutlinePlus size={16} />
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <button
                    onClick={() => addToCartHandler(data._id)}
                    disabled={data.stock < 1}
                    className="flex-1 bg-brand-orange hover:bg-orange-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <AiOutlineShoppingCart size={20} />
                    {data.stock < 1 ? "Out of Stock" : "Add to Cart"}
                  </button>
                  <button
                    onClick={() => click ? removeFromWishlistHandler(data) : addToWishlistHandler(data)}
                    className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white flex items-center justify-center gap-2"
                  >
                    {click ? <AiFillHeart size={20} /> : <AiOutlineHeart size={20} />}
                    {click ? "Added to Wishlist" : "Add to Wishlist"}
                  </button>
                </div>

                {/* Seller Info */}
                <div className="border-t border-border-gray pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Link to={`/shop/preview/${data?.shop._id}`}>
                      <img
                        src={`${backend_url}${data?.shop?.avatar}`}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </Link>
                    <div>
                      <Link to={`/shop/preview/${data?.shop._id}`}>
                        <h3 className="font-semibold text-text-primary hover:text-brand-orange transition-colors">
                          {data.shop.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-1">
                        <AiFillStar className="text-yellow-400" size={14} />
                        <span className="text-sm text-text-secondary">{averageRating} Seller Rating</span>
                      </div>
                    </div>
                    <button
                      onClick={handleMessageSubmit}
                      className="ml-auto flex items-center gap-2 text-brand-orange hover:text-orange-hover transition-colors"
                    >
                      <AiOutlineMessage size={20} />
                      <span className="text-sm">Contact Seller</span>
                    </button>
                  </div>
                </div>

                {/* Shipping Info */}
                <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border-gray">
                  <div className="text-center">
                    <AiOutlineCar size={24} className="mx-auto text-brand-orange mb-2" />
                    <p className="text-xs text-text-primary font-medium">Free Shipping</p>
                    <p className="text-xs text-text-secondary">On orders $100+</p>
                  </div>
                  <div className="text-center">
                    <AiOutlineReload size={24} className="mx-auto text-brand-orange mb-2" />
                    <p className="text-xs text-text-primary font-medium">30 Days Return</p>
                    <p className="text-xs text-text-secondary">Easy returns</p>
                  </div>
                  <div className="text-center">
                    <AiOutlineSafetyCertificate size={24} className="mx-auto text-brand-orange mb-2" />
                    <p className="text-xs text-text-primary font-medium">Secure Checkout</p>
                    <p className="text-xs text-text-secondary">100% protected</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details Tabs */}
            <ProductDetailsInfo
              data={data}
              products={products}
              totalReviewsLength={totalReviewsLength}
              averageRating={averageRating}
              onAskSeller={handleMessageSubmit}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

const ProductDetailsInfo = ({
  data,
  products,
  totalReviewsLength,
  averageRating,
  onAskSeller,
}) => {
  const [active, setActive] = useState(1);
  const reviews = data?.reviews || [];

  return (
    <div className="bg-gray-50 rounded-xl m-6 p-6">
      {/* Tab Headers */}
      <div className="flex flex-wrap gap-6 border-b border-border-gray pb-3">
        {["Product Details", "Customer Reviews", "Product Q&A", "Seller Information"].map((tab, index) => (
          <button
            key={index}
            className={`relative pb-2 text-base font-medium transition-colors ${
              active === index + 1
                ? "text-brand-orange"
                : "text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => setActive(index + 1)}
          >
            {tab}
            {active === index + 1 && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-orange rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - Product Details */}
      {active === 1 && (
        <div className="py-6">
          <h3 className="font-semibold text-text-primary mb-3">Product Description</h3>
          <p className="text-text-secondary leading-relaxed whitespace-pre-line">
            {data.description}
          </p>
          {data.specifications && data.specifications.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-text-primary mb-3">
                Specifications
              </h3>
              <div className="overflow-hidden border border-border-gray rounded-lg">
                {data.specifications.map((specification, index) => (
                  <div
                    key={`${specification.name}-${index}`}
                    className="grid grid-cols-1 sm:grid-cols-3 border-b border-border-gray last:border-b-0"
                  >
                    <div className="bg-gray-100 px-4 py-2 font-medium text-text-primary">
                      {specification.name}
                    </div>
                    <div className="sm:col-span-2 px-4 py-2 text-text-secondary">
                      {specification.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content - Reviews */}
      {active === 2 && (
        <div className="py-6">
          <h3 className="font-semibold text-text-primary mb-4">Customer Reviews</h3>
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <ReviewSnapshot reviews={reviews} rating={data?.ratings} />
              <div className="lg:col-span-2 space-y-4 max-h-[430px] overflow-y-auto pr-2">
                {reviews.map((item, index) => (
                  <div key={index} className="flex gap-3 p-4 bg-white rounded-lg">
                    <img
                      src={`${backend_url}/${item.user.avatar}`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-text-primary">{item.user.name}</span>
                        {item.verifiedPurchase && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Verified purchase
                          </span>
                        )}
                        <Ratings rating={item.rating} />
                      </div>
                      <p className="text-text-secondary text-sm">{item.comment}</p>
                      {item.createdAt && (
                        <p className="text-xs text-text-secondary mt-2">
                          {item.createdAt.substring(0, 10)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AiOutlineMessage size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-text-secondary">No reviews yet for this product</p>
              <p className="text-sm text-text-secondary">Be the first to review!</p>
            </div>
          )}
        </div>
      )}

      {active === 3 && (
        <ProductQuestions data={data} onAskSeller={onAskSeller} />
      )}

      {/* Tab Content - Seller Info */}
      {active === 4 && (
        <div className="py-6">
          <div className="flex items-center gap-4 mb-6">
            <img
              src={`${backend_url}${data?.shop?.avatar}`}
              className="w-16 h-16 rounded-full object-cover"
              alt=""
            />
            <div>
              <h3 className="font-semibold text-text-primary text-lg">{data.shop.name}</h3>
              <div className="flex items-center gap-1">
                <AiFillStar className="text-yellow-400" size={16} />
                <span className="text-text-secondary">{averageRating} out of 5</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <AiOutlineCheckCircle className="text-success" />
              <span className="text-text-secondary">Joined: {data.shop?.createdAt?.slice(0, 10)}</span>
            </div>
            <div className="flex items-center gap-2">
              <AiOutlineCheckCircle className="text-success" />
              <span className="text-text-secondary">Total Products: {products?.length || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <AiOutlineCheckCircle className="text-success" />
              <span className="text-text-secondary">Total Reviews: {totalReviewsLength}</span>
            </div>
          </div>
          
          <p className="text-text-secondary leading-relaxed">{data.shop.description}</p>
          
          <Link to={`/shop/preview/${data.shop._id}`}>
            <button className="mt-6 bg-brand-orange hover:bg-orange-hover text-white px-6 py-2 rounded-lg transition-all duration-300">
              Visit Shop
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

const ReviewSnapshot = ({ reviews, rating }) => {
  const totalReviews = reviews.length;
  const verifiedCount = reviews.filter((review) => review.verifiedPurchase).length;
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((review) => Math.round(review.rating) === star).length;
    return {
      star,
      count,
      percentage: totalReviews ? Math.round((count / totalReviews) * 100) : 0,
    };
  });

  return (
    <div className="bg-white rounded-lg p-4 h-fit">
      <div className="text-center border-b border-border-gray pb-4 mb-4">
        <p className="text-3xl font-bold text-text-primary">
          {Number(rating || 0).toFixed(1)}
        </p>
        <div className="flex justify-center mt-1">
          <Ratings rating={rating} />
        </div>
        <p className="text-sm text-text-secondary mt-1">
          {totalReviews} review{totalReviews === 1 ? "" : "s"}
        </p>
      </div>

      <div className="space-y-2">
        {distribution.map((item) => (
          <div key={item.star} className="grid grid-cols-[44px_1fr_36px] items-center gap-2 text-xs text-text-secondary">
            <span>{item.star} star</span>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-orange"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <span className="text-right">{item.count}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
        {verifiedCount} verified purchase review
        {verifiedCount === 1 ? "" : "s"}
      </div>
    </div>
  );
};

const ProductQuestions = ({ data, onAskSeller }) => {
  const questions = [
    {
      question: "Is this product currently available?",
      answer:
        data.stock > 0
          ? `Yes. ${data.stock} unit${data.stock === 1 ? "" : "s"} available right now.`
          : "This product is currently out of stock.",
    },
    {
      question: "Who sells this product?",
      answer: data.shop?.name
        ? `This product is sold by ${data.shop.name}.`
        : "This product is sold by a Cartify seller.",
    },
    {
      question: "Can I request more information?",
      answer: "Yes. You can contact the seller directly from this product page.",
    },
  ];

  return (
    <div className="py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-text-primary">Product Q&A</h3>
          <p className="text-sm text-text-secondary">
            Common product questions based on current listing information.
          </p>
        </div>
        <button
          type="button"
          onClick={onAskSeller}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-hover"
        >
          <AiOutlineQuestionCircle size={18} />
          Ask seller
        </button>
      </div>

      <div className="space-y-3">
        {questions.map((item) => (
          <div key={item.question} className="rounded-lg bg-white p-4">
            <h4 className="font-medium text-text-primary">{item.question}</h4>
            <p className="mt-1 text-sm text-text-secondary">{item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductDetails;
