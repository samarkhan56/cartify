import React from 'react'
import Header from '../components/Layout/Header'
import Footer from '../components/Layout/Footer'
import { AiOutlineSafetyCertificate } from 'react-icons/ai'

const PrivacyPolicyPage = () => {
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Header />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-xl shadow-md p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <AiOutlineSafetyCertificate size={32} className="text-[#F97316]" />
                        <h1 className="text-3xl font-bold text-[#111827]">Privacy Policy</h1>
                    </div>
                    <p className="text-[#6B7280] mb-4">Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">1. Information We Collect</h2>
                            <p className="text-[#6B7280] mb-2">We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us. This may include:</p>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li>Name and contact information (email, phone number, shipping address)</li>
                                <li>Payment information (processed securely through third-party payment processors)</li>
                                <li>Account credentials (username and password)</li>
                                <li>Communication preferences</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">2. How We Use Your Information</h2>
                            <p className="text-[#6B7280] mb-2">We use the information we collect to:</p>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li>Process and fulfill your orders</li>
                                <li>Communicate with you about your orders and account</li>
                                <li>Send you promotional offers and updates (with your consent)</li>
                                <li>Improve our website and services</li>
                                <li>Detect and prevent fraud</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">3. Information Sharing</h2>
                            <p className="text-[#6B7280]">We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website, conducting our business, or serving you, as long as those parties agree to keep this information confidential.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">4. Data Security</h2>
                            <p className="text-[#6B7280]">We implement a variety of security measures to maintain the safety of your personal information. All sensitive information is transmitted via Secure Socket Layer (SSL) technology and encrypted in our databases.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">5. Cookies</h2>
                            <p className="text-[#6B7280]">We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. You can choose to disable cookies through your browser settings.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">6. Your Rights</h2>
                            <p className="text-[#6B7280]">You have the right to access, correct, or delete your personal information. You may also opt out of marketing communications at any time.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">7. Contact Us</h2>
                            <p className="text-[#6B7280]">If you have questions about this Privacy Policy, please contact us at <span className="text-[#F97316]">privacy@cartify.com</span></p>
                        </section>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default PrivacyPolicyPage
