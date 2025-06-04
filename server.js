const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const Stripe = require('stripe');
const cors = require('cors');
const nodemailer = require('nodemailer');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Use .env for secret key

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

let viewerCount = 0;
let products = [
  { id: 1, name: 'Rare Pikachu Card', price: '$100', status: 'Available' },
  { id: 2, name: 'Charizard Figure', price: '$250', status: 'Available' }
];

io.on('connection', (socket) => {
  viewerCount++;
  io.emit('viewer-count', viewerCount);
  socket.emit('product-update', products);

  socket.on('chat-message', msg => io.emit('chat-message', msg));

  socket.on('place-bid', ({ productId, amount, user }) => {
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) {
      socket.emit('bid-fail', { reason: 'Product not found.' });
      return;
    }
    const product = products[idx];
    if (product.status !== 'Available') {
      socket.emit('bid-fail', { reason: 'Product not available.' });
      return;
    }
    product.price = `$${amount}`;
    io.emit('bid-success', { productId, amount: `$${amount}`, user });
    io.emit('product-update', products);
  });

  // Buy Now
  socket.on('buy-now', ({ productId, user }) => {
    // Payment will be handled via Stripe, so just notify client to start payment
    socket.emit('start-payment', { productId, user });
  });

  // Auction Timers
  let auctionIntervals = {};
  let auctionTimers = {};
  socket.on('start-auction', ({ productId, duration }) => {
    if (auctionIntervals[productId]) return; // Already running
    auctionTimers[productId] = duration;
    io.emit('auction-timer', auctionTimers);
    auctionIntervals[productId] = setInterval(() => {
      auctionTimers[productId]--;
      if (auctionTimers[productId] <= 0) {
        clearInterval(auctionIntervals[productId]);
        delete auctionIntervals[productId];
        products.find(p => p.id === productId).status = 'Auction Ended';
        io.emit('product-update', products);
      }
      io.emit('auction-timer', auctionTimers);
    }, 1000);
  });

  socket.on('disconnect', () => {
    viewerCount--;
    io.emit('viewer-count', viewerCount);
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
});

server.listen(3000, () => console.log('Socket.io server running on port 3000'));
