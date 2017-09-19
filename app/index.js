function shuffleArray(arr) {
    var i = arr.length, j, temp;
    if ( i === 0 ) return arr;
    while ( --i ) {
        j = Math.floor( Math.random() * ( i + 1 ) );
        temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

var CustomElement = require('generate-js-custom-element'),
    DOMAIN = /(?:[\w-]+\.)+[\w-]+/,
    async = require('no-async'),
    ajax = require('ajax'),
    xml = require('xml2js').parseString || require('xml-parser'),
    App = CustomElement.createElement({
    template: require('./index.html'),
    partials: {},
    transforms: {
        summary: function summary(content) {
            return (content instanceof Array ? content[0] : content || '').replace(/<(?:.|\n)*?>/gm, '').trim();
        },
        url: function url(item) {
            try {
                return item['media:content'][0].$.url;
            } catch (e) {
                return;
            }
        },
        https: function https(url) {
            return (url || '').replace('http:', 'https:');
        },
        domain: function domain(url) {
            return (DOMAIN.exec(url || '')[0] || '').replace(/(www|feed|feeds)\./, '');
        },
    }
}, function App(options) {
    var _ = this,
        articles = [];

    CustomElement.call(_, options || {});

    async.eachParallel([
        // 'http://feeds.reuters.com/reuters/topNews',
        'http://feeds.reuters.com/Reuters/worldNews',
        'http://www.bloomberg.com/politics/feeds/site.xml',
        // 'http://feeds.washingtonpost.com/rss/rss_blogpost',
        // 'http://feeds.bbci.co.uk/news/rss.xml',
        // 'http://www.wsj.com/xml/rss/3_7041.xml', // Opinion
        'http://www.wsj.com/xml/rss/3_7085.xml', // World News
        // 'http://www.wsj.com/xml/rss/3_7014.xml', // U.S. Business
        // 'http://www.wsj.com/xml/rss/3_7031.xml', // Markets News
        // 'http://www.wsj.com/xml/rss/3_7455.xml', // Technology: What's News
        'http://www.wsj.com/xml/rss/3_7201.xml', // Lifestyle
        'http://www.economist.com/sections/economics/rss.xml',
        'http://www.economist.com/blogs/democracyinamerica/index.xml'
    ], function(url, next) {
        ajax.get('https://passed.herokuapp.com/?url=' + encodeURIComponent(url), {}, function(data) {
            xml(data, function (err, result) {
                if (result) {
                    articles = articles.concat(result.rss.channel[0].item);
                }

                next();
            });
        });
    }, function() {
        _.set('articles', shuffleArray(articles));
    });
});

App.definePrototype({
});

module.exports = App;
