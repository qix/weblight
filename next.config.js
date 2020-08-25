const withCSS = require("@zeit/next-css");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const withFonts = require("next-fonts");
const WorkerPlugin = require("worker-plugin");

module.exports = withCSS(
  withFonts({
    webpack: (config, { isServer }) => {
      // Fixes npm packages that depend on `fs` module
      if (!isServer) {
        config.node = {
          fs: "empty",
        };
      }

      config.module.rules.push({
        test: /\.c$/,
        use: "raw-loader",
      });

      config.plugins.push(
        new WorkerPlugin(),
        new MonacoWebpackPlugin({
          languages: ["cpp"],
          filename: "static/[name].worker.js",
        })
      );
      return config;
    },
    cssLoaderOptions: { url: false },
  })
);
