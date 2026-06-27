const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Order = require("../model/order");
const Shop = require("../model/shop");
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");

const PRODUCT_APPROVAL_STATUSES = ["pending", "approved", "rejected"];
const visibleProductQuery = {
  isActive: { $ne: false },
  $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }],
};
const parseNameValueLines = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(":");
      return {
        name: name.trim(),
        value: rest.join(":").trim(),
      };
    })
    .filter((item) => item.name && item.value);
};

const parseVariantLines = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, optionsText = ""] = line.split(":");
      return {
        name: name.trim(),
        options: optionsText
          .split(",")
          .map((option) => option.trim())
          .filter(Boolean),
      };
    })
    .filter((variant) => variant.name && variant.options.length > 0);
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildProductFilter = (query) => {
  const filter = { ...visibleProductQuery };
  const andFilters = [];

  if (query.category) {
    andFilters.push({ category: query.category });
  }

  if (query.brand) {
    andFilters.push({ brand: new RegExp(escapeRegex(query.brand), "i") });
  }

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), "i");
    andFilters.push({
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { brand: searchRegex },
      ],
    });
  }

  if (query.minPrice || query.maxPrice) {
    const priceFilter = {};
    if (query.minPrice) priceFilter.$gte = Number(query.minPrice);
    if (query.maxPrice) priceFilter.$lte = Number(query.maxPrice);
    andFilters.push({ discountPrice: priceFilter });
  }

  if (query.minRating) {
    andFilters.push({ ratings: { $gte: Number(query.minRating) } });
  }

  if (query.inStock === "true") {
    andFilters.push({ stock: { $gt: 0 } });
  }

  if (andFilters.length > 0) {
    filter.$and = andFilters;
  }

  return filter;
};

const buildProductSort = (sort) => {
  const sortMap = {
    latest: { createdAt: -1 },
    price_low: { discountPrice: 1 },
    price_high: { discountPrice: -1 },
    rating: { ratings: -1 },
    popular: { sold_out: -1 },
  };

  return sortMap[sort] || sortMap.latest;
};

// create product
router.post(
  "/create-product",
  isSeller,
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      }

      if (String(req.seller.id) !== String(shopId)) {
        return next(new ErrorHandler("You can only create products for your own shop.", 403));
      }

      if (shop.accountStatus === "suspended") {
        return next(new ErrorHandler("Your seller account is suspended.", 403));
      }

      if (shop.verificationStatus && shop.verificationStatus !== "approved") {
        return next(
          new ErrorHandler("Your shop must be approved before publishing products.", 403)
        );
      }

      const files = req.files || [];
      const imageUrls = files.map((file) => `${file.filename}`);
      const productData = req.body;

      if (!productData.discountPrice || productData.discountPrice === "") {
        productData.discountPrice = productData.originalPrice;
      }

      productData.images = imageUrls;
      productData.shop = shop;
      productData.specifications = parseNameValueLines(productData.specifications);
      productData.variants = parseVariantLines(productData.variants);
      productData.approvalStatus = "pending";
      productData.isActive = true;

      const product = await Product.create(productData);

      res.status(201).json({
        success: true,
        product,
        message: "Product submitted for admin approval.",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products of a shop
router.get(
  "/get-all-products-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find({
        shopId: req.params.id,
        ...visibleProductQuery,
      });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products of a shop for the seller dashboard
router.get(
  "/get-all-products-shop-dashboard/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      if (String(req.seller.id) !== String(req.params.id)) {
        return next(new ErrorHandler("You can only view your own shop products.", 403));
      }

      const products = await Product.find({ shopId: req.params.id }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete product of a shop
router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;

      const productData = await Product.findById(productId);
      if (!productData) {
        return next(new ErrorHandler("Product not found with this id!", 404));
      }

      if (String(productData.shopId) !== String(req.seller.id)) {
        return next(new ErrorHandler("You can only delete your own products.", 403));
      }

      productData.images.forEach((imageUrl) => {
        const filename = imageUrl;
        const filePath = `uploads/${filename}`;

        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
          }
        });
      });

      const product = await Product.findByIdAndDelete(productId);

      if (!product) {
        return next(new ErrorHandler("Product not found with this id!", 500));
      }

      res.status(201).json({
        success: true,
        message: "Product Deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products
router.get(
  "/get-all-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find(buildProductFilter(req.query)).sort(
        buildProductSort(req.query.sort)
      );

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// update product moderation status --- admin
router.put(
  "/admin-update-product-status/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { approvalStatus, isActive, rejectionReason } = req.body;
      const product = await Product.findById(req.params.id);

      if (!product) {
        return next(new ErrorHandler("Product not found with this id!", 404));
      }

      if (
        approvalStatus &&
        !PRODUCT_APPROVAL_STATUSES.includes(approvalStatus)
      ) {
        return next(new ErrorHandler("Invalid product approval status.", 400));
      }

      if (approvalStatus) {
        product.approvalStatus = approvalStatus;
        product.approvedAt =
          approvalStatus === "approved" ? Date.now() : product.approvedAt;
        product.rejectionReason =
          approvalStatus === "rejected" ? rejectionReason || "" : "";
      }

      if (typeof isActive === "boolean") {
        product.isActive = isActive;
      }

      await product.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        product,
        message: "Product status updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// review for a product
router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { rating, comment, productId, orderId } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return next(new ErrorHandler("Product not found with this id!", 404));
      }

      const order = await Order.findOne({
        _id: orderId,
        "user._id": req.user._id,
        status: "Delivered",
        "cart._id": productId,
      });

      if (!order) {
        return next(
          new ErrorHandler(
            "Only verified delivered purchases can review this product.",
            403
          )
        );
      }

      const review = {
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar,
        },
        rating,
        comment,
        productId,
        verifiedPurchase: true,
      };

      const isReviewed = product.reviews.find(
        (rev) => String(rev.user._id) === String(req.user._id)
      );

      if (isReviewed) {
        product.reviews.forEach((rev) => {
          if (String(rev.user._id) === String(req.user._id)) {
            rev.rating = rating;
            rev.comment = comment;
            rev.user = review.user;
            rev.verifiedPurchase = true;
          }
        });
      } else {
        product.reviews.push(review);
      }

      let avg = 0;

      product.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      product.ratings = avg / product.reviews.length;

      await product.save({ validateBeforeSave: false });

      await Order.findByIdAndUpdate(
        orderId,
        { $set: { "cart.$[elem].isReviewed": true } },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );

      res.status(200).json({
        success: true,
        message: "Reviewed successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// all products --- for admin
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
