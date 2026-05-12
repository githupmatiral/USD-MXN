require('dotenv').config();
const express = require('express');
const cors = require('cors');

const signalsRoutes = require('./routes/signals');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'MXN Signals Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'FER3OON MXN Signals API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      signals: '/api/signals/mxn',
      upcoming: '/api/signals/upcoming',
      clearCache: '/api/signals/clear-cache'
    }
  });
});

// API Routes
app.use('/api/signals', signalsRoutes);

// Start background signal refresh
const signalAnalyzer = require('./services/signalAnalyzer');
signalAnalyzer.startBackgroundRefresh();

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MXN Signals Backend running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`🤖 Bot URL: ${process.env.BOT_URL}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
});
