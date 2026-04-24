import React from 'react'
import Header from '../components/Layout/Header'
import Footer from '../components/Layout/Footer'
import { AiOutlineReload, AiOutlineClockCircle, AiOutlineCheckCircle } from 'react-icons/ai'

const ReturnsPage = () => {
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Header />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-xl shadow-md p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <AiOutlineReload size={32} className="text-[#F97316]" />
                        <h1 className="text-3xl font-bold text-[#111827]">Return Policy</h1>
                    </div>
                    <p className="text-[#6B7280] mb-4">Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">30-Day Return Policy</h2>
                            <p className="text-[#6B7280]">We want you to be completely satisfied with your purchase. If you're not happy with your order, you may return eligible items within 30 days of delivery.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3 flex items-center gap-2">
                                <AiOutlineCheckCircle size={20} className="text-[#F97316]" />
                                Eligible Items
                            </h2>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li>Items must be unused and in original condition</li>
                                <li>Original tags and packaging must be intact</li>
                                <li>Electronics must be returned with all accessories</li>
                                <li>Proof of purchase is required</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3 flex items-center gap-2">
                                <AiOutlineClockCircle size={20} className="text-[#F97316]" />
                                Non-Returnable Items
                            </h2>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li>Personalized or custom-made products</li>
                                <li>Perishable goods (food, flowers, etc.)</li>
                                <li>Gift cards</li>
                                <li>Final sale items</li>
                                <li>Underwear and swimwear (for hygiene reasons)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">How to Initiate a Return</h2>
                            <div className="space-y-3 text-[#6B7280]">
                                <p>1. Log into your account and go to "My Orders"</p>
                                <p>2. Select the order containing the item you wish to return</p>
                                <p>3. Click "Request Return" and follow the instructions</p>
                                <p>4. Print the return shipping label (if applicable)</p>
                                <p>5. Package the item securely and ship it back</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">Return Shipping Costs</h2>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li><span className="font-semibold">Defective or incorrect items:</span> Free return shipping</li>
                                <li><span className="font-semibold">Customer change of mind:</span> Customer pays return shipping</li>
                                <li><span className="font-semibold">Store credit returns:</span> Free return shipping</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">Refund Processing</h2>
                            <p className="text-[#6B7280] mb-2">Once we receive and inspect your return:</p>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li>Refunds are processed within 5-7 business days</li>
                                <li>Funds will be credited to your original payment method</li>
                                <li>You will receive an email confirmation when your refund is processed</li>
                                <li>Shipping charges are non-refundable (unless return is due to our error)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">Need Help?</h2>
                            <p className="text-[#6B7280]">If you have questions about returns, please contact our support team:</p>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1 mt-2">
                                <li>Email: <span className="text-[#F97316]">returns@cartify.com</span></li>
                                <li>Phone: +1 (234) 567-8900</li>
                                <li>Live chat available 24/7</li>
                            </ul>
                        </section>

                        <div className="bg-[#FFF7ED] p-4 rounded-lg border border-[#FB923C]">
                            <p className="text-[#F97316] text-sm font-medium">Holiday Returns</p>
                            <p className="text-[#6B7280] text-sm mt-1">Items purchased between November 15 and December 25 may be returned until January 31 of the following year.</p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default ReturnsPage