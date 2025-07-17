const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin@123', 10);
console.log(hash);
// Example output: $2a$10$w1Qw6Qw6Qw6Qw6Qw6Qw6QeQw6Qw6Qw6Qw6Qw6Qw6Qw6Qw6Qw6Qw6







