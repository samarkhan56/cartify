import React, { useEffect, useRef, useState } from "react";
import { AiOutlinePlusCircle } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createProduct, recommendProductPrice, resetPriceRecommendation } from "../../redux/actions/product";
import { categoriesData, productTaxonomy, productConditions } from "../../static/data";
import { toast } from "react-toastify";

const laptopConditionMessage = "AI price recommendations for laptops are currently available only for New or Refurbished items.";
const suppressionMessage = (reason) => {
    switch (reason) {
        case "excessive_price_deviation":
            return "The AI estimate differs too much from your entered price, so no recommendation is being applied.";
        case "original_price_out_of_supported_range":
        case "original_price_outside_supported_range":
        case "seller_price_outside_supported_range":
            return "AI pricing is not available for this price range.";
        case "prediction_out_of_supported_range":
        case "prediction_outside_supported_range":
            return "The AI estimate falls outside the supported pricing range.";
        default:
            return "AI could not safely provide a recommendation for this product.";
    }
};

const CreateProduct = () => {
    const { seller } = useSelector((state) => state.seller);
    const { success, error, priceRecommendationLoading, priceRecommendation,
        priceRecommendationError, priceRecommendationInputKey } = useSelector((state) => state.products);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [images, setImages] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [subcategory, setSubcategory] = useState("");
    const [condition, setCondition] = useState("");
    const [tags, setTags] = useState("");
    const [brand, setBrand] = useState("");
    const [sku, setSku] = useState("");
    const [specifications, setSpecifications] = useState("");
    const [variants, setVariants] = useState("");
    const [originalPrice, setOriginalPrice] = useState("");
    const [discountPrice, setDiscountPrice] = useState("");
    const aiAppliedDiscount = useRef(null);
    const [stock, setStock] = useState("");
    const [gender, setGender] = useState("");
    const [runningType, setRunningType] = useState("");
    const taxonomyOptions = Object.prototype.hasOwnProperty.call(productTaxonomy, category)
        ? productTaxonomy[category] : [];
    const selectedType = taxonomyOptions.find((entry) => entry.subcategory === subcategory);
    const productType = selectedType?.productType || "";
    const isRunningShoes = productType === "running_shoes";
    const requiresOriginalPrice = productType === "cookware" || isRunningShoes;
    const requiresCondition = productType === "smartphone" || productType === "laptop";
    const unsupportedLaptopCondition = productType === "laptop" && condition === "used";
    const inputKey = JSON.stringify([name, brand, category, subcategory, productType, condition, specifications, description,
        requiresOriginalPrice ? originalPrice : null, isRunningShoes ? gender : null, isRunningShoes ? runningType : null]);
    const currentRecommendation = priceRecommendationInputKey === inputKey ? priceRecommendation : null;
    const currentRecommendationError = priceRecommendationInputKey === inputKey ? priceRecommendationError : null;
    const canApplyRecommendation = currentRecommendation?.recommendationAllowed !== false &&
        typeof currentRecommendation?.price === "number" && Number.isFinite(currentRecommendation.price) &&
        currentRecommendation.price >= 0;

    // Invalidating the request ID also discards late responses for edited inputs.
    useEffect(() => {
        const applied = aiAppliedDiscount.current;
        if (applied && applied.inputKey !== inputKey) {
            aiAppliedDiscount.current = null;
            setDiscountPrice((price) => price === applied.value ? "" : price);
        }
        dispatch(resetPriceRecommendation());
        return () => { dispatch(resetPriceRecommendation()); };
    }, [dispatch, inputKey]);

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
        if (success) {
            toast.success("Product submitted for admin approval!");
            setIsSubmitting(false);
            // Navigate to dashboard products page
            navigate("/dashboard-products");
        }
    }, [dispatch, error, success, navigate]);

    const handleImageChange = (e) => {
        e.preventDefault();
        let files = Array.from(e.target.files);
        setImages((prevImages) => [...prevImages, ...files]);
    };

    const handleRecommendPrice = () => {
        if (selectedType?.aiPriceSupported !== true || priceRecommendationLoading || unsupportedLaptopCondition) return;
        if (!name.trim() || !brand.trim() || (requiresCondition && !condition)) {
            toast.error(requiresCondition
                ? "Enter a product name, brand, and condition to request an AI price recommendation."
                : "Enter a product name and brand to request an AI price recommendation.");
            return;
        }
        if (requiresOriginalPrice && (!Number.isFinite(Number(originalPrice)) || Number(originalPrice) <= 0 ||
            Number(originalPrice) > Number.MAX_SAFE_INTEGER / 100)) {
            toast.error("Enter a valid original price greater than zero to request an AI price recommendation.");
            return;
        }
        if (isRunningShoes && (!gender || !runningType)) {
            toast.error("Select gender and running type to request an AI price recommendation.");
            return;
        }
        dispatch(recommendProductPrice({
            name, brand, category, subcategory, productType, description, specifications,
            ...(requiresCondition ? { condition } : {}),
            ...(requiresOriginalPrice ? { originalPrice: Number(originalPrice) } : {}),
            ...(isRunningShoes ? { gender, running_type: runningType } : {}),
        }, inputKey));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (seller?.accountStatus === "suspended") {
            toast.error("Your seller account is suspended. Contact admin support.");
            return;
        }

        if (seller?.verificationStatus && seller.verificationStatus !== "approved") {
            toast.error("Your shop must be approved before publishing products.");
            return;
        }
        
        // Validate required fields
        if (!name || !description || !category || !originalPrice || !stock || images.length === 0) {
            toast.error("Please fill in all required fields!");
            return;
        }
        
        setIsSubmitting(true);

        const newForm = new FormData();

        images.forEach((image) => {
            newForm.append("images", image);
        });
        newForm.append("name", name);
        newForm.append("description", description);
        newForm.append("category", category);
        if (subcategory && productType) {
            newForm.append("subcategory", subcategory);
            newForm.append("productType", productType);
        }
        if (condition) newForm.append("condition", condition);
        newForm.append("tags", tags);
        newForm.append("brand", brand);
        newForm.append("sku", sku);
        newForm.append("specifications", specifications);
        newForm.append("variants", variants);
        newForm.append("originalPrice", originalPrice);
        // Only send discountPrice if it has a value
        if (discountPrice) {
            newForm.append("discountPrice", discountPrice);
        } else {
            newForm.append("discountPrice", originalPrice); // Use original price as discount price
        }
        newForm.append("stock", stock);
        newForm.append("shopId", seller._id);
        
        try {
            await dispatch(createProduct(newForm));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-[90%] 800px:w-[50%] bg-white rounded-xl shadow-md p-6 overflow-y-auto max-h-[85vh]">
            <h2 className="text-2xl font-bold text-[#111827] text-center mb-6">Create Product</h2>
            {seller?.verificationStatus && seller.verificationStatus !== "approved" && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Your shop status is {seller.verificationStatus}. Product publishing is available after admin approval.
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Product Name */}
                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={name}
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your product name..."
                        required
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        cols="30"
                        required
                        rows="6"
                        name="description"
                        value={description}
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors resize-none"
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter your product description..."
                    ></textarea>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <select
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setSubcategory("");
                        }}
                        required
                    >
                        <option value="">Select a category</option>
                        {categoriesData &&
                            categoriesData.map((i) => (
                                <option value={i.title} key={i.title}>
                                    {i.title}
                                </option>
                            ))}
                    </select>
                </div>

                {taxonomyOptions.length > 0 && (
                    <div>
                        <label htmlFor="product-subcategory" className="block text-sm font-medium text-[#111827] mb-1">Subcategory</label>
                        <select id="product-subcategory" value={subcategory}
                            onChange={(e) => setSubcategory(e.target.value)}
                            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none">
                            <option value="">Select a subcategory (optional)</option>
                            {taxonomyOptions.map((entry) => (
                                <option key={entry.subcategory} value={entry.subcategory}>{entry.subcategory}</option>
                            ))}
                        </select>
                        {selectedType && <p className="mt-2 text-sm text-[#6B7280]">Product Type: {selectedType.label}</p>}
                    </div>
                )}

                <div>
                    <label htmlFor="product-condition" className="block text-sm font-medium text-[#111827] mb-1">Condition</label>
                    <select id="product-condition" value={condition} onChange={(e) => setCondition(e.target.value)}
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none">
                        <option value="">{requiresCondition ? "Select a condition (required for AI pricing)" : "Select a condition (optional)"}</option>
                        {productConditions.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
                    </select>
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Tags
                    </label>
                    <input
                        type="text"
                        name="tags"
                        value={tags}
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Enter your product tags (comma separated)..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1">
                            Brand
                        </label>
                        <input
                            type="text"
                            value={brand}
                            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="e.g. Nike, Apple, Samsung"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1">
                            SKU
                        </label>
                        <input
                            type="text"
                            value={sku}
                            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                            onChange={(e) => setSku(e.target.value)}
                            placeholder="Internal product code"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Specifications
                    </label>
                    <textarea
                        rows="3"
                        value={specifications}
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors resize-none"
                        onChange={(e) => setSpecifications(e.target.value)}
                        placeholder="One per line, e.g. Material: Cotton"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Variants
                    </label>
                    <textarea
                        rows="3"
                        value={variants}
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors resize-none"
                        onChange={(e) => setVariants(e.target.value)}
                        placeholder="One per line, e.g. Size: S, M, L"
                    />
                </div>

                {selectedType?.aiPriceSupported === true && (
                    <div className="rounded-lg border border-[#E5E7EB] bg-gray-50 p-4" aria-live="polite">
                        <>
                            {isRunningShoes && (
                                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="ai-running-gender" className="block text-sm font-medium text-[#111827] mb-1">Gender</label>
                                        <select id="ai-running-gender" value={gender} onChange={(e) => setGender(e.target.value)}
                                            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg">
                                            <option value="">Select gender for AI pricing</option>
                                            {["Men", "Women"].map((value) => <option key={value} value={value}>{value}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="ai-running-type" className="block text-sm font-medium text-[#111827] mb-1">Running Type</label>
                                        <select id="ai-running-type" value={runningType} onChange={(e) => setRunningType(e.target.value)}
                                            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg">
                                            <option value="">Select running type for AI pricing</option>
                                            {["Running", "Road Running", "Trail Running"].map((value) => <option key={value} value={value}>{value}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            {requiresOriginalPrice && <p className="mb-3 text-sm text-[#6B7280]">Enter the Original Price below to check AI pricing. It is used as a reference for the recommendation.</p>}
                            {unsupportedLaptopCondition && <p className="mb-3 text-sm text-[#6B7280]">{laptopConditionMessage}</p>}
                            <button type="button" onClick={handleRecommendPrice} disabled={priceRecommendationLoading || unsupportedLaptopCondition}
                                className="px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded-lg disabled:opacity-50">
                                {priceRecommendationLoading ? "Getting AI recommendation..." : "Get AI Price Recommendation"}
                            </button>
                            {currentRecommendationError && <p role="alert" className="mt-3 text-sm text-red-600">{currentRecommendationError}</p>}
                            {currentRecommendation?.recommendationAllowed === false && (
                                <p role="status" className="mt-3 text-sm text-[#6B7280]">{suppressionMessage(currentRecommendation.reason)} You can still enter your price manually and create the product.</p>
                            )}
                            {canApplyRecommendation && (
                                <div className="mt-3">
                                    <p className="font-medium text-[#111827]">AI Recommended Price</p>
                                    <p className="text-xl font-semibold text-[#111827]">${currentRecommendation.price.toFixed(2)} {currentRecommendation.currency}</p>
                                    <p className="mt-1 text-sm text-[#6B7280]">Based on the product information provided.</p>
                                    <button type="button" onClick={() => {
                                        const value = currentRecommendation.price.toFixed(2);
                                        aiAppliedDiscount.current = { value, inputKey };
                                        setDiscountPrice(value);
                                    }}
                                        className="mt-3 px-4 py-2 border border-[#F97316] text-[#F97316] rounded-lg hover:bg-orange-50">
                                        Use Recommended Price
                                    </button>
                                </div>
                            )}
                        </>
                    </div>
                )}

                {/* Original Price - REQUIRED */}
                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Original Price <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="originalPrice"
                        step="0.01"
                        value={originalPrice}
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        placeholder="Enter original price"
                        required
                    />
                </div>

                {/* Discount Price - OPTIONAL (no asterisk) */}
                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Price (With Discount) <span className="text-gray-400 text-xs">(Optional)</span>
                    </label>
                    <input
                        type="number"
                        name="discountPrice"
                        step="0.01"
                        value={discountPrice}
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                        onChange={(e) => {
                            aiAppliedDiscount.current = null;
                            setDiscountPrice(e.target.value);
                        }}
                        placeholder="Enter price after discount (optional)"
                    />
                </div>

                {/* Product Stock */}
                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Product Stock <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="stock"
                        value={stock}
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="Enter product quantity in stock"
                        required
                    />
                </div>

                {/* Upload Images */}
                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Upload Images <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="file"
                        name="images"
                        id="upload"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                    <div className="w-full flex items-center flex-wrap gap-2">
                        <label htmlFor="upload" className="cursor-pointer">
                            <AiOutlinePlusCircle size={32} className="text-[#F97316] hover:text-[#EA580C] transition-colors" />
                        </label>
                        {images &&
                            images.map((img, index) => (
                                <img
                                    src={URL.createObjectURL(img)}
                                    key={index}
                                    alt="product preview"
                                    className="h-20 w-20 object-cover rounded-lg border border-[#E5E7EB]"
                                />
                            ))}
                    </div>
                    <p className="text-xs text-[#6B7280] mt-2">You can upload multiple images (recommended: 1-5 images)</p>
                </div>

                {/* Submit Button */}
                <div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full cursor-pointer py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 disabled:opacity-50"
                    >
                        {isSubmitting ? "Creating Product..." : "Create Product"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProduct;
