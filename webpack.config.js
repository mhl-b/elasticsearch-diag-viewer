const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  mode: "development",
  devtool: 'inline-source-map',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'DiagViewer',
      filename: "index.html",
      template: "static/index.template.html",
      inlineSource: '.(js|css)$'
    }),
    new HtmlInlineScriptPlugin(),
  ],
  output: {
    publicPath: '/',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
};
