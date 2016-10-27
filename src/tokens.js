var crypto = require('crypto');

function generateToken() {
 return crypto.randomBytes(42).toString('base64');
}

module.exports = {
  generateToken,
};
