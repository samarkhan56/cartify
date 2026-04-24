import React, { useState } from "react";
import {
  AiFillFacebook,
  AiFillInstagram,
  AiFillYoutube,
  AiOutlineTwitter,
  AiOutlineSend,
} from "react-icons/ai";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const Footer = () => {
  const [email, setEmail] = useState("");

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address!");
      return;
    }
    toast.success("Thanks for subscribing!");
    setEmail("");
  };

  // Quick Links - All working paths
  const quickLinks = [
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
    { name: "Best Selling", path: "/best-selling" },
    { name: "Events", path: "/events" },
    { name: "FAQ", path: "/faq" },
    { name: "Contact Us", path: "/contact" },
  ];

  // Support Links - All working paths
  const supportLinks = [
    { name: "About Us", path: "/about" },
    { name: "Privacy Policy", path: "/privacy" },
    { name: "Terms of Service", path: "/terms" },
    { name: "Shipping Info", path: "/shipping-info" },
    { name: "Returns", path: "/returns" },
    { name: "Help Center", path: "/faq" },
  ];

  return (
    <footer className="bg-primary-dark text-light-text pt-16 pb-8 mt-12">
      {/* Newsletter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-brand-orange/10 to-primary-light rounded-2xl p-8 mb-12 text-center md:text-left md:flex md:justify-between md:items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Subscribe to Our <span className="text-brand-orange">Newsletter</span>
            </h2>
            <p className="text-light-text/70">
              Get the latest updates on new products and upcoming sales
            </p>
          </div>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-5 py-3 rounded-xl bg-card text-text-primary placeholder:text-text-secondary border border-border-gray focus:border-brand-orange focus:outline-none w-full sm:w-80"
              required
            />
            <button
              type="submit"
              className="bg-brand-orange hover:bg-orange-hover text-light-text px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              <span>Subscribe</span>
              <AiOutlineSend className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        {/* Footer Links Grid - Company Section REMOVED */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 pb-12 border-b border-border-gray/30">
          {/* Brand Column */}
          <div className="text-center sm:text-left">
            <img
              src="/Cartify.png"
              alt="Cartify"
              className="h-12 w-auto object-contain brightness-0 invert mx-auto sm:mx-0 mb-4"
            />
            <p className="text-sm text-light-text/70 leading-relaxed">
              Empowering sellers with AI-driven pricing and smart advertising tools.
            </p>
            <div className="flex justify-center sm:justify-start gap-4 mt-5">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-light-text/60 hover:text-brand-orange transition-colors">
                <AiFillFacebook size={24} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-light-text/60 hover:text-brand-orange transition-colors">
                <AiOutlineTwitter size={24} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-light-text/60 hover:text-brand-orange transition-colors">
                <AiFillInstagram size={24} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-light-text/60 hover:text-brand-orange transition-colors">
                <AiFillYoutube size={24} />
              </a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.path}
                    className="text-light-text/60 hover:text-brand-orange transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Column */}
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              {supportLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.path}
                    className="text-light-text/60 hover:text-brand-orange transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="text-center pt-8 text-light-text/50 text-sm">
          <p>© {new Date().getFullYear()} Cartify. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-2">
            <Link to="/terms" className="hover:text-brand-orange transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-brand-orange transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-brand-orange transition-colors">Contact Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;