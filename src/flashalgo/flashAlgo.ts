import { APRegister, CoreRegister, DebugRegister, DPRegister } from "dapjs";
import { copyFileSync } from "fs";
import { wait } from "../common";
import { DapLinkWrapper } from "../daplink";
import { FlashAlgo_Target } from "./flashalgo_target";

export class FlashAlgo{
    private daplink: DapLinkWrapper;
    private target: FlashAlgo_Target;

    constructor(daplink: DapLinkWrapper, target: FlashAlgo_Target){
        this.daplink = daplink;
        this.target = target;
    }

    private async retryIfWait<T>(attempt: number, fn: () => Promise<T> ) : Promise<T>{
        return new Promise<T>(
            (resolve, reject) => {

                fn()
                    .then( (result) => {
                        resolve(result) 
                    } )
                    .catch( (error: Error) => {
                        if( error.message.indexOf("WAIT") != -1 ){

                            if( attempt <= 0 ){
                                console.warn(`Wait received ! Abort !`);
                                reject(error)
                            }
                            else{
                                console.warn(`Wait received ! Retry (${attempt-1})`);
                                this.retryIfWait(attempt - 1, fn)
                                    .then( (value) => resolve(value) )
                                    .catch( (error) => reject(error) );
                            }
                        }
                        else{
                            reject(error);
                        }
                    });
            }
        );
    }

    async setupFlashAlgo(): Promise<boolean>{
        let fct = ""
        try{
            //console.log( await this.daplink.cortex?.getState() )
            //console.log( await this.daplink.cortex?.readDP( DPRegister.DPIDR ) )
            //console.log( await this.daplink.cortex?.readMem32( DebugRegister.DHCSR ))
            fct = "Stop Serial";
            this.daplink.target?.stopSerialRead();
            await wait(500);

            fct = "Halt";
            await this.retryIfWait(10, () => this.daplink.cortex?.halt(true) );
            await wait(250);

            fct = "SP";
            await this.retryIfWait(10, () => this.daplink.cortex?.writeCoreRegister(CoreRegister.SP, this.target.syscall.stack_pointer) );
            fct = "PSR";
            await this.retryIfWait(10, () => this.daplink.cortex?.writeCoreRegister(CoreRegister.PSR, 0x01000000) );
            fct = "writeBlock";
            await this.retryIfWait(10, () => this.daplink.cortex?.writeBlock( this.target.algo_start, this.target.algo_blob ) );
        }
        catch(e: any){
            console.error(`[SETUP_FLASH_ALGO] ${fct} : `, e);
            return false;
        }

        return true;
    }

    async reset() {
        await this.daplink.cortex?.softReset();
        await this.daplink.cortex?.reset();
    }

    async call_init() : Promise<boolean>{
        // try{
            await this.retryIfWait(10, () => this.daplink.cortex?.halt(true) );
            await this.retryIfWait(10, () => this.daplink.cortex?.writeCoreRegister(CoreRegister.PC, this.target.init) );
            await this.retryIfWait(10, () => this.daplink.cortex?.resume(false) );
            
            for( let i = 0; i < 10; i++ ){
                //let value = await this.daplink.cortex?.readCoreRegister(CoreRegister.PC);
                console.log(`[${i/1000}] ${await this.retryIfWait(10, () => this.daplink.cortex?.isHalted() )}`);
                await wait(1000);
            }
        // }
        // catch(e: any){
        //     console.error("[CALL_INIT]: ", e);
        //     return false;
        // }

        // return true;

        return false;
    }

    async call_unInit() : Promise<boolean>{
        return false;
    }

    async call_eraseChip() : Promise<boolean>{
        return false;
    }

    // async massErase(){
    //     if( ! this.daplink.isConnected() ){
    //         return false;
    //     }

    //     try{
    //         console.log("Init");
    //         await this.daplink.cortex?.execute(this.target.algo_start, this.target.algo_blob, this.target.syscall.stack_pointer, this.target.init);

    //         console.log("Erase Chip");
    //         await this.daplink.cortex?.execute(this.target.algo_start, this.target.algo_blob, this.target.syscall.stack_pointer, this.target.erase_chip);

    //         console.log("UnInit");
    //         await this.daplink.cortex?.execute(this.target.algo_start, this.target.algo_blob, this.target.syscall.stack_pointer, this.target.unInit);
    //     }
    //     catch(e: any){
    //         console.error("[MASS ERASE]: ", e);
    //         return false;
    //     }

    //     return true;
    // }
}