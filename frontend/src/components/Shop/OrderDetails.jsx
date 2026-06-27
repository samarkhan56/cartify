import React, { useEffect, useMemo, useState } from "react";
import { BsFillBagFill } from "react-icons/bs";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { backend_url, server } from "../../server";
import { getAllOrdersOfShop } from "../../redux/actions/order";
import { useDispatch, useSelector } from "react-redux";
import OrderTimeline, { ORDER_STEPS, REFUND_STEPS } from "../Order/OrderTimeline";

const getAssetUrl = (path) =>
  path?.startsWith("http") ? path : `${backend_url}${path || ""}`;

const money = (value) => Number(value || 0).toFixed(2);

const getAvailableStatuses = (status) => {
  const steps = REFUND_STEPS.includes(status) ? REFUND_STEPS : ORDER_STEPS;
  const currentIndex = Math.max(steps.indexOf(status), 0);
  return steps.slice(currentIndex);
};

const OrderDetails = () => {
  const { orders } = useSelector((state) => state.order);
  const { seller } = useSelector((state) => state.seller);
  const dispatch = useDispatch();
  const [status, setStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (seller?._id) {
      dispatch(getAllOrdersOfShop(seller._id));
    }
  }, [dispatch, seller?._id]);

  const data = orders && orders.find((item) => item._id === id);
  const availableStatuses = useMemo(
    () => getAvailableStatuses(data?.status || "Pending"),
    [data?.status]
  );

  useEffect(() => {
    if (data?.status) {
      setStatus(data.status);
    }
  }, [data?.status]);

  const updateOrderStatus = async () => {
    const nextStatus = status || data?.status;
    const isRefundUpdate = data?.status === "Processing refund" || data?.status === "Refund Success";
    const endpoint = isRefundUpdate
      ? `${server}/order/order-refund-success/${id}`
      : `${server}/order/update-order-status/${id}`;

    setIsUpdating(true);
    await axios
      .put(endpoint, { status: nextStatus }, { withCredentials: true })
      .then(() => {
        toast.success("Order updated!");
        dispatch(getAllOrdersOfShop(seller._id));
        if (!isRefundUpdate) {
          navigate("/dashboard-orders");
        }
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || "Order update failed.");
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800">Order not found</h1>
          <p className="text-gray-500 mt-2">The order may still be loading or is unavailable.</p>
          <Link to="/dashboard-orders" className="inline-block mt-4 text-orange-600">
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const itemCount = data.cart?.reduce((total, item) => total + Number(item.qty || 0), 0) || 0;
  const sellerReceivable = Number(data.totalPrice || 0) - Number(data.platformFee || 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <BsFillBagFill size={30} className="text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Seller Order Details</h1>
              <p className="text-sm text-gray-500">
                #{data._id?.slice(-8).toUpperCase()} placed on {data.createdAt?.slice(0, 10)}
              </p>
            </div>
          </div>
          <Link to="/dashboard-orders" className="text-sm text-orange-600 hover:text-orange-700">
            Back to order list
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <OrderTimeline order={data} />

            <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Items</h2>
                <span className="text-sm text-gray-500">{itemCount} item(s)</span>
              </div>

              <div className="space-y-4">
                {data.cart?.map((item, index) => (
                  <div key={item._id || index} className="flex items-center gap-4 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                    <img
                      src={getAssetUrl(item.images?.[0])}
                      alt={item.name}
                      className="w-20 h-20 rounded-lg object-cover bg-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        ${money(item.discountPrice)} x {item.qty}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900">
                      ${money(Number(item.discountPrice || 0) * Number(item.qty || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Update Status</h2>
              <p className="text-sm text-gray-500 mt-1">
                Move the order forward as it progresses.
              </p>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
              >
                {availableStatuses.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                disabled={isUpdating || status === data.status}
                onClick={updateOrderStatus}
                className="mt-4 w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isUpdating ? "Updating..." : "Update status"}
              </button>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span className="font-medium text-gray-800">{data.paymentInfo?.type || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="font-medium text-gray-800">{data.paymentInfo?.status || "Pending"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform fee</span>
                  <span className="font-medium text-gray-800">${money(data.platformFee)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <span className="text-gray-500">Seller receivable</span>
                  <span className="font-semibold text-green-600">${money(sellerReceivable)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Order total</span>
                  <span className="font-semibold text-orange-600">${money(data.totalPrice)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Customer & Delivery</h2>
              <p className="text-sm text-gray-600 mt-3">
                {data.shippingAddress?.fullName || data.user?.name}
                <br />
                {data.shippingAddress?.email || data.user?.email}
                <br />
                {data.shippingAddress?.phoneNumber || data.user?.phoneNumber}
              </p>
              <p className="text-sm text-gray-600 mt-4">
                {data.shippingAddress?.address1} {data.shippingAddress?.address2}
                <br />
                {data.shippingAddress?.city}, {data.shippingAddress?.country} {data.shippingAddress?.zipCode}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
