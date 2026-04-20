import React from 'react'
import { Link } from "react-router-dom";
import styles from "../../../styles/styles";

const Hero = () => {
    return (
        <div
            className={`relative min-h-[70vh] 800px:min-h-[80vh] w-full bg-no-repeat ${styles.noramlFlex}`}
            style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920&h=800&fit=crop')",
                backgroundSize: "cover",
                backgroundPosition: "center 30%",
            }}
        >
            {/* Darker Overlay - Improved for better text visibility */}
            <div className="absolute inset-0 bg-black/70"></div>
            
            {/* Additional gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30"></div>
            
            <div className={`${styles.section} w-[90%] 800px:w-[60%] relative z-10`}>
                {/* Badge */}
                <div className="inline-block bg-brand-orange/20 backdrop-blur-sm rounded-full px-4 py-1 mb-4 animate-fadeInUp">
                    <span className="text-brand-orange font-medium text-sm">SUMMER COLLECTION 2024</span>
                </div>
                
                <h1
                    className={`text-[35px] leading-[1.2] 800px:text-[60px] font-[600] capitalize text-light-text animate-fadeInUp`}
                    style={{ animationDelay: "0.1s" }}
                >
                    Elevate Your <span className="text-brand-orange">Style</span> <br />
                    With Premium Fashion
                </h1>
                
                <p className="pt-5 text-[16px] font-[Poppins] font-[400] text-light-text/90 max-w-lg animate-fadeInUp"
                   style={{ animationDelay: "0.2s" }}>
                    Discover the latest trends in clothing, accessories, and footwear. 
                    Shop exclusive collections from top brands with up to 50% off.
                </p>
                
                <Link to="/products" className="inline-block animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
                    <div className="bg-brand-orange hover:bg-orange-hover rounded-md px-8 py-3 mt-5 transition-all transform hover:scale-105 hover:shadow-lg">
                        <span className="text-light-text font-[Poppins] text-[18px] font-semibold flex items-center gap-2">
                            Shop Now
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </span>
                    </div>
                </Link>

                {/* Stats Section */}
                <div className="flex gap-8 mt-8 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
                    <div>
                        <p className="text-2xl font-bold text-light-text">500+</p>
                        <p className="text-sm text-light-text/70">Premium Brands</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-light-text">50k+</p>
                        <p className="text-sm text-light-text/70">Happy Customers</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-light-text">24/7</p>
                        <p className="text-sm text-light-text/70">Support</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Hero