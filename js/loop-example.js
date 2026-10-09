'use strict';
const clearButton = document.getElementById('clear-loop');
const balances = document.getElementById('loop-balances');
if (clearButton && balances) {
  let cleared = false;
  clearButton.hidden = false;
  clearButton.addEventListener('click', () => {
    cleared = !cleared;
    const amounts = cleared ? [6, 3, 0] : [12, 9, 6];
    balances.querySelectorAll('dd').forEach((balance, i) => {
      balance.textContent = amounts[i];
    });
    balances.querySelector('.loop-status').textContent = cleared
      ? '9 units outstanding. Everyone’s net position is unchanged.'
      : '27 units outstanding. 6 can clear on each edge.';
    clearButton.textContent = cleared ? 'Reset the example ↺' : 'Clear 6 around the loop →';
  });
}
