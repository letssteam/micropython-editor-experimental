import { Button } from "../button";
import { GetDataCallback } from "../common";
import { FatFS } from "../microFAT/fat";

import { saveAs } from "file-saver";

export class ActionFlash{

    private getData_cb: GetDataCallback;

    constructor(button: Button, getData: GetDataCallback){
        this.getData_cb = getData;

        button.button.addEventListener("click", () => this.downloadBinary() );
    }

    private async downloadBinary(){

        let fat = new FatFS("PYBFLASH");

        fat.addFile("README", "txt", await this.readFile("files/README.txt"));
        fat.addFile("boot", "py", await this.readFile("files/boot.py"));
        fat.addFile("pybcdc", "inf", await this.readFile("files/pybcdc.inf"));
        fat.addFile("main", "py", this.getData_cb());

        saveAs( new Blob( [Uint8Array.from(fat.generate_binary())] ), "flash.bin" );
    }

    private async readFile(file: string) : Promise<string> {
        let rep = await fetch(file);

        let res = await rep.text();

        console.log(`${file}:\n${res}`);

        return res;
    }

}