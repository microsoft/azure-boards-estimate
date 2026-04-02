const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    devtool: isProduction ? false : 'source-map',
    devServer: {
      server: 'https',
      port: 3000,
      open: false,
      hot: true,
      static: {
        directory: path.join(__dirname, "./"),
      },
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
      }
    },
    entry: {
      main: './src/index.tsx'
    },
    output: {
      publicPath: "./",
      filename: 'assets/[name].js',
      path: path.resolve(__dirname, 'build'),
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  '@babel/preset-env',
                  ['@babel/preset-react', {
                    development: !isProduction,
                    runtime: 'classic' // Use classic runtime for React 16
                  }],
                  '@babel/preset-typescript'
                ],
                plugins: [
                  ['@babel/plugin-transform-class-properties', { loose: true }],
                  ['@babel/plugin-transform-private-methods', { loose: true }],
                  ['@babel/plugin-transform-private-property-in-object', { loose: true }]
                ]
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                ['@babel/preset-react', {
                  development: !isProduction,
                  runtime: 'classic'
                }]
              ]
            }
          }
        },
        {
          test: /\.s[ac]ss$/i,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'sass-loader',
              options: {
                implementation: require('sass'),
                sassOptions: {
                  quietDeps: true // Suppress deprecation warnings
                }
              }
            }
          ]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name].[hash][ext]'
          }
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        "azure-devops-extension-sdk": path.resolve("node_modules/azure-devops-extension-sdk"),
        "azure-devops-extension-api": path.resolve("node_modules/azure-devops-extension-api")
      },
      fallback: {
        "crypto": false,
        "buffer": false,
        "stream": false,
        "process": false
      }
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.PUBLIC_URL': JSON.stringify('.'),
        'process.env': JSON.stringify({
          NODE_ENV: isProduction ? 'production' : 'development',
          PUBLIC_URL: '.'
        })
      }),
      new HtmlWebpackPlugin({
        template: './public/index.html',
        filename: 'index.html',
        inject: true,
        chunks: ['main']
      }),
      new CopyWebpackPlugin({
        patterns: [
          { 
            from: "public/manifest.json",
            to: "manifest.json"
          },
          {
            from: "public/assets",
            to: "assets",
            noErrorOnMissing: true
          }
        ]
      })
    ],
    mode: isProduction ? 'production' : 'development',
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          azureDevOps: {
            test: /[\\/]node_modules[\\/]azure-devops/,
            name: 'azure-devops',
            chunks: 'all',
            priority: 10
          }
        }
      }
    }
  };
};