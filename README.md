<div align="center">
  <h1>🛒 Cartify - Multi-Vendor E-Commerce Platform</h1>
  <p>A complete e-commerce solution for multi-vendor marketplaces</p>
</div>

## 📋 Project Overview

**Cartify** is a full-featured multi-vendor e-commerce platform that allows users to become sellers, manage their own shops, and sell products. Customers can browse products, add items to cart, make purchases, and communicate with sellers in real-time.

This project is built upon an open-source MERN Marketplace foundation and is being customized and enhanced with additional features.

## 🖥️ Tech Stack

### Frontend
- React 18
- Redux (State Management)
- Tailwind CSS
- Material-UI
- React Router

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Socket.io (Real-time chat)

### Payment Integration
- Stripe
- Cash on Delivery

## ✨ Current Features

### For Customers
- User registration with email verification
- Browse products by category
- Search products
- Add to cart and wishlist
- Multiple payment options
- Apply coupon codes
- Track orders
- Chat with sellers
- Leave product reviews

### For Sellers
- Create and manage shop
- Add/edit/delete products
- Create discount events
- Manage orders
- Update delivery status
- Withdraw earnings
- Shop inbox for customer chat

### For Admin
- Dashboard overview
- Manage all users and sellers
- View all orders
- Manage withdrawal requests
- Platform analytics

## 🚧 Features I'm Adding / Customizing

- [ ] Feature 1 - *Description of what you're adding*
- [ ] Feature 2 - *Description of what you're adding*
- [ ] Bug fixes and UI improvements
- [ ] Performance optimizations

## 📁 Project Structure
Cartify/
├── backend/ # Node.js/Express server
│ ├── controller/ # Business logic
│ ├── model/ # Database models
│ ├── middleware/ # Auth & error handling
│ ├── db/ # Database connection
│ └── utils/ # Helper functions
├── frontend/ # React application
│ ├── src/
│ │ ├── components/ # Reusable components
│ │ ├── pages/ # Page views
│ │ ├── redux/ # State management
│ │ └── routes/ # Routing configuration
├── socket/ # Socket.io server for chat
└── uploads/ # Stored images

text

## 🚀 How to Run This Project

### Prerequisites
- Node.js installed
- MongoDB installed locally or MongoDB Atlas account
- Git installed

### Installation Steps

**1. Clone the repository**
```bash
git clone https://github.com/samarkhan56/cartify.git
cd cartify

2. Setup Backend

bash
cd backend
npm install
Create a .env file in backend folder:

env
PORT=8000
DB_URL=your_mongodb_connection_string
JWT_SECRET_KEY=your_secret_key
JWT_EXPIRES=7d
SMPT_HOST=smtp.gmail.com
SMPT_PORT=465
SMPT_MAIL=your_email@gmail.com
SMPT_PASSWORD=your_app_password
Create an uploads folder in backend directory

3. Setup Frontend

bash
cd frontend
npm install
npm start

4. Setup Socket Server

bash
cd socket
npm install
Create .env file:

env
PORT=4000
bash
npm start

5. Access the Application

Frontend: http://localhost:3000

Backend API: http://localhost:8000

Socket server: http://localhost:4000

👥 Team Members
[Samar Khan , Hamza Ahmed] - Project Lead & Developer

📝 License
This project is for educational purposes as part of our academic coursework.

📧 Contact
For any questions or suggestions, please reach out to the team.

<div align="center"> <p>⭐ Star this repository if you find it helpful! ⭐</p>
<p>Made with ❤️ for the Cartify Project</p> </div> ```
