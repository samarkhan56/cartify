import React, { useMemo } from 'react'
import { useSelector } from "react-redux";
import styles from "../../styles/styles";
import ProductCard from "../Route/ProductCard/ProductCard"




const SuggestedProduct = ({ data }) => {
    const { allProducts } = useSelector((state) => state.products);
    const relatedProducts = useMemo(() => {
        if (!data || !allProducts) {
            return [];
        }

        return allProducts
            .filter((product) => product._id !== data._id)
            .map((product) => {
                let score = 0;

                if (product.category === data.category) score += 4;
                if (product.brand && product.brand === data.brand) score += 3;
                if (product.shopId && String(product.shopId) === String(data.shopId)) score += 2;
                score += Math.min(Number(product.ratings || 0), 5) / 5;
                score += Math.min(Number(product.sold_out || 0), 20) / 20;

                return { product, score };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map((item) => item.product);
    }, [allProducts, data])

    return (
        <div>
            {
                data ? (
                    <div
                        className={`p-4 ${styles.section}`}>
                        <div className="mb-5 border-b pb-3">
                            <h2 className={`${styles.heading} text-[25px] font-[500]`}>
                                Related Products
                            </h2>
                            <p className="text-sm text-text-secondary">
                                Similar picks from matching categories, brands, and sellers.
                            </p>
                        </div>
                        {relatedProducts.length > 0 ? (
                            <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2 md:gap-[25px] lg:grid-cols-4 lg:gap-[25px] xl:grid-cols-5 xl:gap-[30px] mb-12">
                                {
                                    relatedProducts.map((i) => (
                                        <ProductCard data={i} key={i._id} />
                                    ))
                                }
                            </div>
                        ) : (
                            <div className="mb-12 rounded-lg border border-border-gray bg-white p-8 text-center">
                                <h3 className="font-semibold text-text-primary">
                                    No related products yet
                                </h3>
                                <p className="mt-1 text-sm text-text-secondary">
                                    More recommendations will appear as similar items are added.
                                </p>
                            </div>
                        )}
                    </div>
                ) : null
            }
        </div>
    )
}

export default SuggestedProduct
