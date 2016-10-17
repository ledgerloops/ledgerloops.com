var simulator = require('./simulator');

simulator.addAgent('michiel');
simulator.addAgent('joop');
simulator.addConnection('michiel', 'joop');
simulator.setMessageHandler('joop', function(fromNick, text) {
  console.log(`Joop received this message from ${fromNick}: ${text}`);
});
simulator.simulateMessage('michiel', 'joop', 'hi there');
