// This is just for the demo, in a real implementation you would only run one
// agent, and use a real messaging protocol to securely connect with other agents

// Note that this module acts a a singleton, as it connects the various agents
// within one simulation process:
var channels = {};

module.exports = {
  addChannel: function(address, cb) {
    channels[address] = cb;
    console.log(`Messaging channel for recipient ${address} created.`);
  },
  send: function(fromNick, toNick, msg) {
    console.log(`Message from ${fromNick} to ${toNick}: ${msg}`);
    channels[toNick](fromNick, msg);
  },
};
