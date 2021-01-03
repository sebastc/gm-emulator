module.exports = {
  module: {
    rules: [
      {
        test: /\.ya?ml$/,
        type: 'asset/resource', // Required by Webpack v4
        use: 'file-loader'
      }
    ]
  }
}
