class CustomLibCompletion {
    constructor(ace_editor, doc_file){
        this.ace_editor = ace_editor;
        this.doc = null;
        this.load_file(doc_file);
        ace_editor.completers.push(this);
    }

    async load_file(filename){
        try{
            var myHeaders = new Headers();
            myHeaders.append('pragma', 'no-cache');
            myHeaders.append('cache-control', 'no-cache');

            let resp = await fetch( filename, { method: "GET", headers: myHeaders } );
            this.doc = await resp.json();
            
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
        var varsAffectations = this.getVarsAffectations(editor.getValue())

        let line = session.getLine(pos.row);

        if( line.slice(-2).includes(".") ){
            let point_pos = line.lastIndexOf(".");
            let beginWord = this.lastIndexOfRegex(line.slice(0, point_pos), "[^a-zA-Z0-9_]");
            let previousWord = line.slice( beginWord + 1, point_pos);

            if( modulesList.includes(previousWord) ){
                
                let classes = Object.keys(this.doc[previousWord].classes)
                callback(null, classes.map( (word) => {
                    return {
                        caption: word,
                        value: word,
                        meta: "from " + previousWord,
                        score: 20,
                        icon: "package"
                    }
                } ));

                let variables = this.doc[previousWord].variables
                callback(null, variables.map( (word) => {
                    return {
                        caption: word,
                        value: word,
                        meta: "from " + previousWord,
                        score: 20,
                        icon: "property"
                    }
                } ));
            }
            else if( Object.keys(varsAffectations).includes(previousWord) ){
                let var_module = varsAffectations[previousWord][0];
                let var_class = varsAffectations[previousWord][1];

                if( modulesList.includes( var_module ) ){
                    
                    let classes = Object.keys(this.doc[var_module].classes)
                    if( classes.includes(var_class) ){

                        callback(null, this.doc[var_module].classes[var_class].map( (word_fct) => {
                            return {
                                caption: `${word_fct.name}(${this.format_function_parameters(word_fct.args, word_fct.defaults)})`,
                                value: word_fct.name,
                                meta: `${var_class}`,
                                score: 100,
                                icon: "method"
                            }
                        } ));
                    }
                }
            }
        }
        else{
            callback(null, modulesList.map( function(word){
                return {
                    caption: word,
                    value: word,
                    meta: "module",
                    icon: "package"
                };
            }));
        }

    }

    getVarsAffectations(content){
        let result = {};

        for( let match of content.matchAll( /^[\t ]*(?<var>\w+)[\t ]*=[\t ]*(?<content>\w[\w\.]*)[\w.\(\)]*$/gm ) ){
            //console.log(`VAR(${match.groups.var}) ==> CONTENT(${match.groups.content}))`);
            result[match.groups.var] = match.groups.content.split(".");
        }

        return result;
    }

    format_function_parameters(args, defaults){
        let final = args.slice()

        defaults.forEach( (value, index) => {
            final[ final.length - index ] += `=${value}`; 
        });

        return final.join(", ");
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
