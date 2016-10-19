function search(ledgers) {
  var debtors = {};
  var creditors = {};
  for (var i=0; i<ledgers.length; i++) {
    for (var currency in ledgers[i].debts[currency] !== 'undefined') {
      if (this._ledgers[i].debts[currency].debtor === this._ledgers[i].peerNick) {
        if (typeof debtors[currency] === 'undefined') {
          debtors[currency] = [];
        }
        debtors[currency].push({
          peerNick: ledgers[i].peerNick,
          amount: ledgers[i].debts[currency].amount,
          currency,
        });
      } else {
        if (typeof creditors[currency] === 'undefined') {
          creditors[currency] = [];
        }
        creditors[currency].push({
          peerNick: ledgers[i].peerNick,
          amount: ledgers[i].debts[currency].amount,
          currency,
        });
      }
    }
  }
  // TODO: smart way to choose this value:
  var amount = 0.01;

  var peerPairs = [];
  for (var currency in debtors) {
    // TODO: randomize order in which peerPairs are formed:
    for (var i=0; i<debtors[currency].length; i++) {
      for (var j=0; j<creditors[currency].length; j++) {
        debtors[currency][i].amount -= amount;
        creditors[currency][j].amount -= amount;
        if ((debtors[i].amount >= 0) && (creditors[j].amount >= 0)) {
          peerPairs.push({ debtorNick: debtors[i].peerNick, creditorNick: creditors[j].peerNick, amount, currency });
        }
      }
    }
  }
  return peerPairs;
};

function getPeerPair(pubkey) {
  return ['unknown', 'unknown'];
}

module.exports = {
  search,
  getPeerPair,
};
