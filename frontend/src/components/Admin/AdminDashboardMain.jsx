import React, { useEffect } from "react";
import {
  AiOutlineCheckCircle,
  AiOutlineClockCircle,
  AiOutlineMoneyCollect,
  AiOutlineShop,
  AiOutlineShoppingCart,
  AiOutlineWarning,
} from "react-icons/ai";
import { Link } from "react-router-dom";
import { DataGrid } from "@material-ui/data-grid";
import { useDispatch, useSelector } from "react-redux";
import { getAllOrdersOfAdmin } from "../../redux/actions/order";
import Loader from "../Layout/Loader";
import { getAllSellers } from "../../redux/actions/sellers";

const AdminDashboardMain = () => {
  const dispatch = useDispatch();
  const { adminOrders, adminOrderLoading } = useSelector((state) => state.order);
  const { sellers } = useSelector((state) => state.seller);

  useEffect(() => {
    dispatch(getAllOrdersOfAdmin());
    dispatch(getAllSellers());
  }, [dispatch]);

  const orders = adminOrders || [];
  const allSellers = sellers || [];
  const grossRevenue = orders.reduce(
    (acc, item) => acc + Number(item.totalPrice || 0),
    0
  );
  const platformRevenue = orders.reduce(
    (acc, item) =>
      acc + Number(item.platformFee || Number(item.totalPrice || 0) * 0.1),
    0
  );
  const pendingOrders = orders.filter((order) =>
    ["Pending", "Processing"].includes(order.status)
  ).length;
  const refundOrders = orders.filter((order) =>
    String(order.status || "").toLowerCase().includes("refund")
  ).length;
  const unpaidCodOrders = orders.filter(
    (order) =>
      order.paymentInfo?.type === "Cash On Delivery" &&
      order.paymentInfo?.status !== "Succeeded"
  ).length;
  const pendingSellers = allSellers.filter(
    (seller) => seller.verificationStatus === "pending"
  ).length;
  const suspendedSellers = allSellers.filter(
    (seller) => seller.accountStatus === "suspended"
  ).length;

  const columns = [
    { field: "id", headerName: "Order ID", minWidth: 170, flex: 0.8 },
    {
      field: "status",
      headerName: "Status",
      minWidth: 140,
      flex: 0.7,
      renderCell: (params) => (
        <span
          className={
            params.value === "Delivered" ? "text-green-600" : "text-orange-600"
          }
        >
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
      minWidth: 180,
      flex: 0.9,
    },
    {
      field: "total",
      headerName: "Total",
      minWidth: 120,
      flex: 0.6,
    },
    {
      field: "createdAt",
      headerName: "Order Date",
      minWidth: 130,
      flex: 0.7,
    },
  ];

  const row = orders.slice(0, 8).map((item) => ({
    id: item._id,
    itemsQty: item?.cart?.reduce((acc, item) => acc + item.qty, 0),
    total: `$${Number(item?.totalPrice || 0).toFixed(2)}`,
    status: item?.status,
    payment: `${item?.paymentInfo?.type || "N/A"} / ${
      item?.paymentInfo?.status || "Pending"
    }`,
    createdAt: item?.createdAt?.slice(0, 10),
  }));

  const overviewCards = [
    {
      label: "Platform Revenue",
      value: `$${platformRevenue.toFixed(2)}`,
      note: `$${grossRevenue.toFixed(2)} gross sales`,
      icon: <AiOutlineMoneyCollect size={30} />,
      tone: "text-green-600 bg-green-50",
    },
    {
      label: "Orders",
      value: orders.length,
      note: `${pendingOrders} pending`,
      icon: <AiOutlineShoppingCart size={30} />,
      tone: "text-orange-600 bg-orange-50",
      link: "/admin-orders",
    },
    {
      label: "COD Unpaid",
      value: unpaidCodOrders,
      note: "Monitor collection risk",
      icon: <AiOutlineClockCircle size={30} />,
      tone: "text-yellow-600 bg-yellow-50",
      link: "/admin-orders",
    },
    {
      label: "Refunds",
      value: refundOrders,
      note: "Open refund workflow",
      icon: <AiOutlineWarning size={30} />,
      tone: "text-red-600 bg-red-50",
      link: "/admin-orders",
    },
    {
      label: "Sellers",
      value: allSellers.length,
      note: `${pendingSellers} pending, ${suspendedSellers} suspended`,
      icon: <AiOutlineShop size={30} />,
      tone: "text-blue-600 bg-blue-50",
      link: "/admin-sellers",
    },
    {
      label: "Healthy Sellers",
      value: allSellers.filter((seller) => seller.accountStatus !== "suspended")
        .length,
      note: "Active seller accounts",
      icon: <AiOutlineCheckCircle size={30} />,
      tone: "text-teal-600 bg-teal-50",
      link: "/admin-sellers",
    },
  ];

  return (
    <>
      {adminOrderLoading ? (
        <Loader />
      ) : (
        <div className="w-full p-4">
          <h3 className="text-[22px] font-Poppins pb-2">Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {overviewCards.map((card) => {
              const content = (
                <div className="bg-white shadow rounded-lg p-5 border border-gray-100 h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{card.label}</p>
                      <h5 className="pt-1 text-[24px] font-[600] text-gray-800">
                        {card.value}
                      </h5>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.tone}`}
                    >
                      {card.icon}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">{card.note}</p>
                </div>
              );

              return card.link ? (
                <Link key={card.label} to={card.link}>
                  {content}
                </Link>
              ) : (
                <div key={card.label}>{content}</div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[22px] font-Poppins">Latest Orders</h3>
            <Link to="/admin-orders" className="text-sm text-orange-600">
              View all orders
            </Link>
          </div>
          <div className="w-full min-h-[45vh] bg-white rounded">
            <DataGrid
              rows={row}
              columns={columns}
              pageSize={4}
              disableSelectionOnClick
              autoHeight
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboardMain;
