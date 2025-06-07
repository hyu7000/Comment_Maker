const vscode = require('vscode');

/**************************************************/
/* Extern Function                                */
/**************************************************/

function initIntelliSense() {
    const provider = vscode.languages.registerCompletionItemProvider(
        'c', // 적용 언어
        {
            provideCompletionItems(document, position) {
                const line = document.lineAt(position.line).text;
                const prefix = line.substring(0, position.character);

                const trigger = /@(\w*)$/.exec(prefix);
                if (trigger) {
                    const items = [];
                    
                    // Config Type
                    {
                        items.push(getConfigTypeItem('Type'));
                        items.push(getConfigTypeItem('Layer'));
                        items.push(getConfigTypeItem('Name'));
                        items.push(getConfigTypeItem('Description'));
                        items.push(getConfigTypeItem('Value'));  
                        items.push(getConfigTypeItem('Sequence'));
                        items.push(getConfigTypeItem('Configuration', 'Configuration : \n * 1.'));
                        items.push(getConfigTypeItem('Image', 'Image : \n * 1.'));
                    }

                    return items;
                }

                return undefined;
            }
        },
        '@'  // 트리거 문자
    );

    return provider;
}

/**************************************************/
/* Private Function                               */
/**************************************************/

function getConfigTypeItem(typeName, insertText = "") {
    const item = new vscode.CompletionItem(typeName, vscode.CompletionItemKind.Keyword);

    if(insertText == "") {
        item.insertText = typeName + ' : ';
    } else {
        item.insertText = insertText;
    }
    item.filterText = typeName;
    item.detail = 'Config Type';

    return item;
}

/**************************************************/
/* module export                                  */
/**************************************************/

module.exports = { 
    initIntelliSense
};