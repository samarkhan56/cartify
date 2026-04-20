import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { 
  AiOutlineHome, 
  AiOutlineFire, 
  AiOutlineShop, 
  AiOutlineCalendar, 
  AiOutlineQuestionCircle,
  AiOutlineDown,
  AiOutlineRight
} from 'react-icons/ai'
import { BsGraphUp } from 'react-icons/bs'
import { HiOutlineUsers } from 'react-icons/hi'

const Navbar = ({ activeHeading }) => {
  const location = useLocation();
  const { isSeller } = useSelector((state) => state.seller);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Navigation items with icons and dropdown support
  const navItems = [
    { 
      id: 1, 
      title: "Home", 
      url: "/", 
      icon: <AiOutlineHome className="text-lg" />,
      dropdown: null
    },
    { 
      id: 2, 
      title: "Best Selling", 
      url: "/best-selling", 
      icon: <BsGraphUp className="text-lg" />,
      dropdown: null
    },
    { 
      id: 3, 
      title: "Products", 
      url: "/products", 
      icon: <AiOutlineShop className="text-lg" />,
      dropdown: [
        { title: "New Arrivals", url: "/products?filter=new" },
        { title: "Trending Now", url: "/products?filter=trending" },
        { title: "On Sale", url: "/products?filter=sale" },
        { title: "Top Rated", url: "/products?filter=top-rated" },
      ]
    },
    { 
      id: 4, 
      title: "Events", 
      url: "/events", 
      icon: <AiOutlineCalendar className="text-lg" />,
      dropdown: null
    },
    { 
      id: 5, 
      title: "FAQ", 
      url: "/faq", 
      icon: <AiOutlineQuestionCircle className="text-lg" />,
      dropdown: null
    },
  ];

  // Add Seller Dashboard for logged-in sellers
  if (isSeller) {
    navItems.push({
      id: 6,
      title: "Dashboard",
      url: "/dashboard",
      icon: <HiOutlineUsers className="text-lg" />,
      dropdown: null
    });
  }

  const isActive = (itemId) => activeHeading === itemId;
  const hasDropdown = (item) => item.dropdown && item.dropdown.length > 0;

  return (
    <nav className="relative">
      <ul className="flex items-center gap-1 lg:gap-2">
        {navItems.map((item) => (
          <li key={item.id} className="relative group">
            {hasDropdown(item) ? (
              // Dropdown item
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                  onMouseEnter={() => setOpenDropdown(item.id)}
                  onMouseLeave={() => setOpenDropdown(null)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm lg:text-base
                    transition-all duration-300 group
                    ${isActive(item.id) 
                      ? 'bg-brand-orange/20 text-brand-orange' 
                      : 'text-light-text/80 hover:text-brand-orange hover:bg-white/5'
                    }
                  `}
                >
                  <span className="group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </span>
                  <span>{item.title}</span>
                  <AiOutlineDown className={`text-xs transition-transform duration-300 ${openDropdown === item.id ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {openDropdown === item.id && (
                  <div 
                    className="absolute top-full left-0 mt-2 w-56 bg-card rounded-xl shadow-2xl border border-border-gray overflow-hidden z-50 animate-fadeIn"
                    onMouseEnter={() => setOpenDropdown(item.id)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    {item.dropdown.map((subItem, idx) => (
                      <Link
                        key={idx}
                        to={subItem.url}
                        className="flex items-center justify-between px-4 py-3 text-text-primary hover:bg-orange-bg hover:text-brand-orange transition-all duration-300 group"
                      >
                        <span>{subItem.title}</span>
                        <AiOutlineRight className="text-xs opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Regular link
              <Link
                to={item.url}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm lg:text-base
                  transition-all duration-300 relative overflow-hidden group
                  ${isActive(item.id) 
                    ? 'bg-brand-orange/20 text-brand-orange' 
                    : 'text-light-text/80 hover:text-brand-orange hover:bg-white/5'
                  }
                `}
              >
                <span className="group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </span>
                <span>{item.title}</span>
                
                {/* Active indicator */}
                {isActive(item.id) && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-brand-orange rounded-full"></span>
                )}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {/* Mobile menu button (visible on small screens) - Optional */}
      <div className="hidden">
        {/* This is for future mobile navigation if needed */}
      </div>
    </nav>
  )
}

export default Navbar