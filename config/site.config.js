/**
 * @fileoverview site.config.js
 * @description site.config.js
 * @module site.config
 */
module.exports = {
  paths: {
    src: './src',
    dist: './dist',
    html: {
      src: './src/pages',
      dest: './dist/html',
    },
    scss: {
      src: './src/styles',
      dest: './dist/assets/css',
    },
    js: {
      src: './src/scripts',
      dest: './dist/assets/js',
    },
    public: {
      src: './public',
      dest: './dist/assets',
    },
  },
  files: {
    scss: {
      entry: 'styles.scss',
      output: 'styles.css',
    },
    html: {
      index: 'index.html',
    },
    favicon: 'favicon.svg',
  },
  dev: {
    port: 3000,
    open: true,
    notify: false,
    logLevel: 'info',
  },
  build: {
    html: {
      prefix: '@@',
      basepath: '@file',
    },
    css: {
      loadPaths: ['./node_modules', './src/styles'],
      includePaths: ['./node_modules', './src/styles'],
    },
  },
  language: 'ko',
  viewport: {
    mode: 'responsive',
    fixedWidth: 1600,
  },
};
