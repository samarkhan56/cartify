import React, { useEffect } from "react";
import {
    AiOutlineArrowRight,
    AiOutlineCheckCircle,
    AiOutlineClockCircle,
    AiOutlineLineChart,
    AiOutlineMoneyCollect,
    AiOutlineShoppingCart,
    AiOutlineShop,
    AiOutlineWarning,
} from "react-icons/ai";
import { Link } from "react-router-dom";
import { MdBorderClear } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { getAllOrdersOfShop } from "../../redux/actions/order";
import { getAllProductsShop } from "../../redux/actions/product";
import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";

const DashboardHero = () => {
    const dispatch = useDispatch();
    const { orders } = useSelector((state) => state.order);
    const { seller } = useSelector((state) => state.seller);
    const { products } = useSelector((state) => state.products);

    useEffect(() => {
        if (seller?._id) {
            dispatch(getAllOrdersOfShop(seller._id));
            dispatch(getAllProductsShop(seller._id, true));
        }
    }, [dispatch, seller?._id]);

    const availableBalance = seller?.availableBalance?.toFixed(2) || "0.00";

    const totalSales = orders?.reduce((acc, order) => acc + Number(order.totalPrice || 0), 0) || 0;
    const deliveredOrders = orders?.filter((order) => order.status === "Delivered").length || 0;
    const pendingOrders = orders?.filter((order) => ["Pending", "Processing"].includes(order.status)).length || 0;
    const refundOrders = orders?.filter((order) => String(order.status || "").toLowerCase().includes("refund")).length || 0;
    const unpaidCodOrders = orders?.filter(
        (order) =>
            order.paymentInfo?.type === "Cash On Delivery" &&
            order.paymentInfo?.status !== "Succeeded"
    ).length || 0;
    const lowStockProducts = products?.filter(
        (product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 5
    ) || [];
    const outOfStockProducts = products?.filter((product) => Number(product.stock || 0) === 0).length || 0;
    const pendingApprovalProducts = products?.filter((product) => product.approvalStatus === "pending").length || 0;
    const approvedProducts = products?.filter(
        (product) => !product.approvalStatus || product.approvalStatus === "approved"
    ).length || 0;

    const getStatusColor = (status) => {
        switch(status) {
            case "Delivered": return "text-green-600";
            case "Processing": return "text-yellow-600";
            case "Shipped": return "text-blue-600";
            default: return "text-red-500";
        }
    };

    const columns = [
        { field: "id", headerName: "Order ID", minWidth: 200, flex: 0.8 },
        {
            field: "status",
            headerName: "Status",
            minWidth: 130,
            flex: 0.6,
            renderCell: (params) => (
                <span className={`font-medium ${getStatusColor(params.value)}`}>
                    {params.value}
                </span>
            ),
        },
        {
            field: "itemsQty",
            headerName: "Items",
            type: "number",
            minWidth: 100,
            flex: 0.5,
        },
        {
            field: "payment",
            headerName: "Payment",
            minWidth: 150,
            flex: 0.7,
            renderCell: (params) => (
                <span className={params.row.paymentStatus === "Succeeded" ? "text-green-600" : "text-orange-600"}>
                    {params.value}
                </span>
            ),
        },
        {
            field: "total",
            headerName: "Total",
            type: "number",
            minWidth: 120,
            flex: 0.6,
            renderCell: (params) => (
                <span className="font-semibold text-gray-800">${params.value}</span>
            ),
        },
        {
            field: "action",
            headerName: "",
            minWidth: 80,
            flex: 0.3,
            renderCell: (params) => (
                <Link to={`/order/${params.id}`}>
                    <Button className="text-orange-600">
                        <AiOutlineArrowRight size={20} />
                    </Button>
                </Link>
            ),
        },
    ];

    const rows = orders?.map((item) => ({
        id: item._id,
        itemsQty: item.cart?.reduce((acc, item) => acc + item.qty, 0) || 0,
        total: item.totalPrice,
        status: item.status,
        payment: item.paymentInfo?.type || "N/A",
        paymentStatus: item.paymentInfo?.status,
    })) || [];

    const metricCards = [
        {
            label: "Pending Orders",
            value: pendingOrders,
            note: `${deliveredOrders} delivered`,
            icon: <AiOutlineClockCircle size={32} />,
            tone: "text-yellow-600 bg-yellow-50",
        },
        {
            label: "COD Unpaid",
            value: unpaidCodOrders,
            note: "Collect on delivery",
            icon: <AiOutlineMoneyCollect size={32} />,
            tone: "text-orange-600 bg-orange-50",
        },
        {
            label: "Refunds",
            value: refundOrders,
            note: "Needs attention",
            icon: <AiOutlineWarning size={32} />,
            tone: "text-red-600 bg-red-50",
        },
        {
            label: "Approved Products",
            value: approvedProducts,
            note: `${pendingApprovalProducts} pending approval`,
            icon: <AiOutlineCheckCircle size={32} />,
            tone: "text-green-600 bg-green-50",
        },
    ];

    return (
        <div className="w-full p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Seller Dashboard</h1>
                <p className="text-gray-500">Welcome back, {seller?.name || "Seller"}!</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* Balance Card */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/80 text-sm">Available Balance</p>
                            <h3 className="text-2xl font-bold mt-1">${availableBalance}</h3>
                        </div>
                        <AiOutlineMoneyCollect size={40} className="text-white/50" />
                    </div>
                    <Link to="/dashboard-withdraw-money">
                        <button className="mt-4 text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors">
                            Withdraw Money
                        </button>
                    </Link>
                </div>

                {/* Total Sales Card */}
                <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Sales</p>
                            <h3 className="text-2xl font-bold text-gray-800">${totalSales.toFixed(2)}</h3>
                        </div>
                        <AiOutlineLineChart size={40} className="text-green-500/50" />
                    </div>
                    <p className="text-gray-400 text-xs mt-2">Lifetime revenue</p>
                </div>

                {/* Orders Card */}
                <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Orders</p>
                            <h3 className="text-2xl font-bold text-gray-800">{orders?.length || 0}</h3>
                        </div>
                        <AiOutlineShoppingCart size={40} className="text-orange-500/50" />
                    </div>
                    <p className="text-gray-400 text-xs mt-2">{pendingOrders} pending orders</p>
                </div>

                {/* Products Card */}
                <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Products</p>
                            <h3 className="text-2xl font-bold text-gray-800">{products?.length || 0}</h3>
                        </div>
                        <AiOutlineShop size={40} className="text-blue-500/50" />
                    </div>
                    <Link to="/dashboard-products">
                        <button className="mt-4 text-sm text-orange-600 hover:text-orange-700 transition-colors">
                            Manage Products
                        </button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {metricCards.map((card) => (
                    <div key={card.label} className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm">{card.label}</p>
                                <h3 className="text-2xl font-bold text-gray-800">{card.value}</h3>
                            </div>
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.tone}`}>
                                {card.icon}
                            </div>
                        </div>
                        <p className="text-gray-400 text-xs mt-2">{card.note}</p>
                    </div>
                ))}
            </div>

            {(lowStockProducts.length > 0 || outOfStockProducts > 0) && (
                <div className="bg-white rounded-xl shadow-md border border-orange-100 p-5 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Stock Alerts</h2>
                            <p className="text-sm text-gray-500">
                                {lowStockProducts.length} low-stock products, {outOfStockProducts} out of stock
                            </p>
                        </div>
                        <Link to="/dashboard-products" className="text-sm text-orange-600 hover:text-orange-700">
                            Manage stock
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {lowStockProducts.slice(0, 6).map((product) => (
                            <div key={product._id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                                    <p className="text-xs text-gray-500">{product.category || "Uncategorized"}</p>
                                </div>
                                <span className="text-sm font-semibold text-orange-600">{product.stock} left</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Orders Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="border-b border-gray-100 p-5">
                    <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
                    <p className="text-gray-500 text-sm">Latest customer orders</p>
                </div>
                <div className="p-5">
                    {rows.length > 0 ? (
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            pageSize={10}
                            disableSelectionOnClick
                            autoHeight
                            className="border-0"
                        />
                    ) : (
                        <div className="text-center py-8">
                            <MdBorderClear size={48} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No orders yet</p>
                            <p className="text-sm text-gray-400">Orders will appear here once customers purchase your products</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardHero;
