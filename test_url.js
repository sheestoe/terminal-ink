
const urls = [
    'https://www.reddit.com/r/worldnews/top/?t=day',
    'https://www.reddit.com/r/brasil/hot.rss&test=1',
    'https://www.reddit.com/r/technology'
];

for (let url of urls) {
    let rssUrl = url;
    try {
        let u = new URL(rssUrl);
        if (u.pathname.includes('&')) {
            u.search = '?' + u.pathname.split('&').slice(1).join('&');
            u.pathname = u.pathname.split('&')[0];
        }
        if (!u.pathname.endsWith('.rss') && !u.pathname.endsWith('.rss/')) {
            if (u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
            u.pathname += '.rss';
        }
        rssUrl = u.toString();
    } catch(e) {}
    console.log(url, '->', rssUrl);
}

