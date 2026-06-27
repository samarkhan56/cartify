import React, { useEffect, useState } from "react";
import { AiOutlinePlusCircle } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createProduct } from "../../redux/actions/product";
import { categoriesData } from "../../static/data";
import { toast } from "react-toastify";

const CreateProduct = () => {
    const { seller } = useSelector((state) => state.seller);
    const { success, error } = useSelector((state) => state.products);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [images, setImages] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState("");
    const [brand, setBrand] = useState("");
    const [sku, setSku] = useState("");
    const [specifications, setSpecifications] = useState("");
    const [variants, setVariants] = useState("");
    const [originalPrice, setOriginalPrice] = useState("");
    const [discountPrice, setDiscountPrice] = useState("");
    const [stock, setStock] = useState("");

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

    const handleSubmit = (e) => {
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
        
        dispatch(createProduct(newForm));
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
                        onChange={(e) => setCategory(e.target.value)}
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

                {/* Original Price - REQUIRED */}
                <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                        Original Price <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="originalPrice"
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
                        value={discountPrice}
                        className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                        onChange={(e) => setDiscountPrice(e.target.value)}
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
