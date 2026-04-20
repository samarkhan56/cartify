import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom";
import styles from "../../../styles/styles";
import {
    AiFillHeart,
    AiFillStar,
    AiOutlineEye,
    AiOutlineHeart,
    AiOutlineShoppingCart,
    AiOutlineStar,
} from "react-icons/ai";
import { backend_url } from "../../../server";
import ProductDetailsCard from "../ProductDetailsCard/ProductDetailsCard.jsx";
import { useDispatch, useSelector } from 'react-redux'
import { addToWishlist, removeFromWishlist } from '../../../redux/actions/wishlist';
import { addTocart } from '../../../redux/actions/cart';
import { toast } from 'react-toastify';
import Ratings from "../../Products/Ratings";

const ProductCard = ({ data, isEvent }) => {
    const { wishlist } = useSelector((state) => state.wishlist);
    const { cart } = useSelector((state) => state.cart);
    const [click, setClick] = useState(false);
    const [open, setOpen] = useState(false);
    const dispatch = useDispatch();

    useEffect(() => {
        if (wishlist && wishlist.find((i) => i._id === data._id)) {
            setClick(true);
        } else {
            setClick(false);
        }
    }, [wishlist]);

    const removeFromWishlistHandler = (data) => {
        setClick(!click);
        dispatch(removeFromWishlist(data));
    }

    const addToWishlistHandler = (data) => {
        setClick(!click);
        dispatch(addToWishlist(data))
    }

    const addToCartHandler = (id) => {
        const isItemExists = cart && cart.find((i) => i._id === id);

        if (isItemExists) {
            toast.error("item already in cart!")
        } else {
            if (data.stock < 1) {
                toast.error("Product stock limited!");
            } else {
                const cartData = { ...data, qty: 1 };
                dispatch(addTocart(cartData));
                toast.success("Item added to cart Successfully!")
            }
        }
    }

    // Calculate discount percentage
    const discountPercentage = data.originalPrice > data.discountPrice 
        ? Math.round(((data.originalPrice - data.discountPrice) / data.originalPrice) * 100)
        : 0;

    return (
        <>
            <div className='group w-full bg-card rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-border-gray/50 relative'>
                {/* Discount Badge */}
                {discountPercentage > 0 && (
                    <div className='absolute top-2 left-2 z-10 bg-gradient-to-r from-brand-orange to-orange-hover text-light-text text-xs font-bold px-2 py-1 rounded-full'>
                        -{discountPercentage}%
                    </div>
                )}
                
                {/* Sold Out Badge */}
                {data.stock === 0 && (
                    <div className='absolute top-2 left-2 z-10 bg-red-500 text-light-text text-xs font-bold px-2 py-1 rounded-full'>
                        Sold Out
                    </div>
                )}

                {/* Image Container */}
                <Link to={`${isEvent === true ? `/product/${data._id}?isEvent=true` : `/product/${data._id}`}`}>
                    <div className='relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden'>
                        <img
                            src={`${backend_url}${data.images && data.images[0]}`}
                            alt={data.name}
                            className='w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-110'
                        />
                        {/* Image Overlay */}
                        <div className='absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                    </div>
                </Link>

                {/* Content */}
                <div className='p-4'>
                    {/* Shop Name */}
                    <Link to={`${isEvent === true ? `/product/${data._id}?isEvent=true` : `/product/${data._id}`}`}>
                        <h5 className='text-xs text-brand-orange font-medium mb-1 hover:underline'>
                            {data.shop.name}
                        </h5>
                    </Link>
                    
                    {/* Product Name */}
                    <Link to={`/product/${data._id}`}>
                        <h4 className='font-semibold text-text-primary text-sm md:text-base mb-2 line-clamp-2 min-h-[40px] group-hover:text-brand-orange transition-colors'>
                            {data.name.length > 45 ? data.name.slice(0, 45) + '...' : data.name}
                        </h4>
                    </Link>

                    {/* Rating */}
                    <div className='flex items-center gap-1 mb-2'>
                        <Ratings rating={data?.ratings} />
                        <span className='text-xs text-text-secondary'>({data?.ratings?.length || 0})</span>
                    </div>

                    {/* Price Section */}
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <h5 className='text-lg font-bold text-brand-orange'>
                                ${data.discountPrice}
                            </h5>
                            {data.originalPrice > data.discountPrice && (
                                <h4 className='text-sm text-text-secondary line-through'>
                                    ${data.originalPrice}
                                </h4>
                            )}
                        </div>
                        <span className="text-xs font-medium text-success">
                            {data?.sold_out || 0} sold
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className='flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border-gray'>
                        {/* Add to Cart Button */}
                        <button
                            onClick={() => addToCartHandler(data._id)}
                            disabled={data.stock === 0}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg transition-all duration-300 text-sm font-medium ${
                                data.stock === 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-light-text hover:scale-105'
                            }`}
                        >
                            <AiOutlineShoppingCart size={16} />
                            <span>{data.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                        </button>

                        {/* Wishlist Button */}
                        <button
                            onClick={() => click ? removeFromWishlistHandler(data) : addToWishlistHandler(data)}
                            className='w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-red-50 transition-all duration-300'
                            title={click ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                            {click ? (
                                <AiFillHeart size={18} className="text-red-500" />
                            ) : (
                                <AiOutlineHeart size={18} className="text-text-secondary hover:text-red-500" />
                            )}
                        </button>

                        {/* Quick View Button */}
                        <button
                            onClick={() => setOpen(!open)}
                            className='w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-brand-orange/10 transition-all duration-300'
                            title='Quick view'
                        >
                            <AiOutlineEye size={18} className="text-text-secondary hover:text-brand-orange" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick View Modal */}
            {open ? <ProductDetailsCard setOpen={setOpen} data={data} /> : null}
        </>
    )
}

export default ProductCard