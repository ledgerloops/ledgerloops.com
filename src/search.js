// sending the probe tokens from creditor to debtor is maybe quite arbitrary,
// you could also send then from debtor to creditor, or even in both
// directions. As long as they get forwarded

function Search() {
  this.tokensQueued = {};
  this.tokensSent = {};
  };
}


Search.prototype.getProbeTokens = function(ledgers) {
  var debtors = {};
  var creditors = {};
  var newPeerPairs = [];
  // TODO: smart way to choose this value:
  var amount = 0.01;

  function findCreditorsAndDebtors() {
    for (var i=0; i<ledgers.length; i++) {
      for (var currency in ledgers[i].debts) {
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
  }

  function pairPeers(signatures) {
    var numNewTokensCreated = 0;
    for (var currency in debtors) {
      for (var i=0; i<debtors[currency].length; i++) {
        for (var j=0; j<creditors[currency].length; j++) {
          debtors[currency][i].amount -= amount;
          creditors[currency][j].amount -= amount;
          if ((debtors[i].amount >= 0) && (creditors[j].amount >= 0)) {
            var creditorNick = creditors[currency][j].peerNick;
            var debtorNick = debtors[currency][j].peerNick;
            var token;
            if (this.haveToken[JSON.stringify([creditorNick, debtorNick])]) {
              continue;
              // token already sent, wait for it to come back or not, but no use sending another one
              // it's possible that a loop exists for this peer pair, but the token you forwarded took
              // a wrong turn somewhere:
              //
              //               Z
              //             ^ 
              //            / 
              //          A         C
              //
              //        ^   \     /
              //       /     v   v
              //
              //     B         D
              //
              //       ^     /   \
              //        \   v     v
              //
              //          E         F
              // A sends D their B-D token, and hope it comes back A -> D -> E -> B -> A.
              // However, D instead explore A -> D -> F, ie. use the queued token from A for their
              // peer pair A-F (this is random),
              // D would then create three new tokens: for their peer pairs A-E, C-E, and C-F.
              // D's A-E token would travel to E, to B, to A, and since A already has a B-D token,
              // it would go to Z. Hm, so it would help if F and Z would reply with either "forwarded"
              // or "unroutable", then D can reroute the A's token, or A can reroute D's token, and
              // tokens would always keep travelling until they find a cycle.
              // maybe more efficient is if each node tells their creditors whether they have at least one
              // unexplored debtor or not:
              // F -> D: no
              // Z -> A: no
              // A -> B: yes
              // B -> E: yes
              // E -> D: yes
              // D -> C: yes
              // D -> A: yes
              // But C is a dead start, and will (or at least should) not send any tokens to D.
              // Since this situation can change at any time (maybe the debt from Z to C was just settled a minute ago),
              // Nodes should update all their debtors and creditors of their current state: DEAD_START, CONNECTED, DEAD_END.
              // It could also be that a previously forwarded token dies before it finds a cycle; debtors should inform
              // creditors when a previously forwarded token dies due to a downstream dead end), and creditors
              // should also inform debtors when a previously forwarded token dies due to an upstream dead start.
            } else if ((typeof this.queuedTokens[creditorNick] !== 'undefined') &&
                (this.queuedTokens[creditorNick].length > 0)) {
              token = this.queuedTokens[creditorNick].shift(); // FIFO, so you try to use tokens that are as old as possible
            } else if (numNewTokensCreated < MAX_NUM_NEW_TOKENS) {
              token = crypto.randomBytes(42).toString('base64');
              numNewTokensCreated++;
            } else {
              continue;
            }
            this.haveToken[JSON.stringify([creditorNick, debtorNick])] = token;
            this.tokensSent[token] = {
              debtorNick,
              creditorNick,
              amount,
              currency,
            };
          }
        }
      }
    }
  }

  findCreditorsAndDebtors();
  pairPeers();
  return Promise.resolve(newPeerPairs);
};

Search.prototype.queueToken = (fromCreditorNick, token) {
  if (typeof this.tokensSent[token] !== 'undefined') {
    console.log('LOOP FOUND!', token, fromCreditorNick, this.tokensSent[token].debtorNick);
  }
  if (typeof this.tokensQueued[fromCreditorNick] === 'undefined') {
    this.tokensQueued[fromCreditorNick] = [];
  }
  this.tokensQueued[fromCreditorNick].push(token);
}

Search.prototype.getPeerPair = function(pubkey) {
  return peerPairs[pubkey];
};

module.exports = Search;
