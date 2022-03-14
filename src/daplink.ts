import * as DAPjs from "dapjs";
import { wait } from "./common";

export class DapLinkWrapper {

    static readonly LENGTH_SERIAL_BUFFER : number = 30;

    private transport? : DAPjs.WebUSB = undefined;
    private target? : DAPjs.DAPLink = undefined;

    private cb_onReceiveData : Array<(data: string) => void> = [];
    private serial_buffer : string = "";

    constructor(){}

    addReiceivedDataListener ( cb : (data: string) => void ){
        this.cb_onReceiveData.push(cb);
    }

    async connect(){
        if( ! this.isConnected() ){
            if(! await this.createTarget() ){
                return false;
            }
        }

        this.target?.startSerialRead();
        return true;
    }

    async disconnect(){
        if( ! this.isConnected() ){
            return;
        }

        this.target.stopSerialRead();
        this.target.disconnect();

        this.target = undefined;
        this.transport = undefined;

        this.flushSerial();
    }

    async runScript(script: string, disable_echo: boolean = true){
        
        if( !await this.connect() ){
            return;
        }

        await this.sendScript(script + "\n\n\n", disable_echo);
    }

    async flashMain(script: string){

        let bin_data = new TextEncoder().encode(script);
        let prog = "prog=[";
        
        let part_length = 40;
        let nb_part = Math.ceil(bin_data.length / part_length);
        
        for( let i = 0; i < nb_part; ++i ){
            prog += bin_data.slice(i * part_length, (i+1) * part_length).join(",");
            prog += ",\n"
        }

        prog += "]\n";

        let main =  prog +
                    `with open("main.py", "wb") as f:\n` +
                    `\tf.write(bytearray(prog))\n` + 
                    "\n"
                    "\n"
                    "\n";
                    

        console.log(main);

        await this.sendScript(main, false);
        await this.target?.reset();

        console.log("done");
    }

    isConnected() : boolean{
        return this.target != undefined && this.target.connected;
    }

    flash(data: Uint8Array) : void{
        if( !this.isConnected() ){ return; }

        this.target?.startSerialRead();
        this.target?.flash(data);
        this.target?.reset();
    }

    private async sendScript(script: string, disable_echo: boolean){

        if( !this.isConnected() ){ return; }
        if( script.length == 0 ){ return; }

        let final_script = "def __send_script_execution__():\n\t" + script.replace(/\n/g, "\n\t") + "\n\n";

        let chunks = final_script.match(new RegExp('[\\s\\S]{1,' + DapLinkWrapper.LENGTH_SERIAL_BUFFER + '}', 'g')) || [];

        await this.target?.serialWrite(String.fromCharCode(3)); // [Ctrl+C]
        await wait(2000);

        await this.target?.serialWrite(String.fromCharCode(1)); // [Ctrl+A] enter raw mode (REPL Python)

        for( let chunk of chunks ){
            await this.target?.serialWrite(chunk);
            await this.target?.serialRead();
        }

        await this.target?.serialWrite("__send_script_execution__()\n\n");

        await this.target?.serialWrite(String.fromCharCode(4)); // [Ctrl+D] Start REPL on paste code (REPL Python)

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
        
        this.target.on(DAPjs.DAPLink.EVENT_SERIAL_DATA, data => this.onEventSerialData(data) );

        await this.target.connect();
        await this.target.setSerialBaudrate(115200);

        return true;
    }

    private flushSerial(){
        if( this.serial_buffer.length > 0 ){
            this.onEventSerialData("\n");
        }
    }

    private onEventSerialData(data: string){
        let splits = data.split(/(?<=\n)/); // Split but keep the '\n'

        splits.forEach( (split) => {
            this.serial_buffer += split;

            if( split.at(-1) == '\n' ){
                this.callOnReceiveCallbacks( this.serial_buffer.replace(/\x04\x04/g, "").replace(/\>OK/g, "") );
                this.serial_buffer = "";
            }
        });
    }

    private callOnReceiveCallbacks(data: string){
        this.cb_onReceiveData.forEach( (cb) => {
            cb(data);
        })
    }
}