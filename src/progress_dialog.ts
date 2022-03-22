export enum ProgressMessageType {
    INFO,
    WARNING,
    ERROR
};

export class ProgressDialog{

    private dialog: HTMLElement;
    private progress_bar_div: HTMLElement;

    constructor(title_text: string = "Uploading...", content_text: string = "Your program is uploading to your target, please wait.<br/><br/><i>Do not unplugged your board, do not close this tab nor change tab during uploading.</i>"){
        this.dialog = document.createElement("div");
        this.dialog.classList.add("progress-dialog");
        this.dialog.style.display = "none";

        let container = document.createElement("div");
        container.classList.add("progress-container")

        let title = document.createElement("div");
        title.classList.add("progress-content-title");
        title.innerText = title_text;

        let content = document.createElement("div");
        content.classList.add("progress-content");

        let text = document.createElement("p");
        text.innerHTML = content_text;

        let close_button = document.createElement("button");
        close_button.classList.add("progress-bar-close-button");
        close_button.innerText = "Close";
        close_button.addEventListener( "click", () => this.close() );
        
        this.progress_bar_div = document.createElement("div");
        this.progress_bar_div.classList.add("progress-bar-container")

        let value = document.createElement("p");
        value.classList.add("progress-bar-value");

        let bar = document.createElement("div");
        bar.classList.add("progress-bar-cursor");

        this.progress_bar_div.append(value);
        this.progress_bar_div.append(bar);

        let infos = document.createElement("div");
        infos.classList.add("progress-bar-infos");


        content.append(text);
        content.append(this.progress_bar_div);
        content.append("Status:");
        content.append(infos);
        content.append(close_button);

        container.append(title);
        container.append(content);

        this.dialog.append(container);

        document.body.append(this.dialog);
    }

    showCloseButton(){
        (this.dialog.querySelector(".progress-bar-close-button") as HTMLElement).style.display = "block";
    }

    setProgressValue(progress: number){
        (this.dialog.querySelector(".progress-bar-value") as HTMLElement).innerHTML = Math.round(progress) + "%";
        (this.dialog.querySelector(".progress-bar-cursor") as HTMLElement).style.width = progress + "%";
    }

    addInfo(line: string, type: ProgressMessageType = ProgressMessageType.INFO){

        switch(type){
            case ProgressMessageType.ERROR:
                (this.dialog.querySelector(".progress-bar-infos") as HTMLElement).innerHTML += `<span class="error">${line}</span><br/>`;
                (this.dialog.querySelector(".progress-bar-infos") as HTMLElement).innerHTML += `<span class="error">Try unplugging and replugging your board...</span><br/>`;
                break;

            case ProgressMessageType.WARNING:
                (this.dialog.querySelector(".progress-bar-infos") as HTMLElement).innerHTML += `<span class="warning">${line}</span><br/>`;
                break;

            default:
            case ProgressMessageType.INFO:
                (this.dialog.querySelector(".progress-bar-infos") as HTMLElement).innerHTML += `<span class="info">${line}</span><br/>`;
                break;
        }
    }

    open(){
        this.dialog.style.display = "block";

        this.setProgressValue(0);
        (this.dialog.querySelector(".progress-bar-close-button") as HTMLElement).style.display = "none";
        (this.dialog.querySelector(".progress-bar-infos") as HTMLElement).innerHTML = "";
    }

    close(){
        this.dialog.style.display = "none";
    }
};