import { GetDataCallback, toHexString } from "../common";
import { FatFS } from "../microFAT/fat";

import { saveAs } from "file-saver";
import { DapLinkWrapper } from "../daplink";
import { Action } from "./action";
import { SerialOutput } from "../serialOutput";
import { IHex } from "../ihex_util";

export class ActionFlash implements Action {

    private getData_cb: GetDataCallback;
    private daplink: DapLinkWrapper;
    private serial_ouput: SerialOutput;

    private dialog: HTMLElement;
    private progress_bar_div: HTMLElement;

    constructor(dialog_parent: HTMLElement, daplink: DapLinkWrapper, serial_output: SerialOutput, getData: GetDataCallback){
        this.getData_cb = getData;
        this.daplink = daplink;
        this.serial_ouput = serial_output;

        this.createDialog(dialog_parent);
    }

    async run() : Promise<boolean>{

        new IHex(0x08000000).parseBin(await this.generateBinary());

        if( this.daplink.isConnected() )
        {
            this.openDialog();
            this.addInfoLine("Searching Micropython...");

            if( await this.daplink.isMicropythonOnTarget() ){
                this.addInfoLine("MicroPython was found.");
                await this.daplink.flashMain(this.getData_cb(), (prg: number) => this.setProgressBarValue(Math.round(prg*100)));
                this.serial_ouput.clear();
                this.showCloseButton();
            }
            else{
                this.addInfoLine("MicroPython was not found... Reflash everything.");
                await this.daplink.flash(await this.generateBinary(), (prg: number) =>  this.setProgressBarValue(Math.round(prg*100)), err => this.addInfoLine("Error: " + err, true));
                this.showCloseButton();
            }
        }
        else{
            saveAs( new Blob( [await this.generateBinary()] ), "flash.bin" );
        }

        return true;
    }

    private async generateBinary() : Promise<Uint8Array>{
        let fat = new FatFS("PYBFLASH");

        fat.addFile("README", "TXT", await this.readFileAsText("files/README.txt"));
        fat.addFile("BOOT", "PY", await this.readFileAsText("files/boot.py"));
        fat.addFile("PYBCDC", "INF", await this.readFileAsText("files/pybcdc.inf"));
        fat.addFile("MAIN", "PY", this.getData_cb());

        let base = await this.readFileAsBlob("files/micropython_L475_v1.18_PADDED.bin");
        let fat_part = fat.generate_binary();

        let bin_file = new Uint8Array( base.byteLength + fat_part.length);
        bin_file.set(new Uint8Array(base), 0);
        bin_file.set(new Uint8Array(fat_part), base.byteLength);

        return bin_file;
    }

    private async readFileAsText(file: string) : Promise<string> {
        let rep = await fetch(file);
        return await rep.text();
    }

    private async readFileAsBlob(file: string) : Promise<ArrayBuffer> {
        let rep = await fetch(file);
        return await rep.arrayBuffer();
    }

    private createDialog(parent: HTMLElement){
        this.dialog = document.createElement("div");
        this.dialog.classList.add("progress-dialog");
        this.dialog.style.display = "none";

        let container = document.createElement("div");
        container.classList.add("progress-container")

        let title = document.createElement("div");
        title.classList.add("progress-content-title");
        title.innerText = "Uploading...";

        let content = document.createElement("div");
        content.classList.add("progress-content");

        let text = document.createElement("p");
        text.innerHTML = `
            Your program is uploading to your target, please wait.<br/>
            <br/>
            <i>Do not unplugged your board, do not close this tab nor change tab during uploading.</i>
        `;

        let close_button = document.createElement("button");
        close_button.classList.add("progress-bar-close-button");
        close_button.innerText = "Close";
        close_button.addEventListener( "click", () => this.closeDialog() );
        
        this.progress_bar_div = document.createElement("div");
        this.progress_bar_div.classList.add("progress-bar-container")

        let value = document.createElement("p");
        value.classList.add("progress-bar-value");

        let bar = document.createElement("div");
        bar.classList.add("progress-bar-cursor");

        this.progress_bar_div.append(value);
        this.progress_bar_div.append(bar);

        let infos = document.createElement("div");
        infos.classList.add("progress-bar-infos");


        content.append(text);
        content.append(this.progress_bar_div);
        content.append("Status:");
        content.append(infos);
        content.append(close_button);

        container.append(title);
        container.append(content);

        this.dialog.append(container);

        parent.append(this.dialog);
    }

    private openDialog(){
        this.dialog.style.display = "block";

        this.setProgressBarValue(0);
        (this.dialog.querySelector(".progress-bar-close-button") as HTMLElement).style.display = "none";
        (this.dialog.querySelector(".progress-bar-infos") as HTMLElement).innerHTML = "";
    }

    private setProgressBarValue(value: number){
        (this.dialog.querySelector(".progress-bar-value") as HTMLElement).innerHTML = value + "%";
        (this.dialog.querySelector(".progress-bar-cursor") as HTMLElement).style.width = value + "%";
    }

    private addInfoLine(line: string, is_error: boolean = false){

        if( is_error ){
            (this.dialog.querySelector(".progress-bar-infos") as HTMLElement).innerHTML += `<span class="error">${line}</span><br/>`;
            (this.dialog.querySelector(".progress-bar-infos") as HTMLElement).innerHTML += `<span class="error">Try unplugging and replugging your board...</span><br/>`;
        }
        else{
            (this.dialog.querySelector(".progress-bar-infos") as HTMLElement).innerHTML += `${line}<br/>`;
        }
    }

    private showCloseButton(){
        (this.dialog.querySelector(".progress-bar-close-button") as HTMLElement).style.display = "block";
    }

    private closeDialog(){
        this.dialog.style.display = "none";
    }


}