import axios from "axios";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import {
    AiOutlineCheckCircle,
    AiOutlineEnvironment,
    AiOutlinePhone,
    AiOutlineSafetyCertificate,
    AiOutlineShop,
    AiOutlineStar,
} from "react-icons/ai";
import { getAllProductsShop } from "../../redux/actions/product";
import { backend_url, server } from "../../server";
import styles from "../../styles/styles";
import Loader from "../Layout/Loader";



const ShopInfo = ({ isOwner }) => {
    const [data, setData] = useState({});
    const { products } = useSelector((state) => state.products);
    const { seller } = useSelector((state) => state.seller);
    const [isLoading, setIsLoading] = useState(false);

    const { id } = useParams();
    const dispatch = useDispatch();
    const effectiveShopId = isOwner ? seller?._id : id;


    useEffect(() => {
        if (!effectiveShopId) {
            return;
        }

        dispatch(getAllProductsShop(effectiveShopId, isOwner));
        setIsLoading(true);
        axios.get(`${server}/shop/get-shop-info/${effectiveShopId}`).then((res) => {
            setData(res.data.shop);
            setIsLoading(false);
        }).catch((error) => {
            console.log(error);
            setIsLoading(false);
        })
    }, [dispatch, effectiveShopId, isOwner])


    const logoutHandler = async () => {
        axios.get(`${server}/shop/logout`, {
            withCredentials: true,
        });
        window.location.reload();
    };


    const totalReviewsLength =
        products &&
        products.reduce((acc, product) => acc + product.reviews.length, 0);

    const totalRatings = products && products.reduce((acc, product) => acc + product.reviews.reduce((sum, review) => sum + review.rating, 0), 0);

    const averageRating = totalRatings / totalReviewsLength || 0;
    const totalSold =
        products &&
        products.reduce((acc, product) => acc + Number(product.sold_out || 0), 0);
    const isVerified = data?.isVerified || data?.verificationStatus === "approved";
    const isSuspended = data?.accountStatus === "suspended";



    return (
        <>
            {
                isLoading ? (
                    <Loader />
                ) : (
                    <div className="p-5">
                        <div className="w-full py-5">
                            <div className="w-full flex item-center justify-center">
                                <img
                                    src={`${backend_url}${data.avatar}`}
                                    alt=""
                                    className="w-[150px] h-[150px] object-cover rounded-full border-4 border-white shadow-md"
                                />
                            </div>
                            <div className="text-center py-3">
                                <h3 className="text-[22px] font-semibold text-gray-900">{data.name}</h3>
                                <div className="mt-2 flex flex-wrap justify-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                            isVerified
                                                ? "bg-green-100 text-green-700"
                                                : "bg-amber-100 text-amber-700"
                                        }`}
                                    >
                                        <AiOutlineCheckCircle size={14} />
                                        {isVerified ? "Verified seller" : "Verification pending"}
                                    </span>
                                    {isSuspended && (
                                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                            Suspended
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-[15px] text-gray-600 leading-6 text-center">
                                {data.description || "This seller has not added a shop description yet."}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                                <p className="text-xl font-bold text-gray-900">{products?.length || 0}</p>
                                <p className="text-xs text-gray-500">Products</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                                <p className="text-xl font-bold text-gray-900">{Number(averageRating).toFixed(1)}</p>
                                <p className="text-xs text-gray-500">Rating</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                                <p className="text-xl font-bold text-gray-900">{totalReviewsLength || 0}</p>
                                <p className="text-xs text-gray-500">Reviews</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                                <p className="text-xl font-bold text-gray-900">{totalSold || 0}</p>
                                <p className="text-xs text-gray-500">Sold</p>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-4">
                            <div className="flex items-start gap-3">
                                <AiOutlineEnvironment className="mt-1 text-brand-orange" />
                                <div>
                                    <h5 className="font-[600] text-gray-900">Address</h5>
                                    <h4 className="text-sm text-gray-600">{data.address || "Not provided"}</h4>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <AiOutlinePhone className="mt-1 text-brand-orange" />
                                <div>
                                    <h5 className="font-[600] text-gray-900">Phone Number</h5>
                                    <h4 className="text-sm text-gray-600">{data.phoneNumber || "Not provided"}</h4>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <AiOutlineStar className="mt-1 text-brand-orange" />
                                <div>
                                    <h5 className="font-[600] text-gray-900">Shop Ratings</h5>
                                    <h4 className="text-sm text-gray-600">{Number(averageRating).toFixed(2)}/5</h4>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <AiOutlineShop className="mt-1 text-brand-orange" />
                                <div>
                                    <h5 className="font-[600] text-gray-900">Joined On</h5>
                                    <h4 className="text-sm text-gray-600">{data?.createdAt?.slice(0, 10) || "N/A"}</h4>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <AiOutlineSafetyCertificate className="mt-1 text-brand-orange" />
                                <div>
                                    <h5 className="font-[600] text-gray-900">Seller Status</h5>
                                    <h4 className="text-sm text-gray-600">
                                        {isVerified ? "Approved to sell on Cartify" : "Awaiting verification review"}
                                    </h4>
                                </div>
                            </div>
                        </div>
                        {isOwner && (
                            <div className="py-3 px-4">
                                <Link to="/settings">
                                    <div className={`${styles.button} !w-full !h-[42px] !rounded-[5px]`}>
                                        <span className="text-white">Edit Shop</span>
                                    </div>
                                </Link>

                                <div className={`${styles.button} !w-full !h-[42px] !rounded-[5px]`}
                                    onClick={logoutHandler}
                                >
                                    <span className="text-white">Log Out</span>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </>
    );
};

export default ShopInfo;
