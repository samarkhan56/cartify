import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "../../styles/styles";
import { categoriesData } from "../../static/data";
import {
  AiOutlineHeart,
  AiOutlineSearch,
  AiOutlineShoppingCart,
  AiOutlineUser,
} from "react-icons/ai";
import { IoIosArrowDown, IoIosArrowForward } from "react-icons/io";
import { BiMenuAltLeft } from "react-icons/bi";
import { CgProfile } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import DropDown from "./DropDown";
import Navbar from "./Navbar";
import { useSelector } from "react-redux";
import { backend_url } from "../../server";
import Cart from "../cart/Cart";
import Wishlist from "../Wishlist/Wishlist";

const Header = ({ activeHeading }) => {
  const { isSeller } = useSelector((state) => state.seller);
  const { cart } = useSelector((state) => state.cart);
  const { wishlist } = useSelector((state) => state.wishlist);
  const { isAuthenticated, user } = useSelector((state) => state.user);
  const { allProducts } = useSelector((state) => state.products);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchData, setSearchData] = useState(null);
  const [active, setActive] = useState(false);
  const [dropDown, setDropDown] = useState(false);
  const [openCart, setOpenCart] = useState(false);
  const [openWishlist, setOpenWishlist] = useState(false);
  const [open, setOpen] = useState(false); // mobile menu

  // Handle search change
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    // Filter products
    const filteredProducts =
      allProducts &&
      allProducts.filter((product) =>
        product.name.toLowerCase().includes(term.toLowerCase())
      );
    setSearchData(filteredProducts);
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 70) {
        setActive(true);
      } else {
        setActive(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Split Navigation - Modern E-commerce Style */}
      <div
        className={`${active ? "shadow-lg fixed top-0 left-0 right-0 z-20 animate-slideDown" : ""
          } hidden 800px:block bg-primary-dark transition-all duration-300`}
      >
        <div className={`${styles.section} py-3`}>
          {/* Top Row - Shop Menu, Logo, Icons */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-6">
              <div className="relative">
                <button
                  onClick={() => setDropDown(!dropDown)}
                  className="flex items-center gap-2 text-light-text hover:text-soft-orange transition-colors group"
                >
                  <BiMenuAltLeft size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Shop by Category</span>
                  <IoIosArrowDown
                    size={16}
                    className={`transform transition-transform ${dropDown ? "rotate-180" : ""
                      }`}
                  />
                </button>
                {dropDown && (
                  <DropDown
                    categoriesData={categoriesData}
                    setDropDown={setDropDown}
                  />
                )}
              </div>
            </div>

            <Link to="/" className="transform hover:scale-105 transition-transform duration-300">
              <div className="bg-white p-2 rounded-full flex items-center justify-center">
                <img
                  src="/cartify.png"
                  alt="Cartify"
                  className="h-[50px] w-auto object-contain"
                />
              </div>
            </Link>

            <div className="flex items-center gap-5">
              {/* Wishlist Button */}
              <button
                onClick={() => setOpenWishlist(true)}
                className="relative group"
                aria-label="Wishlist"
              >
                <AiOutlineHeart
                  size={24}
                  className="text-light-text group-hover:text-soft-orange transition-colors"
                />
                {wishlist && wishlist.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-success text-light-text text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Cart Button */}
              <button
                onClick={() => setOpenCart(true)}
                className="relative group"
                aria-label="Shopping Cart"
              >
                <AiOutlineShoppingCart
                  size={24}
                  className="text-light-text group-hover:text-soft-orange transition-colors"
                />
                {cart && cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-success text-light-text text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {cart.length}
                  </span>
                )}
              </button>

              {/* User Profile / Login */}
              {isAuthenticated ? (
                <Link to="/profile" className="group">
                  <img
                    src={`${backend_url}${user?.avatar}`}
                    className="w-8 h-8 rounded-full border-2 border-brand-orange group-hover:border-soft-orange transition-all group-hover:scale-110"
                    alt="Profile"
                  />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-light-text hover:text-soft-orange transition-colors group"
                >
                  <CgProfile size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-sm hidden 1100px:block">Account</span>
                </Link>
              )}
            </div>
          </div>

          {/* Bottom Row - Search Bar and Navigation */}
          <div className="flex items-center gap-6">
            {/* Search Bar - Prominent Position */}
            <div className="flex-1 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for products, brands, and more..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full h-[44px] px-5 pr-12 bg-card rounded-lg border border-border-gray focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all text-text-primary placeholder:text-text-secondary"
                  aria-label="Search products"
                />
                <AiOutlineSearch
                  size={22}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary cursor-pointer hover:text-brand-orange transition-colors"
                  onClick={() => {
                    // Trigger search if needed
                    if (searchTerm) {
                      // You can add search navigation logic here
                    }
                  }}
                />
              </div>

              {/* Search Results Dropdown */}
              {searchData && searchData.length > 0 && searchTerm && (
                <div className="absolute top-full mt-2 w-full bg-card rounded-lg shadow-xl z-[9] p-2 max-h-[400px] overflow-y-auto border border-border-gray animate-fadeIn">
                  {searchData.map((item, index) => (
                    <Link
                      to={`/product/${item._id}`}
                      key={index}
                      onClick={() => {
                        setSearchTerm("");
                        setSearchData(null);
                      }}
                    >
                      <div className="flex items-center gap-3 p-3 hover:bg-orange-bg rounded-lg transition-colors cursor-pointer group">
                        <img
                          src={`${backend_url}${item.images[0]}`}
                          alt={item.name}
                          className="w-12 h-12 rounded-md object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-text-primary font-medium group-hover:text-brand-orange transition-colors">
                            {item.name}
                          </p>
                          <p className="text-sm text-brand-orange font-semibold">
                            ${item.price}
                          </p>
                        </div>
                        <AiOutlineSearch className="text-text-secondary group-hover:text-brand-orange" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation Links */}
            <div className="flex items-center">
              <Navbar active={activeHeading} />
            </div>

            {/* Seller Button */}
            <Link
              to={isSeller ? "/dashboard" : "/shop-create"}
              className="bg-brand-orange hover:bg-orange-hover px-5 py-2 rounded-lg text-light-text whitespace-nowrap transition-all hover:scale-105 hover:shadow-lg font-medium"
            >
              {isSeller ? "Seller Dashboard" : "Start Selling"}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div
        className={`${active === true
            ? "shadow-sm fixed top-0 left-0 z-20 animate-slideDown"
            : ""
          } w-full h-[60px] bg-card z-20 top-0 left-0 shadow-sm 800px:hidden border-b border-border-gray`}
      >
        <div className="w-full flex items-center justify-between h-full px-4">
          <div>
            <BiMenuAltLeft
              size={32}
              className="text-text-primary hover:text-brand-orange cursor-pointer transition-colors"
              onClick={() => setOpen(true)}
            />
          </div>
          <div>
            <Link to="/">
              <img
                src="/Cartify.png"
                alt="Cartify"
                className="cursor-pointer h-[40px] w-auto"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="relative cursor-pointer group"
              onClick={() => setOpenCart(true)}
            >
              <AiOutlineShoppingCart
                size={24}
                className="text-text-primary group-hover:text-brand-orange transition-colors"
              />
              {cart && cart.length > 0 && (
                <span className="absolute -top-2 -right-2 rounded-full bg-success w-5 h-5 text-light-text font-mono text-[10px] font-bold flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </div>
            {isAuthenticated ? (
              <Link to="/profile">
                <img
                  src={`${backend_url}${user?.avatar}`}
                  className="w-8 h-8 rounded-full border border-brand-orange"
                  alt="Profile"
                />
              </Link>
            ) : (
              <Link to="/login">
                <CgProfile size={24} className="text-text-primary hover:text-brand-orange" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Cart Popup */}
      {openCart && <Cart setOpenCart={setOpenCart} />}

      {/* Wishlist Popup */}
      {openWishlist && <Wishlist setOpenWishlist={setOpenWishlist} />}

      {/* Mobile Sidebar */}
      {open && (
        <div className="fixed w-full bg-black/50 z-30 h-full top-0 left-0 animate-fadeIn">
          <div className="fixed w-[80%] bg-card h-screen top-0 left-0 z-40 overflow-y-scroll shadow-xl animate-slideInLeft">
            <div className="w-full justify-between flex items-center p-4 border-b border-border-gray">
              <div className="flex items-center gap-4">
                <Link to="/" onClick={() => setOpen(false)}>
                  <img
                    src="/Cartify.png"
                    alt="Cartify"
                    className="h-[35px] w-auto"
                  />
                </Link>
              </div>
              <RxCross1
                size={22}
                className="cursor-pointer text-text-secondary hover:text-brand-orange transition-colors"
                onClick={() => setOpen(false)}
              />
            </div>

            {/* User Info in Mobile */}
            <div className="p-4 border-b border-border-gray">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <img
                    src={`${backend_url}${user?.avatar}`}
                    className="w-12 h-12 rounded-full border-2 border-brand-orange"
                    alt="Profile"
                  />
                  <div>
                    <p className="font-semibold text-text-primary">{user?.name}</p>
                    <p className="text-sm text-text-secondary">{user?.email}</p>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-text-primary hover:text-brand-orange"
                  onClick={() => setOpen(false)}
                >
                  <AiOutlineUser size={20} />
                  <span>Login / Register</span>
                </Link>
              )}
            </div>

            {/* Search Bar in Mobile */}
            <div className="p-4 border-b border-border-gray">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search products..."
                  className="w-full h-[40px] px-4 pr-10 border-border-gray border rounded-lg focus:border-brand-orange focus:outline-none text-text-primary"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                <AiOutlineSearch
                  size={20}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
              </div>
              {searchData && searchData.length > 0 && searchTerm && (
                <div className="mt-2 bg-card rounded-lg shadow-lg border border-border-gray max-h-[300px] overflow-y-auto">
                  {searchData.slice(0, 5).map((item, index) => (
                    <Link
                      to={`/product/${item._id}`}
                      key={index}
                      onClick={() => {
                        setOpen(false);
                        setSearchTerm("");
                        setSearchData(null);
                      }}
                    >
                      <div className="flex items-center gap-3 p-2 hover:bg-orange-bg rounded">
                        <img
                          src={`${backend_url}${item.images[0]}`}
                          className="w-10 h-10 rounded object-cover"
                          alt=""
                        />
                        <p className="text-sm text-text-primary">{item.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation Links */}
            <div className="p-4">
              <Navbar active={activeHeading} />
            </div>

            {/* Wishlist and Cart in Mobile */}
            <div className="p-4 border-t border-border-gray">
              <button
                onClick={() => {
                  setOpenWishlist(true);
                  setOpen(false);
                }}
                className="flex items-center gap-3 w-full p-2 hover:bg-orange-bg rounded-lg transition-colors"
              >
                <AiOutlineHeart size={22} />
                <span>Wishlist</span>
                {wishlist?.length > 0 && (
                  <span className="bg-success text-light-text text-xs rounded-full px-2 py-0.5">
                    {wishlist.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setOpenCart(true);
                  setOpen(false);
                }}
                className="flex items-center gap-3 w-full p-2 hover:bg-orange-bg rounded-lg transition-colors mt-2"
              >
                <AiOutlineShoppingCart size={22} />
                <span>Cart</span>
                {cart?.length > 0 && (
                  <span className="bg-success text-light-text text-xs rounded-full px-2 py-0.5">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>

            {/* Seller Button in Mobile */}
            <div className="p-4">
              <Link
                to={isSeller ? "/dashboard" : "/shop-create"}
                onClick={() => setOpen(false)}
                className="block bg-brand-orange hover:bg-orange-hover text-light-text text-center py-2 rounded-lg transition-colors font-medium"
              >
                {isSeller ? "Go to Dashboard" : "Become a Seller"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default Header;