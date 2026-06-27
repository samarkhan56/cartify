import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { getAllOrdersOfUser } from "../../redux/actions/order";
import OrderTimeline from "../Order/OrderTimeline";

const TrackOrder = () => {
  const { orders } = useSelector((state) => state.order);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const { id } = useParams();

  useEffect(() => {
    if (user?._id) {
      dispatch(getAllOrdersOfUser(user._id));
    }
  }, [dispatch, user?._id]);

  const data = orders && orders.find((item) => item._id === id);

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800">Order not found</h1>
          <p className="text-gray-500 mt-2">The order may still be loading or is unavailable.</p>
          <Link to="/profile" className="inline-block mt-4 text-orange-600">
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  const itemCount = data.cart?.reduce((total, item) => total + Number(item.qty || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Order</h1>
            <p className="text-sm text-gray-500 mt-1">
              Order #{data._id?.slice(-8).toUpperCase()} placed on {data.createdAt?.slice(0, 10)}
            </p>
          </div>
          <Link to={`/user/order/${data._id}`} className="text-sm text-orange-600 hover:text-orange-700">
            View full details
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OrderTimeline order={data} />
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Items</span>
                  <span className="font-medium text-gray-800">{itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment</span>
                  <span className="font-medium text-gray-800">{data.paymentInfo?.type || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment status</span>
                  <span className="font-medium text-gray-800">{data.paymentInfo?.status || "Pending"}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold text-orange-600">
                    ${Number(data.totalPrice || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Delivery Address</h2>
              <p className="text-sm text-gray-600 mt-3">
                {data.shippingAddress?.fullName}
                <br />
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

export default TrackOrder;
