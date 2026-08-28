
with open('src/Data/BackgroundSync.ts', 'r', encoding='utf-8') as f:
    code = f.read()

src = '''                  if (url.includes('reddit.com')) {
                      let rssUrl = url;
                      if (!rssUrl.includes('.rss')) {
                          if (rssUrl.endsWith('/')) rssUrl = rssUrl.slice(0, -1);
                          rssUrl += '/.rss';
                      }'''

dst = '''                  if (url.includes('reddit.com')) {
                      let rssUrl = url;
                      try {
                          let u = new URL(rssUrl);
                          if (!u.pathname.endsWith('.rss') && !u.pathname.endsWith('.rss/')) {
                              if (u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
                              u.pathname += '.rss';
                          }
                          if (u.pathname.includes('&')) {
                              u.search = '?' + u.pathname.split('&').slice(1).join('&');
                              u.pathname = u.pathname.split('&')[0];
                          }
                          rssUrl = u.toString();
                      } catch(e) {}'''

code = code.replace(src, dst)
with open('src/Data/BackgroundSync.ts', 'w', encoding='utf-8') as f:
    f.write(code)

