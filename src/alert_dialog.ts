export enum AlertDialogIcon{
    NONE = "alert-dialog-icon-none",
    INFO = "alert-dialog-icon-info",
    WARNING = "alert-dialog-icon-warning",
    ERROR = "alert-dialog-icon-error"
}

export class AlertDialog {

    private dialog: HTMLElement;

    constructor(title?: string, text?: string, icon: AlertDialogIcon = AlertDialogIcon.NONE){

        this.dialog = document.createElement("div");
        this.dialog.classList.add("alert-dialog");
        this.dialog.style.display = "none";

        let container = document.createElement("div");
        container.classList.add("alert-dialog-container")

        let title_el = document.createElement("div");
        title_el.classList.add("alert-dialog-title", icon);
        title_el.innerText = title || "";

        let content = document.createElement("div");
        content.classList.add("alert-dialog-content");

        let text_el = document.createElement("p");
        text_el.innerHTML = text || "";

        let close_button = document.createElement("button");
        close_button.classList.add("alert-dialog-close-button");
        close_button.innerText = "Close";
        close_button.addEventListener( "click", () => this.close() );

        content.append(text_el);
        content.append(close_button);

        container.append(title_el);
        container.append(content);

        this.dialog.append(container);

        document.body.append(this.dialog);
    }

    open(title?: string, text?: string, icon?: AlertDialogIcon){
        if( title ){
            (this.dialog.querySelector(".alert-dialog-title") as HTMLElement).innerHTML = title;
        }

        if( text ){
            (this.dialog.querySelector(".alert-dialog-content p") as HTMLElement).innerHTML = text;
        }

        if( icon ){
            let title_el = this.dialog.querySelector(".alert-dialog-title") as HTMLElement;
            title_el.classList.remove(AlertDialogIcon.NONE, AlertDialogIcon.INFO, AlertDialogIcon.WARNING, AlertDialogIcon.ERROR);
            title_el.classList.add(icon);
        }

        this.dialog.style.display = "block";
    }

    close(){
        this.dialog.style.display = "none";
    }

};