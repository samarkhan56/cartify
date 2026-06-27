import React from 'react'
import Header from '../components/Layout/Header'
import Footer from '../components/Layout/Footer'
import { AiOutlineCheckCircle, AiOutlineSafetyCertificate, AiOutlineCustomerService, AiOutlineGlobal } from 'react-icons/ai'
import { FaHandsHelping } from 'react-icons/fa'
import { MdDeliveryDining } from 'react-icons/md'

const AboutUsPage = () => {
    const features = [
        {
            icon: <MdDeliveryDining size={32} className="text-[#F97316]" />,
            title: "Fast Delivery",
            description: "Free shipping on orders over $100. Get your products delivered within 3-5 business days."
        },
        {
            icon: <AiOutlineSafetyCertificate size={32} className="text-[#F97316]" />,
            title: "Secure Payments",
            description: "100% secure payment processing with multiple payment options. Your data is safe with us."
        },
        {
            icon: <AiOutlineCustomerService size={32} className="text-[#F97316]" />,
            title: "24/7 Support",
            description: "Our dedicated support team is available around the clock to assist you with any queries."
        },
        {
            icon: <FaHandsHelping size={32} className="text-[#F97316]" />,
            title: "Easy Returns",
            description: "30-day return policy. Not satisfied? We'll make it right with hassle-free returns."
        }
    ]

    const stats = [
        { value: "50,000+", label: "Happy Customers" },
        { value: "500+", label: "Premium Brands" },
        { value: "10,000+", label: "Products Sold" },
        { value: "98%", label: "Customer Satisfaction" }
    ]

    const teamMembers = [
        {
            name: "John Doe",
            role: "Founder & CEO",
            image: "https://randomuser.me/api/portraits/men/1.jpg"
        },
        {
            name: "Jane Smith",
            role: "Head of Operations",
            image: "https://randomuser.me/api/portraits/women/2.jpg"
        },
        {
            name: "Mike Johnson",
            role: "Tech Lead",
            image: "https://randomuser.me/api/portraits/men/3.jpg"
        },
        {
            name: "Sarah Williams",
            role: "Customer Success",
            image: "https://randomuser.me/api/portraits/women/4.jpg"
        }
    ]

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Header />
            
            {/* Hero Section */}
            <div className="relative bg-gradient-to-r from-[#1E293B] to-[#334155] text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">About Cartify</h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                        We're on a mission to revolutionize e-commerce by empowering sellers with AI-driven pricing 
                        and smart advertising tools while providing buyers with the best shopping experience.
                    </p>
                </div>
            </div>

            {/* Our Story Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-[#111827] mb-4">Our Story</h2>
                        <div className="w-20 h-1 bg-[#F97316] mb-6"></div>
                        <p className="text-[#6B7280] mb-4 leading-relaxed">
                            Founded in 2023, Cartify started with a simple idea: to create an e-commerce platform 
                            that benefits both sellers and buyers. We noticed that sellers struggled with pricing 
                            strategies while buyers had difficulty finding the best deals.
                        </p>
                        <p className="text-[#6B7280] mb-4 leading-relaxed">
                            Today, Cartify is a leading marketplace that uses cutting-edge AI technology to help 
                            sellers optimize their pricing and advertising, while offering buyers a curated selection 
                            of high-quality products at competitive prices.
                        </p>
                        <p className="text-[#6B7280] leading-relaxed">
                            With thousands of satisfied customers and hundreds of trusted sellers, we're proud to 
                            be building a community where commerce meets innovation.
                        </p>
                    </div>
                    <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded-2xl p-8 text-white text-center">
                        <AiOutlineGlobal size={64} className="mx-auto mb-4 opacity-80" />
                        <h3 className="text-2xl font-bold mb-2">Our Mission</h3>
                        <p className="text-orange-100">
                            To democratize e-commerce by providing powerful tools that help sellers succeed 
                            and creating a seamless shopping experience that buyers love.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="bg-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center">
                                <h3 className="text-3xl md:text-4xl font-bold text-[#F97316] mb-2">{stat.value}</h3>
                                <p className="text-[#6B7280]">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-[#111827] mb-4">Why Choose Cartify?</h2>
                    <div className="w-20 h-1 bg-[#F97316] mx-auto"></div>
                    <p className="text-[#6B7280] mt-4 max-w-2xl mx-auto">
                        We're committed to providing the best experience for both sellers and buyers
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="text-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
                            <div className="w-16 h-16 bg-[#FFF7ED] rounded-full flex items-center justify-center mx-auto mb-4">
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-semibold text-[#111827] mb-2">{feature.title}</h3>
                            <p className="text-[#6B7280] text-sm">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Our Values Section */}
            <div className="bg-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-[#111827] mb-4">Our Core Values</h2>
                        <div className="w-20 h-1 bg-[#F97316] mx-auto"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex items-start gap-4">
                            <AiOutlineCheckCircle size={24} className="text-[#F97316] flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-[#111827] mb-1">Transparency</h3>
                                <p className="text-[#6B7280] text-sm">We believe in honest communication and transparent business practices.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <AiOutlineCheckCircle size={24} className="text-[#F97316] flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-[#111827] mb-1">Innovation</h3>
                                <p className="text-[#6B7280] text-sm">Leveraging cutting-edge AI to solve real-world e-commerce challenges.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <AiOutlineCheckCircle size={24} className="text-[#F97316] flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-[#111827] mb-1">Customer First</h3>
                                <p className="text-[#6B7280] text-sm">Every decision we make is focused on creating value for our users.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-[#111827] mb-4">Meet Our Leadership</h2>
                    <div className="w-20 h-1 bg-[#F97316] mx-auto"></div>
                    <p className="text-[#6B7280] mt-4">The passionate people behind Cartify's success</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {teamMembers.map((member, index) => (
                        <div key={index} className="text-center">
                            <img 
                                src={member.image} 
                                alt={member.name}
                                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-[#F97316]"
                            />
                            <h3 className="text-lg font-semibold text-[#111827]">{member.name}</h3>
                            <p className="text-[#6B7280] text-sm">{member.role}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Selling?</h2>
                    <p className="text-orange-100 mb-8 max-w-2xl mx-auto">
                        Join thousands of successful sellers on Cartify and take your business to the next level.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a 
                            href="/shop-create" 
                            className="inline-block px-8 py-3 bg-white text-[#F97316] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                        >
                            Become a Seller
                        </a>
                        <a 
                            href="/products" 
                            className="inline-block px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                        >
                            Start Shopping
                        </a>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    )
}

export default AboutUsPage
