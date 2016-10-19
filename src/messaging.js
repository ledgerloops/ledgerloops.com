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
