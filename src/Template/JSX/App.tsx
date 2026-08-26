import {TemplateDataType} from "Data/PrepareData.js";
import Time from "./Time.js";
import HackerNews from "./HackerNews.js";

export let templateData: TemplateDataType;

export default function App(data: TemplateDataType) {
    templateData = data; // easier than passing to children via props
    return <div style={{
        fontSize: 22,
        display: 'flex',
        backgroundColor: '#fff',
        width: '800px',
        height: '480px',
    }}>
        <div style={{display: 'flex', flexDirection: 'column', width: '50%', height: '100%'}}>
            <Time style={{alignSelf: 'flex-start'}}/>
            <HackerNews style={{width: '100%', height: '100%'}}/>
        </div>
        <div style={{width: '50%', overflow: 'hidden'}}>
            <img style={{height: '80%', marginLeft: '-50px', marginTop: '10%'}} src='/assets/images/color.jpg'/>
        </div>
    </div>
}
