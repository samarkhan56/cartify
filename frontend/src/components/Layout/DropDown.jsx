import React from "react";
import { useNavigate } from "react-router-dom";
import {
    FaLaptop,
    FaMobileAlt,
    FaTshirt,
    FaShoePrints,
    FaHeadphones,
    FaGift,
    FaPaw,
    FaGem,
    FaClock,
    FaHome,
    FaCamera,
    FaBook,
    FaFutbol,
    FaCar,
    FaBabyCarriage,
    FaRing,
    FaPlug,
    FaTree,
    FaChair,
    FaBriefcase
} from "react-icons/fa";
import { GiLipstick, GiSunglasses } from "react-icons/gi";
import { MdKitchen, MdToys } from "react-icons/md";

const DropDown = ({ categoriesData, setDropDown }) => {
    const navigate = useNavigate();

    // Icon mapping for each category
    const getCategoryIcon = (categoryTitle) => {
        const iconMap = {
            "Computers and Laptops": <FaLaptop className="text-[#F97316]" size={18} />,
            "Laptops": <FaLaptop className="text-[#F97316]" size={18} />,
            "Mobile and Tablets": <FaMobileAlt className="text-[#F97316]" size={18} />,
            "mobile and tablets": <FaMobileAlt className="text-[#F97316]" size={18} />,
            "Cloths": <FaTshirt className="text-[#F97316]" size={18} />,
            "cloths": <FaTshirt className="text-[#F97316]" size={18} />,
            "Clothing": <FaTshirt className="text-[#F97316]" size={18} />,
            "Shoes": <FaShoePrints className="text-[#F97316]" size={18} />,
            "shoes": <FaShoePrints className="text-[#F97316]" size={18} />,
            "Footwear": <FaShoePrints className="text-[#F97316]" size={18} />,
            "Music and Gaming": <FaHeadphones className="text-[#F97316]" size={18} />,
            "music and gaming": <FaHeadphones className="text-[#F97316]" size={18} />,
            "Gaming": <FaHeadphones className="text-[#F97316]" size={18} />,
            "Gifts": <FaGift className="text-[#F97316]" size={18} />,
            "gifts": <FaGift className="text-[#F97316]" size={18} />,
            "Pet Care": <FaPaw className="text-[#F97316]" size={18} />,
            "pet care": <FaPaw className="text-[#F97316]" size={18} />,
            "Pets": <FaPaw className="text-[#F97316]" size={18} />,
            // FIXED: Added lowercase version for cosmetics
            "Cosmetics and body care": <GiLipstick className="text-[#F97316]" size={18} />,
            "cosmetics and body care": <GiLipstick className="text-[#F97316]" size={18} />,
            "Beauty & Cosmetics": <GiLipstick className="text-[#F97316]" size={18} />,
            "Accessories": <GiSunglasses className="text-[#F97316]" size={18} />,
            "accessories": <GiSunglasses className="text-[#F97316]" size={18} />,
            "Jewelry": <FaRing className="text-[#F97316]" size={18} />,
            "Watches": <FaClock className="text-[#F97316]" size={18} />,
            "Electronics": <FaPlug className="text-[#F97316]" size={18} />,
            "Home & Living": <FaHome className="text-[#F97316]" size={18} />,
            "Furniture": <FaChair className="text-[#F97316]" size={18} />,
            "Sports": <FaFutbol className="text-[#F97316]" size={18} />,
            "Books": <FaBook className="text-[#F97316]" size={18} />,
            "Toys": <MdToys className="text-[#F97316]" size={18} />,
            "Baby Products": <FaBabyCarriage className="text-[#F97316]" size={18} />,
            "Automotive": <FaCar className="text-[#F97316]" size={18} />,
            "Cameras": <FaCamera className="text-[#F97316]" size={18} />,
            "Kitchen": <MdKitchen className="text-[#F97316]" size={18} />,
            "Plants": <FaTree className="text-[#F97316]" size={18} />,
            "Bags": <FaBriefcase className="text-[#F97316]" size={18} />,
        };

        return iconMap[categoryTitle] || <FaGem className="text-[#F97316]" size={18} />;
    };
    const submitHandle = (i) => {
        navigate(`/products?category=${i.title}`);
        setDropDown(false);
    };

    return (
        <div className="absolute top-12 left-0 w-64 bg-white rounded-lg shadow-xl z-50 border border-gray-100 overflow-hidden">
            <div className="py-2 max-h-96 overflow-y-auto">
                {categoriesData &&
                    categoriesData.map((i, index) => (
                        <div
                            key={index}
                            className="flex items-center px-4 py-2 hover:bg-[#FFF7ED] cursor-pointer transition-colors group"
                            onClick={() => submitHandle(i)}
                        >
                            <div className="w-6 h-6 flex items-center justify-center">
                                {getCategoryIcon(i.title)}
                            </div>
                            <h3 className="ml-3 text-gray-700 group-hover:text-[#F97316] transition-colors text-sm font-medium">
                                {i.title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </h3>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default DropDown;
