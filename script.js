class Simulator {
    constructor() {
        this.variables = {}; 
        this.updateInterval = null; 
        this.instance = null; 
    }

    run() {
        
        document.getElementById("consoleOutput").innerHTML = "";
    
        const editorText = document.getElementById("editor").value;
        const transformedCode = this.transformCSharpToJS(editorText);
    
        try {
            console.log("変換後のコード:\n" + transformedCode); 
            const outputFunction = new Function('"use strict";\n' + transformedCode);
            outputFunction(); 
    
            
            this.instance = window.instance; 
    
            
            if (this.updateInterval) {
                clearInterval(this.updateInterval); 
            }
    
            this.updateInterval = setInterval(() => {
                if (this.instance && typeof this.instance.Update === 'function') {
                    this.instance.Update(); 
                }
            }, 333); 
    
        } catch (e) {
            console.error(e);
            this.logError(e.message);
        }
    }
    

    
    transformCSharpToJS(csharpCode) {
        let classNameMatch = csharpCode.match(/\b(public|private|protected)?\s*class\s+(\w+)/);
        let className = classNameMatch ? classNameMatch[2] : "UnknownClass";

        let constructorInit = "";
        let variableNames = [];
        let instanceVariables = [];

        let transformedCode = csharpCode
            .replace(/using\s+[\w.]+;?/g, "") 
            .replace(/\b(public|private|protected)?\s*class\s+(\w+)\s*{/, 
                "class $2 {\n    logToConsole(message) {\n        const consoleOutput = document.getElementById('consoleOutput');\n        consoleOutput.innerHTML += message + '<br>';\n        consoleOutput.scrollTop = consoleOutput.scrollHeight;\n    }\n    constructor() {") 
            .replace(/\b(public|private|protected)?\s*(string|int|float|double|bool)\s+(\w+)\s*=\s*([^;]+);/g, (match, accessModifier, type, varName, initialValue) => {
                variableNames.push(varName); 
                instanceVariables.push(varName); 
                constructorInit += `this.${varName} = ${initialValue}; `; 
                return ""; 
            }) 
            .replace(/\b(public|private|protected)?\s*(string|int|float|double|bool)\s+(\w+);/g, (match, accessModifier, type, varName) => {
                
                variableNames.push(varName); 
                instanceVariables.push(varName); 
                constructorInit += `this.${varName} = null; `; 
                return ""; 
            }) 
            .replace(/\b(public|private|protected)?\s*\w+\s+(\w+)\(\)\s*{/g, "$2() {") 
            
            transformedCode = transformedCode.replace(/Debug\.Log\(([^)]+)\);/g, (match, expr) => {
                return "this.logToConsole(" + expr.replace(/(["'])(.*?)\1/g, (match, quote, literal) => {
                    
                    return `${quote}${literal}${quote}`;
                }).replace(/\b([a-zA-Z_]\w*)\b/g, (match, varName) => {
                    
                    if (instanceVariables.includes(varName) && !match.includes('"') && !match.includes("'")) {
                        return `this.${varName}`;
                    }
                    return varName;
                }) + ");";
            });



        
        transformedCode = transformedCode.replace("constructor() {", `constructor() { ${constructorInit} }\n`);

        
        variableNames.forEach(varName => {
            let regex = new RegExp(`(?<!this\\.)\\b${varName}\\b(?!\\s*\\()`, "g"); 
            transformedCode = transformedCode.replace(regex, `this.${varName}`);
        });

        
        transformedCode += `\nwindow.instance = new ${className}();\nif (window.instance.Start) window.instance.Start();\nif (window.instance.Update) window.instance.Update();`;

        return transformedCode;
    }

    logError(message) {
        const consoleOutput = document.getElementById("consoleOutput");
        consoleOutput.innerHTML += `<span style="color: red;">エラー: ${message}</span><br>`;
    }
}


const simulator = new Simulator();


document.getElementById("runButton").addEventListener("click", () => {
    simulator.run();
});


document.getElementById("stopButton").addEventListener("click", () => {
    if (simulator.updateInterval) {
        clearInterval(simulator.updateInterval); 
        simulator.updateInterval = null; 
        console.log("プログラムを停止しました");
        document.getElementById("consoleOutput").innerHTML += "<span style='color: red;'>プログラムを停止しました</span><br>";
    }
});



document.getElementById("clearEditorButton").addEventListener("click", () => {
    document.getElementById("editor").value = 
`using System;

public class sampleclass 
{

    void Start()
    {
        
    }

    void Update()
    {
        
    }
}`;
});


document.getElementById("clearConsoleButton").addEventListener("click", () => {
    document.getElementById("consoleOutput").innerHTML = "";
});




document.getElementById('editor').addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
        e.preventDefault(); 
        const start = this.selectionStart;
        const end = this.selectionEnd;

        
        this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);

        
        this.selectionStart = this.selectionEnd = start + 4;
    }
});

