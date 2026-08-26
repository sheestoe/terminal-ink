import {templateData} from "./App.js";

export default function HackerNews({style}: { style?: React.CSSProperties }) {
    return <div style={{display: 'flex', padding: '0 30px', flexDirection: 'column', ...style}}>
        <div style={{display: 'flex', justifyContent: 'center', fontSize: 30, padding: '10px 0 20px'}}><div>Hacker News</div></div>
        <div style={{display: 'flex', fontSize: 14, lineHeight: 1.4, flexDirection: 'column'}}>
            {templateData.hackerNews.map((hn) =>
                <div style={{display: 'flex'}} key={hn.id}>- {hn.title}</div>)}
        </div>
    </div>
}