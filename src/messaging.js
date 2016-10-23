// This is just for the demo, in a real implementation you would only run one
// agent, and use a real messaging protocol to securely connect with other agents

// Note that this module acts a a singleton, as it connects the various agents
// within one simulation process:
var channels = {};
var queue = [];

function flush() {
  console.log(`Flushing ${queue.length} messages`);
  var iteration = queue;
  queue = [];
  return Promise.all(iteration.map(queuedMsg => {
    return channels[queuedMsg.toNick](queuedMsg.fromNick, queuedMsg.msg);
  })).then(() => {
    return iteration;
  });
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
