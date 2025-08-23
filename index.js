#!/usr/bin/env node

console.log('Welcome to write!');
console.log('This is a placeholder for the write application.');

// Export something for programmatic use
module.exports = {
  version: require('./package.json').version,
  name: 'write',
};
