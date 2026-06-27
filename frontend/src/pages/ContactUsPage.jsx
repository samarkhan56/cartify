import React, { useState } from 'react'
import Header from '../components/Layout/Header'
import Footer from '../components/Layout/Footer'
import { 
  AiOutlineMail, 
  AiOutlinePhone, 
  AiOutlineEnvironment, 
  AiOutlineClockCircle,
  AiOutlineSend,
  AiOutlineCheckCircle 
} from 'react-icons/ai'
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa'
import { toast } from 'react-toastify'

const ContactUsPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        // Simulate API call - Replace with your actual contact form API
        setTimeout(() => {
            toast.success('Message sent successfully! We will get back to you soon.')
            setFormData({ name: '', email: '', subject: '', message: '' })
            setIsSubmitting(false)
        }, 1500)
    }

    const contactInfo = [
        {
            icon: <AiOutlineMail size={24} />,
            title: "Email Us",
            details: "support@cartify.com",
            subDetail: "sales@cartify.com",
            link: "mailto:support@cartify.com"
        },
        {
            icon: <AiOutlinePhone size={24} />,
            title: "Call Us",
            details: "+1 (234) 567-8900",
            subDetail: "Mon-Fri, 9am-6pm EST",
            link: "tel:+12345678900"
        },
        {
            icon: <AiOutlineEnvironment size={24} />,
            title: "Visit Us",
            details: "123 Commerce Street",
            subDetail: "New York, NY 10001, USA",
            link: "https://maps.google.com"
        },
        {
            icon: <AiOutlineClockCircle size={24} />,
            title: "Business Hours",
            details: "Monday - Friday: 9am - 6pm",
            subDetail: "Saturday: 10am - 4pm",
            link: null
        }
    ]

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Header />
            
            {/* Hero Section */}
            <div className="relative bg-gradient-to-r from-[#1E293B] to-[#334155] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                        Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </p>
                </div>
            </div>

            {/* Contact Info Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {contactInfo.map((info, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition-shadow">
                            <div className="w-14 h-14 bg-[#FFF7ED] rounded-full flex items-center justify-center mx-auto mb-4 text-[#F97316]">
                                {info.icon}
                            </div>
                            <h3 className="text-lg font-semibold text-[#111827] mb-2">{info.title}</h3>
                            <p className="text-[#6B7280] text-sm">{info.details}</p>
                            <p className="text-[#6B7280] text-sm mt-1">{info.subDetail}</p>
                            {info.link && (
                                <a href={info.link} className="inline-block mt-3 text-[#F97316] hover:text-[#EA580C] text-sm font-medium">
                                    Get in touch →
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact Form & Map Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Contact Form */}
                    <div className="bg-white rounded-xl shadow-md p-8">
                        <h2 className="text-2xl font-bold text-[#111827] mb-2">Send us a Message</h2>
                        <p className="text-[#6B7280] mb-6">Fill out the form below and we'll get back to you within 24 hours.</p>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[#111827] mb-1">
                                    Your Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                    placeholder="John Doe"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[#111827] mb-1">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                    placeholder="you@example.com"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[#111827] mb-1">
                                    Subject <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="subject"
                                    required
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors"
                                    placeholder="How can we help you?"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[#111827] mb-1">
                                    Message <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="message"
                                    required
                                    rows="5"
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316] transition-colors resize-none"
                                    placeholder="Tell us more about your inquiry..."
                                />
                            </div>
                            
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                                <AiOutlineSend size={18} />
                            </button>
                        </form>
                    </div>

                    {/* Map & Social Media */}
                    <div className="space-y-6">
                        {/* Map */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="p-6 border-b border-[#E5E7EB]">
                                <h3 className="text-xl font-semibold text-[#111827]">Find Us Here</h3>
                            </div>
                            <div className="h-64 w-full">
                                <iframe
                                    title="Cartify Location"
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.2219901290355!2d-74.00369368400567!3d40.71312937933099!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25a316bb3c173%3A0x942cf8efbc391ee!2sWall%20St%2C%20New%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2s!4v1699999999999!5m2!1sen!2s"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                            </div>
                        </div>

                        {/* Social Media */}
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h3 className="text-xl font-semibold text-[#111827] mb-4">Connect With Us</h3>
                            <p className="text-[#6B7280] mb-4">Follow us on social media for updates, promotions, and more.</p>
                            <div className="flex gap-4">
                                <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Cartify on Facebook" className="w-10 h-10 bg-[#F97316] rounded-full flex items-center justify-center text-white hover:bg-[#EA580C] transition-colors">
                                    <FaFacebook size={20} />
                                </a>
                                <a href="https://www.twitter.com" target="_blank" rel="noreferrer" aria-label="Cartify on Twitter" className="w-10 h-10 bg-[#F97316] rounded-full flex items-center justify-center text-white hover:bg-[#EA580C] transition-colors">
                                    <FaTwitter size={20} />
                                </a>
                                <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Cartify on Instagram" className="w-10 h-10 bg-[#F97316] rounded-full flex items-center justify-center text-white hover:bg-[#EA580C] transition-colors">
                                    <FaInstagram size={20} />
                                </a>
                                <a href="https://www.youtube.com" target="_blank" rel="noreferrer" aria-label="Cartify on YouTube" className="w-10 h-10 bg-[#F97316] rounded-full flex items-center justify-center text-white hover:bg-[#EA580C] transition-colors">
                                    <FaYoutube size={20} />
                                </a>
                            </div>
                        </div>

                        {/* FAQ Link */}
                        <div className="bg-gradient-to-r from-[#FFF7ED] to-[#FFEDD5] rounded-xl p-6 text-center">
                            <AiOutlineCheckCircle size={40} className="mx-auto text-[#F97316] mb-3" />
                            <h3 className="text-lg font-semibold text-[#111827] mb-2">Frequently Asked Questions</h3>
                            <p className="text-[#6B7280] text-sm mb-4">Find quick answers to common questions.</p>
                            <a href="/faq" className="inline-block px-6 py-2 bg-[#F97316] text-white rounded-lg hover:bg-[#EA580C] transition-colors">
                                Visit FAQ Page
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    )
}

export default ContactUsPage
