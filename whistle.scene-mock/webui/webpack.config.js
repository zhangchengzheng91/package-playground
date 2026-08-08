const path = require('path');
const webpack = require('webpack');

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/**
 * Asset URLs in index.html. Default `auto` fixes Whistle plugin iframes: absolute `/js/*` would
 * hit the proxy root and 404. Set `WEBUI_PUBLIC_PATH` for a fixed prefix (e.g. dev `/v2/`).
 */
const envPublicPath = process.env.WEBUI_PUBLIC_PATH;
const WEBUI_PUBLIC_PATH =
  envPublicPath != null && envPublicPath !== ''
    ? envPublicPath.replace(/\/?$/, '/')
    : 'auto';

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const webBaseNoSlash =
  WEBUI_PUBLIC_PATH === 'auto'
    ? '/'
    : WEBUI_PUBLIC_PATH.replace(/\/$/, '') || '/';

/** `pnpm run watch` sets this so dev server also writes `dist/` (Whistle uiServer) while exposing a port. */
const writeDistToDiskWhileServing =
  process.env.WEBUI_WRITE_DISK === '1' ||
  process.env.WEBUI_WRITE_DISK === 'true';

/**
 * @param {Record<string, string | boolean> | undefined} env
 * @param {{ mode?: string }} argv
 */
module.exports = (_env, argv) => {
  const mode = argv.mode === 'production' ? 'production' : 'development';
  const isProd = mode === 'production';

  return {
    mode,
    context: path.resolve(__dirname),
    entry: './src/main.tsx',

    output: {
      path: path.resolve(__dirname, 'dist'),
      publicPath: WEBUI_PUBLIC_PATH,
      filename: isProd ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
      chunkFilename: isProd ? 'js/[id].[contenthash:8].chunk.js' : 'js/[id].chunk.js',
      assetModuleFilename: isProd ? 'assets/[hash][ext][query]' : 'assets/[name][ext][query]',
      clean: true,
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    module: {
      rules: [
        {
          test: /\.[tj]sx?$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          options: { cacheDirectory: true },
        },
        {
          test: /\.css$/i,
          use: [
            isProd ? MiniCssExtractPlugin.loader : require.resolve('style-loader'),
            'css-loader',
          ],
        },
        {
          test: /\.less$/i,
          use: [
            isProd ? MiniCssExtractPlugin.loader : require.resolve('style-loader'),
            'css-loader',
            {
              loader: 'less-loader',
              options: { lessOptions: { relativeUrls: true } },
            },
          ],
        },
        {
          test: /\.(png|jpe?g|gif|webp)$/i,
          type: 'asset',
          parser: { dataUrlCondition: { maxSize: 8192 } },
        },
        {
          test: /\.(woff2?|eot|ttf|otf)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.svg$/i,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          configFile: path.resolve(__dirname, 'tsconfig.json'),
        },
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
      }),
      new webpack.EnvironmentPlugin({
        NODE_ENV: mode,
      }),
      new webpack.DefinePlugin({
        /** Empty string means use runtime `__webpack_require__.p` (publicPath `auto`). */
        __WEBUI_PUBLIC_PATH__: JSON.stringify(
          WEBUI_PUBLIC_PATH === 'auto' ? '' : WEBUI_PUBLIC_PATH,
        ),
      }),
      ...(isProd
        ? [
            new MiniCssExtractPlugin({
              filename: 'css/[name].[contenthash:8].css',
              chunkFilename: 'css/[id].[contenthash:8].css',
              ignoreOrder: true,
            }),
          ]
        : []),
    ],

    optimization: {
      ...(isProd
        ? {
            runtimeChunk: 'single',
            splitChunks: {
              chunks: 'all',
              cacheGroups: {
                defaultVendors: {
                  test: /[\\/]node_modules[\\/]/,
                  name: 'vendor',
                  priority: -10,
                  reuseExistingChunk: true,
                },
              },
            },
          }
        : {}),
    },

    performance: {
      hints: isProd ? 'warning' : false,
      maxAssetSize: 750 * 1024,
      maxEntrypointSize: 750 * 1024,
    },

    devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',

    devServer: {
      // Align with biz/webui/lib default WHISTLE_WEBUI_V2_PORT (3000) so Electron/Whistle proxy hits this server.
      allowedHosts: 'all',
      compress: false,
      ...(writeDistToDiskWhileServing
        ? {
            devMiddleware: {
              writeToDisk: true,
            },
          }
        : {}),
      historyApiFallback: {
        disableDotRule: true,
        rewrites: [
          {
            from: new RegExp(
              '^' + escapeForRegex(webBaseNoSlash) + '\\/.*$',
              'i',
            ),
            to: `${webBaseNoSlash}/index.html`,
          },
        ],
      },
      // Disable HMR / live reload — avoids flaky behavior behind Whistle/Electron proxy.
      hot: false,
      liveReload: false,
      port:
        Number(process.env.PORT || process.env.WHISTLE_WEBUI_V2_PORT) || 3000,
      onListening(devServer) {
        const addr = devServer.server && devServer.server.address();
        const port =
          addr && typeof addr === 'object' && 'port' in addr
            ? addr.port
            : devServer.options.port;
        // After webpack's default logStatus; emits explicit port (incl. when port comes from PORT env).
        // eslint-disable-next-line no-console -- intentional startup banner
        console.log(`[webui] dev server listening on port ${port}`);
      },
      static: [
        {
          directory: path.resolve(__dirname, 'public'),
          /** Files in `public/` are served under the same prefix as the app bundle. */
          publicPath: WEBUI_PUBLIC_PATH,
          watch: true,
        },
      ],
      client: {
        overlay: { errors: true, warnings: false },
      },
    },
  };
};
