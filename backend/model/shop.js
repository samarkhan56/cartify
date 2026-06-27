const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your shop name!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your shop email address"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minLength: [6, "Password should be greater than 6 characters"],
    select: false,
  },
  description: {
    type: String,
  },
  address: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,  // Changed from Number to String
    required: true,
  },
  role: {
    type: String,
    default: "Seller",
  },
  verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  accountStatus: {
    type: String,
    enum: ["active", "suspended"],
    default: "active",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  rejectionReason: {
    type: String,
  },
  approvedAt: {
    type: Date,
  },
  suspendedAt: {
    type: Date,
  },
  avatar: {
    type: String,
    default: "",  // Empty string means use initials
  },
  avatarColor: {
    type: String,
    default: "#4ECDC4",
  },
  zipCode: {
    type: String,  // Changed from Number to String (zip codes can have leading zeros)
    required: true,
  },
  withdrawMethod: {
    type: Object,
  },
  availableBalance: {
    type: Number,
    default: 0,
  },
  transections: [
    {
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        default: "Processing",
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      },
      updatedAt: {
        type: Date,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  resetPasswordToken: String,
  resetPasswordTime: Date,
});

// Generate avatar initials and color before saving
shopSchema.pre("save", function(next) {
  // Only generate if avatar is empty and name exists
  if (!this.avatar && this.name) {
    // Generate initials from shop name
    const words = this.name.trim().split(' ');
    if (words.length === 1) {
      this.avatar = words[0].charAt(0).toUpperCase();
    } else {
      this.avatar = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    
    // Generate consistent color based on shop name
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#5D9B9B', '#E8A87C', '#C38D9E', '#6C5B7B'
    ];
    
    let hash = 0;
    for (let i = 0; i < this.name.length; i++) {
      hash = this.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    this.avatarColor = colors[index];
  }
  next();
});

// Virtual field to check if avatar is initials or image
shopSchema.virtual('isInitialsAvatar').get(function() {
  return this.avatar && this.avatar.length <= 2 && !this.avatar.includes('.');
});

// Hash password
shopSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// jwt token
shopSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// compare password
shopSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Shop", shopSchema);
