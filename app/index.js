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

function summary(content) {
    return (content instanceof Array ? content[0] : content || '').replace(/<(?:.|\n)*?>/gm, '').trim();
}

function uniq(arr) {
    var unique = [];
    for (var i = 0; i < arr.length; i++) {
        if (unique.indexOf(arr[i]) == -1) {
            unique.push(arr[i]);
        }
    }
    return unique;
}

function categorize(articles, count) {
    if (!articles) return [];

    var counter = {},
        stories = [];

    articles.forEach(function(article) {
        // var description = summary(article.title + ' ' + article.description);
        var description = summary(article.title);

        // description.split(WHITESPACE).forEach(function(word) {
        description.match(WORDS).concat(description.match(DOUBLE_WORDS)).concat(description.match(TRIPLE_WORDS)).forEach(function(word) {
            if (!word) return;
            if (word.length < 5) return;
            if (word[0] !== word[0].toUpperCase()) return;

            if (!counter[word]) {
                counter[word] = {
                    title: word,
                    articles: []
                };
            }

            counter[word].articles.push(article);
        });
    });

    counter = uniquelyPowerful(counter);

    return Object.keys(counter).map(function(word) {
        return counter[word];
    }).sort(function(a, b) {
        return b.articles.length - a.articles.length;
    }).filter(function(category) {
        for (var i = 0; i < category.articles.length; i++) {
            if (!category.articles[i]) break;

            if (stories.indexOf(category.articles[i]) === -1) {
                stories.push(category.articles[i]);
            } else {
                category.articles.splice(i);
                i--;
            }
        }

        return category.articles.length > 0;
    }).sort(function(a, b) {
        return b.articles.length - a.articles.length;
    }).slice(0, count);
}

function uniquelyPowerful(counter) {
    var keys = Object.keys(counter),
        matcher, i, n;

    for (i = keys.length - 1; i >= 0; i--) {
        matcher = keys[i];

        for (n = keys.length - 1; n >= 0; n--) {
            if (matcher.length > keys[n].length && counter[keys[n]] && keys[n].indexOf(' ') !== -1 && matcher.toLowerCase().indexOf(keys[n].toLowerCase()) !== -1) {
                counter[matcher].articles = uniq(counter[matcher].articles.concat(counter[keys[n]].articles));
                // counter[keys[n]].articles = uniq(counter[keys[n]].articles.concat(counter[matcher].articles));
                // delete counter[keys[n]];
            }
        }
    }

    return counter;
}

var CustomElement = require('generate-js-custom-element'),
    DOMAIN = /(?:[\w-]+\.)+[\w-]+/,
    async = require('no-async'),
    ajax = require('ajax'),
    xml = require('xml2js').parseString || require('xml-parser'),
    WHITESPACE = /[\s\.\,\;\"\(\)0-9]+?/,
    WORDS = /[A-Za-z']+/gmi,
    DOUBLE_WORDS = /[A-Za-z']+\s[A-Za-z']+/gmi,
    TRIPLE_WORDS = /[A-Za-z']+\s[A-Za-z']+\s[A-Za-z']+/gmi;

var App = CustomElement.createElement({
    template: require('./index.html'),
    partials: {
        article: require('./article.html')
    },
    transforms: {
        summary: summary,
        shuffleArray: shuffleArray,
        url: function url(item) {
            try {
                return item['media:content'][0].$.url;
            } catch (e) { }
        },
        https: function https(url) {
            return (url || '').replace('http:', 'https:');
        },
        selectCategory: function selectCategory(app, category, attr) {
            return function toggleProperty() {
                category[attr] = !category[attr];
                document.body.style.overflow = category[attr] ? 'hidden' : '';
                app.set('selectedCategory', category[attr] ? category : undefined);
            };
        },
        shortestTitle: function shortestTitle(articles) {
            var last = articles[0].title[0],
                lastLength = last.length;

            for (var i = articles.length - 1; i >= 1; i--) {
                if (articles[i].title[0].length > last.length) {
                    last = articles[i].title[0];
                    lastLength = last.length;
                }
            }

            return last;
        },
        domain: function domain(url) {
            var d = DOMAIN.exec(url || '');
            return d ? (d[0] || '').replace(/(www|feed|feeds)\./, '') : url;
        },
        categorize: categorize,
    }
}, function App(options) {
    var _ = this,
        data = _.getLocalArticles(),
        sixHoursAgo = new Date( new Date().getTime() - (60 * 60 * 1000 * 6) );

    CustomElement.call(_, options || {});

    _.set('app', _);

    if (!data || new Date(data.updatedAt).getTime() < sixHoursAgo.getTime()) {
        _.getRemoteArticles(function(articles) {
            _.set('categories', categorize(articles, 15));
            _.saveArticles(articles);
        });
    } else {
        _.set('categories', categorize(data.articles, 15));
    }
});

App.definePrototype({
});

App.definePrototype({
    saveArticles: function saveArticles(articles) {
        window.localStorage.setItem(
            'articles',
            JSON.stringify({
                updatedAt: new Date(),
                articles: articles
            })
        );
    },

    getRemoteArticles: function getRemoteArticles(done) {
        var articles  = [];

        async.eachParallel([
            'http://feeds.reuters.com/reuters/topNews',
            'http://feeds.reuters.com/Reuters/worldNews',
            'http://www.bloomberg.com/politics/feeds/site.xml',
            'https://www.theglobeandmail.com/?service=rss',
            'http://feeds.washingtonpost.com/rss/rss_blogpost',
            'http://feeds.bbci.co.uk/news/rss.xml',
            'http://www.wsj.com/xml/rss/3_7041.xml', // Opinion
            'http://www.wsj.com/xml/rss/3_7085.xml', // World News
            'http://www.wsj.com/xml/rss/3_7014.xml', // U.S. Business
            'http://www.wsj.com/xml/rss/3_7031.xml', // Markets News
            'http://www.wsj.com/xml/rss/3_7455.xml', // Technology: What's News
            // 'http://www.wsj.com/xml/rss/3_7201.xml', // Lifestyle
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
            done(articles);
        });
    },

    getLocalArticles: function getLocalArticles() {
        try {
            return JSON.parse(
                window.localStorage.getItem('articles')
            );
        } catch (e) { }
    },
});

module.exports = App;
