const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const geoip = require('geoip-lite');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // folder cu index.html

// MongoDB Connection
mongoose.connect('mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/kidscars?retryWrites=true&w=majority')
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Mongoose Schemas
const visitorSchema = new mongoose.Schema({
  ip: String,
  location: Object,
  userAgent: String,
  language: String,
  platform: String,
  screenResolution: String,
  timezone: String,
  cookiesEnabled: Boolean,
  referer: String,
  timestamp: { type: Date, default: () => new Date().toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }) }
});

const messageSchema = new mongoose.Schema({
  message: String,
  ip: String,
  timestamp: { type: Date, default: () => new Date().toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }) }
});

const Visitor = mongoose.model('Visitor', visitorSchema);
const ChatMessage = mongoose.model('ChatMessage', messageSchema);

// Routes
app.post('/api/visitor-info', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
  const location = geoip.lookup(ip) || {};

  const visitor = new Visitor({
    ip,
    location,
    ...req.body
  });

  try {
    await visitor.save();
    res.status(201).json({ message: 'Visitor saved' });
  } catch (error) {
    console.error('Error saving visitor:', error);
    res.status(500).json({ error: 'Failed to save visitor' });
  }
});

app.post('/api/chat-message', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';

  const chat = new ChatMessage({
    message: req.body.message,
    ip
  });

  try {
    await chat.save();
    res.status(201).json({ message: 'Message saved' });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
