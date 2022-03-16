import { Action } from "../actions/action";
import { Button } from "./button"

export class ToggleButton extends Button{

    private lock_button_state = false;
    private is_A_show = true;
    private iconA: string;
    private iconB: string;
    private titleA: string;
    private titleB: string;

    constructor(parent: HTMLElement, iconA: string, iconB: string, action: Action, titleA: string = "", titleB : string = ""){
        super(parent, iconA, action);

        this.iconA = iconA;
        this.iconB = iconB;
        this.titleA = titleA;
        this.titleB = titleB;
    }

    setButtonState(show_default: boolean){
        if( this.lock_button_state ){ return; }
        this.internal_setButtonState(show_default);
    }

    protected async onButtonClick(){
        if( ! this.is_enable ){ return; }

        this.lock_button_state = true;
        if( await this.action.run() ){ 
            this.internal_setButtonState(!this.is_A_show);
        }
        this.lock_button_state = false;
    }

    private internal_setButtonState(show_A: boolean){
        if( show_A ){
            this.button.title = this.titleA;
            this.icon.src = this.iconA;
        }
        else{
            this.button.title = this.titleB;
            this.icon.src = this.iconB;
        }

        this.is_A_show = show_A;
    }
}