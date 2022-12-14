const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

// Models
const { User } = require("../models/user.model");
const { Product } = require("../models/products.model");
const { ProductImg } = require("../models/productImg.model");
const { Order } = require("../models/order.model");
const { Cart } = require("../models/cart.model");
const { ProductInCart } = require("../models/productInCart.model");

// Utils
const { catchAsync } = require("../utils/catchAsync.util");
const { AppError } = require("../utils/appError.util");

dotenv.config({ path: "./config.env" });

const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.findAll({
    attributes: { exclude: ["password"] },
    where: { status: "active" },
  });

  res.status(200).json({
    status: "success",
    data: { users },
  });
});

const createUser = catchAsync(async (req, res, next) => {
  const { username, email, password } = req.body;

  const userExist = await User.findOne({ where: { email } });

  if (userExist) {
    return next(new AppError("email is already taken", 409));
  }

  // Encrypt the password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = await User.create({
    username,
    email,
    password: hashedPassword,
  });

  // Remove password from response
  newUser.password = undefined;

  // 201 -> Success and a resource has been created
  res.status(201).json({
    status: "success",
    data: { newUser },
  });
});

const updateUser = catchAsync(async (req, res, next) => {
  const { username, email } = req.body;
  const { user } = req;

  await user.update({ username, email });

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

const deleteUser = catchAsync(async (req, res, next) => {
  const { user } = req;

  await user.update({ status: "disabled" });

  res.status(204).json({ status: "success" });
});

const login = catchAsync(async (req, res, next) => {
  // Get email and password from req.body
  const { email, password } = req.body;

  // Validate if the user exist with given email
  const user = await User.findOne({
    where: { email, status: "active" },
  });

  // Compare passwords (entered password vs db password)
  // If user doesn't exists or passwords doesn't match, send error
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError("Wrong credentials", 400));
  }

  // Remove password from response
  user.password = undefined;

  // Generate JWT (payload, secretOrPrivateKey, options)
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.status(200).json({
    status: "success",
    data: { user, token },
  });
});

const getUsersProducts = catchAsync(async (req, res, next) => {
  const { sessionUser } = req;

  const products = await Product.findAll({
    where: { userId: sessionUser.id },
    include: ProductImg,
  });

  res.status(200).json({
    status: "success",
    data: {
      products,
    },
  });
});

const getUsersOrders = catchAsync(async (req, res, next) => {
  const { sessionUser } = req;

  const orders = await Order.findAll({
    where: { userId: sessionUser.id },
    include: {
      model: Cart,
      include: {
        model: ProductInCart,
        where: { status: "purchased" },
        include: { model: Product, include: { model: ProductImg } },
      },
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      orders,
    },
  });
});

const getOneUsersOrder = catchAsync(async (req, res, next) => {
  let { order } = req;

  order = await Order.findOne({
    where: { id: order.id },
    include: {
      model: Cart,
      include: {
        model: ProductInCart,
        where: { status: "purchased" },
        include: { model: Product, include: { model: ProductImg } },
      },
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  login,
  getUsersProducts,
  getUsersOrders,
  getOneUsersOrder,
};
