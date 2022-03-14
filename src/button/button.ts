import { Action } from "../actions/action";

export class Button{

    protected is_enable: boolean;
    protected action: Action;
    protected button: HTMLDivElement;
    protected icon: HTMLImageElement;

    constructor(parent: HTMLElement, icon: string, action: Action, title: string = ""){
        this.button = document.createElement("div");
        this.icon = document.createElement("img");

        this.button.classList.add("menu_button")
        this.button.title = title;

        this.action = action;
        this.is_enable = true;
        this.icon.src = icon;
        this.button.append(this.icon);
        parent.append(this.button);

        this.button.addEventListener("click", () => this.onButtonClick());
    }

    enable(){
        this.button.classList.remove("disable");
    }

    disable(){
        this.button.classList.add("disable");
    }

    isEnable(){
        return this.is_enable;
    }

    protected async onButtonClick(){
        if( this.is_enable ){
            this.action.run();
        }
    }
}