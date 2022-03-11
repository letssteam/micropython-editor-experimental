import { Button } from "../button";
import { saveAs } from "file-saver";

export class ActionSave{

    private cb_getScript;

    constructor(button: Button, getScript: CallableFunction){
        this.cb_getScript = getScript;

        button.button.addEventListener("click", () => this.saveFile("main.py"));
    }

    saveFile(filename: string){
        var blob = new Blob([this.cb_getScript()], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename);
    }

}