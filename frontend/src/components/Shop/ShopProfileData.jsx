import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { AiOutlineSearch, AiOutlineStar } from "react-icons/ai";
import styles from "../../styles/styles";
import ProductCard from "../Route/ProductCard/ProductCard";
import { backend_url } from "../../server";
import Ratings from "../Products/Ratings";
import { getAllEventsShop } from "../../redux/actions/event";



const ShopProfileData = ({ isOwner }) => {
    const { products } = useSelector((state) => state.products);
    const { events } = useSelector((state) => state.events);
    const { seller } = useSelector((state) => state.seller);
    const { id } = useParams();


    const dispatch = useDispatch();
    const effectiveShopId = isOwner ? seller?._id : id;

    useEffect(() => {
        if (effectiveShopId) {
            dispatch(getAllEventsShop(effectiveShopId));
        }
    }, [dispatch, effectiveShopId]);

    const [active, setActive] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [sortBy, setSortBy] = useState("latest");

    const productList = useMemo(() => products || [], [products]);
    const eventList = useMemo(() => events || [], [events]);
    const allReviews = useMemo(
        () => productList.map((product) => product.reviews || []).flat(),
        [productList]
    );
    const categories = useMemo(
        () =>
            Array.from(
                new Set(productList.map((product) => product.category).filter(Boolean))
            ),
        [productList]
    );
    const filteredProducts = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const nextProducts = productList.filter((product) => {
            const matchesSearch =
                !normalizedSearch ||
                [product.name, product.brand, product.category]
                    .filter(Boolean)
                    .some((value) => value.toLowerCase().includes(normalizedSearch));
            const matchesCategory =
                !categoryFilter || product.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });

        return [...nextProducts].sort((a, b) => {
            if (sortBy === "price_low") {
                return Number(a.discountPrice || 0) - Number(b.discountPrice || 0);
            }
            if (sortBy === "price_high") {
                return Number(b.discountPrice || 0) - Number(a.discountPrice || 0);
            }
            if (sortBy === "rating") {
                return Number(b.ratings || 0) - Number(a.ratings || 0);
            }
            if (sortBy === "popular") {
                return Number(b.sold_out || 0) - Number(a.sold_out || 0);
            }

            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }, [categoryFilter, productList, searchTerm, sortBy]);


    return (
        <div className="w-full">
            <div className="flex w-full flex-col gap-4 rounded-lg bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="flex w-full flex-wrap gap-2">
                    {[
                        { id: 1, label: "Shop Products", count: productList.length },
                        { id: 2, label: "Running Events", count: eventList.length },
                        { id: 3, label: "Shop Reviews", count: allReviews.length },
                    ].map((tab) => (
                        <button
                            type="button"
                            key={tab.id}
                            onClick={() => setActive(tab.id)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                active === tab.id
                                    ? "bg-brand-orange text-white"
                                    : "bg-gray-100 text-gray-700 hover:text-brand-orange"
                            }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>
                <div>
                    {
                        isOwner && (
                            <div>
                                <Link to="/dashboard">
                                    <div className={`${styles.button} !rounded-[4px] h-[42px]`}>
                                        <span className="text-[#fff]">Go Dashboard</span>
                                    </div>
                                </Link>
                            </div>
                        )
                    }
                </div>
            </div>

            <br />

            {active === 1 && (
                <>
                    <div className="mb-5 rounded-lg bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="relative">
                                <AiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search this shop"
                                    className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-brand-orange"
                                />
                            </div>
                            <select
                                value={categoryFilter}
                                onChange={(event) => setCategoryFilter(event.target.value)}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
                            >
                                <option value="">All categories</option>
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value)}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-orange"
                            >
                                <option value="latest">Latest</option>
                                <option value="popular">Most sold</option>
                                <option value="rating">Top rated</option>
                                <option value="price_low">Price: low to high</option>
                                <option value="price_high">Price: high to low</option>
                            </select>
                        </div>
                    </div>
                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2 md:gap-[25px] lg:grid-cols-3 lg:gap-[25px] xl:grid-cols-4 xl:gap-[20px] mb-12 border-0">
                            {filteredProducts.map((product) => (
                                <ProductCard data={product} key={product._id} isShop={true} />
                            ))}
                        </div>
                    ) : (
                        <div className="mb-12 rounded-lg bg-white p-10 text-center shadow-sm">
                            <h5 className="text-[18px] font-semibold text-gray-900">
                                No matching products
                            </h5>
                            <p className="mt-1 text-sm text-gray-500">
                                Try a different search, category, or sort option.
                            </p>
                        </div>
                    )}
                </>
            )}

            {active === 2 && (
                <div className="w-full">
                    {eventList.length > 0 ? (
                        <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2 md:gap-[25px] lg:grid-cols-3 lg:gap-[25px] xl:grid-cols-4 xl:gap-[20px] mb-12 border-0">
                            {eventList.map((i) => (
                                <ProductCard
                                    data={i}
                                    key={i._id}
                                    isShop={true}
                                    isEvent={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mb-12 rounded-lg bg-white p-10 text-center shadow-sm">
                            <h5 className="text-[18px] font-semibold text-gray-900">
                                No running events
                            </h5>
                            <p className="mt-1 text-sm text-gray-500">
                                Active seller campaigns will appear here.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Shop reviews */}
            {active === 3 && (
                <div className="w-full">
                    {allReviews.length > 0 ? (
                        allReviews.map((item, index) => (
                            <div key={`${item.user?._id || "review"}-${index}`} className="w-full flex my-4 rounded-lg bg-white p-4 shadow-sm">
                                <img
                                    src={`${backend_url}/${item.user.avatar}`}
                                    className="w-[50px] h-[50px] rounded-full"
                                    alt=""
                                />
                                <div className="pl-2">
                                    <div className="flex w-full items-center">
                                        <h1 className="font-[600] pr-2">{item.user.name}</h1>
                                        <Ratings rating={item.rating} />
                                        {item.verifiedPurchase && (
                                            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                                Verified purchase
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-[400] text-[#000000a7]">{item?.comment}</p>

                                    <p className="text-[#000000a7] text-[14px]">{item.createdAt.substring(0, 10)}</p>


                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="mb-12 rounded-lg bg-white p-10 text-center shadow-sm">
                            <AiOutlineStar size={36} className="mx-auto mb-2 text-gray-300" />
                            <h5 className="text-[18px] font-semibold text-gray-900">
                                No shop reviews yet
                            </h5>
                            <p className="mt-1 text-sm text-gray-500">
                                Verified customer reviews will appear here.
                            </p>
                        </div>
                    )}
                </div>
            )}


        </div>
    );
};

export default ShopProfileData;
