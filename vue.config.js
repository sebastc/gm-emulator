module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/gm-emulator' : '/',
  pwa: {
    name: 'GM Emulator',
    themeColor: '#00B7D3'
  },
  transpileDependencies: [
    'vuetify'
  ]
}
