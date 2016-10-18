var SettlementEngine = require('../../src/settlement-engine');

function nextStep(actors, incoming) {
  var outgoing = [];
  var promises = [];
  function reactTo(receiver, text, sendingPeer) {
    return actors[receiver].generateReactions(text, sendingPeer).then((reactions) => {
      for (var j=0; j<reactions.length; j++) {
        if (reactions[j].to === 'debtor') {
          rotation = 2;
        } else if (reactions[j].to === 'creditor') {
          rotation = 1;
        } else {
          console.error(reactions);
          throw new Error('message to unknown peer type!');
        }
        // console.log('adding outgoing', {
        //   sender: receiver,
        //   receiver: ((receiver + rotation) % actors.length),
        //   text: reactions[j].msg,
        // });
        outgoing.push({
          sender: receiver,
          receiver: ((receiver + rotation) % actors.length),
          text: reactions[j].msg,
        });
      }
    });
  }
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
    promises.push(reactTo(incoming[i].receiver, incoming[i].text, sendingPeer));
  }
  // console.log('promises gather, now executing:');
  return Promise.all(promises).then((results) => {
    // console.log('All promises executed', results);
    return outgoing;
  }, (err) => {
    console.error('Something went wrong', err);
  });
}

function test_settlement_sequence() {
  var actors = [
    new SettlementEngine(),
    new SettlementEngine(),
    new SettlementEngine(),
  ];
  var traffic1 = [{
    sender: undefined,
    receiver: 0,
    text: '{}',
  }];
  console.log('Step 1:');
  return nextStep(actors, traffic1).then((traffic2) => {
    console.log('Step 2:');
    return nextStep(actors, traffic2);
  }).then((traffic3) => {
    console.log('Step 3:');
    return nextStep(actors, traffic3);
  }).then((traffic4) => {
    console.log('Step 4:');
    return nextStep(actors, traffic4);
  }).then((traffic5) => {
    console.log('Step 5:');
    return nextStep(actors, traffic5);
  }).then((traffic6) => {
    console.log('Step 6:');
    return nextStep(actors, traffic6);
  }).then((traffic7) => {
    console.log('Step 7:');
    return nextStep(actors, traffic7);
  }).then((traffic8) => {
    console.log('Step 8:');
    return nextStep(actors, traffic8);
  }).then((traffic9) => {
    console.log('Step 9:');
    return nextStep(actors, traffic9);
  });
}

// TODO: some automated checks on the traffic steps, instead of visually checking console log during this test

Promise.all([
  test_settlement_sequence(),
]).then(() => { console.log('OK'); });
