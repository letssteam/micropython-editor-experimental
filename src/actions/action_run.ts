import { GetDataCallback } from "../common";
import { DapLinkWrapper } from "../daplink";
import { ProgressDialog, ProgressMessageType } from "../progress_dialog";
import { Action } from "./action";

export class ActionRun implements Action{

    private daplink: DapLinkWrapper;
    private getScript_cb: GetDataCallback;
    private dialog: ProgressDialog;

    constructor(daplink : DapLinkWrapper, getScript: GetDataCallback){
        this.daplink = daplink;
        this.getScript_cb = getScript;
        this.dialog = new ProgressDialog("Running...");
    }

    async run(): Promise<boolean> {
        let is_error = false;
        this.dialog.open();
        this.dialog.addInfo("Sending script to target");
        await this.daplink.runScript(   this.getScript_cb(), 
                                        (prgs) => this.dialog.setProgressValue(prgs),
                                        (err) => {
                                            this.dialog.addInfo(err, ProgressMessageType.ERROR);
                                            is_error = true;
                                        } );
                                        
        if( is_error ){
            this.dialog.showCloseButton();
        }
        else{
            this.dialog.close();
        }
        return true;
    }
}