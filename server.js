require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const geoip = require('geoip-lite');
const useragent = require('useragent');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Schemas
const visitorSchema = new mongoose.Schema({
  ip: String,
  geo: Object,
  userAgent: String,
  browser: String,
  os: String,
  platform: String,
  language: String,
  screenResolution: String,
  timezone: String,
  cookiesEnabled: Boolean,
  referer: String,
  visitTime: { type: Date, default: () => new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" })) }
});

const chatSchema = new mongoose.Schema({
  visitorId: mongoose.Schema.Types.ObjectId,
  messages: [{
    text: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

const Visitor = mongoose.model('Visitor', visitorSchema);
const Chat = mongoose.model('Chat', chatSchema);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to get client IP (behind proxies too)
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',').shift() || req.connection.remoteAddress;
}

// Routes

// Save visitor info
app.post('/api/visitor-info', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const geo = geoip.lookup(ip) || {};
    const ua = useragent.parse(req.body.userAgent);

    const visitor = new Visitor({
      ip,
      geo,
      userAgent: req.body.userAgent,
      browser: ua.toAgent(),
      os: ua.os.toString(),
      platform: req.body.platform,
      language: req.body.language,
      screenResolution: req.body.screenResolution,
      timezone: req.body.timezone,
      cookiesEnabled: req.body.cookiesEnabled,
      referer: req.body.referer,
    });

    await visitor.save();

    res.status(201).json({ message: 'Visitor info saved', visitorId: visitor._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save visitor info' });
  }
});

// Save chat message
app.post('/api/chat-message', async (req, res) => {
  try {
    // Expecting visitorId and message in body
    const { visitorId, message } = req.body;
    if (!visitorId || !message) return res.status(400).json({ error: 'Missing visitorId or message' });

    let chat = await Chat.findOne({ visitorId });
    if (!chat) {
      chat = new Chat({ visitorId, messages: [] });
    }
    chat.messages.push({ text: message });
    await chat.save();

    res.status(201).json({ message: 'Message saved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save chat message' });
  }
});

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
