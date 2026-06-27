import React, { useEffect, useState } from 'react'
import { backend_url, server } from "../../server";
import { useDispatch, useSelector } from 'react-redux';
import {
    deleteUserAddress,
    loadUser,
    updatUserAddress,
    updateUserInformation,
} from "../../redux/actions/user";
import { AiOutlineArrowRight, AiOutlineCamera, AiOutlineDelete, AiOutlineMail, AiOutlinePhone, AiOutlineUser } from 'react-icons/ai';
import { Link } from 'react-router-dom';
import { DataGrid } from "@material-ui/data-grid";
import { Button } from "@material-ui/core";
import { RxCross1 } from 'react-icons/rx'
import { MdTrackChanges } from "react-icons/md";
import { toast } from "react-toastify";
import axios from 'axios';
import { Country, State } from "country-state-city";
import { getAllOrdersOfUser } from '../../redux/actions/order';
import { RiLockPasswordLine } from 'react-icons/ri';
import { HiOutlineLocationMarker } from 'react-icons/hi';

const ProfileContent = ({ active }) => {
    const { user, error, successMessage } = useSelector((state) => state.user);
    const [name, setName] = useState(user && user.name);
    const [email, setEmail] = useState(user && user.email);
    const [phoneNumber, setPhoneNumber] = useState(user && user.phoneNumber);
    const [password, setPassword] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const dispatch = useDispatch();

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch({ type: "clearErrors" });
        }
        if (successMessage) {
            toast.success(successMessage);
            dispatch({ type: "clearMessages" });
        }
    }, [error, successMessage, dispatch]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        await dispatch(updateUserInformation(name, email, phoneNumber, password));
        setIsUpdating(false);
    }

    const handleImage = async (e) => {
        const formData = new FormData();
        formData.append("image", e.target.files[0]);

        await axios
            .put(`${server}/user/update-avatar`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                withCredentials: true,
            })
            .then(() => {
                dispatch(loadUser());
                toast.success("Avatar updated successfully!");
            })
            .catch((error) => {
                toast.error(error.response?.data?.message || "Failed to update avatar");
            });
    };

    return (
        <div className='w-full'>
            {/* Profile Section */}
            {active === 1 && (
                <div className="bg-card rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-6 pb-2 border-b border-border-gray">
                        Profile Information
                    </h2>
                    
                    {/* Avatar Section */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <img
                                src={`${backend_url}${user?.avatar || 'default-avatar.png'}`}
                                className="w-28 h-28 rounded-full object-cover border-4 border-brand-orange shadow-md"
                                alt="Profile"
                            />
                            <label
                                htmlFor="avatar-upload"
                                className="absolute bottom-0 right-0 w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-hover transition-colors shadow-md"
                            >
                                <AiOutlineCamera size={16} className="text-white" />
                            </label>
                            <input
                                type="file"
                                id="avatar-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImage}
                            />
                        </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <AiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                                    <input
                                        type="email"
                                        className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <AiOutlinePhone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                                    <input
                                        type="tel"
                                        className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                        value={phoneNumber || ''}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    Password (required to save changes)
                                </label>
                                <div className="relative">
                                    <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                                    <input
                                        type="password"
                                        className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password to confirm changes"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="mt-4 px-6 py-2 bg-brand-orange hover:bg-orange-hover text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50"
                        >
                            {isUpdating ? "Updating..." : "Update Profile"}
                        </button>
                    </form>
                </div>
            )}

            {/* Orders Section */}
            {active === 2 && (
                <div className="bg-card rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 pb-2 border-b border-border-gray">
                        My Orders
                    </h2>
                    <AllOrders />
                </div>
            )}

            {/* Refunds Section */}
            {active === 3 && (
                <div className="bg-card rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 pb-2 border-b border-border-gray">
                        Refund Requests
                    </h2>
                    <AllRefundOrders />
                </div>
            )}

            {/* Track Order Section */}
            {active === 5 && (
                <div className="bg-card rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 pb-2 border-b border-border-gray">
                        Track Your Orders
                    </h2>
                    <TrackOrder />
                </div>
            )}

            {/* Change Password Section */}
            {active === 6 && (
                <div className="bg-card rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 pb-2 border-b border-border-gray">
                        Change Password
                    </h2>
                    <ChangePassword />
                </div>
            )}

            {/* Address Section */}
            {active === 7 && (
                <div className="bg-card rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 pb-2 border-b border-border-gray">
                        Address Book
                    </h2>
                    <Address />
                </div>
            )}
        </div>
    )
}

