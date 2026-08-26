import {Liquid} from 'liquidjs';
import {TEMPLATE_FOLDER} from "Config.js";
import {TemplateDataType} from "Data/PrepareData.js";

const engine = new Liquid({
    root: TEMPLATE_FOLDER,
    extname: '.liquid',
    // cache: true,
    dynamicPartials: true,
    strictFilters: true,
    strictVariables: true,
});

export async function buildLiquid(templateFile: string, data: TemplateDataType) {
    return engine.renderFile(templateFile, data);
}


