import axios from "axios";
import { server } from "../../server";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

// get all orders of user
export const getAllOrdersOfUser = (userId) => async (dispatch) => {
  try {
    if (!userId) {
      return;
    }

    dispatch({
      type: "getAllOrdersUserRequest",
    });

    const { data } = await axios.get(
      `${server}/order/get-all-orders/${userId}`,
      { withCredentials: true }
    );

    dispatch({
      type: "getAllOrdersUserSuccess",
      payload: data.orders,
    });
  } catch (error) {
    dispatch({
      type: "getAllOrdersUserFailed",
      payload: getErrorMessage(error),
    });
  }
};

// Get all orders of seller
export const getAllOrdersOfShop = (shopId) => async (dispatch) => {
  try {
    if (!shopId) {
      return;
    }

    dispatch({
      type: "getAllOrdersShopRequest",
    });

    const { data } = await axios.get(
      `${server}/order/get-seller-all-orders/${shopId}`,
      { withCredentials: true }
    );

    dispatch({
      type: "getAllOrdersShopSuccess",
      payload: data.orders,
    });
  } catch (error) {
    dispatch({
      type: "getAllOrdersShopFailed",
      payload: getErrorMessage(error),
    });
  }
};

// get all orders of Admin
export const getAllOrdersOfAdmin = () => async (dispatch) => {
  try {
    dispatch({
      type: "adminAllOrdersRequest",
    });

    const { data } = await axios.get(`${server}/order/admin-all-orders`, {
      withCredentials: true,
    });

    dispatch({
      type: "adminAllOrdersSuccess",
      payload: data.orders,
    });
  } catch (error) {
    dispatch({
      type: "adminAllOrdersFailed",
      payload: getErrorMessage(error),
    });
  }
};

// update refund request as admin
export const updateAdminRefundStatus =
  (orderId, status, note = "") =>
  async (dispatch) => {
    try {
      dispatch({
        type: "adminRefundStatusRequest",
      });

      const { data } = await axios.put(
        `${server}/order/admin-refund-status/${orderId}`,
        { status, note },
        { withCredentials: true }
      );

      dispatch({
        type: "adminRefundStatusSuccess",
        payload: data.order,
      });

      return data;
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch({
        type: "adminRefundStatusFailed",
        payload: message,
      });
      throw new Error(message);
    }
  };
