import { saveAs } from "file-saver";
import { GetScriptCallback } from "../common";
import { Action } from "./action";

export class ActionSave implements Action{

    private cb_getScript : GetScriptCallback;

    constructor(getScript: GetScriptCallback){
        this.cb_getScript = getScript;
    }

    saveFile(filename: string){
        var blob = new Blob([this.cb_getScript()], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename);
    }

    async run(): Promise<boolean> {
        this.saveFile("main.py");
        return true;
    }
}