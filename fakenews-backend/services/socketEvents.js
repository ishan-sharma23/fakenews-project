/**
 * WebSocket Event Handlers for Real-Time Analysis
 * Handles Socket.IO connections and real-time analysis updates
 */

// ML Service URL (Python Flask)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Initialize WebSocket event handlers
 * @param {SocketIO} io - Socket.IO instance
 */
const initializeSocketEvents = (io) => {
  console.log('[Socket.IO] Initializing event handlers...');
  
  io.on('connection', (socket) => {
    console.log(`[Socket] New client connected: ${socket.id}`);

    /**
     * Handle real-time analysis request
     * Event: 'analyze'
     * Data: { content: string, contentType: 'text' | 'url', userId?: string }
     */
    socket.on('analyze', async (data) => {
      try {
        const { content } = data;

        // Emit analysis started
        socket.emit('analysis-started', { timestamp: new Date() });

        // Call ML service
        const response = await fetch(`${ML_SERVICE_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content })
        });

        if (!response.ok) {
          throw new Error(`ML service error: ${response.status}`);
        }

        const result = await response.json();

        // Emit analysis result to the client
        socket.emit('analysis-complete', {
          result,
          timestamp: new Date(),
          contentLength: content.length
        });

        console.log(`[Socket] Analysis completed for client ${socket.id}`);
      } catch (error) {
        console.error(`[Socket] Analysis error: ${error.message}`);
        socket.emit('analysis-error', {
          error: error.message,
          timestamp: new Date()
        });
      }
    });

    /**
     * Handle client disconnect
     */
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = {
  initializeSocketEvents
};
