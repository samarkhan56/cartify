import React, { useEffect, useRef, useState } from "react";

const Sponsored = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Brand logos - using LOCAL images for 100% reliability
  const brands = [
    { id: 1, name: "Sony", logo: "/brands/sony.png" },
    { id: 2, name: "Dell", logo: "/brands/dell.png" },
    { id: 3, name: "LG", logo: "/brands/lg.png" },
    { id: 4, name: "Apple", logo: "/brands/apple.png" },
    { id: 5, name: "Microsoft", logo: "/brands/microsoft.png" }
  ];

  return (
    <div className="w-full py-16 mb-8" ref={sectionRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-sm font-semibold mb-3">
            TRUSTED PARTNERS
          </span>
          <h3 className="text-text-primary text-xl md:text-2xl font-semibold">
            Join 5,000+ businesses already selling on Cartify
          </h3>
        </div>

        {/* Brand Logos Grid */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
          {brands.map((brand, index) => (
            <div
              key={brand.id}
              className={`group transition-all duration-500 hover:scale-110 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="relative">
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-brand-orange/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Logo Image */}
                <img
                  src={brand.logo}
                  alt={`${brand.name} logo`}
                  className="h-10 md:h-14 w-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sponsored;