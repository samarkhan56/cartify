import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { categoriesData } from "../../static/data";
import {
  AiOutlineHeart,
  AiOutlineSearch,
  AiOutlineShoppingCart,
} from "react-icons/ai";
import { IoIosArrowDown } from "react-icons/io";
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
  const [open, setOpen] = useState(false);

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    const filteredProducts =
      allProducts &&
      allProducts.filter((product) =>
        product.name.toLowerCase().includes(term.toLowerCase())
      );
    setSearchData(filteredProducts);
  };

  useEffect(() => {
    const handleScroll = () => {
      setActive(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* ========== ESTORE STYLE HEADER ========== */}
      <header
        className={`${
          active ? "fixed top-0 left-0 right-0 z-50 bg-white shadow-md" : "bg-white"
        } hidden 800px:block transition-all duration-300 border-b border-gray-100`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Main Header Row */}
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link to="/" className="shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-gray-800">Cartify</span>
                <span className="text-2xl font-bold text-brand-orange">.</span>
              </div>
            </Link>

            {/* Navigation Menu - Center */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link to="/" className="text-gray-700 hover:text-brand-orange transition-colors text-sm font-medium">
                Home
              </Link>
              <div className="relative">
                <button
                  onClick={() => setDropDown(!dropDown)}
                  className="flex items-center gap-1 text-gray-700 hover:text-brand-orange transition-colors text-sm font-medium"
                >
                  Category
                  <IoIosArrowDown size={12} />
                </button>
                {dropDown && (
                  <DropDown categoriesData={categoriesData} setDropDown={setDropDown} />
                )}
              </div>
              <Link to="/products" className="text-gray-700 hover:text-brand-orange transition-colors text-sm font-medium">
                Latest
              </Link>
              {/* <Link to="/blog" className="text-gray-700 hover:text-brand-orange transition-colors text-sm font-medium">
                Blog
              </Link> */}
              <Link to="/pages" className="text-gray-700 hover:text-brand-orange transition-colors text-sm font-medium">
                Pages
              </Link>
              <Link to="/contact" className="text-gray-700 hover:text-brand-orange transition-colors text-sm font-medium">
                Contact
              </Link>
            </nav>

            {/* Right Section - HOT, Search, Icons, Sign In */}
            <div className="flex items-center gap-5">
              {/* HOT Badge */}
              {/* <div className="hidden md:flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                <span>HOT</span>
              </div> */}

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search product"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-48 h-9 px-4 pr-8 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange"
                />
                <AiOutlineSearch
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-brand-orange"
                />
                {searchData && searchData.length > 0 && searchTerm && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl z-50 border border-gray-100 max-h-80 overflow-y-auto">
                    {searchData.slice(0, 5).map((item) => (
                      <Link
                        key={item._id}
                        to={`/product/${item._id}`}
                        onClick={() => setSearchTerm("")}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                      >
                        <img
                          src={`${backend_url}${item.images[0]}`}
                          className="w-10 h-10 rounded object-cover"
                          alt=""
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          <p className="text-xs text-brand-orange">${item.discountPrice}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Wishlist */}
              <button onClick={() => setOpenWishlist(true)} className="relative">
                <AiOutlineHeart size={20} className="text-gray-700 hover:text-brand-orange transition-colors" />
                {wishlist?.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button onClick={() => setOpenCart(true)} className="relative">
                <AiOutlineShoppingCart size={20} className="text-gray-700 hover:text-brand-orange transition-colors" />
                {cart?.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>

              {/* Sign In / User */}
              {isAuthenticated ? (
                <Link to="/profile">
                  <img
                    src={`${backend_url}${user?.avatar}`}
                    className="w-7 h-7 rounded-full border border-gray-200"
                    alt=""
                  />
                </Link>
              ) : (
                <Link to="/login" className="text-gray-700 hover:text-brand-orange transition-colors text-sm font-medium">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========== MOBILE HEADER ========== */}
      <div className="800px:hidden bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <BiMenuAltLeft size={24} onClick={() => setOpen(true)} className="text-gray-700" />
          <Link to="/">
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold text-gray-800">Cartify</span>
              <span className="text-xl font-bold text-brand-orange">.</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={() => setOpenCart(true)} className="relative">
              <AiOutlineShoppingCart size={20} className="text-gray-700" />
              {cart?.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
            {isAuthenticated ? (
              <Link to="/profile">
                <img src={`${backend_url}${user?.avatar}`} className="w-6 h-6 rounded-full" alt="" />
              </Link>
            ) : (
              <Link to="/login">
                <CgProfile size={20} className="text-gray-700" />
              </Link>
            )}
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search product"
              className="w-full h-9 px-4 pr-8 bg-gray-100 rounded-full text-sm"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <AiOutlineSearch size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Popups */}
      {openCart && <Cart setOpenCart={setOpenCart} />}
      {openWishlist && <Wishlist setOpenWishlist={setOpenWishlist} />}

      {/* Mobile Sidebar */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-gray-800">Cartify</span>
                <span className="text-lg font-bold text-brand-orange">.</span>
              </div>
              <RxCross1 size={18} onClick={() => setOpen(false)} className="cursor-pointer text-gray-500" />
            </div>
            <div className="space-y-4">
              <Link to="/" className="block text-gray-700">Home</Link>
              <button
                onClick={() => setDropDown(!dropDown)}
                className="flex items-center gap-2 text-gray-700 w-full"
              >
                Category
                <IoIosArrowDown size={12} />
              </button>
              <Link to="/products" className="block text-gray-700">Latest</Link>
              <Link to="/blog" className="block text-gray-700">Blog</Link>
              <Link to="/pages" className="block text-gray-700">Pages</Link>
              <Link to="/contact" className="block text-gray-700">Contact</Link>
              <Link to="/login" className="block text-gray-700">Sign In</Link>
              <Link to="/shop-create" className="block text-gray-700">Become a Seller</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;