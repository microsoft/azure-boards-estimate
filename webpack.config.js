const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => {
    const isProduction = argv.mode === "production";

    return {
        entry: "./src/index.tsx",
        devtool: "inline-source-map",
        devServer: {
            server: 'https',
            port: 3000,
            open: false,
            hot: true,
            static: {
                directory: path.join(__dirname, "./")
            }
        },

        output: {
            publicPath: "/dist/",
            filename: isProduction
                ? "assets/[name].[contenthash].js"
                : "assets/[name].js",
            path: path.resolve(__dirname, "dist"),
            clean: true
        },

        resolve: {
            extensions: [".tsx", ".ts", ".js", ".jsx"],
            alias: {
                "@": path.resolve(__dirname, "src")
            }
        },

        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: {
                        loader: "ts-loader",
                        options: {
                            configFile: "tsconfig.build.json"
                        }
                    },
                    exclude: /node_modules/
                },
                {
                    test: /\.scss$/,
                    use: [
                        isProduction
                            ? MiniCssExtractPlugin.loader
                            : "style-loader",
                        "css-loader",
                        {
                            loader: "sass-loader",
                            options: {
                                sassOptions: {
                                    silenceDeprecations: ["import"]
                                }
                            }
                        }
                    ]
                },
                {
                    test: /\.css$/,
                    use: [
                        isProduction
                            ? MiniCssExtractPlugin.loader
                            : "style-loader",
                        "css-loader"
                    ]
                },
                {
                    test: /\.(png|jpe?g|gif|svg|woff|woff2|eot|ttf|otf)$/,
                    type: "asset/resource",
                    generator: {
                        filename: "assets/[name].[contenthash][ext]"
                    }
                }
            ]
        },

        plugins: [
            new HtmlWebpackPlugin({
                template: "./public/index.html",
                filename: "index.html"
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: "public",
                        to: "",
                        globOptions: {
                            ignore: ["**/index.html"]
                        }
                    }
                ]
            }),
            ...(isProduction
                ? [
                      new MiniCssExtractPlugin({
                          filename: "assets/[name].[contenthash].css"
                      })
                  ]
                : [])
        ],
    };
};
