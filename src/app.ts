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

export class Application{

    private top_container : HTMLElement = <HTMLElement>document.getElementById("top_container");
    private left_container : HTMLElement = <HTMLElement>document.getElementById("left_container");
    private right_container : HTMLElement = <HTMLElement>document.getElementById("right_container");
    private spacer_container : HTMLElement = <HTMLElement>document.getElementById("spacer_container");


    private button_run : Button;
    private button_conn: ToggleButton;

    private dapLinkWrapper : DapLinkWrapper;
    private serial_output : SerialOutput;



    constructor(monaco_editor: any){
        this.dapLinkWrapper = new DapLinkWrapper();

        this.serial_output = new SerialOutput(this.right_container);
        this.dapLinkWrapper.addReiceivedDataListener( (data) => this.serial_output.write(data));
        this.dapLinkWrapper.addConnectionChangeListener( is_connected => this.onConnectionChange(is_connected));


        this.topMenu(monaco_editor);


        //@ts-ignore
        this.button_run.disable();

        new TwoPanelContainer(this.left_container, this.spacer_container, this.right_container).set_panel_size(document.body.clientWidth * 0.66);
    }


    private topMenu(monaco_editor: any){

        let act_connection =  new ActionConnection(this.dapLinkWrapper);
        let act_run = new ActionRun(this.dapLinkWrapper, () => monaco_editor.getValue());
        let act_flash = new ActionFlash(document.body, this.dapLinkWrapper, this.serial_output, () => monaco_editor.getValue());
        let act_load = new ActionLoad((data) => monaco_editor.setValue(data));
        let act_save = new ActionSave(() => monaco_editor.getValue());
        let act_settings = new ActionSettings();


        this.button_conn = new ToggleButton(this.top_container, "img/disconnect.png", "img/connect.png", act_connection, "Click to connect", "Click to disconnect");
        this.button_run = new Button(this.top_container, "img/play.png", act_run, "Run script on target");
        new Button(this.top_container, "img/flash.png", act_flash, "Flash or Download");

        new ButtonSpacer(this.top_container);

        new Button(this.top_container, "img/upload.png", act_load, "Load python file");
        new Button(this.top_container, "img/download.png", act_save, "Save python file");

        new ButtonSpacer(this.top_container);

        new Button(this.top_container, "img/settings.png", act_settings, "Settings");
    }

    private onConnectionChange(is_connected: boolean){
        if(is_connected){
            this.button_run.enable();
            this.button_conn.setButtonState(false);
        }
        else{
            this.button_run.disable();
            this.button_conn.setButtonState(true);
        }
    }
}

// @ts-ignore
window["Application"] = Application;