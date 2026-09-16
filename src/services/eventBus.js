// Real-time Event Bus & Cross-Tab BroadcastChannel for HotPot Order Alerts

class EventBus {
  constructor() {
    this.listeners = {};
    // Setup cross-tab sync via BroadcastChannel if available in browser
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('hotpot_crosstab_events');
      this.channel.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (type && this.listeners[type]) {
          this.listeners[type].forEach(callback => callback(data, true)); // true indicates cross-tab
        }
      };
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    // Notify local listeners
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data, false));
    }
    // Broadcast to all other open browser tabs
    if (this.channel) {
      this.channel.postMessage({ type: event, data });
    }
  }
}

export const eventBus = new EventBus();
