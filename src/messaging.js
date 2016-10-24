// This is just for the demo, in a real implementation you would only run one
// agent, and use a real messaging protocol to securely connect with other agents

var debug = require('./debug');

// Note that this module acts a a singleton, as it connects the various agents
// within one simulation process:
var channels = {};
var queue = [];

function flush() {
  debug.log(`Flushing ${queue.length} messages`);
  var iteration = queue;
  var cursor = 0;
  queue = [];
  function handleNextMessages() {
    if (cursor === iteration.length) {
      return Promise.resolve();
    }
    return channels[iteration[cursor].toNick](iteration[cursor].fromNick, iteration[cursor].msg).then(() => {
      cursor++;
    });
  }
 
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
    queue.push({ fromNick, toNick, msg });
    debug.log(`Message queued from ${fromNick} to ${toNick}:`);
    debug.log(msg);
    debug.log(JSON.parse(msg));
    return Promise.resolve();
  },
  flush,  
};
