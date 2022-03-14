import { DapLinkWrapper } from "../daplink";
import { Action } from "./action";

export class ActionConnection implements Action {

    private daplink: DapLinkWrapper;
    private cb_onConnectionChagne: (isConnected: boolean) => void;
    private is_connected: boolean;

    constructor(daplink: DapLinkWrapper, on_connection_change : (isConnected: boolean) => void){
        this.daplink = daplink;
        this.cb_onConnectionChagne = on_connection_change;

        this.is_connected = false;
    }

    async connect() : Promise<boolean>{

        if( !await this.daplink.connect() ){
            return false;
        }
        this.is_connected = true;

        if( this.cb_onConnectionChagne ) this.cb_onConnectionChagne(true);

        return true;
    }

    async disconnect() : Promise<boolean>{

        await this.daplink.disconnect();
        this.is_connected = false;

        if( this.cb_onConnectionChagne ) this.cb_onConnectionChagne(false);

        return true;
    }

    async run(): Promise<boolean> {
        if( this.is_connected ){
            return this.disconnect();
        }
        else{
            return this.connect();
        }
    }
}