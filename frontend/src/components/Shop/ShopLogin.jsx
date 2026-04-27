import React, { useState } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineMail, AiOutlineLock, AiOutlineShop } from "react-icons/ai";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { loadSeller } from "../../redux/actions/user";

const ShopLogin = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("")
    const [visible, setVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data } = await axios.post(
                `${server}/shop/login-shop`,
                {
                    email,
                    password,
                },
                { withCredentials: true }
            );
            toast.success("Login Successful!");
            dispatch(loadSeller());

            if (data.user) {
                localStorage.setItem("sellerInfo", JSON.stringify(data.user));
            }
            navigate("/dashboard");
        } catch (err) {
            toast.error(err.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
            <div className='sm:mx-auto sm:w-full sm:max-w-md'>
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

            <div className='mt-8 sm:mx-auto sw:w-full sm:max-w-md'>
                <div className='bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10'>
                    <form className='space-y-6' onSubmit={handleSubmit}>
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className='block text-sm font-medium text-[#111827]'>
                                Email Address
                            </label>
                            <div className='mt-1 relative'>
                                <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    placeholder="seller@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className='appearance-none block w-full pl-10 pr-3 py-2 border border-[#E5E7EB] rounded-lg shadow-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-[#F97316] focus:border-[#F97316] sm:text-sm'
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className='block text-sm font-medium text-[#111827]'>
                                Password
                            </label>
                            <div className='mt-1 relative'>
                                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type={visible ? "text" : "password"}
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className='appearance-none block w-full pl-10 pr-10 py-2 border border-[#E5E7EB] rounded-lg shadow-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-[#F97316] focus:border-[#F97316] sm:text-sm'
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

                        {/* Remember me and Forgot password */}
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center'>
                                <input
                                    type="checkbox"
                                    name="remember-me"
                                    id="remember-me"
                                    className="h-4 w-4 text-[#F97316] focus:ring-[#F97316] border-[#E5E7EB] rounded"
                                />
                                <label
                                    htmlFor="remember-me"
                                    className="ml-2 block text-sm text-[#6B7280]"
                                >
                                    Remember me
                                </label>
                            </div>
                            <div className='text-sm'>
                                <Link
                                    to="/seller-forgot-password"
                                    className="font-medium text-[#F97316] hover:text-[#EA580C]"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div>
                            <button
                                type='submit'
                                disabled={isLoading}
                                className='w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#F97316] hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F97316] transition-all duration-300 disabled:opacity-50'
                            >
                                {isLoading ? "Signing in..." : "Sign In"}
                            </button>
                        </div>

                        {/* Sign Up Link */}
                        <div className='flex items-center justify-center'>
                            <h4 className="text-[#6B7280]">Don't have a seller account?</h4>
                            <Link to="/shop-create" className="text-[#F97316] hover:text-[#EA580C] font-medium pl-2">
                                Register Now
                            </Link>
                        </div>
                    </form>

                    {/* Help Text */}
                    <div className="mt-6 text-center text-xs text-[#6B7280]">
                        <p>Need help? <Link to="/contact" className="text-[#F97316] hover:underline">Contact Support</Link></p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ShopLogin