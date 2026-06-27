import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  AiOutlineCheckCircle,
  AiOutlineClockCircle,
} from "react-icons/ai";
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";
import { server } from "../server";

const notificationTypeLabels = {
  order_created: "Order",
  order_status_updated: "Order",
  refund_requested: "Refund",
  refund_success: "Refund",
  refund_rejected: "Refund",
  admin_order_created: "Admin",
  admin_refund_requested: "Refund",
  seller_order_created: "Seller",
  general: "General",
};

const formatNotificationDate = (date) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await axios.get(`${server}/notification/user`, {
          withCredentials: true,
        });
        setNotifications(data.notifications || []);
      } catch (error) {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    const notification = notifications.find((item) => item._id === notificationId);
    const nextUnreadCount = notification?.isRead
      ? unreadCount
      : Math.max(unreadCount - 1, 0);

    setNotifications((items) =>
      items.map((item) =>
        item._id === notificationId ? { ...item, isRead: true } : item
      )
    );
    window.dispatchEvent(
      new CustomEvent("cartify:notifications-read", {
        detail: { unreadCount: nextUnreadCount },
      })
    );

    try {
      await axios.put(
        `${server}/notification/user/${notificationId}/read`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      setNotifications((items) =>
        items.map((item) =>
          item._id === notificationId ? { ...item, isRead: false } : item
        )
      );
      window.dispatchEvent(
        new CustomEvent("cartify:notifications-read", {
          detail: { unreadCount },
        })
      );
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((item) => !item.isRead);

    if (unreadNotifications.length === 0 || isMarkingAll) {
      return;
    }

    setIsMarkingAll(true);
    const previousNotifications = notifications;
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));

    try {
      await axios.put(
        `${server}/notification/user/read-all`,
        {},
        { withCredentials: true }
      );
      window.dispatchEvent(
        new CustomEvent("cartify:notifications-read", {
          detail: { unreadCount: 0 },
        })
      );
    } catch (error) {
      setNotifications(previousNotifications);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const filteredNotifications =
    activeFilter === "unread"
      ? notifications.filter((item) => !item.isRead)
      : notifications;

  return (
    <>
      <Header activeHeading={0} />
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-brand-orange px-2.5 py-1 text-xs font-semibold text-white">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Order, payment, refund, and account updates.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    activeFilter === "all"
                      ? "bg-brand-orange text-white"
                      : "text-gray-600 hover:text-brand-orange"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("unread")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    activeFilter === "unread"
                      ? "bg-brand-orange text-white"
                      : "text-gray-600 hover:text-brand-orange"
                  }`}
                >
                  Unread
                </button>
              </div>
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0 || isMarkingAll}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMarkingAll ? "Updating..." : "Mark all read"}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center">
                <AiOutlineCheckCircle
                  size={42}
                  className="mx-auto text-green-500 mb-3"
                />
                <p className="text-lg font-semibold text-gray-900">
                  You are all caught up
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  New order and payment updates will appear here.
                </p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-10 text-center">
                <AiOutlineCheckCircle
                  size={42}
                  className="mx-auto text-green-500 mb-3"
                />
                <p className="text-lg font-semibold text-gray-900">
                  No unread notifications
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  You have read every update in this view.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <Link
                  key={notification._id}
                  to={notification.link || "#"}
                  onClick={() => markAsRead(notification._id)}
                  className={`block border-b border-gray-100 last:border-b-0 p-5 transition-colors hover:bg-orange-50 ${
                    notification.isRead ? "bg-white" : "bg-orange-50/60"
                  }`}
                >
                  <div className="flex gap-4">
                    <span
                      className={`mt-2 h-2.5 w-2.5 rounded-full ${
                        notification.isRead ? "bg-gray-300" : "bg-brand-orange"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-gray-900">
                            {notification.title}
                          </h2>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {notificationTypeLabels[notification.type] ||
                              "Update"}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <AiOutlineClockCircle size={13} />
                          {formatNotificationDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default NotificationsPage;