// All Orders Component
const AllOrders = () => {
    const { user } = useSelector((state) => state.user);
    const { orders } = useSelector((state) => state.order);
    const dispatch = useDispatch();

    useEffect(() => {
        if (user?._id) {
            dispatch(getAllOrdersOfUser(user._id));
        }
    }, [dispatch, user]);

    const getStatusColor = (status) => {
        switch(status) {
            case "Delivered": return "text-success";
            case "Processing": return "text-info";
            case "Shipped": return "text-brand-orange";
            default: return "text-red-500";
        }
    };

    const columns = [
        { field: "id", headerName: "Order ID", minWidth: 200, flex: 1 },
        {
            field: "status",
            headerName: "Status",
            minWidth: 130,
            flex: 0.7,
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
            field: "total",
            headerName: "Total",
            type: "number",
            minWidth: 120,
            flex: 0.6,
        },
        {
            field: "action",
            headerName: "",
            minWidth: 80,
            flex: 0.3,
            renderCell: (params) => (
                <Link to={`/user/order/${params.id}`}>
                    <Button className="text-brand-orange">
                        <AiOutlineArrowRight size={20} />
                    </Button>
                </Link>
            ),
        },
    ];

    const rows = orders?.map((item) => ({
        id: item._id,
        itemsQty: item.cart?.length || 0,
        total: `$${item.totalPrice}`,
        status: item.status,
    })) || [];

    return (
        <div className="w-full">
            <DataGrid
                rows={rows}
                columns={columns}
                pageSize={10}
                disableSelectionOnClick
                autoHeight
                className="border-0"
            />
        </div>
    )
}

// Refund Orders Component
const AllRefundOrders = () => {
    const { user } = useSelector((state) => state.user);
    const { orders } = useSelector((state) => state.order);
    const dispatch = useDispatch();

    useEffect(() => {
        if (user?._id) {
            dispatch(getAllOrdersOfUser(user._id));
        }
    }, [dispatch, user]);

    const eligibleOrders = orders?.filter((item) => item.status === "Processing refund") || [];

    const columns = [
        { field: "id", headerName: "Order ID", minWidth: 200, flex: 1 },
        {
            field: "status",
            headerName: "Status",
            minWidth: 150,
            flex: 0.8,
            renderCell: () => <span className="text-yellow-600 font-medium">Processing Refund</span>,
        },
        {
            field: "itemsQty",
            headerName: "Items",
            type: "number",
            minWidth: 100,
            flex: 0.5,
        },
        {
            field: "total",
            headerName: "Total",
            type: "number",
            minWidth: 120,
            flex: 0.6,
        },
        {
            field: "action",
            headerName: "",
            minWidth: 80,
            flex: 0.3,
            renderCell: (params) => (
                <Link to={`/user/order/${params.id}`}>
                    <Button className="text-brand-orange">
                        <AiOutlineArrowRight size={20} />
                    </Button>
                </Link>
            ),
        },
    ];

    const rows = eligibleOrders.map((item) => ({
        id: item._id,
        itemsQty: item.cart?.length || 0,
        total: `$${item.totalPrice}`,
        status: item.status,
    }));

    return (
        <div className="w-full">
            {rows.length > 0 ? (
                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSize={10}
                    autoHeight
                    disableSelectionOnClick
                    className="border-0"
                />
            ) : (
                <p className="text-center text-text-secondary py-8">No refund requests found.</p>
            )}
        </div>
    )
}

// Track Order Component
const TrackOrder = () => {
    const { user } = useSelector((state) => state.user);
    const { orders } = useSelector((state) => state.order);
    const dispatch = useDispatch();

    useEffect(() => {
        if (user?._id) {
            dispatch(getAllOrdersOfUser(user._id));
        }
    }, [dispatch, user]);

    const getStatusColor = (status) => {
        switch(status) {
            case "Delivered": return "text-success";
            case "Processing": return "text-info";
            case "Shipped": return "text-brand-orange";
            default: return "text-red-500";
        }
    };

    const columns = [
        { field: "id", headerName: "Order ID", minWidth: 200, flex: 1 },
        {
            field: "status",
            headerName: "Status",
            minWidth: 150,
            flex: 0.8,
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
            field: "total",
            headerName: "Total",
            type: "number",
            minWidth: 120,
            flex: 0.6,
        },
        {
            field: "action",
            headerName: "",
            minWidth: 80,
            flex: 0.3,
            renderCell: (params) => (
                <Link to={`/user/track/order/${params.id}`}>
                    <Button className="text-brand-orange">
                        <MdTrackChanges size={20} />
                    </Button>
                </Link>
            ),
        },
    ];

    const rows = orders?.map((item) => ({
        id: item._id,
        itemsQty: item.cart?.length || 0,
        total: `$${item.totalPrice}`,
        status: item.status,
    })) || [];

    return (
        <div className="w-full">
            <DataGrid
                rows={rows}
                columns={columns}
                pageSize={10}
                disableSelectionOnClick
                autoHeight
                className="border-0"
            />
        </div>
    )
}

