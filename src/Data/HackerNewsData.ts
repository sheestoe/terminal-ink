export type HackerNewsData = {
    by: string;
    descendants: number;
    id: number;
    kids?: number[];
    score: number;
    time: number;
    title: string;
    type: string;
    url: string;
}[]


export async function getHackerNews(): Promise<HackerNewsData> {
    const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    let ids: number[] = await response.json();
    ids = ids.slice(0, 20);
    return Promise.all(ids.map(async (id) => {
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return response.json();
    }));
}