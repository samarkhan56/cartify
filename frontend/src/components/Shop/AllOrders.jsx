import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Loader from "../Layout/Loader";
import { getAllOrdersOfShop } from "../../redux/actions/order";
import { AiOutlineArrowRight } from "react-icons/ai";

const AllOrders = () => {
    const { orders, isLoading } = useSelector((state) => state.order);
    const { seller } = useSelector((state) => state.seller);
    const [statusFilter, setStatusFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");

    const dispatch = useDispatch();

    useEffect(() => {
        if (seller?._id) {
            dispatch(getAllOrdersOfShop(seller._id));
        }
    }, [dispatch, seller?._id]);

    const sellerOrders = useMemo(() => orders || [], [orders]);
    const filteredOrders = useMemo(() => {
        return sellerOrders.filter((order) => {
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "refund"
                    ? String(order.status || "").toLowerCase().includes("refund")
                    : order.status === statusFilter);
            const matchesPayment =
                paymentFilter === "all" ||
                (paymentFilter === "cod-unpaid"
                    ? order.paymentInfo?.type === "Cash On Delivery" &&
                    order.paymentInfo?.status !== "Succeeded"
                    : order.paymentInfo?.type === paymentFilter);

            return matchesStatus && matchesPayment;
        });
    }, [sellerOrders, paymentFilter, statusFilter]);

    const columns = [
        { field: "id", headerName: "Order ID", minWidth: 150, flex: 0.7 },

        {
            field: "status",
            headerName: "Status",
            minWidth: 130,
            flex: 0.7,
            cellClassName: (params) => {
                return params.getValue(params.id, "status") === "Delivered"
                    ? "greenColor"
                    : "redColor";
            },
        },
        {
            field: "itemsQty",
            headerName: "Items Qty",
            type: "number",
            minWidth: 130,
            flex: 0.7,
        },

        {
            field: "total",
            headerName: "Total",
            type: "number",
            minWidth: 130,
            flex: 0.8,
        },
        {
            field: "payment",
            headerName: "Payment",
            type: "text",
            minWidth: 170,
            flex: 0.8,
        },

        {
            field: " ",
            flex: 1,
            minWidth: 150,
            headerName: "",
            type: "number",
            sortable: false,
            renderCell: (params) => {
                return (
                    <>
                        <Link to={`/order/${params.id}`}>
                            <Button>
                                <AiOutlineArrowRight size={20} />
                            </Button>
                        </Link>
                    </>
                );
            },
        },
    ];

    const row = filteredOrders.map((item) => ({
        id: item._id,
        itemsQty: item.cart.length,
        total: `$${Number(item.totalPrice || 0).toFixed(2)}`,
        status: item.status,
        payment: `${item?.paymentInfo?.type || "N/A"} / ${
            item?.paymentInfo?.status || "Pending"
        }`,
    }));

    return (
        <>
            {isLoading ? (
                <Loader />
            ) : (
                <div className="w-full mx-8 pt-1 mt-10">
                    <div className="bg-white border border-gray-100 rounded-lg p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Orders</h2>
                            <p className="text-sm text-gray-500">
                                {filteredOrders.length} of {sellerOrders.length} orders shown
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="border border-gray-200 rounded-md px-3 py-2 text-sm"
                            >
                                <option value="all">All statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Processing">Processing</option>
                                <option value="Delivered">Delivered</option>
                                <option value="refund">Refunds</option>
                            </select>
                            <select
                                value={paymentFilter}
                                onChange={(e) => setPaymentFilter(e.target.value)}
                                className="border border-gray-200 rounded-md px-3 py-2 text-sm"
                            >
                                <option value="all">All payments</option>
                                <option value="Cash On Delivery">Cash on Delivery</option>
                                <option value="Stripe">Stripe</option>
                                <option value="cod-unpaid">COD unpaid</option>
                            </select>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg">
                    <DataGrid
                        rows={row}
                        columns={columns}
                        pageSize={10}
                        disableSelectionOnClick
                        autoHeight
                    />
                    </div>
                </div>
            )}
        </>
    );
};

export default AllOrders;