// Change Password Component
const ChangePassword = () => {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const passwordChangeHandler = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);

        await axios
            .put(
                `${server}/user/update-user-password`,
                { oldPassword, newPassword, confirmPassword },
                { withCredentials: true }
            )
            .then((res) => {
                toast.success("Password updated successfully!");
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
            })
            .catch((error) => {
                toast.error(error.response?.data?.message || "Failed to update password");
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <form onSubmit={passwordChangeHandler} className="space-y-4 max-w-lg mx-auto">
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                    Current Password
                </label>
                <input
                    type="password"
                    className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                    New Password
                </label>
                <input
                    type="password"
                    className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                    Confirm New Password
                </label>
                <input
                    type="password"
                    className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-brand-orange hover:bg-orange-hover text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50"
            >
                {isLoading ? "Updating..." : "Update Password"}
            </button>
        </form>
    )
}

// Address Component
const Address = () => {
    const [open, setOpen] = useState(false);
    const [country, setCountry] = useState("");
    const [city, setCity] = useState("");
    const [zipCode, setZipCode] = useState("");
    const [address1, setAddress1] = useState("");
    const [address2, setAddress2] = useState("");
    const [addressType, setAddressType] = useState("");
    const { user } = useSelector((state) => state.user);
    const dispatch = useDispatch();

    const addressTypeData = ["Default", "Home", "Office"];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!addressType || !country || !city || !address1) {
            toast.error("Please fill all required fields!");
            return;
        }

        dispatch(
            updatUserAddress(
                country,
                city,
                address1,
                address2,
                zipCode,
                addressType
            )
        );
        setOpen(false);
        setCountry("");
        setCity("");
        setAddress1("");
        setAddress2("");
        setZipCode("");
        setAddressType("");
    }

    const handleDelete = (item) => {
        dispatch(deleteUserAddress(item._id));
    }

    return (
        <div>
            {/* Add Address Modal */}
            {open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-card border-b border-border-gray p-4 flex justify-between items-center">
                            <h3 className="font-semibold text-text-primary">Add New Address</h3>
                            <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                <RxCross1 size={18} className="text-text-secondary" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">Country</label>
                                <select
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                                    required
                                >
                                    <option value="">Select Country</option>
                                    {Country?.getAllCountries().map((item) => (
                                        <option key={item.isoCode} value={item.isoCode}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">City</label>
                                <select
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                                    required
                                    disabled={!country}
                                >
                                    <option value="">Select City</option>
                                    {State?.getStatesOfCountry(country).map((item) => (
                                        <option key={item.isoCode} value={item.isoCode}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">Address Line 1</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                                    value={address1}
                                    onChange={(e) => setAddress1(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">Address Line 2 (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                                    value={address2}
                                    onChange={(e) => setAddress2(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">Zip Code</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                                    value={zipCode}
                                    onChange={(e) => setZipCode(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">Address Type</label>
                                <select
                                    value={addressType}
                                    onChange={(e) => setAddressType(e.target.value)}
                                    className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none"
                                    required
                                >
                                    <option value="">Select Address Type</option>
                                    {addressTypeData.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2 bg-brand-orange hover:bg-orange-hover text-white rounded-lg font-medium transition-all duration-300"
                            >
                                Add Address
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Address List */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-text-primary">Saved Addresses</h3>
                <button
                    onClick={() => setOpen(true)}
                    className="px-4 py-2 bg-brand-orange hover:bg-orange-hover text-white rounded-lg text-sm font-medium transition-all duration-300"
                >
                    Add New Address
                </button>
            </div>

            {user?.addresses?.length > 0 ? (
                <div className="space-y-3">
                    {user.addresses.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-4 border border-border-gray rounded-lg hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start gap-3">
                                <HiOutlineLocationMarker size={20} className="text-brand-orange mt-0.5" />
                                <div>
                                    <p className="font-medium text-text-primary">{item.addressType}</p>
                                    <p className="text-sm text-text-secondary">{item.address1}</p>
                                    {item.address2 && <p className="text-sm text-text-secondary">{item.address2}</p>}
                                    <p className="text-sm text-text-secondary">{item.city}, {item.country} {item.zipCode}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(item)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <AiOutlineDelete size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-text-secondary py-8">No saved addresses. Add one to make checkout faster!</p>
            )}
        </div>
    )
}

export default ProfileContent;
