const bcryptjs = require('bcryptjs');

const genPasswordHash = async (password) => {
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    return hashedPassword;
}

module.exports = genPasswordHash;