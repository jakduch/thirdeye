const path = require('path');

module.exports = {
  entry: './src/main/index.ts',
  target: 'electron-main',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  externals: {
    'electron-store': 'commonjs electron-store',
    '@octokit/rest': 'commonjs @octokit/rest',
    'electron-updater': 'commonjs electron-updater',
  },
};
