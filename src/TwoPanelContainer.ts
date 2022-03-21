export class TwoPanelContainer{

    static MIN_SPACE = 50;

    private left_container : HTMLElement;
    private separator : HTMLElement;
    private right_container : HTMLElement;
    private is_moving : boolean = false;

    constructor(left_container: HTMLElement, separator: HTMLElement, right_container: HTMLElement){
        this.left_container = left_container;
        this.separator = separator;
        this.right_container = right_container;

        this.separator.addEventListener( "mousedown", () => { this.is_moving = true; } );
        document.addEventListener( "mouseup", () => { this.is_moving = false; } );
        document.addEventListener( "mousemove", (evt) => { this.mouse_move(evt); } );
    }

    mouse_move(evt: MouseEvent){
        if( !this.is_moving ){ return; }

        let newPosX = Math.max( TwoPanelContainer.MIN_SPACE, Math.min(evt.clientX, document.body.clientWidth - TwoPanelContainer.MIN_SPACE));

        this.set_panel_size(newPosX);
    }

    set_panel_size(left_size: number){
        this.separator.style.left = left_size + "px";
        this.left_container.style.width = left_size + "px";
        this.right_container.style.width = (document.body.clientWidth - left_size - this.separator.clientWidth) + "px";
    }

    hide_right_panel(){
        this.right_container.style.display = "none";
        this.separator.style.display = "none";
        this.left_container.style.width = "100%";
    }

    show_right_panel(){
        this.right_container.style.display = "block";
        this.separator.style.display = "block";
        this.set_panel_size(50);
    }
}