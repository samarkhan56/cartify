import React, { useState } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineUser, AiOutlineMail, AiOutlineLock } from "react-icons/ai";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";

const Signup = () => {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [visible, setVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!name || !email || !password) {
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
            const response = await axios.post(`${server}/user/create-user`, {
                name,
                email,
                password,
            });

            // Check if user was created successfully
            if (response.status === 201 || response.status === 200) {
                toast.success("Account created successfully! Please login.");
                // Clear form
                setName("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                // Redirect to login page
                navigate("/login");
            } else {
                toast.error("Registration failed. Please try again.");
            }
        } catch (error) {
            console.error("Signup error:", error);
            const errorMsg = error.response?.data?.message || "Registration failed. Please try again.";
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className='min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
            <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="w-12 h-12 bg-[#F97316] rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xl">C</span>
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-[#111827]">
                        Create your account
                    </h2>
                    <p className="mt-2 text-sm text-[#6B7280]">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-[#F97316] hover:text-[#EA580C]">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-md'>
                <div className='bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10'>
                    <form className='space-y-6' onSubmit={handleSubmit}>
                        {/* Full Name */}
                        <div>
                            <label className='block text-sm font-medium text-[#111827]'>
                                Full Name
                            </label>
                            <div className='mt-1 relative'>
                                <AiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className='appearance-none block w-full pl-10 pr-3 py-2 border border-[#E5E7EB] rounded-lg shadow-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-[#F97316] focus:border-[#F97316] sm:text-sm'
                                />
                            </div>
                        </div>

                        {/* Email Address */}
                        <div>
                            <label className='block text-sm font-medium text-[#111827]'>
                                Email Address
                            </label>
                            <div className='mt-1 relative'>
                                <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className='appearance-none block w-full pl-10 pr-3 py-2 border border-[#E5E7EB] rounded-lg shadow-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-[#F97316] focus:border-[#F97316] sm:text-sm'
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className='block text-sm font-medium text-[#111827]'>
                                Password
                            </label>
                            <div className='mt-1 relative'>
                                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type={visible ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password"
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

                        {/* Confirm Password */}
                        <div>
                            <label className='block text-sm font-medium text-[#111827]'>
                                Confirm Password
                            </label>
                            <div className='mt-1 relative'>
                                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                                <input
                                    type={confirmVisible ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    className='appearance-none block w-full pl-10 pr-10 py-2 border border-[#E5E7EB] rounded-lg shadow-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-[#F97316] focus:border-[#F97316] sm:text-sm'
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
                        <div>
                            <button
                                type='submit'
                                disabled={isLoading}
                                className='w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#F97316] hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F97316] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                {isLoading ? "Creating account..." : "Sign Up"}
                            </button>
                        </div>

                        {/* Login Link */}
                        <div className='flex items-center justify-center'>
                            <h4 className="text-[#6B7280]">Already have an account?</h4>
                            <Link to="/login" className="text-[#F97316] hover:text-[#EA580C] font-medium pl-2">
                                Sign In
                            </Link>
                        </div>
                    </form>

                    {/* Terms */}
                    <p className="mt-6 text-center text-xs text-[#6B7280]">
                        By signing up, you agree to our{' '}
                        <Link to="/terms" className="text-[#F97316] hover:underline">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-[#F97316] hover:underline">
                            Privacy Policy
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Signup