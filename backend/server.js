const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const Stripe = require('stripe');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Use .env for secret key

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Serve uploaded images statically
app.use('/uploads', express.static(uploadDir));

// MongoDB (mongoose) setup
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/slider');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  status: String,
  auction: Boolean,
  auctionEnd: Number,
  imageUrl: String
});
const Product = mongoose.model('Product', productSchema);

const chatSchema = new mongoose.Schema({
  user: String,
  text: String,
  time: String
});
const ChatMessage = mongoose.model('ChatMessage', chatSchema);

// On server start, load products and chat from DB
let products = [];
let chatHistory = [];
const MAX_CHAT_HISTORY = 50;
(async () => {
  products = await Product.find().lean();
  chatHistory = await ChatMessage.find().sort({ _id: 1 }).lean();
  if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory = chatHistory.slice(-MAX_CHAT_HISTORY);
})();

io.on('connection', (socket) => {
  socket.on('join-room', roomId => {
    socket.join(roomId);
    socket.roomId = roomId;
    // Notify broadcaster of new viewer
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const broadcaster = clients.find(id => io.sockets.sockets.get(id)?.isBroadcaster);
    if (broadcaster && socket.id !== broadcaster) {
      io.to(broadcaster).emit('viewer-joined', { socketId: socket.id });
    }
    // Update viewer count
    io.to(roomId).emit('viewer-count', clients.length - (broadcaster ? 1 : 0));
  });
  socket.on('leave-room', roomId => {
    socket.leave(roomId);
    if (socket.roomId === roomId) delete socket.roomId;
    // Update viewer count
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const broadcaster = clients.find(id => io.sockets.sockets.get(id)?.isBroadcaster);
    io.to(roomId).emit('viewer-count', clients.length - (broadcaster ? 1 : 0));
    if (broadcaster) io.to(broadcaster).emit('viewer-left', { socketId: socket.id });
  });
  socket.on('offer', ({ offer, to }) => io.to(to).emit('offer', { offer, from: socket.id }));
  socket.on('answer', ({ answer, to }) => io.to(to).emit('answer', { answer, from: socket.id }));
  socket.on('ice-candidate', ({ candidate, to }) => io.to(to).emit('ice-candidate', { candidate, from: socket.id }));
  socket.on('broadcaster', () => {
    socket.isBroadcaster = true;
  });
  socket.on('disconnect', () => {
    if (socket.roomId) {
      const clients = Array.from(io.sockets.adapter.rooms.get(socket.roomId) || []);
      const broadcaster = clients.find(id => io.sockets.sockets.get(id)?.isBroadcaster);
      io.to(socket.roomId).emit('viewer-count', clients.length - (broadcaster ? 1 : 0));
      if (socket.isBroadcaster) {
        io.to(socket.roomId).emit('broadcaster-left');
      } else if (broadcaster) {
        io.to(broadcaster).emit('viewer-left', { socketId: socket.id });
      }
    }
  });
  // Send chat history to new client
  socket.emit('chat-history', chatHistory);

  socket.on('chat-message', async msg => {
    chatHistory.push(msg);
    if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.shift();
    await ChatMessage.create(msg);
    io.emit('chat-message', msg);
  });
  socket.on('add-product', async product => {
    product.id = Date.now();
    product.status = 'Available';
    // Support adding as auction directly
    if (product.auction === true && typeof product.duration === 'number' && product.duration > 0) {
      product.auctionEnd = Date.now() + product.duration * 1000;
    } else {
      product.auction = false;
      product.auctionEnd = null;
    }
    const dbProduct = await Product.create(product);
    products.push(dbProduct.toObject());
    io.emit('product-update', products);
  });
  socket.on('delete-product', async productId => {
    await Product.deleteOne({ id: productId });
    products = products.filter(p => p.id !== productId);
    io.emit('product-update', products);
  });
  socket.on('start-auction', async ({ productId, duration }) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      product.auction = true;
      product.auctionEnd = Date.now() + duration * 1000;
      await Product.updateOne({ id: productId }, { auction: true, auctionEnd: product.auctionEnd });
      io.emit('product-update', products);
    }
  });
});

// Stripe payment endpoint
app.post('/create-checkout-session', async (req, res) => {
  const { productId, user } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product || product.status !== 'Available') {
    return res.status(400).json({ error: 'Product not available' });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: product.name },
            unit_amount: product.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:5173/payment-success?productId=' + productId + '&user=' + encodeURIComponent(user),
      cancel_url: 'http://localhost:5173/payment-cancel',
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Email config (use your real SMTP credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

app.post('/shipping-info', async (req, res) => {
  const { name, address, city, zip, email } = req.body;
  try {
    // Send confirmation to user
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: 'Order Confirmation',
      text: `Thank you ${name}! Your order will be shipped to: ${address}, ${city}, ${zip}`
    });
    // Send notification to admin
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: process.env.MAIL_USER,
      subject: 'New Order Shipping Info',
      text: `Order for ${name}\nAddress: ${address}, ${city}, ${zip}\nEmail: ${email}`
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Image upload endpoint
app.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Auction end timer: check every second for ended auctions
setInterval(async () => {
  let changed = false;
  for (const product of products) {
    if (product.auction && product.auctionEnd && product.auctionEnd < Date.now()) {
      product.auction = false;
      product.status = 'Auction Ended';
      await Product.updateOne({ id: product.id }, { auction: false, status: 'Auction Ended' });
      changed = true;
    }
  }
  if (changed) {
    io.emit('product-update', products);
  }
}, 1000);

server.listen(3000, () => console.log('Socket.io server running on port 3000'));
