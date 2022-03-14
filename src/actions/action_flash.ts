import { GetDataCallback } from "../common";
import { FatFS } from "../microFAT/fat";

import { saveAs } from "file-saver";
import { DapLinkWrapper } from "../daplink";
import { Action } from "./action";

export class ActionFlash implements Action {

    private getData_cb: GetDataCallback;
    private daplink: DapLinkWrapper;

    constructor(daplink: DapLinkWrapper, getData: GetDataCallback){
        this.getData_cb = getData;
        this.daplink = daplink;
    }

    async run() : Promise<boolean>{

        if( this.daplink.isConnected() )
        {
            if( await this.isMicropythonFound() ){
                // Write the main file
                // let script = this.generateScript( this.getData_cb() );
                // this.daplink.runScript(script);
                this.daplink.flashMain(this.getData_cb());
            }
            else{
                this.daplink.flash(await this.generateBinary());
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

    private async isMicropythonFound(): Promise<boolean> {

        console.error("Not implemented")

        return true;
    }
}