import { GetDataCallback } from "../common";
import { DapLinkWrapper } from "../daplink";
import { Action } from "./action";

export class ActionRun implements Action{

    private daplink: DapLinkWrapper;
    private getScript_cb: GetDataCallback;

    constructor(daplink : DapLinkWrapper, getScript: GetDataCallback){
        this.daplink = daplink;
        this.getScript_cb = getScript;
    }

    async run(): Promise<boolean> {
        this.daplink.runScript(this.getScript_cb());
        return true;
    }
}