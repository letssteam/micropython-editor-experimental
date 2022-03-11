import { Button } from "../button";
import { GetDataCallback } from "../common";
import { DapLinkWrapper } from "../daplink";

export class ActionRun{

    constructor(daplink : DapLinkWrapper, button: Button, getScript: GetDataCallback){
        button.button.addEventListener("click", () => button.isEnable() ? daplink.runScript(getScript()) : null);
    }

}