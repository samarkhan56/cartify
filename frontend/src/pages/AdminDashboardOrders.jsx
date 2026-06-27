import React, { useEffect, useMemo, useState } from "react";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import { DataGrid } from "@material-ui/data-grid";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  getAllOrdersOfAdmin,
  updateAdminRefundStatus,
} from "../redux/actions/order";

const AdminDashboardOrders = () => {
  const dispatch = useDispatch();
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const { adminOrders, adminRefundLoading } = useSelector(
    (state) => state.order
  );

  useEffect(() => {
    dispatch(getAllOrdersOfAdmin());
  }, [dispatch]);

  const orders = useMemo(() => adminOrders || [], [adminOrders]);
  const refundQueue = useMemo(
    () => orders.filter((order) => order.status === "Processing refund"),
    [orders]
  );
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
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
  }, [orders, paymentFilter, statusFilter]);

  const handleRefundResolution = async (orderId, status) => {
    try {
      await dispatch(updateAdminRefundStatus(orderId, status));
      toast.success(
        status === "Refund Success"
          ? "Refund approved successfully."
          : "Refund request rejected."
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const summaryCards = [
    {
      label: "All Orders",
      value: orders.length,
    },
    {
      label: "Pending",
      value: orders.filter((order) => ["Pending", "Processing"].includes(order.status)).length,
    },
    {
      label: "COD Unpaid",
      value: orders.filter(
        (order) =>
          order.paymentInfo?.type === "Cash On Delivery" &&
          order.paymentInfo?.status !== "Succeeded"
      ).length,
    },
    {
      label: "Refund Queue",
      value: refundQueue.length,
    },
    {
      label: "Refunded",
      value: orders.filter((order) => order.status === "Refund Success").length,
    },
  ];

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
      field: "customer",
      headerName: "Customer",
      type: "text",
      minWidth: 160,
      flex: 0.8,
    },
    {
      field: "createdAt",
      headerName: "Order Date",
      type: "number",
      minWidth: 130,
      flex: 0.8,
    },
    {
      field: "refundAction",
      headerName: "Refund Action",
      minWidth: 230,
      flex: 1,
      sortable: false,
      renderCell: (params) => {
        const order = orders.find((item) => item._id === params.id);

        if (order?.status !== "Processing refund") {
          return <span className="text-gray-400 text-sm">No action</span>;
        }

        return (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={adminRefundLoading}
              onClick={() => handleRefundResolution(params.id, "Refund Success")}
              className="px-3 py-1 rounded bg-green-600 text-white text-xs disabled:bg-gray-300"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={adminRefundLoading}
              onClick={() => handleRefundResolution(params.id, "Refund Rejected")}
              className="px-3 py-1 rounded bg-red-600 text-white text-xs disabled:bg-gray-300"
            >
              Reject
            </button>
          </div>
        );
      },
    },
  ];

  const row = filteredOrders.map((item) => ({
    id: item._id,
    itemsQty: item?.cart?.reduce((acc, item) => acc + item.qty, 0),
    total: `$${Number(item?.totalPrice || 0).toFixed(2)}`,
    status: item?.status,
    payment: `${item?.paymentInfo?.type || "N/A"} / ${
      item?.paymentInfo?.status || "Pending"
    }`,
    customer: item?.shippingAddress?.fullName || item?.user?.name || "Customer",
    createdAt: item?.createdAt?.slice(0, 10),
    refundAction: item.status,
  }));
  return (
    <div>
      <AdminHeader />
      <div className="w-full flex">
        <div className="flex items-start justify-between w-full">
          <div className="w-[80px] 800px:w-[330px]">
            <AdminSideBar active={2} />
          </div>

          <div className="w-full min-h-[45vh] pt-5 rounded flex justify-center">
            <div className="w-[97%]">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                {summaryCards.map((card) => (
                  <div key={card.label} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-2xl font-semibold text-gray-800">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-100 rounded-lg p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Order Management</h2>
                  <p className="text-sm text-gray-500">Filter by lifecycle and payment status.</p>
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
                    <option value="Refund Rejected">Refund rejected</option>
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

              {refundQueue.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 mb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Active Refund Queue
                      </h3>
                      <p className="text-sm text-gray-600">
                        {refundQueue.length} refund request
                        {refundQueue.length === 1 ? "" : "s"} waiting for admin
                        decision.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("refund")}
                      className="px-4 py-2 rounded-md bg-brand-orange text-white text-sm font-medium"
                    >
                      View refunds
                    </button>
                  </div>
                </div>
              )}

              <DataGrid
                rows={row}
                columns={columns}
                pageSize={10}
                disableSelectionOnClick
                autoHeight
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardOrders;
