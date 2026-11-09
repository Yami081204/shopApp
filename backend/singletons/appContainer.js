let instance = null;

const getAppContainer = (factory) => {
  if (!instance) {
    if (typeof factory !== 'function') {
      throw new Error('App container has not been created');
    }
    instance = factory();
  }
  return instance;
};

const resetAppContainer = () => {
  instance = null;
};

export { getAppContainer, resetAppContainer };
