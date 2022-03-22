export enum ProgressMessageType {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error"
};

export class ProgressDialog{

    private dialog: HTMLElement;
    private progress_bar_div: HTMLElement;

    constructor(title: string = "Uploading...", text: string = "Your program is uploading to your target, please wait.<br/><br/><i>Do not unplugged your board, do not close this tab nor change tab during uploading.</i>"){
        this.dialog = document.createElement("div");
        this.dialog.classList.add("progress-dialog");
        this.dialog.style.display = "none";

        let container = document.createElement("div");
        container.classList.add("progress-dialog-container")

        let title_el = document.createElement("div");
        title_el.classList.add("progress-dialog-title");
        title_el.innerText = title;

        let content = document.createElement("div");
        content.classList.add("progress-dialog-content");

        let text_el = document.createElement("p");
        text_el.innerHTML = text;

        let close_button = document.createElement("button");
        close_button.classList.add("progress-dialog-close-button");
        close_button.innerText = "Close";
        close_button.addEventListener( "click", () => this.close() );
        
        this.progress_bar_div = document.createElement("div");
        this.progress_bar_div.classList.add("progress-dialog-bar-container")

        let value = document.createElement("p");
        value.classList.add("progress-dialog-bar-value");

        let bar = document.createElement("div");
        bar.classList.add("progress-dialog-bar-cursor");

        this.progress_bar_div.append(value);
        this.progress_bar_div.append(bar);

        let infos = document.createElement("div");
        infos.classList.add("progress-dialog-infos");


        content.append(text_el);
        content.append(this.progress_bar_div);
        content.append("Status:");
        content.append(infos);
        content.append(close_button);

        container.append(title_el);
        container.append(content);

        this.dialog.append(container);

        document.body.append(this.dialog);
    }

    showCloseButton(){
        (this.dialog.querySelector(".progress-dialog-close-button") as HTMLElement).style.display = "block";
    }

    setProgressValue(progress: number){
        (this.dialog.querySelector(".progress-dialog-bar-value") as HTMLElement).innerHTML = Math.round(progress) + "%";
        (this.dialog.querySelector(".progress-dialog-bar-cursor") as HTMLElement).style.width = progress + "%";
    }

    addInfo(line: string, type: ProgressMessageType = ProgressMessageType.INFO){
        (this.dialog.querySelector(".progress-dialog-infos") as HTMLElement).innerHTML += `<span class="${type}">${line}</span><br/>`;
    }

    open(){
        this.dialog.style.display = "block";

        this.setProgressValue(0);
        (this.dialog.querySelector(".progress-dialog-close-button") as HTMLElement).style.display = "none";
        (this.dialog.querySelector(".progress-dialog-infos") as HTMLElement).innerHTML = "";
    }

    close(){
        this.dialog.style.display = "none";
    }
};