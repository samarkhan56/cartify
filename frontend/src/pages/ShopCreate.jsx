import React, { useState } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineShop, AiOutlineUser, AiOutlinePhone, AiOutlineMail, AiOutlineEnvironment, AiOutlineLock } from "react-icons/ai";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const ShopCreate = () => {
    const navigate = useNavigate()
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [shopName, setShopName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [zipCode, setZipCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [visible, setVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!shopName || !name || !email || !phoneNumber || !address || !password) {
            toast.error("Please fill in all required fields");
            return;
        }
        
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);

        try {
            const { data } = await axios.post(`http://localhost:8000/api/v2/shop/create-shop`, {
                name: name,
                email: email,
                password: password,
                phoneNumber: phoneNumber,
                address: address,
                zipCode: zipCode,
                shopName: shopName
            });

            toast.success(data.message || "Registration successful! Please check your email to activate your account.");
            navigate("/shop-login");
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-[#F97316] rounded-full flex items-center justify-center">
                            <AiOutlineShop size={32} className="text-white" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-[#111827]">
                        Become a Seller
                    </h2>
                    <p className="mt-2 text-sm text-[#6B7280]">
                        Start selling on Cartify today
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Shop Name */}
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1">
                                Shop Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <AiOutlineShop className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={shopName}
                                    onChange={(e) => setShopName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                    placeholder="Your Shop Name"
                                />
                            </div>
                        </div>

                        {/* Owner Name */}
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1">
                                Owner Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <AiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                    placeholder="Your Full Name"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                    placeholder="shop@example.com"
                                />
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <AiOutlinePhone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type="tel"
                                    required
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1">
                                Shop Address <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <AiOutlineEnvironment className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                    placeholder="Full Shop Address"
                                />
                            </div>
                        </div>

                        {/* Zip Code */}
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1">
                                Zip Code
                            </label>
                            <input
                                type="text"
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                placeholder="Zip Code (Optional)"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type={visible ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                    placeholder="Create a password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setVisible(!visible)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F97316]"
                                >
                                    {visible ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1">
                                Confirm Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type={confirmVisible ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                    placeholder="Confirm your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setConfirmVisible(!confirmVisible)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F97316]"
                                >
                                    {confirmVisible ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#F97316] hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F97316] transition-all duration-300 disabled:opacity-50"
                        >
                            {isLoading ? "Creating Account..." : "Register as Seller"}
                        </button>

                        {/* Login Link */}
                        <div className="text-center">
                            <p className="text-[#6B7280]">
                                Already have a seller account?{' '}
                                <Link to="/shop-login" className="text-[#F97316] hover:text-[#EA580C] font-medium">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </form>

                    {/* Info Box */}
                    <div className="mt-6 p-4 bg-[#FFF7ED] rounded-lg border border-[#FB923C]">
                        <h4 className="text-sm font-semibold text-[#F97316] mb-2">Why sell on Cartify?</h4>
                        <ul className="text-xs text-[#6B7280] space-y-1">
                            <li>✓ Reach millions of customers</li>
                            <li>✓ Easy product management</li>
                            <li>✓ Secure payment processing</li>
                            <li>✓ 24/7 seller support</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ShopCreate