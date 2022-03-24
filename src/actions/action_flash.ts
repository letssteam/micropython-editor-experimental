import { GetScriptCallback, toHexString } from "../common";
import { FatFS } from "../microFAT/fat";

import { saveAs } from "file-saver";
import { DapLinkWrapper } from "../daplink";
import { Action } from "./action";
import { SerialOutput } from "../serialOutput";
import { IHex } from "../ihex_util";
import { ProgressDialog, ProgressMessageType } from "../progress_dialog";
import { AlertDialog, AlertDialogIcon } from "../alert_dialog";

class FatFile {
    name: string = "";
    extension: string = "";
    path: string = "";
}

export class ActionFlash implements Action {

    static readonly FLASH_START_ADDRESS : number = 0x08000000;


    private get_script_cb: GetScriptCallback;
    private daplink: DapLinkWrapper;
    private serial_ouput: SerialOutput;
    private dialog: ProgressDialog;

    constructor(daplink: DapLinkWrapper, serial_output: SerialOutput, get_script: GetScriptCallback){
        this.get_script_cb = get_script;
        this.daplink = daplink;
        this.serial_ouput = serial_output;
        this.dialog = new ProgressDialog();
    }

    async run() : Promise<boolean>{
        if( this.daplink.isConnected() )
        {
            this.dialog.open();
            this.dialog.addInfo("Searching for MicroPython...");

            if( await this.daplink.isMicropythonOnTarget() ){
                this.dialog.addInfo("MicroPython was found.");
                this.dialog.addInfo("Flashing python scripts");
                await this.daplink.flashMain(   this.get_script_cb(), 
                                                (prg: number) => this.dialog.setProgressValue(prg*100),
                                                (err) => {
                                                    this.dialog.addInfo("[FlashMain] Error: " + err, ProgressMessageType.ERROR)
                                                    this.dialog.addInfo("Try unplugging and replugging your board...", ProgressMessageType.ERROR);
                                                });
                this.serial_ouput.clear();
                this.dialog.showCloseButton();
            }
            else{
                this.dialog.addInfo("MicroPython was not found... Reflash everything.", ProgressMessageType.WARNING);
                this.dialog.addInfo("Flashing MicroPython...");

                let bin = await this.generateBinary();

                if( bin == null ){
                    this.dialog.addInfo("Failed to generate binary... Abort")
                }
                else{
                    let hex = new IHex(ActionFlash.FLASH_START_ADDRESS).parseBin(bin);

                    await this.daplink.flash(   new TextEncoder().encode(hex), 
                                                (prg: number) =>  this.dialog.setProgressValue(prg*100), 
                                                (err) => {
                                                    this.dialog.addInfo("[Flash] Error: " + err, ProgressMessageType.ERROR)
                                                    this.dialog.addInfo("Try unplugging and replugging your board...", ProgressMessageType.ERROR);
                                                }
                                            );
                }

                this.dialog.showCloseButton();
            }
        }
        else{
            let bin = await this.generateBinary();
            if( bin != null ){
                saveAs( new Blob( [new IHex(ActionFlash.FLASH_START_ADDRESS).parseBin(bin)] ), "flash.hex" );
            }
        }

        return true;
    }

    private async generateBinary() : Promise<Uint8Array | null>{
        let fat = new FatFS("PYBFLASH");
        let base : ArrayBuffer;

        try{
            let files : Array<FatFile> = JSON.parse( await this.readFileAsText("assets/fat.json"))
            
            files.forEach( async (file) => {
                fat.addFile(file.name, file.extension, await this.readFileAsText(file.path))
            });

            base = await this.readFileAsBlob("assets/micropython_L475_v1.18_PADDED.bin");
        }
        catch(e: any){
            console.error("[GENERATE BINARY]: ", e);
            new AlertDialog("Fatal error", `An error occured during the image generation: <br/><div class="citation-error">${e.message}</div><br/>Check your internet connection or restart your browser.`, AlertDialogIcon.ERROR).open();
            return null;
        }

        fat.addFile("MAIN", "PY", this.get_script_cb());

        let fat_part = fat.generate_binary();

        let bin_file = new Uint8Array( base.byteLength + fat_part.length);
        bin_file.set(new Uint8Array(base), 0);
        bin_file.set(new Uint8Array(fat_part), base.byteLength);

        console.log(`Binary size :  ${bin_file.byteLength} bytes`)

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