// This is just for the demo, in a real implementation you would only run one
// agent, and use a real messaging protocol to securely connect with other agents

var debug = require('./debug');

// Note that this module acts a a singleton, as it connects the various agents
// within one simulation process:
var channels = {};
var queue = [];
var autoFlush = false;

function sendOneMessage(obj) {
  if (typeof channels[obj.toNick] === 'undefined') {
    console.error('Unknown recipient', obj);
    return Promise.reject(new Error('unknown message recipient'));
  }
  return channels[obj.toNick](obj.fromNick, obj.msg);
}

function flush() {
  var iteration = queue;
  var cursor = 0;
  queue = [];
  function handleNextMessages() {
    if (cursor === iteration.length) {
      return Promise.resolve();
    }
    debug.log('flushing message', cursor);
    return sendOneMessage(iteration[cursor]).then(() => {
      debug.log('done flushing message', cursor);
      debug.log(`Queue now has ${queue.length} messages, iteration has ${iteration.length}.`);
      cursor++;
      return handleNextMessages();
    });
  }

  debug.log(`Flushing ${iteration.length} messages:`);
  debug.log(iteration);

  return handleNextMessages().then(() => {
    return iteration;
  });
}

module.exports = {
  addChannel: function(address, cb) {
    channels[address] = cb;
    debug.log(`Messaging channel for recipient ${address} created.`);
  },
  send: function(fromNick, toNick, msg) {
    if (autoFlush) {
      return sendOneMessage({ fromNick, toNick, msg });
    } else {
      queue.push({ fromNick, toNick, msg });
      debug.log(JSON.parse(msg));
      return Promise.resolve();
    }
  },
  flush,
  autoFlush: function() { autoFlush = true; },
  getQueue: function() { return queue; },
  discardQueue: function() { queue = []; },
};
