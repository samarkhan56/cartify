import React, { Suspense, lazy, useEffect } from "react";
import "./App.css";
import Store from "./redux/store";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop"; // ➕ ADD THIS
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loadSeller, loadUser } from "./redux/actions/user";
import ProtectedRoute from "./routes/ProtectedRoute";
import ProtectedAdminRoute from "./routes/ProtectedAdminRoute";
import SellerProtectedRoute from "./routes/SellerProtectedRoute";
import { getAllProducts } from "./redux/actions/product";
import { getAllEvents } from "./redux/actions/event";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ActivationPage = lazy(() => import("./pages/ActivationPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const BestSellingPage = lazy(() => import("./pages/BestSellingPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const OrderSuccessPage = lazy(() => import("./pages/OrderSuccessPage"));
const ProductDetailsPage = lazy(() => import("./pages/ProductDetailsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ShopCreatePage = lazy(() => import("./pages/ShopCreate"));
const SellerActivationPage = lazy(() => import("./pages/SellerActivationPage"));
const ShopLoginPage = lazy(() => import("./pages/ShopLoginPage"));
const OrderDetailsPage = lazy(() => import("./pages/OrderDetailsPage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const UserInbox = lazy(() => import("./pages/UserInbox"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const AboutUsPage = lazy(() => import("./pages/AboutUsPage"));
const ContactUsPage = lazy(() => import("./pages/ContactUsPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const ShippingInfoPage = lazy(() => import("./pages/ShippingInfoPage"));
const ReturnsPage = lazy(() => import("./pages/ReturnsPage"));

const ShopDashboardPage = lazy(() => import("./pages/Shop/ShopDashboardPage"));
const ShopCreateProduct = lazy(() => import("./pages/Shop/ShopCreateProduct"));
const ShopAllProducts = lazy(() => import("./pages/Shop/ShopAllProducts"));
const ShopCreateEvents = lazy(() => import("./pages/Shop/ShopCreateEvents"));
const ShopAllEvents = lazy(() => import("./pages/Shop/ShopAllEvents"));
const ShopAllCoupouns = lazy(() => import("./pages/Shop/ShopAllCoupouns"));
const ShopPreviewPage = lazy(() => import("./pages/Shop/ShopPreviewPage"));
const ShopAllOrders = lazy(() => import("./pages/Shop/ShopAllOrders"));
const ShopOrderDetails = lazy(() => import("./pages/Shop/ShopOrderDetails"));
const ShopAllRefunds = lazy(() => import("./pages/Shop/ShopAllRefunds"));
const ShopSettingsPage = lazy(() => import("./pages/Shop/ShopSettingsPage"));
const ShopWithDrawMoneyPage = lazy(() =>
  import("./pages/Shop/ShopWithDrawMoneyPage")
);
const ShopInboxPage = lazy(() => import("./pages/Shop/ShopInboxPage"));
const ShopHomePage = lazy(() => import("./pages/Shop/ShopHomePage"));

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminDashboardUsers = lazy(() => import("./pages/AdminDashboardUsers"));
const AdminDashboardSellers = lazy(() => import("./pages/AdminDashboardSellers"));
const AdminDashboardOrders = lazy(() => import("./pages/AdminDashboardOrders"));
const AdminDashboardProducts = lazy(() => import("./pages/AdminDashboardProducts"));
const AdminDashboardEvents = lazy(() => import("./pages/AdminDashboardEvents"));
const AdminDashboardWithdraw = lazy(() =>
  import("./pages/AdminDashboardWithdraw")
);

const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="h-10 w-10 rounded-full border-2 border-brand-orange border-t-transparent animate-spin" />
  </div>
);

const App = () => {
  useEffect(() => {
    const dispatchStartupAction = (action) => {
      Promise.resolve(Store.dispatch(action)).catch(() => {});
    };

    dispatchStartupAction(loadUser());
    dispatchStartupAction(loadSeller());
    dispatchStartupAction(getAllProducts());
    dispatchStartupAction(getAllEvents());
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop /> {/* ➕ ADD THIS LINE */}
      <Suspense fallback={<RouteLoader />}>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sign-up" element={<SignupPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/shipping-info" element={<ShippingInfoPage />} />
        <Route path="/returns" element={<ReturnsPage />} />
        <Route
          path="/activation/:activation_token"
          element={<ActivationPage />}
        />
        <Route
          path="/seller/activation/:activation_token"
          element={<SellerActivationPage />}
        />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/product/:id" element={<ProductDetailsPage />} />
        <Route path="/best-selling" element={<BestSellingPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />

        <Route path="/order/success" element={<OrderSuccessPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <UserInbox />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/order/:id"
          element={
            <ProtectedRoute>
              <OrderDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/track/order/:id"
          element={
            <ProtectedRoute>
              <TrackOrderPage />
            </ProtectedRoute>
          }
        />

        <Route path="/shop/preview/:id" element={<ShopPreviewPage />} />
        {/* shop Routes */}
        <Route path="/shop-create" element={<ShopCreatePage />} />
        <Route path="/shop-login" element={<ShopLoginPage />} />
        <Route
          path="/shop/:id"
          element={
            <SellerProtectedRoute>
              <ShopHomePage />
            </SellerProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <SellerProtectedRoute>
              <ShopSettingsPage />
            </SellerProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <SellerProtectedRoute>
              <ShopDashboardPage />
            </SellerProtectedRoute>
          }
        />
        <Route
          path="/dashboard-create-product"
          element={
            <SellerProtectedRoute>
              <ShopCreateProduct />
            </SellerProtectedRoute>
          }
        />

        <Route
          path="/dashboard-orders"
          element={
            <SellerProtectedRoute>
              <ShopAllOrders />
            </SellerProtectedRoute>
          }
        />

        <Route
          path="/dashboard-refunds"
          element={
            <SellerProtectedRoute>
              <ShopAllRefunds />
            </SellerProtectedRoute>
          }
        />

        <Route
          path="/order/:id"
          element={
            <SellerProtectedRoute>
              <ShopOrderDetails />
            </SellerProtectedRoute>
          }
        />

        <Route
          path="/dashboard-products"
          element={
            <SellerProtectedRoute>
              <ShopAllProducts />
            </SellerProtectedRoute>
          }
        />

        <Route
          path="/dashboard-withdraw-money"
          element={
            <SellerProtectedRoute>
              <ShopWithDrawMoneyPage />
            </SellerProtectedRoute>
          }
        />

        <Route
          path="/dashboard-messages"
          element={
            <SellerProtectedRoute>
              <ShopInboxPage />
            </SellerProtectedRoute>
          }
        />

        <Route
          path="/dashboard-create-event"
          element={
            <SellerProtectedRoute>
              <ShopCreateEvents />
            </SellerProtectedRoute>
          }
        />
        <Route
          path="/dashboard-events"
          element={
            <SellerProtectedRoute>
              <ShopAllEvents />
            </SellerProtectedRoute>
          }
        />
        <Route
          path="/dashboard-coupouns"
          element={
            <SellerProtectedRoute>
              <ShopAllCoupouns />
            </SellerProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin-users"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardUsers />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin-sellers"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardSellers />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin-orders"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardOrders />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin-products"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardProducts />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin-events"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardEvents />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin-withdraw-request"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardWithdraw />
            </ProtectedAdminRoute>
          }
        />
        </Routes>
      </Suspense>
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </BrowserRouter>
  );
};
export default App;
