import { Button } from "./button/button";
import { ActionConnection } from "./actions/action_connection";
import { DapLinkWrapper } from "./daplink";
import { ActionRun } from "./actions/action_run";
import { SerialOutput } from "./serialOutput";
import { TwoPanelContainer } from "./TwoPanelContainer";
import { ActionSave } from "./actions/action_save";
import { ActionLoad } from "./actions/action_load";
import { ActionFlash } from "./actions/action_flash";
import { ToggleButton } from "./button/button_toggle";
import { ActionSettings } from "./actions/action_settings";
import { ButtonSpacer } from "./button/buttonSpacer";
import { PlaceHolderButton } from "./button/button_placeholder";
import { GetScriptCallback, SetScriptCallback } from "./common";
import { ButtonDropdown, ButtonDropdownElement } from "./button/button_dropdown";
import { AlertDialog, AlertDialogIcon } from "./alert_dialog";
import { APP_VERSION } from "./version";
import { FlashAlgo } from "./flashalgo/flashAlgo";
import { FlashAlgo_Target } from "./flashalgo/flashalgo_target";

export class Application{

    private top_container : HTMLElement = <HTMLElement>document.getElementById("top_container");
    private left_container : HTMLElement = <HTMLElement>document.getElementById("left_container");
    private right_container : HTMLElement = <HTMLElement>document.getElementById("right_container");
    private spacer_container : HTMLElement = <HTMLElement>document.getElementById("spacer_container");


    private button_run? : Button;
    private button_conn?: ToggleButton;

    private dapLinkWrapper : DapLinkWrapper;
    private serial_output : SerialOutput;
    private flashalgo: FlashAlgo;



    constructor(get_script: GetScriptCallback, set_script: SetScriptCallback){
        this.dapLinkWrapper = new DapLinkWrapper();

        this.serial_output = new SerialOutput(this.right_container);
        this.dapLinkWrapper.addReiceivedDataListener( (data) => this.serial_output.write(data));
        this.dapLinkWrapper.addConnectionChangeListener( is_connected => this.onConnectionChange(is_connected));


        this.topMenu(get_script, set_script);


        this.button_run?.disable();

        if( this.dapLinkWrapper.isWebUSBAvailable() ){
            new TwoPanelContainer(this.left_container, this.spacer_container, this.right_container).set_panel_size(document.body.clientWidth * 0.66);
        }
        else{
            new TwoPanelContainer(this.left_container, this.spacer_container, this.right_container).hide_right_panel();
        }

        let stm32l475_flash_prog_blob = new Uint32Array([
            0xE00ABE00, 
            0xb085b480, 0x6078af00, 0xf103687b, 0x60fb4378, 0x0adb68fb, 0x37144618, 0xbc8046bd, 0x00004770,
            0xb085b480, 0x60f8af00, 0x607a60b9, 0x4a124b11, 0x4b10609a, 0x609a4a11, 0x691b4b0e, 0xf0434a0d,
            0x611303b8, 0x69db4b0b, 0x0320f003, 0xd10a2b00, 0xf2454b0b, 0x601a5255, 0x22064b09, 0x4b08605a,
            0x72fff640, 0x2300609a, 0x37144618, 0xbc8046bd, 0xbf004770, 0x40022000, 0x45670123, 0xcdef89ab,
            0x40003000, 0xb085b480, 0x6078af00, 0x681b4b0b, 0x4a0a60fb, 0xf42368fb, 0x601353f8, 0x68fb4a07,
            0x4b066013, 0x4a05695b, 0x4300f043, 0x23006153, 0x37144618, 0xbc8046bd, 0xbf004770, 0x40022000,
            0xaf00b480, 0x695b4b16, 0xf0434a15, 0x61530304, 0x695b4b13, 0xf4434a12, 0x61534300, 0x695b4b10,
            0xf4434a0f, 0x61533380, 0x4b0ee003, 0x22aaf64a, 0x4b0b601a, 0xf403691b, 0x2b003380, 0x4b08d1f5,
            0x4a07695b, 0x0304f023, 0x4b056153, 0x4a04695b, 0x4300f423, 0x23006153, 0x46bd4618, 0x4770bc80,
            0x40022000, 0x40003000, 0xb084b580, 0x6078af00, 0xf7ff6878, 0x60f8ff65, 0x691b4b1d, 0xf0434a1c,
            0x611303b8, 0x22024b1a, 0x4b19615a, 0x68fb695a, 0xf40300db, 0x491663ff, 0x614b4313, 0x695b4b14,
            0xf4434a13, 0x61533380, 0x4b12e003, 0x22aaf64a, 0x4b0f601a, 0xf403691b, 0x2b003380, 0x4b0cd1f5,
            0x4a0b695b, 0x0302f023, 0x4b096153, 0xf003691b, 0x2b0003b8, 0x4b06d007, 0x4a05691b, 0x03b8f043,
            0x23016113, 0x2300e000, 0x37104618, 0xbd8046bd, 0x40022000, 0x40003000, 0xb085b480, 0x60f8af00,
            0x607a60b9, 0x330368bb, 0x0303f023, 0x4b2160bb, 0x4a20691b, 0x03b8f043, 0x4b1e6113, 0x615a2200,
            0x4b1ce02f, 0x4a1b695b, 0x7300f443, 0x0301f043, 0x68fb6153, 0x6812687a, 0xbf00601a, 0x691b4b15,
            0x3380f403, 0xd1f92b00, 0x695b4b12, 0xf0234a11, 0x61530301, 0x691b4b0f, 0x03b8f003, 0xd0072b00,
            0x691b4b0c, 0xf0434a0b, 0x611303b8, 0xe00c2301, 0x330468fb, 0x687b60fb, 0x607b3304, 0x3b0468bb,
            0x68bb60bb, 0xd1cc2b00, 0x46182300, 0x46bd3714, 0x4770bc80, 0x40022000, 0x00000000, 0x00000000
        ]);

        this.flashalgo = new FlashAlgo( this.dapLinkWrapper,
            {
                init: 0x20000025, // Init
                unInit: 0x20000089, // UnInit
                erase_chip: 0x200000c5, // EraseChip
                erase_sector: 0x2000012d, // EraseSector
                program_page: 0x200001bd, // ProgramPage
                verify: 0x0, // Verify
            
                // BKPT : start of blob + 1
                // RSB  : blob start + header + rw data offset
                // RSP  : stack pointer
                syscall: {
                    breakpoint: 0x20000001,
                    static_base: 0x20000264,
                    stack_pointer: 0x20000500
                },
            
                program_buffer: 0x20000000 + 0x00000A00,  // mem buffer location
                algo_start: 0x20000000,               // location to write prog_blob in target RAM
                //algo_size: sizeof(stm32l475_flash_prog_blob),   // prog_blob size
                algo_size: stm32l475_flash_prog_blob.byteLength,   // prog_blob size
                algo_blob: stm32l475_flash_prog_blob,           // address of prog_blob
                program_buffer_size: 0x00000800,       // ram_to_flash_bytes_to_be_written
                algo_flags: 0
            })

    }


