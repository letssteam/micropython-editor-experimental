import { Button } from "../button";
import { DapLinkWrapper } from "../daplink";

export class ActionConnection {

    private daplink: DapLinkWrapper;
    private button: Button;
    private img_connect: string;
    private img_disconnect: string;
    private cb_onConnectionChagne: (isConnected: boolean) => void;
    private is_connected: boolean;

    constructor(daplink: DapLinkWrapper, button: Button, img_connect: string, img_disconnect: string, on_connection_change : (isConnected: boolean) => void){
        this.daplink = daplink;
        this.button = button;
        this.img_connect = img_connect;
        this.img_disconnect = img_disconnect;
        this.cb_onConnectionChagne = on_connection_change;

        this.is_connected = false;

        this.button.button.addEventListener("click", () => this.is_connected ? this.disconnect() : this.connect());
    }

    async connect(){

        if( !await this.daplink.connect() ){
            return;
        }

        this.button.icon.src = this.img_connect;
        this.button.button.title = "Click to disconnect";
        this.is_connected = true;

        if( this.cb_onConnectionChagne ) this.cb_onConnectionChagne(true);
    }

    async disconnect(){

        await this.daplink.disconnect();

        this.button.icon.src = this.img_disconnect;
        this.button.button.title = "Click to connect";
        this.is_connected = false;

        if( this.cb_onConnectionChagne ) this.cb_onConnectionChagne(false);
    }

}