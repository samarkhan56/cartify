import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AiOutlineMail, AiOutlineLock, AiOutlineEye, AiOutlineEyeInvisible, AiOutlineShop } from 'react-icons/ai';
import { toast } from 'react-toastify';
import axios from 'axios';
import { server } from '../server';

const ShopLoginPage = () => {
    const navigate = useNavigate();
    const { isSeller } = useSelector((state) => state.seller);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        if (isSeller) {
            navigate("/dashboard");
        }
    }, [isSeller, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const { data } = await axios.post(`${server}/shop/login-shop`, {
                email,
                password,
            }, { withCredentials: true });
            
            toast.success("Login successful!");
            navigate("/dashboard");
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Login failed. Please try again.";
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="w-14 h-14 bg-[#F97316] rounded-full flex items-center justify-center">
                            <AiOutlineShop size={32} className="text-white" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-[#111827]">
                        Seller Login
                    </h2>
                    <p className="mt-2 text-sm text-[#6B7280]">
                        Sign in to your seller dashboard
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                                    placeholder="seller@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F97316]"
                                >
                                    {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-[#F97316] focus:ring-[#F97316] border-[#E5E7EB] rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-[#6B7280]">
                                    Remember me
                                </label>
                            </div>
                            <div className="text-sm">
                                <Link to="/seller-forgot-password" className="text-[#F97316] hover:text-[#EA580C]">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#F97316] hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F97316] transition-all duration-300 disabled:opacity-50"
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                        </button>

                        <div className="text-center">
                            <p className="text-[#6B7280]">
                                Don't have a seller account?{' '}
                                <Link to="/shop-create" className="text-[#F97316] hover:text-[#EA580C] font-medium">
                                    Register as Seller
                                </Link>
                            </p>
                        </div>
                    </form>

                    {/* Help Text */}
                    <div className="mt-6 text-center text-xs text-[#6B7280]">
                        <p>Need help? <Link to="/contact" className="text-[#F97316] hover:underline">Contact Support</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShopLoginPage;