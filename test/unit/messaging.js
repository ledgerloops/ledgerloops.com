var messaging = require('../../src/messaging');

function test_sendMessage() {
  return new Promise((resolve, reject) => {
    messaging.addChannel('joop', function(fromNick, text) {
      if((fromNick === 'michiel') && (text === 'hi there')) {
        resolve();
      }
    });
    messaging.send('michiel', 'joop', 'hi there');
  });
}

Promise.all([
  test_sendMessage(),
]).then(() => { console.log('OK'); });
