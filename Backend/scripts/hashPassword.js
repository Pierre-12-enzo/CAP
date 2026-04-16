const bcrypt = require('bcryptjs');

async function hashPassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

async function verifyPassword(password, hashedPassword) {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
}
function decryptPassword(hashedPassword) {

    throw new Error('Bcrypt hashes are one-way and cannot be decrypted. Use verifyPassword to check a password.');
}

// Example usage
async function main() {
    const password = 'mgcjuQdqorA1!';
    const hashed = await hashPassword(password);
    console.log('Hashed:', hashed);
   

    const isValid = await verifyPassword(password, hashed);
    console.log('Password valid:', isValid);
}

main().catch(console.error);
