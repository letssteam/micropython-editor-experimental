class CustomLibCompletion {
    constructor(ace_editor, doc_file){
        this.ace_editor = ace_editor;
        this.doc = null;
        this.load_file(doc_file);
    }

    async load_file(filename){
        try{
            var myHeaders = new Headers();
            myHeaders.append('pragma', 'no-cache');
            myHeaders.append('cache-control', 'no-cache');

            let resp = await fetch( filename, { method: "GET", headers: myHeaders } );
            this.doc = await resp.json();

            ace_editor.completers.push(this);
            
            console.log("Completion file is loaded !");
        }
        catch(e){
            console.error(e);
            new AlertDialog("Custom Completion error", `An error occured during loading completion file: <br/><div class="citation-error">${e.message}</div><br/>The user experience can be degraded. Try to restart your browser.`, AlertDialogIcon.ERROR).open();
            this.doc = null;
        }
    }

    getCompletions(editor, session, pos, prefix, callback){
        if( this.doc == null ){ return; }

        var modulesList = Object.keys( this.doc );

        let line = session.getLine(pos.row);

        if( line[ line.length - 2 ] == "." ){
            let beginWord = this.lastIndexOfRegex(line.slice(0, -2), "[^a-zA-Z0-9_]");
            let previousWord = line.slice( beginWord + 1, -2);

            if( modulesList.includes(previousWord) ){
                
                let classes = Object.keys(this.doc[previousWord].classes)
                callback(null, classes.map( (word) => {
                    return {
                        caption: word,
                        value: word,
                        meta: "from " + previousWord
                    }
                } ));

                let variables = this.doc[previousWord].variables
                callback(null, variables.map( (word) => {
                    return {
                        caption: word,
                        value: word,
                        meta: "from " + previousWord
                    }
                } ));
            }
        }
        else{
            callback(null, modulesList.map( function(word){
                return {
                    caption: word,
                    value: word,
                    meta: "module"
                };
            }));
        }

    }

    lastIndexOfRegex(str, toFind){
        let regexp = new RegExp(toFind, "g");
        let index = -1;
        let m;

        while( (m = regexp.exec(str)) != null ){
            index = m.index;
        }
    
        return index;
    }
}
