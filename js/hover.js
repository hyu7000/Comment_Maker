const vscode = require('vscode');

const typeDescription = 
`**@Type List**
- public function
- private function
- public variable
- private variable
- public struct
- private struct
- public enum
- private enum
- public macro
- private macro
- header
- integration
- config variable
- config macro`

/**************************************************/
/* Extern Function                                */
/**************************************************/

function initHover() {
    const provider = vscode.languages.registerHoverProvider(
        'c',
        {
            provideHover(document, position, token) {
                const wordRange = document.getWordRangeAtPosition(position);
                const word = document.getText(wordRange);

                let hoverDescription = "";

                switch(word){
                    case 'Type':
                        hoverDescription = typeDescription;
                        break;
                }

                if (hoverDescription != "") {
                    return new vscode.Hover(hoverDescription);
                }

                return undefined;
            }
        }
    );

    return provider;
}

/**************************************************/
/* Private Function                               */
/**************************************************/


/**************************************************/
/* module export                                  */
/**************************************************/

module.exports = { 
    initHover
};