import * as DAPjs from "dapjs";
import { AlertDialog, AlertDialogIcon } from "./alert_dialog";
import { OnConnectionChangeCallback, OnErrorCallback, OnProgressCallback, wait } from "./common";

export class DapLinkWrapper {

    static readonly LENGTH_SERIAL_BUFFER : number = 30;
    static readonly SERIAL_DELAY_MS : number = 10;

    private is_webusb_available: boolean;
    private device?: USBDevice = undefined;
    private transport? : DAPjs.WebUSB = undefined;
    private target? : DAPjs.DAPLink = undefined;

    private cb_onReceiveData : Array<(data: string) => void> = [];
    private serial_buffer : string = "";
    private onConnectionChange_cb: OnConnectionChangeCallback[] = [];

    constructor(){
        if( navigator.usb ){
            navigator.usb.addEventListener('disconnect', event => {
                if( this.isConnected() ){
                    if(this.device?.serialNumber == event.device.serialNumber){
                        this.disconnect();
                    }
                }
            });

            this.is_webusb_available = true;
        }
        else{
            this.is_webusb_available = false;
        }
    }

    isWebUSBAvailable(){
        return this.is_webusb_available;
    }

    addReiceivedDataListener ( cb : (data: string) => void ){
        this.cb_onReceiveData.push(cb);
    }

    async connect() : Promise<boolean>{
        if( ! this.isConnected() ){
            if(!this.is_webusb_available || ! await this.createTarget() ){
                return false;
            }
        }

        await this.target?.serialWrite(String.fromCharCode(1)); // [Ctrl+A] enter raw mode (REPL Python)
        this.target?.startSerialRead(DapLinkWrapper.SERIAL_DELAY_MS, true);
        this.callOnConnectionChangeCallbacks(true);
        return true;
    }

    async disconnect() : Promise<boolean>{
        if( ! this.isConnected() ){
            return false;
        }

        this.target?.stopSerialRead();

        try{
            await this.target?.disconnect();
        }
        catch(e){}

        this.target = undefined;
        this.transport = undefined;
        this.device = undefined;

        this.flushSerial();
        this.callOnConnectionChangeCallbacks(false);
        return true;
    }

    async runScript(script: string, on_progress: OnProgressCallback, on_error: OnErrorCallback){
        
        if( !await this.connect() ){
            return;
        }

        await this.sendScript(script + "\n\n\n", on_progress, on_error);
    }

    async flashMain(script: string, on_progress : OnProgressCallback, on_error: OnErrorCallback){

        let bin_data = new TextEncoder().encode(script);
        let prog = "prog=[";
        
        let part_length = 40;
        let nb_part = Math.ceil(bin_data.length / part_length);

        on_progress(0);
        
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

        await this.sendScript(main, on_progress, on_error);
        await this.target?.serialWrite(String.fromCharCode(2)); // [Ctrl+B] exit raw mode (REPL Python)
        await this.target?.serialWrite(String.fromCharCode(4)); // [Ctrl+D] Soft reset (REPL Python)

        on_progress(1);
    }

    isConnected() : boolean{
        return this.target != undefined && this.target.connected;
    }

    async flash(hex: Uint8Array, on_progress : OnProgressCallback, on_error: OnErrorCallback) : Promise<void>{
        if( !this.isConnected() ){ return; }

        this.target?.on(DAPjs.DAPLink.EVENT_PROGRESS, progress => on_progress(progress) );

        try{
            await this.target?.stopSerialRead();
            await this.target?.reset();
            await this.target?.flash(hex);
            await wait(1000);
            await this.target?.reset();
        }
        catch(e: any){
            console.warn("[FLASH]: ", e);
            on_error(e.message);
        }

        this.target?.on(DAPjs.DAPLink.EVENT_PROGRESS, progress => {} );
    }

    async isMicropythonOnTarget(){
        if( !this.isConnected() ){ return; }

        try{
            this.target?.stopSerialRead();
            await this.target?.serialWrite(String.fromCharCode(3)); // [Ctrl+C]
            await wait(2000);
            await this.target?.serialWrite(String.fromCharCode(4)); // [Ctrl+D]
            let read : string = "";

            for( let i = 0; i < 10; i++ ){
                read += new TextDecoder().decode( await this.target?.serialRead() );
                await wait(100);
            }
            
            this.target?.startSerialRead(DapLinkWrapper.SERIAL_DELAY_MS, true);
            return (read.indexOf("MPY") != -1);
        }
        catch(e: any){
            console.error("[IS_MICROPYTHON_ON_TARGET]: ", e);
            return false;
        }
    }

