// This is just for the demo, in a real implementation you would only run one
// agent, and use a real messaging protocol to securely connect with other agents

// Note that this module acts a a singleton, as it connects the various agents
// within one simulation process:
var channels = {};
var queue = [];
var iteration;

function flush() {
  console.log(`Flushing ${queue.length} messages`);
  iteration = queue;
  queue = [];
  return flushIteration();
}

function flushIteration() {
  var nextMsg = iteration.shift();
  if(nextMsg) {
    console.log(`Message from ${nextMsg.fromNick} to ${nextMsg.toNick}: ${nextMsg.msg}`);
    return channels[nextMsg.toNick](nextMsg.fromNick, nextMsg.msg).then(() => {
      return flushIteration();
    });
  } else {
    return Promise.resolve();
  }
}

module.exports = {
  addChannel: function(address, cb) {
    channels[address] = cb;
    console.log(`Messaging channel for recipient ${address} created.`);
  },
  send: function(fromNick, toNick, msg) {
    queue.push({ fromNick, toNick, msg });
    console.log(`Message queued`, { fromNick, toNick, msg });
    return Promise.resolve();
  },
  flush,  
};
