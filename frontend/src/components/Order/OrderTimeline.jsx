import React from "react";
import {
  AiOutlineCheck,
  AiOutlineClockCircle,
  AiOutlineRollback,
} from "react-icons/ai";

export const ORDER_STEPS = [
  "Pending",
  "Processing",
  "Transferred to delivery partner",
  "Shipping",
  "Received",
  "On the way",
  "Delivered",
];

export const REFUND_STEPS = ["Processing refund", "Refund Success"];

const getSteps = (status) =>
  REFUND_STEPS.includes(status) ? REFUND_STEPS : ORDER_STEPS;

const getStatusMessage = (status) => {
  const messages = {
    Pending: "Your order has been placed and is waiting for seller confirmation.",
    Processing: "The seller is preparing your order.",
    "Transferred to delivery partner": "Your order has been handed to the delivery partner.",
    Shipping: "Your order is moving through the shipping network.",
    Received: "Your order has reached your city.",
    "On the way": "The delivery partner is bringing your order to you.",
    Delivered: "Your order has been delivered.",
    "Processing refund": "Your refund request is being reviewed.",
    "Refund Success": "Your refund has been completed.",
  };

  return messages[status] || "Order status is being updated.";
};

const OrderTimeline = ({ order, compact = false }) => {
  const status = order?.status || "Pending";
  const steps = getSteps(status);
  const currentIndex = Math.max(steps.indexOf(status), 0);

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Order Timeline</h2>
          <p className="text-sm text-gray-500 mt-1">{getStatusMessage(status)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            REFUND_STEPS.includes(status)
              ? "bg-red-50 text-red-600"
              : status === "Delivered"
              ? "bg-green-50 text-green-600"
              : "bg-orange-50 text-orange-600"
          }`}
        >
          {status}
        </span>
      </div>

      <div className={compact ? "space-y-3" : "grid grid-cols-1 md:grid-cols-7 gap-3"}>
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = REFUND_STEPS.includes(step)
            ? AiOutlineRollback
            : isComplete
            ? AiOutlineCheck
            : AiOutlineClockCircle;

          return (
            <div
              key={step}
              className={`rounded-lg border p-3 ${
                isCurrent
                  ? "border-orange-300 bg-orange-50"
                  : isComplete
                  ? "border-green-200 bg-green-50"
                  : "border-gray-100 bg-gray-50"
              }`}
            >
              <div
                className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${
                  isCurrent
                    ? "bg-orange-500 text-white"
                    : isComplete
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                <Icon size={16} />
              </div>
              <p className="text-sm font-medium text-gray-800">{step}</p>
            </div>
          );
        })}
      </div>

      {order?.statusHistory?.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Status history</h3>
          <div className="space-y-2">
            {order.statusHistory.slice().reverse().map((item, index) => (
              <div key={`${item.status}-${index}`} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{item.status}</span>
                <span className="text-gray-400">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recently"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTimeline;
