const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const geoip = require('geoip-lite');
const moment = require('moment-timezone');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // serve static files from 'public' folder

// Connect to MongoDB (schimba cu URL-ul tău MongoDB)
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


// Schemes & Models
const VisitorSchema = new mongoose.Schema({
  sessionId: String,
  ip: String,
  geo: Object,
  timestamp: String,
  browser: String,
  platform: String,
  language: String,
  userAgent: String,
  screenResolution: String,
  timezone: String,
  cookiesEnabled: Boolean,
  referer: String,
});

const ChatSchema = new mongoose.Schema({
  sessionId: String,
  message: String,
  ip: String,
  timestamp: String,
});

const UserSessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },
  visits: [
    {
      ip: String,
      geo: Object,
      timestamp: String,
      browser: String,
      platform: String,
      language: String,
      userAgent: String,
      screenResolution: String,
      timezone: String,
      cookiesEnabled: Boolean,
      referer: String,
    },
  ],
});

const Visitor = mongoose.model('Visitor', VisitorSchema);
const Chat = mongoose.model('Chat', ChatSchema);
const UserSession = mongoose.model('UserSession', UserSessionSchema);

// Helper: get IP from req
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || ''
  );
}

// Routes

// Save visitor info
app.post('/api/visitor-info', async (req, res) => {
  try {
    const ip = getClientIP(req);
    const geo = geoip.lookup(ip);
    const roTime = moment().tz('Europe/Bucharest').format();

    const {
      sessionId,
      browser,
      platform,
      language,
      userAgent,
      screenResolution,
      timezone,
      cookiesEnabled,
      referer,
    } = req.body;

    const visitData = {
      sessionId,
      ip,
      geo,
      timestamp: roTime,
      browser,
      platform,
      language,
      userAgent,
      screenResolution,
      timezone,
      cookiesEnabled,
      referer,
    };

    // Save visit in Visitor collection (flat log)
    await Visitor.create(visitData);

    // Upsert user session - add visit to visits array or create new
    await UserSession.findOneAndUpdate(
      { sessionId },
      { $push: { visits: visitData } },
      { upsert: true, new: true }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error('Error saving visitor info:', err);
    res.status(500).send(err.message);
  }
});

// Save chat message
app.post('/api/chat-message', async (req, res) => {
  try {
    const ip = getClientIP(req);
    const roTime = moment().tz('Europe/Bucharest').format();

    const { sessionId, message } = req.body;
    if (!message || !sessionId) return res.status(400).send('Missing data');

    await Chat.create({
      sessionId,
      message,
      ip,
      timestamp: roTime,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error('Error saving chat message:', err);
    res.status(500).send(err.message);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});