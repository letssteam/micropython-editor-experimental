class CustomBaseCompletion {
    constructor(ace_editor){
        this.ace_editor = ace_editor;

        ace_editor.completers.push(this);
    }

    getCompletions(editor, session, pos, prefix, callback){
        
        let content = this.get_content( session, pos);

        let localWords = this.extract_words( content );
        localWords = localWords.filter( (value) => !session.$mode.$highlightRules.$keywordList.includes(value));

        callback(null, localWords.map( function(word){
            return {
                caption: word,
                value: word,
                meta: "local"
            };
        }));
    }

    get_content(session, pos){

        if( pos.row == 0 ){ return ""; }

        return session.getLines(0, pos.row - 1)
                      .concat( session.getLines(pos.row + 1, session.getLength()) )
                      .join("\n");
    }

    extract_words(content){

        return content.replace(/[a-zA-Z0-9_]+\.[\.a-zA-Z0-9_]+/gm, "")  // Remove 'dot' linked element (object.member)
                      .replace(/#[\S ]*\n/g, "")                        // Remve comments
                      .replace(/\n[ ]*\n/g, "\n")                       // Remove empty line
                      .replace(/\([\S \t]*\)[\s]*:/gm, "")              // Remove parenthesis (and content) on class/function declaration (keep only the name)
                      .replace(/[\S]*\([\S \t]*\)/gm, "")               // Remove function call
                      .replace(/(?<=[<!=> ]+)\d+/gm, "")                // Remove numeric literals
                      .replace(/[\r\t:=><!\+\-*\/\%;]*/gm, "")          // Remove special chars
                      .replace(/\n/g, " ")                              // Replace newline whit space (for further processing)
                      .replace(/[ ]{2,}/gm, " ")                        // Remove extra space
                      .trim()                                           // Trim the result
                      .split(" ");                                      // Split the result

    }
}
