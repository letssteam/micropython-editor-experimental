import { Button, ButtonSpacer } from "./button";
import { ActionConnection } from "./action_connection";
import { DapLinkWrapper } from "./daplink";
import { ActionRun } from "./actions/action_run";
import { SerialOutput } from "./serialOutput";
import { TwoPanelContainer } from "./TwoPanelContainer";
import { ActionSave } from "./actions/action_save";
import { ActionLoad } from "./actions/action_load";
import { FatFS } from "./microFAT/fat";

export class Application{

    private top_container : HTMLElement = <HTMLElement>document.getElementById("top_container");
    private left_container : HTMLElement = <HTMLElement>document.getElementById("left_container");
    private right_container : HTMLElement = <HTMLElement>document.getElementById("right_container");
    private spacer_container : HTMLElement = <HTMLElement>document.getElementById("spacer_container");



    private dapLinkWrapper : DapLinkWrapper;



    constructor(monaco_editor: any){
        this.dapLinkWrapper = new DapLinkWrapper();

        this.topMenu(monaco_editor);
        this.rightPanel();


        new TwoPanelContainer(this.left_container, this.spacer_container, this.right_container).set_panel_size(document.body.clientWidth * 0.66);
        let fat = new FatFS("PYBFLASH");

        fat.addFile("TEST", "TXT", "JE SUIS TROP FORT, PUTAIN  !!!");
        fat.generate_hex();
    }


    private topMenu(monaco_editor: any){

        // Connection
        new ActionConnection(this.dapLinkWrapper, new Button(this.top_container, "img/disconnect.png"), "img/connect.png", "img/disconnect.png", (is_connected) => { is_connected ? menu_run.enable() : menu_run.disable(); });
        
        // Run
        let menu_run = new Button(this.top_container, "img/play.png");
        menu_run.disable();
        new ActionRun(this.dapLinkWrapper, menu_run, () => monaco_editor.getValue() );

        //Flash
        let menu_flash = new Button(this.top_container, "img/flash.png");


        new ButtonSpacer(this.top_container);


        // Load
        new ActionLoad(new Button(this.top_container, "img/upload.png"), (data) => monaco_editor.setValue(data));

        // Save
        new ActionSave(new Button(this.top_container, "img/download.png"), () => monaco_editor.getValue() );


        new ButtonSpacer(this.top_container);
        
        
        // Settings
        let menu_settings = new Button(this.top_container, "img/settings.png");
    }

    private rightPanel(){
        let serialOutput = new SerialOutput(this.right_container);
        this.dapLinkWrapper.onReceivedData( (data) => serialOutput.write(data));
    }
}

// @ts-ignore
window["Application"] = Application;