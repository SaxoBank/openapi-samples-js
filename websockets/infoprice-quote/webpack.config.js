var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: './public/js/priceSubscription.js',
    output: {
        path: path.resolve(__dirname, 'public/build'),
        filename: 'main.bundle.js'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015']
                }
            }
        ]
    },
    watch:true,
    stats: {
        colors: true
    },
    devtool: 'source-map'
};