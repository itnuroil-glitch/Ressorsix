const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Some Windows environments prevent Metro's child transformer processes from
// spawning. A single worker runs transforms in the Metro process itself.
config.maxWorkers = 1;

module.exports = config;
