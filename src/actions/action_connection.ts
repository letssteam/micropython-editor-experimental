import { OnConnectionChangeCallback } from "../common";
import { DapLinkWrapper } from "../daplink";
import { Action } from "./action";

export class ActionConnection implements Action {

    private daplink: DapLinkWrapper;
    private is_connected: boolean;

    constructor(daplink: DapLinkWrapper){
        this.daplink = daplink;

        this.is_connected = false;
        daplink.addConnectionChangeListener( (is_conn) => this.onConnectionChange(is_conn) );
    }

    async connect() : Promise<boolean>{
        return await this.daplink.connect();
    }

    async disconnect() : Promise<boolean>{
        return await this.daplink.disconnect();
    }

    async run(): Promise<boolean> {
        if( this.is_connected ){
            return this.disconnect();
        }
        else{
            return this.connect();
        }
    }

    private onConnectionChange(is_connected: boolean){
        this.is_connected = is_connected;
    }
}