    addConnectionChangeListener(cb: OnConnectionChangeCallback): void{
        this.onConnectionChange_cb.push(cb);
    }

    async sendKeyboardInterrupt(){
        if( !this.isConnected() ){ return; }

        try{
            await this.target?.serialWrite(String.fromCharCode(3)); // [Ctrl+C]
            await wait(1000);
        }
        catch(e: any){
            console.error("[SEND_KEYBOARD_INTERRUPT]: ", e);
            return false;
        }
    }

    private callOnConnectionChangeCallbacks(is_connected: boolean){
        this.onConnectionChange_cb.forEach( cb => cb(is_connected) );
    }


    private async sendScript(script: string, on_progress?: OnProgressCallback, on_error?: OnErrorCallback ){

        if( !this.isConnected() ){ return; }
        if( script.length == 0 ){ return; }

        let final_script = `def __send_script_execution__():\n\t` + script.replace(/\n/g, "\n\t") + "\n\n";

        let chunks = final_script.match(new RegExp('[\\s\\S]{1,' + DapLinkWrapper.LENGTH_SERIAL_BUFFER + '}', 'g')) || [];

        try{
            await this.target?.serialWrite(String.fromCharCode(3)); // [Ctrl+C]
            await wait(2000);

            this.flushSerial();

            await this.target?.serialWrite(String.fromCharCode(1)); // [Ctrl+A] enter raw mode (REPL Python)
            await wait(250);

            for(let i = 0; i < chunks.length; ++i ){
                await this.target?.serialWrite(chunks[i]);
                await wait(10);

                if(on_progress != undefined){
                    on_progress( i / chunks.length );
                }
            }

            await this.target?.serialWrite( "try:\n");
            await this.target?.serialWrite(     "\t__send_script_execution__()\n");
            await this.target?.serialWrite( "except KeyboardInterrupt:\n");
            await this.target?.serialWrite(     "\tprint(\"--INTERRUPT RUNNING PROGRAM--\")\n\n");

            await this.target?.serialWrite(String.fromCharCode(4)); // [Ctrl+D] Execute python code (REPL Python)
        }
        catch(e: any){
            console.warn("[SEND SCRIPT]: ", e);
            if(on_error){ on_error(e.message); }
        }

    }

    private async createTarget() : Promise<boolean> {

        try{
            this.device = await navigator.usb.requestDevice({
                filters: [{vendorId: 0x0D28}]
            });
        }
        catch(e: any){
            console.warn(e);

            if( e.message.indexOf("No device selected") == -1 ){
                new AlertDialog("WebUSB Error", `An error occured with the WebUSB: <br/><div class="citation-error">${e.message}</div><br/>Try unplugging and replugging your board or restart your browser.<br/><br/><i>Note: WebUSB is experimental and only support on chrome based browser (chrome, chromium, brave, edge, etc)</i>`, AlertDialogIcon.ERROR).open();
            }
            return false;
        }

        this.transport = new DAPjs.WebUSB(this.device);
        this.target = new DAPjs.DAPLink(this.transport);
        
        this.target.on(DAPjs.DAPLink.EVENT_SERIAL_DATA, data => this.onEventSerialData(data) );

        try{
            await this.target.connect();
            await this.target.setSerialBaudrate(115200);
        }
        catch(e: any){
            console.warn(e);
            new AlertDialog("Connection failed", `An error occured during the connection: <br/><div class="citation-error">${e.message}</div><br/>Try unplugging and replugging your board...`, AlertDialogIcon.ERROR).open();
            return false;
        }

        return true;
    }

    private flushSerial(){
        if( this.serial_buffer.length > 0 ){
            this.serial_buffer = "";
        }
    }

    private onEventSerialData(data: string){
        let splits = data.split(/(?<=\n)/); // Split but keep the '\n'

        splits.forEach( (split) => {
            this.serial_buffer += split;

            if( split.at(-1) == '\n' ){
                this.callOnReceiveCallbacks( this.cleanString(this.serial_buffer) );
                this.serial_buffer = "";
            }
        });
    }

    private callOnReceiveCallbacks(data: string){
        this.cb_onReceiveData.forEach( (cb) => {
            cb(data);
        })
    }

    private cleanString(str: string): string{
        return   str.replace(/\x04\x04/g, "")
                    .replace(/\>OK[\x04\>]*/g, "")
                    .replace(/\>\>\>[ \r\n]*/g, "")

                    .replace(/[\>\r\n]*raw REPL; CTRL-B to exit[\r\n]*/g, "")
                    .replace(/Type "help\(\)" for more information.[\r\n]*/g, "")
                    .replace(/MicroPython [\s\S]*\n$/g, "");
    }
}