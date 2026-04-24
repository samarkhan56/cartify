import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AiOutlineUser, AiOutlineMail, AiOutlineLock, AiOutlineShop, AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { toast } from 'react-toastify';
import axios from 'axios';
import { server } from '../server';

const LoginPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector((state) => state.user);
    const [loginType, setLoginType] = useState('customer'); // 'customer' or 'seller'
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Customer login state
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPassword, setCustomerPassword] = useState("");
    
    // Seller login state
    const [sellerEmail, setSellerEmail] = useState("");
    const [sellerPassword, setSellerPassword] = useState("");

    // Redirect if already logged in
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
            window.location.reload();
            navigate("/");
        } catch (error) {
            toast.error(error.response?.data?.message || "Login failed. Please try again.");
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
            window.location.reload();
            navigate("/dashboard");
        } catch (error) {
            toast.error(error.response?.data?.message || "Seller login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xl">C</span>
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-text-primary">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-sm text-text-secondary">
                        Sign in to your account
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-card py-8 px-4 shadow-lg rounded-lg sm:px-10">
                    {/* Login Type Toggle */}
                    <div className="flex gap-3 mb-6 p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => setLoginType('customer')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all duration-300 ${
                                loginType === 'customer'
                                    ? 'bg-brand-orange text-white shadow-md'
                                    : 'text-text-secondary hover:bg-gray-200'
                            }`}
                        >
                            <AiOutlineUser size={18} />
                            Customer
                        </button>
                        <button
                            onClick={() => setLoginType('seller')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all duration-300 ${
                                loginType === 'seller'
                                    ? 'bg-brand-orange text-white shadow-md'
                                    : 'text-text-secondary hover:bg-gray-200'
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
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                        placeholder="customer@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={sellerPassword}
                                        onChange={(e) => setSellerPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-brand-orange"
                                    >
                                        {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-brand-orange focus:ring-brand-orange border-border-gray rounded"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary">
                                        Remember me
                                    </label>
                                </div>
                                <div className="text-sm">
                                    <Link to="/forgot-password" className="text-brand-orange hover:text-orange-hover">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-orange-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange transition-all duration-300 disabled:opacity-50"
                            >
                                {isLoading ? "Signing in..." : "Sign in as Customer"}
                            </button>

                            <div className="text-center">
                                <p className="text-text-secondary">
                                    Don't have an account?{' '}
                                    <Link to="/sign-up" className="text-brand-orange hover:text-orange-hover font-medium">
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
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    Shop Email Address
                                </label>
                                <div className="relative">
                                    <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={sellerEmail}
                                        onChange={(e) => setSellerEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                        placeholder="seller@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={sellerPassword}
                                        onChange={(e) => setSellerPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-brand-orange"
                                    >
                                        {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me-seller"
                                        name="remember-me-seller"
                                        type="checkbox"
                                        className="h-4 w-4 text-brand-orange focus:ring-brand-orange border-border-gray rounded"
                                    />
                                    <label htmlFor="remember-me-seller" className="ml-2 block text-sm text-text-secondary">
                                        Remember me
                                    </label>
                                </div>
                                <div className="text-sm">
                                    <Link to="/seller-forgot-password" className="text-brand-orange hover:text-orange-hover">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-orange-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange transition-all duration-300 disabled:opacity-50"
                            >
                                {isLoading ? "Signing in..." : "Sign in as Seller"}
                            </button>

                            <div className="text-center">
                                <p className="text-text-secondary">
                                    Don't have a seller account?{' '}
                                    <Link to="/shop-create" className="text-brand-orange hover:text-orange-hover font-medium">
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

export default LoginPage;