const path = require("node:path");
const { rspack } = require("@rspack/core");
const {
  ReactRefreshRspackPlugin,
} = require("@rspack/plugin-react-refresh");

/**
 * @param {unknown} env
 * @param {{ mode?: string }} argv
 * @returns {import('@rspack/core').Configuration}
 */
module.exports = function rspackConfig(env, argv) {
  const isDev = argv.mode === "development";

  return {
    context: __dirname,
    mode: isDev ? "development" : "production",
    entry: {
      main: "./src/main.tsx",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].[contenthash:8].js",
      clean: true,
      publicPath: "/",
    },
    resolve: {
      extensions: ["...", ".js", ".jsx", ".ts", ".tsx"],
    },
    module: {
      rules: [
        {
          test: /\.(jsx|js)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "builtin:swc-loader",
              options: {
                jsc: {
                  parser: {
                    syntax: "ecmascript",
                    jsx: true,
                  },
                  transform: {
                    react: {
                      runtime: "automatic",
                      development: isDev,
                      refresh: isDev,
                    },
                  },
                },
              },
            },
          ],
          type: "javascript/auto",
        },
        {
          test: /\.(tsx|ts)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "builtin:swc-loader",
              options: {
                jsc: {
                  parser: {
                    syntax: "typescript",
                    tsx: true,
                  },
                  transform: {
                    react: {
                      runtime: "automatic",
                      development: isDev,
                      refresh: isDev,
                    },
                  },
                },
              },
            },
          ],
          type: "javascript/auto",
        },
      ],
    },
    plugins: [
      new rspack.HtmlRspackPlugin({
        template: "./index.html",
      }),
      isDev && new rspack.HotModuleReplacementPlugin(),
      isDev && new ReactRefreshRspackPlugin(),
    ].filter(Boolean),
    devServer: {
      hot: true,
      port: 8080,
      historyApiFallback: true,
    },
    experiments: {
      css: true,
    },
    optimization: {
      minimize: !isDev,
      minimizer: [new rspack.SwcJsMinimizerRspackPlugin()],
    },
    devtool: isDev ? "eval-cheap-module-source-map" : "source-map",
  };
};
