import {ReactNode} from "react";
import {renderToString} from "react-dom/server";
import {TemplateDataType} from "Data/PrepareData.js";

export async function buildJSX(component: (props: any) => ReactNode, data: TemplateDataType): Promise<string> {
    return renderToString(component(data));
}
