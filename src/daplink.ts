import * as DAPjs from "dapjs";

export class DapLinkWrapper {

    private transport? : DAPjs.WebUSB = undefined;
    private target? : DAPjs.DAPLink = undefined;
    private cb_onReceiveDate? : (data: string) => void = undefined;

    constructor(){}

    onReceivedData ( cb : (data: string) => void ){
        this.cb_onReceiveDate = cb;
    }

    async connect(){
        if( this.transport == undefined ){
            if(! await this.createTarget() ){
                return false;
            }
        }

        this.target?.startSerialRead();
        return true;
    }

    async disconnect(){
        if( this.target == undefined ){
            return;
        }

        this.target.stopSerialRead();
        this.target.disconnect();

        this.target = undefined;
        this.transport = undefined;
    }

    async runScript(script: string){
        
        if( !await this.connect() ){
            return;
        }

        let lines = script.split("\n");
        lines.push("");
        lines.push("");

        await this.target?.serialWrite(String.fromCharCode(5)); // [Ctrl+E] Enable paste mode (REPL Python)

        for( let line of lines ){
            await this.target?.serialWrite(line + "\n");
        }

        await this.target?.serialWrite(String.fromCharCode(4)); // [Ctrl+D] Disable paste mode (REPL Python)
    }

    private async createTarget() : Promise<boolean> {

        let device : USBDevice;

        try{
            device = await navigator.usb.requestDevice({
                filters: [{vendorId: 0x0D28}]
            });
        }
        catch(e){
            console.warn(e);
            return false;
        }

        this.transport = new DAPjs.WebUSB(device);
        this.target = new DAPjs.DAPLink(this.transport);
        
        this.target.on(DAPjs.DAPLink.EVENT_SERIAL_DATA, data => {
            if(this.cb_onReceiveDate != undefined){
                this.cb_onReceiveDate(data);
            }
        });

        await this.target.connect();
        await this.target.setSerialBaudrate(115200);

        return true;
    }
}