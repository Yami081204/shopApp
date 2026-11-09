const createEventPublisher = ({ logger = console } = {}) => {
  const observers = new Map();

  return {
    subscribe(eventType, observer) {
      const listeners = observers.get(eventType) || new Set();
      listeners.add(observer);
      observers.set(eventType, listeners);
      return () => listeners.delete(observer);
    },

    async publish(event) {
      const listeners = [
        ...(observers.get(event.type) || []),
        ...(observers.get('*') || [])
      ];
      const results = await Promise.allSettled(listeners.map((observer) => observer(event)));
      for (const result of results) {
        if (result.status === 'rejected') {
          logger.error(`Observer failed for ${event.type}:`, result.reason);
        }
      }
    }
  };
};

export { createEventPublisher };
