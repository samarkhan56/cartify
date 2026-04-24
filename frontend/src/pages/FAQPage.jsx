import React, { useState } from 'react'
import Header from '../components/Layout/Header'
import Footer from '../components/Layout/Footer'
import { AiOutlinePlus, AiOutlineMinus, AiOutlineSearch, AiOutlineTrophy, AiOutlineSafety, AiOutlineCar, AiOutlineReload } from 'react-icons/ai'
import { FaShippingFast, FaHeadset, FaLock } from 'react-icons/fa'

const FAQPage = () => {
    const [openIndex, setOpenIndex] = useState(null)

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    const faqCategories = [
        {
            title: "Orders & Shipping",
            icon: <FaShippingFast size={24} className="text-[#F97316]" />,
            questions: [
                {
                    question: "How long does shipping take?",
                    answer: "Standard shipping typically takes 3-5 business days. Express shipping (1-2 business days) is available at checkout for an additional fee. You'll receive a tracking number once your order ships."
                },
                {
                    question: "Do you ship internationally?",
                    answer: "Yes, we ship to over 50 countries worldwide. International shipping typically takes 7-14 business days depending on the destination. Customs fees may apply and are the responsibility of the buyer."
                },
                {
                    question: "How can I track my order?",
                    answer: "Once your order ships, you'll receive a confirmation email with a tracking number. You can also track your order by logging into your account and visiting the 'My Orders' section."
                },
                {
                    question: "What are the shipping costs?",
                    answer: "We offer free standard shipping on all orders over $100. For orders under $100, shipping costs are calculated at checkout based on your location and selected shipping method."
                }
            ]
        },
        {
            title: "Returns & Refunds",
            icon: <AiOutlineReload size={24} className="text-[#F97316]" />,
            questions: [
                {
                    question: "What is your return policy?",
                    answer: "We offer a 30-day return policy from the date of delivery. Items must be unused, in original condition, and with all tags attached. Some items like personalized products are final sale."
                },
                {
                    question: "How do I initiate a return?",
                    answer: "To initiate a return, log into your account, go to 'My Orders', select the order you wish to return, and click 'Request Return'. Follow the instructions to complete the return process."
                },
                {
                    question: "How long do refunds take?",
                    answer: "Once we receive your return, please allow 5-7 business days for inspection and processing. Refunds will be issued to your original payment method within 3-5 business days after approval."
                },
                {
                    question: "Do I have to pay for return shipping?",
                    answer: "Return shipping is free for defective or incorrect items. For other returns, the customer is responsible for return shipping costs unless you choose store credit, which includes free returns."
                }
            ]
        },
        {
            title: "Payments & Security",
            icon: <FaLock size={24} className="text-[#F97316]" />,
            questions: [
                {
                    question: "What payment methods do you accept?",
                    answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, Google Pay, and Cash on Delivery (selected locations)."
                },
                {
                    question: "Is my payment information secure?",
                    answer: "Yes, we use industry-standard SSL encryption to protect your payment information. We never store your full credit card details on our servers."
                },
                {
                    question: "Can I change my payment method after placing an order?",
                    answer: "Unfortunately, you cannot change the payment method once an order is placed. You would need to cancel the order (if within the cancellation window) and place a new one."
                },
                {
                    question: "When will I be charged for my order?",
                    answer: "Your card will be charged immediately upon order confirmation. For Cash on Delivery orders, payment is due upon delivery."
                }
            ]
        },
        {
            title: "Account & Support",
            icon: <FaHeadset size={24} className="text-[#F97316]" />,
            questions: [
                {
                    question: "How do I create an account?",
                    answer: "Click on the 'Sign In' button at the top right corner of our website, then select 'Create Account'. Fill in your details and click 'Register' to create your account."
                },
                {
                    question: "I forgot my password. What should I do?",
                    answer: "Click on 'Forgot Password' on the login page. Enter your email address, and we'll send you a link to reset your password."
                },
                {
                    question: "How can I contact customer support?",
                    answer: "You can reach our customer support team via email at support@cartify.com, by phone at +1 (234) 567-8900, or through our live chat feature available 24/7."
                },
                {
                    question: "Can I change or cancel my order?",
                    answer: "Orders can be modified or canceled within 1 hour of placement. After that, the order may have already been processed for shipping. Contact customer support immediately for assistance."
                }
            ]
        }
    ]

    const quickAnswers = [
        {
            question: "How do I become a seller?",
            answer: "Visit our 'Become a Seller' page, fill out the registration form, and submit the required documents. Our team will review your application within 2-3 business days.",
            link: "/shop-create",
            linkText: "Apply Now"
        },
        {
            question: "What is your warranty policy?",
            answer: "Most products come with a manufacturer's warranty. Warranty periods vary by product and are specified on the product page. Contact our support for warranty claims.",
            link: "/contact",
            linkText: "Contact Support"
        },
        {
            question: "Do you offer bulk discounts?",
            answer: "Yes, we offer wholesale pricing for bulk orders. Please contact our sales team for a custom quote based on your order quantity.",
            link: "/contact",
            linkText: "Request Quote"
        }
    ]

    const stats = [
        { value: "24/7", label: "Customer Support" },
        { value: "30-Day", label: "Easy Returns" },
        { value: "100%", label: "Secure Payment" },
        { value: "50k+", label: "Happy Customers" }
    ]

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Header />
            
            {/* Hero Section */}
            <div className="relative bg-gradient-to-r from-[#1E293B] to-[#334155] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                        Find answers to common questions about orders, payments, returns, and more.
                    </p>
                    <div className="mt-8 max-w-md mx-auto relative">
                        <AiOutlineSearch size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search for answers..."
                            className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="bg-white py-12 border-b border-[#E5E7EB]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center">
                                <h3 className="text-2xl font-bold text-[#F97316] mb-1">{stat.value}</h3>
                                <p className="text-[#6B7280] text-sm">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FAQ Categories */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {faqCategories.map((category, catIndex) => (
                        <div key={catIndex} className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#FFF7ED] to-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#FFF7ED] rounded-full flex items-center justify-center">
                                        {category.icon}
                                    </div>
                                    <h2 className="text-xl font-semibold text-[#111827]">{category.title}</h2>
                                </div>
                            </div>
                            <div className="divide-y divide-[#E5E7EB]">
                                {category.questions.map((faq, qIndex) => {
                                    const globalIndex = catIndex * 100 + qIndex
                                    return (
                                        <div key={qIndex} className="p-4 hover:bg-gray-50 transition-colors">
                                            <button
                                                onClick={() => toggleFAQ(globalIndex)}
                                                className="w-full flex justify-between items-center text-left"
                                            >
                                                <span className="font-medium text-[#111827] pr-4">{faq.question}</span>
                                                {openIndex === globalIndex ? (
                                                    <AiOutlineMinus className="text-[#F97316] flex-shrink-0" size={18} />
                                                ) : (
                                                    <AiOutlinePlus className="text-[#F97316] flex-shrink-0" size={18} />
                                                )}
                                            </button>
                                            {openIndex === globalIndex && (
                                                <p className="mt-3 text-[#6B7280] text-sm leading-relaxed">{faq.answer}</p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Answers Section */}
            <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-white text-center mb-4">Still Have Questions?</h2>
                    <p className="text-orange-100 text-center mb-12 max-w-2xl mx-auto">
                        Can't find what you're looking for? Our support team is here to help.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {quickAnswers.map((item, index) => (
                            <div key={index} className="bg-white rounded-xl p-6 text-center shadow-lg">
                                <h3 className="text-lg font-semibold text-[#111827] mb-2">{item.question}</h3>
                                <p className="text-[#6B7280] text-sm mb-4">{item.answer}</p>
                                <a 
                                    href={item.link} 
                                    className="inline-block text-[#F97316] hover:text-[#EA580C] font-medium text-sm"
                                >
                                    {item.linkText} →
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contact Support CTA */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                <div className="bg-white rounded-xl shadow-md p-8 max-w-2xl mx-auto">
                    <FaHeadset size={48} className="mx-auto text-[#F97316] mb-4" />
                    <h3 className="text-2xl font-bold text-[#111827] mb-2">Need Immediate Help?</h3>
                    <p className="text-[#6B7280] mb-6">
                        Our customer support team is available 24/7 to assist you with any issues.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a 
                            href="/contact" 
                            className="px-6 py-3 bg-[#F97316] text-white rounded-lg font-semibold hover:bg-[#EA580C] transition-colors"
                        >
                            Contact Support
                        </a>
                        <a 
                            href="mailto:support@cartify.com" 
                            className="px-6 py-3 border-2 border-[#F97316] text-[#F97316] rounded-lg font-semibold hover:bg-[#F97316] hover:text-white transition-colors"
                        >
                            Email Us
                        </a>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    )
}

export default FAQPage