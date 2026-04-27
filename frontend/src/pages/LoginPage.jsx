import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { AiOutlineUser, AiOutlineMail, AiOutlineLock, AiOutlineShop, AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { toast } from 'react-toastify';
import axios from 'axios';
import { server } from '../server';
import { loadUser } from '../redux/actions/user';

const LoginPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector((state) => state.user);
    const [loginType, setLoginType] = useState('customer');
    const [showPassword, setShowPassword] = useState(false);
    const [showSellerPassword, setShowSellerPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Customer login state
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPassword, setCustomerPassword] = useState("");
    
    // Seller login state
    const [sellerEmail, setSellerEmail] = useState("");
    const [sellerPassword, setSellerPassword] = useState("");

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, navigate]);

    // Customer Login Handler
    const handleCustomerLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const { data } = await axios.post(`${server}/user/login-user`, {
                email: customerEmail,
                password: customerPassword,
            }, { withCredentials: true });
            
            toast.success("Login successful!");
            await dispatch(loadUser());
            navigate("/");
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Login failed. Please try again.";
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    // Seller Login Handler
    const handleSellerLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const { data } = await axios.post(`${server}/shop/login-shop`, {
                email: sellerEmail,
                password: sellerPassword,
            }, { withCredentials: true });
            
            toast.success("Seller login successful!");
            navigate("/dashboard");
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Seller login failed. Please try again.";
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
                        <div className="w-12 h-12 bg-[#F97316] rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xl">C</span>
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-[#111827]">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-sm text-[#6B7280]">
                        Sign in to your account
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
                    {/* Login Type Toggle */}
                    <div className="flex gap-3 mb-6 p-1 bg-gray-100 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setLoginType('customer')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all duration-300 ${
                                loginType === 'customer'
                                    ? 'bg-[#F97316] text-white shadow-md'
                                    : 'text-[#6B7280] hover:bg-gray-200'
                            }`}
                        >
                            <AiOutlineUser size={18} />
                            Customer
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginType('seller')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all duration-300 ${
                                loginType === 'seller'
                                    ? 'bg-[#F97316] text-white shadow-md'
                                    : 'text-[#6B7280] hover:bg-gray-200'
                            }`}
                        >
                            <AiOutlineShop size={18} />
                            Seller
                        </button>
                    </div>

                    {/* Customer Login Form */}
                    {loginType === 'customer' && (
                        <form onSubmit={handleCustomerLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[#111827] mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                                        placeholder="customer@example.com"
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
                                        value={customerPassword}
                                        onChange={(e) => setCustomerPassword(e.target.value)}
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
                                    <Link to="/forgot-password" className="text-[#F97316] hover:text-[#EA580C]">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#F97316] hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F97316] transition-all duration-300 disabled:opacity-50"
                            >
                                {isLoading ? "Signing in..." : "Sign in as Customer"}
                            </button>

                            <div className="text-center">
                                <p className="text-[#6B7280]">
                                    Don't have an account?{' '}
                                    <Link to="/sign-up" className="text-[#F97316] hover:text-[#EA580C] font-medium">
                                        Sign up
                                    </Link>
                                </p>
                            </div>
                        </form>
                    )}

                    {/* Seller Login Form */}
                    {loginType === 'seller' && (
                        <form onSubmit={handleSellerLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[#111827] mb-1">
                                    Shop Email Address
                                </label>
                                <div className="relative">
                                    <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={sellerEmail}
                                        onChange={(e) => setSellerEmail(e.target.value)}
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
                                        type={showSellerPassword ? "text" : "password"}
                                        required
                                        value={sellerPassword}
                                        onChange={(e) => setSellerPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none transition-colors"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowSellerPassword(!showSellerPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F97316]"
                                    >
                                        {showSellerPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me-seller"
                                        type="checkbox"
                                        className="h-4 w-4 text-[#F97316] focus:ring-[#F97316] border-[#E5E7EB] rounded"
                                    />
                                    <label htmlFor="remember-me-seller" className="ml-2 block text-sm text-[#6B7280]">
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
                                {isLoading ? "Signing in..." : "Sign in as Seller"}
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
                    )}
                </div>
            </div>
        </div>
    )
}

export default LoginPage