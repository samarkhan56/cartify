import React from 'react'
import Header from '../components/Layout/Header'
import Footer from '../components/Layout/Footer'
import { AiOutlineFileText } from 'react-icons/ai'

const TermsPage = () => {
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Header />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-xl shadow-md p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <AiOutlineFileText size={32} className="text-[#F97316]" />
                        <h1 className="text-3xl font-bold text-[#111827]">Terms of Service</h1>
                    </div>
                    <p className="text-[#6B7280] mb-4">Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">1. Acceptance of Terms</h2>
                            <p className="text-[#6B7280]">By accessing or using Cartify, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our services.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">2. Account Registration</h2>
                            <p className="text-[#6B7280] mb-2">To use certain features of our service, you must register for an account. You agree to:</p>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li>Provide accurate and complete information</li>
                                <li>Maintain the security of your password</li>
                                <li>Accept responsibility for all activities under your account</li>
                                <li>Notify us immediately of any unauthorized use</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">3. Orders and Payments</h2>
                            <p className="text-[#6B7280] mb-2">When you place an order on Cartify:</p>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li>You agree to pay the specified price for the product</li>
                                <li>We reserve the right to refuse or cancel orders at any time</li>
                                <li>Prices are subject to change without notice</li>
                                <li>All payments must be made through our approved payment methods</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">4. Shipping and Delivery</h2>
                            <p className="text-[#6B7280]">Estimated delivery times are provided for reference only. We are not responsible for delays caused by shipping carriers, customs, or other factors beyond our control.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">5. Returns and Refunds</h2>
                            <p className="text-[#6B7280]">Please refer to our Return Policy for detailed information about returns and refunds. Most items can be returned within 30 days of delivery.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">6. Intellectual Property</h2>
                            <p className="text-[#6B7280]">All content on Cartify, including text, graphics, logos, and images, is our property and protected by copyright laws. You may not reproduce, distribute, or create derivative works without our permission.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">7. Limitation of Liability</h2>
                            <p className="text-[#6B7280]">Cartify shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">8. Governing Law</h2>
                            <p className="text-[#6B7280]">These terms shall be governed by and construed in accordance with the laws of the United States.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">9. Changes to Terms</h2>
                            <p className="text-[#6B7280]">We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on this page.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">10. Contact Us</h2>
                            <p className="text-[#6B7280]">If you have any questions about these Terms, please contact us at <span className="text-[#F97316]">legal@cartify.com</span></p>
                        </section>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default TermsPage