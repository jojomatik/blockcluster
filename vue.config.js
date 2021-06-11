module.exports = {
  transpileDependencies: ["vuetify"],
  devServer: {
    proxy: {
      "^/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
};
