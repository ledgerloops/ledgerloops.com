var simulator = require('../../src/simulator');

function test_sendMessage() {
  return new Promise((resolve, reject) => {
    simulator.addAgent('michiel');
    simulator.addAgent('joop');
    simulator.addConnection('michiel', 'joop');
    simulator.setMessageHandler('joop', function(fromNick, text) {
      if((fromNick === 'michiel') && (text === 'hi there')) {
        resolve();
      }
    });
    simulator.simulateMessage('michiel', 'joop', 'hi there');
  });
}

Promise.all([
  test_sendMessage(),
]).then(() => { console.log('OK'); });
