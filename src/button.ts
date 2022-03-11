export class Button{

    private is_enable: boolean;

    button: HTMLDivElement;
    icon: HTMLImageElement;

    constructor(parent: HTMLElement, icon: string){
        this.button = document.createElement("div");
        this.icon = document.createElement("img");

        this.button.classList.add("menu_button")

        this.is_enable = true;
        this.icon.src = icon;
        this.button.append(this.icon);
        parent.append(this.button);
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

}



export class ButtonSpacer{
    constructor(parent: HTMLElement){
        let button = document.createElement("div");
        button.classList.add("menu_button_space")
        parent.append(button);
    }
}