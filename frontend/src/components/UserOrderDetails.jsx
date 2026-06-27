import React, { useEffect, useState } from "react";
import { BsFillBagFill } from "react-icons/bs";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { backend_url, server } from "../server";
import { RxCross1 } from "react-icons/rx";
import { getAllOrdersOfUser } from "../redux/actions/order";
import { useDispatch, useSelector } from "react-redux";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";
import OrderTimeline from "./Order/OrderTimeline";

const getAssetUrl = (path) =>
  path?.startsWith("http") ? path : `${backend_url}${path || ""}`;

const money = (value) => Number(value || 0).toFixed(2);

const UserOrderDetails = () => {
  const { orders } = useSelector((state) => state.order);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [rating, setRating] = useState(1);
  const { id } = useParams();

  useEffect(() => {
    if (user?._id) {
      dispatch(getAllOrdersOfUser(user._id));
    }
  }, [dispatch, user?._id]);

  const data = orders && orders.find((item) => item._id === id);

  const reviewHandler = async () => {
    try {
      const res = await axios.put(
        `${server}/product/create-new-review`,
        {
          user,
          rating,
          comment,
          productId: selectedItem?._id,
          orderId: id,
        },
        { withCredentials: true }
      );

      toast.success(res.data.message);
      dispatch(getAllOrdersOfUser(user._id));
      setComment("");
      setRating(1);
      setOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Review could not be submitted.");
    }
  };

  const refundHandler = async () => {
    await axios
      .put(
        `${server}/order/order-refund/${id}`,
        { status: "Processing refund" },
        { withCredentials: true }
      )
      .then((res) => {
        toast.success(res.data.message);
        dispatch(getAllOrdersOfUser(user._id));
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || "Refund request failed.");
      });
  };

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

  const canRequestRefund = data.status === "Delivered";
  const isRefunding = String(data.status || "").toLowerCase().includes("refund");
  const itemCount = data.cart?.reduce((total, item) => total + Number(item.qty || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <BsFillBagFill size={30} className="text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
              <p className="text-sm text-gray-500">
                #{data._id?.slice(-8).toUpperCase()} placed on {data.createdAt?.slice(0, 10)}
              </p>
            </div>
          </div>
          <Link to={`/user/track/order/${data._id}`} className="text-sm text-orange-600 hover:text-orange-700">
            Track order
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
                  <div key={item._id || index} className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                    <img
                      src={getAssetUrl(item.images?.[0])}
                      alt={item.name}
                      className="w-20 h-20 rounded-lg object-cover bg-gray-100"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        ${money(item.discountPrice)} x {item.qty}
                      </p>
                    </div>
                    {!item.isReviewed && data.status === "Delivered" && (
                      <button
                        className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                        onClick={() => {
                          setSelectedItem(item);
                          setOpen(true);
                        }}
                      >
                        Write review
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
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
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-800">${money(data.subTotalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-medium text-gray-800">${money(data.shippingPrice)}</span>
                </div>
                {Number(data.discountPrice || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-red-500">-${money(data.discountPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold text-orange-600">${money(data.totalPrice)}</span>
                </div>
              </div>

              {canRequestRefund && !isRefunding && (
                <button
                  className="mt-5 w-full rounded-md bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                  onClick={refundHandler}
                >
                  Request refund
                </button>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
              <p className="text-sm text-gray-600 mt-3">
                {data.shippingAddress?.fullName}
                <br />
                {data.shippingAddress?.address1} {data.shippingAddress?.address2}
                <br />
                {data.shippingAddress?.city}, {data.shippingAddress?.country} {data.shippingAddress?.zipCode}
                <br />
                {data.shippingAddress?.phoneNumber || data.user?.phoneNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <div className="flex justify-end">
              <RxCross1
                size={24}
                onClick={() => setOpen(false)}
                className="cursor-pointer text-gray-500"
              />
            </div>
            <h2 className="text-center text-2xl font-semibold text-gray-900">Give a Review</h2>

            <div className="mt-5 flex gap-4">
              <img
                src={getAssetUrl(selectedItem?.images?.[0])}
                alt={selectedItem?.name}
                className="h-20 w-20 rounded-lg object-cover"
              />
              <div>
                <p className="font-medium text-gray-900">{selectedItem?.name}</p>
                <p className="text-sm text-gray-500">
                  ${money(selectedItem?.discountPrice)} x {selectedItem?.qty}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <h5 className="font-medium text-gray-900">Rating</h5>
              <div className="mt-2 flex w-fit">
                {[1, 2, 3, 4, 5].map((i) =>
                  rating >= i ? (
                    <AiFillStar
                      key={i}
                      className="mr-1 cursor-pointer"
                      color="rgb(246,186,0)"
                      size={25}
                      onClick={() => setRating(i)}
                    />
                  ) : (
                    <AiOutlineStar
                      key={i}
                      className="mr-1 cursor-pointer"
                      color="rgb(246,186,0)"
                      size={25}
                      onClick={() => setRating(i)}
                    />
                  )
                )}
              </div>
            </div>

            <label className="mt-5 block font-medium text-gray-900">
              Comment <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was your product?"
              className="mt-2 h-28 w-full rounded-md border border-gray-200 p-3 outline-none focus:border-orange-500"
            />
            <button
              className="mt-4 w-full rounded-md bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700"
              onClick={reviewHandler}
            >
              Submit review
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserOrderDetails;
