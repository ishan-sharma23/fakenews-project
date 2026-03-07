import io from 'socket.io-client';

/**
 * WebSocket Service
 * Manages real-time connection to backend via Socket.IO
 */

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map(); // For internal events
  }

  /**
   * Initialize Socket.IO connection
   * @param {string} url - Backend server URL (e.g., 'http://localhost:5000')
   */
  connect(url = process.env.REACT_APP_API_URL || 'http://localhost:5000') {
    if (this.socket) {
      console.log('[WebSocket] Already connected');
      return this.socket;
    }

    console.log('[WebSocket] Connecting to:', url);
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      autoConnect: true,
      forceNew: false
    });

    // Connection established
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected successfully:', this.socket.id);
      this.isConnected = true;
      this._emitInternal('connected', this.socket.id);
    });

    // Connection failed
    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this._emitInternal('connection-error', error);
    });

    // Disconnected
    this.socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      this.isConnected = false;
      this._emitInternal('disconnected');
    });

    return this.socket;
  }

  /**
   * Emit internal event (not to server)
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  _emitInternal(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Send analysis request
   * @param {string} content - News content to analyze
   * @param {string} contentType - Type of content ('text' or 'url')
   * @param {string} userId - Optional user ID
   */
  sendAnalysis(content, contentType = 'text', userId = null) {
    if (!this.socket || !this.isConnected) {
      console.error('[WebSocket] Socket not connected');
      return;
    }

    this.socket.emit('analyze', {
      content,
      contentType,
      userId
    });
  }

  /**
   * Listen to real-time analysis results
   * @param {Function} callback - Callback function
   */
  onAnalysisComplete(callback) {
    if (this.socket) {
      this.socket.on('analysis-complete', callback);
    }
  }

  /**
   * Listen to analysis started
   * @param {Function} callback - Callback function
   */
  onAnalysisStarted(callback) {
    if (this.socket) {
      this.socket.on('analysis-started', callback);
    }
  }

  /**
   * Listen to analysis errors
   * @param {Function} callback - Callback function
   */
  onAnalysisError(callback) {
    if (this.socket) {
      this.socket.on('analysis-error', callback);
    }
  }

  /**
   * Generic event listener (for internal events like 'connected', 'disconnected')
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    // Check if it's an internal event
    if (event === 'connected' || event === 'disconnected' || event === 'connection-error') {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    } else if (this.socket) {
      // Socket.IO event
      this.socket.on(event, callback);
    }
  }

  /**
   * Emit custom event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[WebSocket] Cannot emit event '${event}' - socket not connected`);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   */
  off(event) {
    // Check if it's an internal event
    if (event === 'connected' || event === 'disconnected' || event === 'connection-error') {
      this.listeners.delete(event);
    } else if (this.socket) {
      this.socket.off(event);
    }
  }
}

// Export singleton instance
const socketServiceInstance = new SocketService();
export default socketServiceInstance;

