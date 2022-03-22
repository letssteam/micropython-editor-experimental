import { GetDataCallback, toHexString } from "../common";
import { FatFS } from "../microFAT/fat";

import { saveAs } from "file-saver";
import { DapLinkWrapper } from "../daplink";
import { Action } from "./action";
import { SerialOutput } from "../serialOutput";
import { IHex } from "../ihex_util";
import { ProgressDialog, ProgressMessageType } from "../progress_dialog";

export class ActionFlash implements Action {

    static readonly FLASH_START_ADDRESS : number = 0x08000000;


    private getData_cb: GetDataCallback;
    private daplink: DapLinkWrapper;
    private serial_ouput: SerialOutput;
    private dialog: ProgressDialog;

    constructor(daplink: DapLinkWrapper, serial_output: SerialOutput, getData: GetDataCallback){
        this.getData_cb = getData;
        this.daplink = daplink;
        this.serial_ouput = serial_output;
        this.dialog = new ProgressDialog();
    }

    async run() : Promise<boolean>{
        if( this.daplink.isConnected() )
        {
            this.dialog.open();
            this.dialog.addInfo("Searching Micropython...");

            if( await this.daplink.isMicropythonOnTarget() ){
                this.dialog.addInfo("MicroPython was found.");
                await this.daplink.flashMain(   this.getData_cb(), 
                                                (prg: number) => this.dialog.setProgressValue(prg*100),
                                                (err) => this.dialog.addInfo(err, ProgressMessageType.ERROR));
                this.serial_ouput.clear();
                this.dialog.showCloseButton();
            }
            else{
                this.dialog.addInfo("MicroPython was not found... Reflash everything.", ProgressMessageType.WARNING);
                let hex = new IHex(ActionFlash.FLASH_START_ADDRESS).parseBin(await this.generateBinary());

                await this.daplink.flash(   new TextEncoder().encode(hex), 
                                            (prg: number) =>  this.dialog.setProgressValue(prg*100), 
                                            err => this.dialog.addInfo("Error: " + err, ProgressMessageType.ERROR)
                                        );
                this.dialog.showCloseButton();
            }
        }
        else{
            saveAs( new Blob( [new IHex(ActionFlash.FLASH_START_ADDRESS).parseBin(await this.generateBinary())] ), "flash.hex" );
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
}