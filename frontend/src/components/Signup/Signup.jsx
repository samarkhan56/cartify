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
        
        // Validation
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
            const { data } = await axios.post(`${server}/user/create-user`, {
                name,
                email,
                password,
            });

            if (data.message) {
                toast.success(data.message);
                setName("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                navigate("/login");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className='min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
            <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xl">C</span>
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-text-primary">
                        Create your account
                    </h2>
                    <p className="mt-2 text-sm text-text-secondary">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-brand-orange hover:text-orange-hover">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-md'>
                <div className='bg-card py-8 px-4 shadow-lg rounded-lg sm:px-10'>
                    <form className='space-y-6' onSubmit={handleSubmit}>
                        {/* Full Name */}
                        <div>
                            <label htmlFor="name" className='block text-sm font-medium text-text-primary'>
                                Full Name
                            </label>
                            <div className='mt-1 relative'>
                                <AiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                <input
                                    type="text"
                                    name="name"
                                    autoComplete="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className='appearance-none block w-full pl-10 pr-3 py-2 border border-border-gray rounded-lg shadow-sm placeholder-text-secondary focus:outline-none focus:ring-brand-orange focus:border-brand-orange sm:text-sm'
                                />
                            </div>
                        </div>

                        {/* Email Address */}
                        <div>
                            <label htmlFor="email" className='block text-sm font-medium text-text-primary'>
                                Email Address
                            </label>
                            <div className='mt-1 relative'>
                                <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className='appearance-none block w-full pl-10 pr-3 py-2 border border-border-gray rounded-lg shadow-sm placeholder-text-secondary focus:outline-none focus:ring-brand-orange focus:border-brand-orange sm:text-sm'
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className='block text-sm font-medium text-text-primary'>
                                Password
                            </label>
                            <div className='mt-1 relative'>
                                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                <input
                                    type={visible ? "text" : "password"}
                                    name="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password"
                                    className='appearance-none block w-full pl-10 pr-10 py-2 border border-border-gray rounded-lg shadow-sm placeholder-text-secondary focus:outline-none focus:ring-brand-orange focus:border-brand-orange sm:text-sm'
                                />
                                <button
                                    type="button"
                                    onClick={() => setVisible(!visible)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-brand-orange"
                                >
                                    {visible ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-text-secondary">Password must be at least 6 characters</p>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className='block text-sm font-medium text-text-primary'>
                                Confirm Password
                            </label>
                            <div className='mt-1 relative'>
                                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                <input
                                    type={confirmVisible ? "text" : "password"}
                                    name="confirmPassword"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    className='appearance-none block w-full pl-10 pr-10 py-2 border border-border-gray rounded-lg shadow-sm placeholder-text-secondary focus:outline-none focus:ring-brand-orange focus:border-brand-orange sm:text-sm'
                                />
                                <button
                                    type="button"
                                    onClick={() => setConfirmVisible(!confirmVisible)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-brand-orange"
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
                                className='w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-orange-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                {isLoading ? "Creating account..." : "Sign Up"}
                            </button>
                        </div>

                        {/* Login Link */}
                        <div className='flex items-center justify-center'>
                            <h4 className="text-text-secondary">Already have an account?</h4>
                            <Link to="/login" className="text-brand-orange hover:text-orange-hover font-medium pl-2">
                                Sign In
                            </Link>
                        </div>
                    </form>

                    {/* Terms */}
                    <p className="mt-6 text-center text-xs text-text-secondary">
                        By signing up, you agree to our{' '}
                        <Link to="/terms" className="text-brand-orange hover:underline">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-brand-orange hover:underline">
                            Privacy Policy
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Signup