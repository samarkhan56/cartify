import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import React, { useEffect } from "react";
import { AiOutlineEye } from "react-icons/ai";
import { Link } from "react-router-dom";
import axios from "axios";
import { server } from "../../server";
import { useState } from "react";
import { toast } from "react-toastify";

const AllProducts = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    axios
      .get(`${server}/product/admin-all-products`, { withCredentials: true })
      .then((res) => {
        setData(res.data.products);
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || "Failed to load products.");
      });
  };

  const handleStatusUpdate = async (id, payload) => {
    try {
      const { data } = await axios.put(
        `${server}/product/admin-update-product-status/${id}`,
        payload,
        { withCredentials: true }
      );
      toast.success(data.message);
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update product status.");
    }
  };

  const columns = [
    { field: "id", headerName: "Product Id", minWidth: 150, flex: 0.7 },
    {
      field: "name",
      headerName: "Name",
      minWidth: 180,
      flex: 1.4,
    },
    {
      field: "price",
      headerName: "Price",
      minWidth: 100,
      flex: 0.6,
    },
    {
      field: "Stock",
      headerName: "Stock",
      type: "number",
      minWidth: 80,
      flex: 0.5,
    },

    {
      field: "sold",
      headerName: "Sold out",
      type: "number",
      minWidth: 130,
      flex: 0.6,
    },
    {
      field: "approvalStatus",
      headerName: "Approval",
      minWidth: 120,
      flex: 0.6,
    },
    {
      field: "visibility",
      headerName: "Visibility",
      minWidth: 110,
      flex: 0.6,
    },
    {
      field: "moderation",
      flex: 1.4,
      minWidth: 260,
      headerName: "Moderation",
      sortable: false,
      renderCell: (params) => (
        <div className="flex gap-2">
          <Button
            size="small"
            onClick={() =>
              handleStatusUpdate(params.id, { approvalStatus: "approved" })
            }
          >
            Approve
          </Button>
          <Button
            size="small"
            onClick={() =>
              handleStatusUpdate(params.id, {
                approvalStatus: "rejected",
                rejectionReason: "Rejected by admin review",
              })
            }
          >
            Reject
          </Button>
          <Button
            size="small"
            onClick={() =>
              handleStatusUpdate(params.id, {
                isActive: params.row.visibility !== "Hidden" ? false : true,
              })
            }
          >
            {params.row.visibility === "Hidden" ? "Show" : "Hide"}
          </Button>
        </div>
      ),
    },
    {
      field: "Preview",
      flex: 0.8,
      minWidth: 100,
      headerName: "",
      type: "number",
      sortable: false,
      renderCell: (params) => {
        return (
          <>
            <Link to={`/product/${params.id}`}>
              <Button>
                <AiOutlineEye size={20} />
              </Button>
            </Link>
          </>
        );
      },
    },
  ];

  const row = [];

  data &&
    data.forEach((item) => {
      row.push({
        id: item._id,
        name: item.name,
        price: "US$ " + item.discountPrice,
        Stock: item.stock,
        sold: item?.sold_out,
        approvalStatus: item.approvalStatus || "approved",
        visibility: item.isActive === false ? "Hidden" : "Active",
      });
    });

  return (
    <>
      <div className="w-full mx-8 pt-1 mt-10 bg-white">
        <DataGrid
          rows={row}
          columns={columns}
          pageSize={10}
          disableSelectionOnClick
          autoHeight
        />
      </div>
    </>
  );
};

export default AllProducts;
