import Parser from 'rss-parser';
const parser = new Parser();
async function check() {
    const uol = await parser.parseURL('http://rss.uol.com.br/feed/noticias.xml').catch(() => null);
    console.log("UOL:", uol ? uol.items.length : 'Failed');
    const bbc = await parser.parseURL('https://feeds.bbci.co.uk/portuguese/rss.xml').catch(() => null);
    console.log("BBC:", bbc ? bbc.items.length : 'Failed');
    const cnn = await parser.parseURL('https://www.cnnbrasil.com.br/feed/').catch(() => null);
    console.log("CNN:", cnn ? cnn.items.length : 'Failed');
}
check();
