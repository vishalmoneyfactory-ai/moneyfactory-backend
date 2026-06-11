const jwt = require('jsonwebtoken');

function generateToken(user, expiresIn = process.env.JWT_EXPIRE || '7d') {
  return jwt.sign({ userId: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn });
}

module.exports = generateToken;
