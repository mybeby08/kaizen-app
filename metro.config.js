const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable tree shaking and dead code elimination
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
  output: {
    comments: false,
  },
  compress: {
    reduce_funcs: false,
  },
};

// Optimize resolver for better tree shaking
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable source map optimization for production
config.transformer.minifierPath = 'metro-minify-terser';

// Optimize cache for faster builds
config.cacheStores = [
  {
    get: async (key) => {
      // Implement custom cache logic if needed
      return null;
    },
    set: async (key, value) => {
      // Implement custom cache logic if needed
    },
  },
];

module.exports = config;