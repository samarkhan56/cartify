import React from 'react'
import { useNavigate } from "react-router-dom";
import { categoriesData } from "../../../static/data";
import {
    FaTruck,
    FaGift,
    FaWallet,
    FaShieldAlt,
    FaLaptop,
    FaMobileAlt,
    FaTshirt,
    FaShoePrints,
    FaHeadphones,
    FaGift as FaGiftIcon,
    FaPaw,
    FaGem,
    FaRing,
    FaClock,
    FaPlug,
    FaHome,
    FaCamera,
    FaUtensils,
    FaBabyCarriage,
    FaBook,
    FaFutbol,
    FaCar,
    FaGamepad
} from "react-icons/fa";
import { GiLipstick, GiSunglasses } from "react-icons/gi";
import { MdToys } from "react-icons/md";
import { RiPlantFill } from "react-icons/ri";

const Categories = () => {
    const navigate = useNavigate();

    // ========== UNIQUE ICONS FOR EACH CATEGORY ==========
    const getCategoryIcon = (title) => {
        // Convert to lowercase for case-insensitive matching
        const lowerTitle = title.toLowerCase();

        const iconMap = {
            "accessories": <GiSunglasses className="text-xl" />,
            "cloths": <FaTshirt className="text-xl" />,
            "clothing": <FaTshirt className="text-xl" />,
            "shoes": <FaShoePrints className="text-xl" />,
            "footwear": <FaShoePrints className="text-xl" />,
            "mobile and tablets": <FaMobileAlt className="text-xl" />,
            "mobile & tablets": <FaMobileAlt className="text-xl" />,
            "music and gaming": <FaHeadphones className="text-xl" />,
            "gaming": <FaGamepad className="text-xl" />,
            "others": <FaGem className="text-xl" />,
            "computers and laptops": <FaLaptop className="text-xl" />,
            "laptops": <FaLaptop className="text-xl" />,
            "gifts": <FaGiftIcon className="text-xl" />,
            "pet care": <FaPaw className="text-xl" />,
            "pets": <FaPaw className="text-xl" />,
            "cosmetics and body care": <GiLipstick className="text-xl" />,
            "beauty": <GiLipstick className="text-xl" />,
            "beauty & cosmetics": <GiLipstick className="text-xl" />,
            "jewelry": <FaRing className="text-xl" />,
            "watches": <FaClock className="text-xl" />,
            "electronics": <FaPlug className="text-xl" />,
            "home & living": <FaHome className="text-xl" />,
            "furniture": <FaHome className="text-xl" />,
            "cameras": <FaCamera className="text-xl" />,
            "kitchen": <FaUtensils className="text-xl" />,
            "baby products": <FaBabyCarriage className="text-xl" />,
            "books": <FaBook className="text-xl" />,
            "sports": <FaFutbol className="text-xl" />,
            "automotive": <FaCar className="text-xl" />,
            "plants": <RiPlantFill className="text-xl" />,
            "toys": <MdToys className="text-xl" />,
        };

        return iconMap[lowerTitle] || <FaGem className="text-xl" />;
    };

    // ========== CATEGORY-SPECIFIC IMAGES ==========
    const getCategoryImage = (title) => {
        const imageMap = {
            // Computers & Electronics
            "Computers and Laptops": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop",
            "Laptops": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop",
            "Electronics": "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=300&h=200&fit=crop",

            // Mobile & Tablets
            "Mobile and Tablets": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop",
            "mobile and tablets": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop",
            "Mobile & Tablets": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop",

            // Accessories
            "Accessories": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop",
            "accessories": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop",

            // Clothing
            "Cloths": "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&h=200&fit=crop",
            "cloths": "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&h=200&fit=crop",
            "Clothing": "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&h=200&fit=crop",

            // Shoes
            "Shoes": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop",
            "shoes": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop",
            "Footwear": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop",

            // Music & Gaming
            "Music and Gaming": "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=300&h=200&fit=crop",
            "music and gaming": "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=300&h=200&fit=crop",
            "Gaming": "https://images.unsplash.com/photo-1592155931584-901ac15763e3?w=300&h=200&fit=crop",

            // Gifts
            "Gifts": "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=300&h=200&fit=crop",
            "gifts": "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=300&h=200&fit=crop",

            // Pet Care
            "Pet Care": "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=300&h=200&fit=crop",
            "pet care": "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=300&h=200&fit=crop",

            // Cosmetics & Beauty - FIXED: Added lowercase version
            "Cosmetics and body care": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=200&fit=crop",
            "cosmetics and body care": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=200&fit=crop",
            "Beauty": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=200&fit=crop",

            // Jewelry
            "Jewelry": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=200&fit=crop",

            // Watches
            "Watches": "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=300&h=200&fit=crop",

            // Home & Living
            "Home & Living": "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=300&h=200&fit=crop",
            "Furniture": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=200&fit=crop",

            // Kitchen
            "Kitchen": "https://images.unsplash.com/photo-1556909114-44e7ef4dd31b?w=300&h=200&fit=crop",

            // Sports
            "Sports": "https://images.unsplash.com/photo-1461896836934-ffe807baa261?w=300&h=200&fit=crop",

            // Books
            "Books": "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&h=200&fit=crop",

            // Toys
            "Toys": "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=300&h=200&fit=crop",

            // Baby Products
            "Baby Products": "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300&h=200&fit=crop",

            // Automotive
            "Automotive": "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=300&h=200&fit=crop",

            // Plants
            "Plants": "https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=300&h=200&fit=crop",

            // Cameras
            "Cameras": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&h=200&fit=crop",
        };

        return imageMap[title] || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300&h=200&fit=crop";
    };

    // Features data
    const features = [
        {
            icon: <FaTruck className="text-2xl" />,
            title: "Lightning Fast Delivery",
            description: "Free shipping on orders over $100",
            gradient: "from-orange-500 to-red-500"
        },
        {
            icon: <FaGift className="text-2xl" />,
            title: "Daily Flash Sales",
            description: "Save up to 70% off",
            gradient: "from-purple-500 to-pink-500"
        },
        {
            icon: <FaWallet className="text-2xl" />,
            title: "Best Price Guarantee",
            description: "Factory direct prices",
            gradient: "from-green-500 to-teal-500"
        },
        {
            icon: <FaShieldAlt className="text-2xl" />,
            title: "Secure Checkout",
            description: "100% protected payments",
            gradient: "from-blue-500 to-cyan-500"
        }
    ];

    return (
        <>
            {/* Modern Features Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group relative bg-gradient-to-br from-card to-gray-50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer border border-border-gray/50"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`}></div>

                            <div className="relative z-10">
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-brand-orange transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-text-secondary">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modern Categories Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-10">
                    <span className="inline-block px-4 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-sm font-semibold mb-3">
                        EXPLORE COLLECTIONS
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
                        Shop by <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-orange-hover">Category</span>
                    </h2>
                    <p className="text-text-secondary max-w-2xl mx-auto">
                        Discover thousands of products across hundreds of categories
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                    {categoriesData &&
                        categoriesData.map((category, index) => {
                            const handleSubmit = () => {
                                setTimeout(() => {
                                    navigate(`/products?category=${category.title}`);
                                }, 300);
                            };

                            return (
                                <div
                                    className="group cursor-pointer animate-fadeInUp"
                                    style={{ animationDelay: `${index * 0.03}s` }}
                                    key={category.id}
                                    onClick={handleSubmit}
                                >
                                    {/* Consistent card size - all cards identical dimensions */}
                                    <div className="h-full bg-gradient-to-br from-card to-gray-50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border-gray/50 overflow-hidden">
                                        {/* Image Container - Fixed height with category-specific image */}
                                        <div className="relative h-36 sm:h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                                            <img
                                                src={getCategoryImage(category.title)}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                alt={category.title}
                                                onError={(e) => {
                                                    e.target.src = "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300&h=200&fit=crop";
                                                }}
                                            />
                                            {/* Dark overlay on hover */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        </div>

                                        {/* Content - Fixed padding */}
                                        <div className="p-3 text-center">
                                            {/* Icon Circle - PRESERVED unique icons */}
                                            <div className="flex justify-center mb-2">
                                                <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-all duration-300">
                                                    {getCategoryIcon(category.title)}
                                                </div>
                                            </div>
                                            {/* Category Title */}
                                            <h3 className="font-semibold text-text-primary group-hover:text-brand-orange transition-colors text-sm md:text-base line-clamp-2 min-h-[40px]">
                                                {category.title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </h3>
                                            {/* Shop Now link - appears on hover */}
                                            <p className="text-xs text-brand-orange mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
                                                Shop Now →
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
        </>
    )
}

export default Categories
