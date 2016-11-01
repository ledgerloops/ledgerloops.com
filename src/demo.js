var Challenge = require('./challenges');

function Sender() {
};

function Receiver() {
};

Sender.prototype.createChallenge = function() {
  this._challenge = new Challenge();
  return this._challenge.fromScratch();
};

Sender.prototype.solveChallenge = function() {
  console.log('solving challenge');
  return this._challenge.solve();
};

Receiver.prototype.rememberChallenge = function(obj) {
  this._challenge = new Challenge();
  return this._challenge.fromData(obj);
};

Receiver.prototype.verifySolution = function(solution) {
  return this._challenge.verifySolution(solution);
};

function demo() {
  var sender = new Sender();
  var receiver = new Receiver();
  sender.createChallenge().then(challenge => {
    console.log({ challenge });
    receiver.rememberChallenge(challenge);
  }).then(() => {
    return receiver.verifySolution('asdf');
  }).then(verdictForWrongSolution => {
    console.log({ verdictForWrongSolution });
    return sender.solveChallenge();
  }).then(solution => {
    console.log({ solution });
    return receiver.verifySolution(solution);
  }).then(verdictForSenderSolution => {
    console.log({ verdictForSenderSolution });
  });
}

//...
demo();
