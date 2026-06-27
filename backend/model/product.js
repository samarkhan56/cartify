const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your product name!"],
  },
  description: {
    type: String,
    required: [true, "Please enter your product description!"],
  },
  category: {
    type: String,
    required: [true, "Please enter your product category!"],
  },
  tags: {
    type: String,
  },
  brand: {
    type: String,
    trim: true,
  },
  originalPrice: {
    type: Number,
    required: [true, "Please enter your original product price!"],
  },
  discountPrice: {
    type: Number,
    // REMOVED required - now optional
  },
  stock: {
    type: Number,
    required: [true, "Please enter your product stock!"],
  },
  sku: {
    type: String,
    trim: true,
  },
  specifications: [
    {
      name: {
        type: String,
        trim: true,
      },
      value: {
        type: String,
        trim: true,
      },
    },
  ],
  variants: [
    {
      name: {
        type: String,
        trim: true,
      },
      options: [
        {
          type: String,
          trim: true,
        },
      ],
    },
  ],
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  rejectionReason: {
    type: String,
  },
  approvedAt: {
    type: Date,
  },
  images: [
    {
      type: String,
    },
  ],

  reviews: [
    {
      user: {
        type: Object,
      },
      rating: {
        type: Number,
      },
      comment: {
        type: String,
      },
      productId: {
        type: String,
      },
      verifiedPurchase: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      },
    },
  ],
  ratings: {
    type: Number,
  },
  shopId: {
    type: String,
    required: true,
  },
  shop: {
    type: Object,
    required: true,
  },
  sold_out: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Product", productSchema);
