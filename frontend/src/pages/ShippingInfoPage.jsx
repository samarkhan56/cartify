import React from 'react'
import Header from '../components/Layout/Header'
import Footer from '../components/Layout/Footer'
import { AiOutlineClockCircle, AiOutlineGlobal, AiOutlineDollar } from 'react-icons/ai'
import { MdDeliveryDining } from 'react-icons/md'

const ShippingInfoPage = () => {
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Header />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-xl shadow-md p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <MdDeliveryDining size={32} className="text-[#F97316]" />
                        <h1 className="text-3xl font-bold text-[#111827]">Shipping Information</h1>
                    </div>
                    <p className="text-[#6B7280] mb-6">Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3 flex items-center gap-2">
                                <AiOutlineClockCircle size={20} className="text-[#F97316]" />
                                Shipping Times
                            </h2>
                            <p className="text-[#6B7280] mb-2">Estimated delivery times after order confirmation:</p>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li><span className="font-semibold">Standard Shipping:</span> 3-5 business days</li>
                                <li><span className="font-semibold">Express Shipping:</span> 1-2 business days</li>
                                <li><span className="font-semibold">International Shipping:</span> 7-14 business days</li>
                            </ul>
                            <p className="text-[#6B7280] text-sm mt-2">*Delivery times may vary based on location and carrier delays.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3 flex items-center gap-2">
                                <AiOutlineDollar size={20} className="text-[#F97316]" />
                                Shipping Costs
                            </h2>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li><span className="font-semibold">Free Standard Shipping:</span> On all orders over $100</li>
                                <li><span className="font-semibold">Standard Shipping (Under $100):</span> $5.99</li>
                                <li><span className="font-semibold">Express Shipping:</span> $12.99</li>
                                <li><span className="font-semibold">International Shipping:</span> Calculated at checkout</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3 flex items-center gap-2">
                                <AiOutlineGlobal size={20} className="text-[#F97316]" />
                                International Shipping
                            </h2>
                            <p className="text-[#6B7280] mb-2">We ship to over 50 countries worldwide. International orders may be subject to:</p>
                            <ul className="list-disc pl-6 text-[#6B7280] space-y-1">
                                <li>Customs duties and taxes (paid by customer)</li>
                                <li>Extended delivery times due to customs clearance</li>
                                <li>Additional documentation requirements</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">Order Processing</h2>
                            <p className="text-[#6B7280]">Orders are processed within 1-2 business days after payment confirmation. You will receive a shipping confirmation email with tracking number once your order ships.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">Tracking Your Order</h2>
                            <p className="text-[#6B7280]">Once your order ships, you will receive a tracking number via email. You can also track your order by logging into your account and visiting the "My Orders" section.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[#111827] mb-3">Lost or Damaged Packages</h2>
                            <p className="text-[#6B7280]">If your package is lost or damaged during transit, please contact our customer support within 7 days of the expected delivery date. We will work with the carrier to resolve the issue.</p>
                        </section>

                        <div className="bg-[#FFF7ED] p-4 rounded-lg border border-[#FB923C]">
                            <p className="text-[#F97316] text-sm font-medium">Need help with your order?</p>
                            <p className="text-[#6B7280] text-sm mt-1">Contact our support team at <span className="text-[#F97316]">shipping@cartify.com</span> or call us at +1 (234) 567-8900</p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default ShippingInfoPage
