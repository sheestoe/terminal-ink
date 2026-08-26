import {readFileSync} from "node:fs"

export function LocalImage({file, style}: { file: string, style?: React.CSSProperties }) {
    const content = readFileSync(file);
    const src = 'data:image/jpeg;base64,' + content.toString('base64');
    return <img src={src} style={style}/>;
}