import React from "react";
import { 
  AiOutlineLogin, 
  AiOutlineMessage, 
  AiOutlineUser, 
  AiOutlineShoppingCart,
  AiOutlineHistory,
  AiOutlineKey,
  AiOutlineHome
} from "react-icons/ai";
import { RiLockPasswordLine } from "react-icons/ri";
import { HiOutlineReceiptRefund, HiOutlineShoppingBag } from "react-icons/hi";
import { TbAddressBook } from "react-icons/tb";
import { MdOutlineTrackChanges, MdOutlineAdminPanelSettings } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";

const ProfileSidebar = ({ active, setActive }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);

  const logoutHandler = () => {
    axios
      .get(`${server}/user/logout`, { withCredentials: true })
      .then((res) => {
        toast.success(res.data.message);
        window.location.reload(true);
        navigate("/login");
      })
      .catch((error) => {
        console.log(error.response.data.message);
      });
  };

  const menuItems = [
    { id: 1, name: "Profile", icon: <AiOutlineUser size={20} />, path: null },
    { id: 2, name: "Orders", icon: <HiOutlineShoppingBag size={20} />, path: null },
    { id: 3, name: "Refunds", icon: <HiOutlineReceiptRefund size={20} />, path: null },
    { id: 4, name: "Inbox", icon: <AiOutlineMessage size={20} />, path: "/inbox" },
    { id: 5, name: "Track Order", icon: <MdOutlineTrackChanges size={20} />, path: null },
    { id: 6, name: "Change Password", icon: <RiLockPasswordLine size={20} />, path: null },
    { id: 7, name: "Address Book", icon: <TbAddressBook size={20} />, path: null },
  ];

  const handleMenuClick = (item) => {
    if (item.path) {
      navigate(item.path);
    } else {
      setActive(item.id);
    }
  };

  return (
    <div className="w-full bg-card rounded-xl shadow-md p-5">
      <div className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
              active === item.id
                ? "bg-brand-orange/10 text-brand-orange border-l-4 border-brand-orange"
                : "text-text-secondary hover:bg-gray-100 hover:text-text-primary"
            }`}
          >
            <span className={active === item.id ? "text-brand-orange" : ""}>
              {item.icon}
            </span>
            <span className="text-sm font-medium">{item.name}</span>
          </button>
        ))}

        {/* Admin Dashboard - Only for Admin */}
        {user && user?.role === "Admin" && (
          <Link to="/admin/dashboard">
            <div
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                active === 8
                  ? "bg-brand-orange/10 text-brand-orange border-l-4 border-brand-orange"
                  : "text-text-secondary hover:bg-gray-100 hover:text-text-primary"
              }`}
            >
              <MdOutlineAdminPanelSettings size={20} />
              <span className="text-sm font-medium">Admin Dashboard</span>
            </div>
          </Link>
        )}

        {/* Divider */}
        <div className="border-t border-border-gray my-3"></div>

        {/* Logout Button */}
        <button
          onClick={logoutHandler}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-all duration-300"
        >
          <AiOutlineLogin size={20} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileSidebar;