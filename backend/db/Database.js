const mongoose = require("mongoose");

const connectDatabase = () => {
  // Use MONGO_URI from .env file
  const dbUrl = process.env.MONGO_URI || "mongodb://localhost:27017/cartify";
  
  mongoose
    .connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((data) => {
      console.log(`mongod connected with server: ${data.connection.host}`);
    })
    .catch((err) => {
      console.log("Database connection error:", err);
      process.exit(1);
    });
};

module.exports = connectDatabase;