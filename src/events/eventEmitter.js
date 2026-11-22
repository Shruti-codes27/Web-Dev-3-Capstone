const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}

const appEventEmitter = new AppEventEmitter();

// App event constants
const APP_EVENTS = {
  ORDER_PLACED: 'order:placed',
  ORDER_STATUS_UPDATED: 'order:status_updated',
  ORDER_CANCELLED: 'order:cancelled',
  STOCK_LOW: 'stock:low'
};

module.exports = {
  appEventEmitter,
  APP_EVENTS
};
