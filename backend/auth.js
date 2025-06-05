const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const Stripe = require('stripe');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load deployment configuration if available
let deploymentConfig = {
  ENABLE_DEPLOYMENT: true,
  ENABLE_MONGODB: true,
  ENABLE_STRIPE: true,
  ENABLE_EMAIL: true,
  BACKEND_PORT: 3000
};

// Try to load deployment configuration
try {
  const configPath = path.join(__dirname, '..', 'deployment.config');
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    configContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          deploymentConfig[key.trim()] = value.trim().replace(/"|'/g, '');
        }
      }
    });
    console.log('Deployment configuration loaded successfully in auth.js.');
  }
} catch (err) {
  console.error('Failed to load deployment configuration:', err);
}

// Check if deployment is enabled
if (deploymentConfig.ENABLE_DEPLOYMENT === 'false') {
  console.log('Deployment is disabled in configuration. Auth server will not start.');
  process.exit(0);
}

// Initialize stripe based on configuration
const stripe = deploymentConfig.ENABLE_STRIPE === 'true' ? 
  Stripe(process.env.STRIPE_SECRET_KEY) : null;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// MongoDB connection
if (deploymentConfig.ENABLE_MONGODB === 'true') {
  const mongoUri = deploymentConfig.MONGO_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/slider';
  mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected in auth.js'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.log('MongoDB connection disabled in configuration for auth.js');
}

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  role: String,
  verified: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// Password/email token schema
const tokenSchema = new mongoose.Schema({
  username: String,
  token: String,
  expires: Date,
  type: String // 'reset' or 'verify'
});
const Token = mongoose.model('Token', tokenSchema);

// Product schema
const productSchema = new mongoose.Schema({
  name: String,
  price: Number, // cents
  status: String
});
const Product = mongoose.model('Product', productSchema);

// Initialize products if empty
async function initProducts() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      { name: 'Rare Pikachu Card', price: 10000, status: 'Available', auction: false, auctionEnd: null },
      { name: 'Charizard Figure', price: 25000, status: 'Available', auction: false, auctionEnd: null }
    ]);
  }
}
initProducts();

// Registration endpoint (with email verification)
app.post('/auth/register', async (req, res) => {
  const { username, password, email, role } = req.body;
  if (!username || !password || !email || !role) return res.status(400).json({ error: 'All fields required' });
  if (await User.findOne({ username })) return res.status(400).json({ error: 'Username already exists' });
  if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already exists' });
  const hash = await bcrypt.hash(password, 10);
  await User.create({ username, email, password: hash, role, verified: false });
  const token = crypto.randomBytes(32).toString('hex');
  await Token.create({ username, token, expires: new Date(Date.now() + 24*3600_000), type: 'verify' });
  transporter.sendMail({
    from: process.env.MAIL_USER,
    to: email,
    subject: 'Verify your email',
    text: `Verify your account: http://localhost:5173/verify-email?token=${token}`
  });
  res.json({ success: true });
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
  if (!user.verified) return res.status(400).json({ error: 'Email not verified' });
  const token = jwt.sign({ username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, username, role: user.role });
});

// Token refresh endpoint
app.post('/auth/refresh', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    // Issue new token with same payload, new expiry
    const newToken = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token: newToken });
  });
});

// Email verification endpoint
app.post('/auth/verify-email', async (req, res) => {
  const { token } = req.body;
  const entry = await Token.findOne({ token, type: 'verify' });
  if (!entry || entry.expires < new Date()) return res.status(400).json({ error: 'Invalid or expired token' });
  const user = await User.findOne({ username: entry.username });
  if (!user) return res.status(400).json({ error: 'User not found' });
  user.verified = true;
  await user.save();
  await Token.deleteOne({ _id: entry._id });
  res.json({ success: true });
});

// Password reset request
app.post('/auth/request-reset', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'No user with that email' });
  const token = crypto.randomBytes(32).toString('hex');
  await Token.create({ username: user.username, token, expires: new Date(Date.now() + 3600_000), type: 'reset' });
  transporter.sendMail({
    from: process.env.MAIL_USER,
    to: email,
    subject: 'Password Reset',
    text: `Reset your password: http://localhost:5173/reset-password?token=${token}`
  });
  res.json({ success: true });
});

// Password reset
app.post('/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  const entry = await Token.findOne({ token, type: 'reset' });
  if (!entry || entry.expires < new Date()) return res.status(400).json({ error: 'Invalid or expired token' });
  const user = await User.findOne({ username: entry.username });
  if (!user) return res.status(400).json({ error: 'User not found' });
  user.password = await bcrypt.hash(password, 10);
  await user.save();
  await Token.deleteOne({ _id: entry._id });
  res.json({ success: true });
});

// Get products
app.get('/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Update product status/price (for bidding, buy now, etc.)
app.post('/products/update', async (req, res) => {
  const { id, price, status } = req.body;
  const product = await Product.findById(id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (price !== undefined) product.price = price;
  if (status) product.status = status;
  await product.save();
  res.json(product);
});

const PORT = deploymentConfig.BACKEND_PORT || process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
  console.log(`Deployment mode: ${deploymentConfig.ENABLE_DEPLOYMENT === 'true' ? 'Enabled' : 'Disabled'}`);
});