    private topMenu(get_script: GetScriptCallback, set_script: SetScriptCallback){

        let act_connection =  new ActionConnection(this.dapLinkWrapper);
        let act_run = new ActionRun(this.dapLinkWrapper, get_script);
        let act_flash = new ActionFlash(this.dapLinkWrapper, this.serial_output, get_script);
        let act_load = new ActionLoad(set_script);
        let act_save = new ActionSave(get_script);
        let act_settings = new ActionSettings();

        if( this.dapLinkWrapper.isWebUSBAvailable() ){
            this.button_conn = new ToggleButton(this.top_container, "img/disconnect.png", "img/connect.png", act_connection, "Click to connect", "Click to disconnect");
            this.button_run = new Button(this.top_container, "img/play.png", act_run, "Run script on target");
        }
        else{
            new PlaceHolderButton(this.top_container);  // Connection placeholder
            new PlaceHolderButton(this.top_container);  // Play placeholder
        }
        new Button(this.top_container, "img/flash.png", act_flash, "Flash or Download");

        new ButtonSpacer(this.top_container);

        new Button(this.top_container, "img/upload.png", act_load, "Load python file");
        new Button(this.top_container, "img/download.png", act_save, "Save python file");

        new ButtonSpacer(this.top_container);

        new ButtonDropdown(this.top_container, "img/settings.png", [ new ButtonDropdownElement("Clear console", () => this.serial_output.clear(), "f120"), 
                                                                     new ButtonDropdownElement("Force task stop", () => this.dapLinkWrapper.sendKeyboardInterrupt(), "f54c"),
                                                                     new ButtonDropdownElement("About", () => this.about(), "f059"),
                                                                     new ButtonDropdownElement("Mass erase", () => this.massErase(), "f780") ], "Settings");
    }

    private onConnectionChange(is_connected: boolean){
        if(is_connected){
            this.button_run?.enable();
            this.button_conn?.setButtonState(false);
        }
        else{
            this.button_run?.disable();
            this.button_conn?.setButtonState(true);
        }
    }

    private about(){
        new AlertDialog("About", `Version: ${APP_VERSION}`, AlertDialogIcon.INFO).open();
    }

    private async massErase(){
        console.log("Setup flashAlgo");
        if( ! await this.flashalgo.setupFlashAlgo() ){
            console.warn("Abort !");
            return;
        }

        console.log("Init");
        if( ! await this.flashalgo.call_init() ){
            console.warn("Abort !");
            return;
        }

        console.log("UnInit");
        if( ! await this.flashalgo.call_unInit() ){
            console.warn("Abort !");
            return;
        }

        console.log("Reset")
        await this.flashalgo.reset()
    }
}

// @ts-ignore
window["Application"] = Application;
// @ts-ignore
window["AlertDialog"] = AlertDialog;
// @ts-ignore
window["AlertDialogIcon"] = AlertDialogIcon;