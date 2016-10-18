var SettlementEngine = require('../../src/settlement-engine');

function nextStep(actors, incoming) {
  console.log('nextStep', actors, incoming);
  var outgoing = [];
  for (var i=0; i<incoming.length; i++) {
    var sendingPeer;
    switch(incoming[i].sender - incoming[i].receiver) {
    //val sender receiver
    case -2:  //  0      2
      sendingPeer = 'creditor';
      break;
    case -1:   // 0      1
          // 1      2
      sendingPeer = 'debtor';
      break;
    case 1:   //  1      0
         //  2      1
      sendingPeer = 'creditor';
      break;
    case 2:   //  2      0
      sendingPeer = 'debtor';
      break;
    };
    var reactions = actors[incoming[i].receiver].generateReactions(incoming[i].text, sendingPeer);
    for (var j=0; j<reactions.length; j++) {
      if (reactions[j].to === 'debtor') {
        rotation = 2;
      } else if (reactions[j].to === 'creditor') {
        rotation = 1;
      } else {
        console.error(incoming[i], reactions);
        throw new Error('message to unknown peer type!');
      }
      
      outgoing.push({
        sender: incoming[i].receiver,
        receiver: ((incoming[i].receiver + rotation) % actors.length),
        text: reactions[j].msg,
      });
    }
  }
  return outgoing;
}

var messagesMock = {
  announcePubkey: function(pubkey) {
    return { to: 'debtor', msg: `hey, here is my pubkey; ${pubkey}` };
  },
};

var signaturesMock = {
  generateKeypair: function() {
    return { pub: 'pub', priv: 'priv' };
  }
};


function test_settlement_sequence() {
  return new Promise((resolve, reject) => {
    var actors = [
      new SettlementEngine(messagesMock, signaturesMock),
      new SettlementEngine(messagesMock, signaturesMock),
      new SettlementEngine(messagesMock, signaturesMock),
    ];
    var traffic = [{
      sender: undefined,
      receiver: 0,
      text: '',
    }];
    traffic = nextStep(actors, traffic);
    traffic = nextStep(actors, traffic);
    resolve();
  });
}

Promise.all([
  test_settlement_sequence(),
]).then(() => { console.log('OK'); });
