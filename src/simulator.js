var Agent = function(nick) {
  this.nick = nick;
  this.peers = {};
};

Agent.prototype.addPeer = function(nick, wayToContact) {
  this.peers[nick] = wayToContact;
};

Agent.prototype.onmessage = function(fromNick, text) {
  if (typeof this.messageHandler !== 'function') {
    throw new Error(`Agent ${this.nick} does not have a message handler`);
  }
  this.messageHandler(fromNick, text);
};

Agent.prototype.sendMessage = function(toNick, text) {
  this.peers[toNick](this.nick, text);
};
 
var agents = {};

module.exports = {
  addAgent: function(nick) {
    agents[nick] = new Agent(nick);
  },
  addConnection: function(fromNick, toNick) {
    agents[fromNick].addPeer(toNick,
        agents[toNick].onmessage.bind(agents[toNick]));
    agents[toNick].addPeer(fromNick,
        agents[fromNick].onmessage.bind(agents[fromNick]));
  },
  setMessageHandler: function(nick, handler) {
    agents[nick].messageHandler = handler;
  },
  simulateMessage: function(fromNick, toNick, text) {
    agents[fromNick].sendMessage(toNick, text);
  },
};
