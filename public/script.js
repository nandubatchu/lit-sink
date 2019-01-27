let cm = document.getElementById('code')
let componentView = document.getElementById('componentView')
let refreshEelementButton = document.getElementById('refreshElement')
let saveToCDN = document.getElementById('saveToCDN')
let componentInitText = document.getElementById('componentInitText')
let componentType = document.getElementById('componentType')
let componentName = document.getElementById('componentName')

const username = 'nandubatchu'
const PLACEHOLDERS = {
    COMPONENT_INIT_TEXT: `<pink-button>My Pink Button</pink-button>`,
    CODE: `import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

class PinkButtonElement extends LitElement {

    static get properties() {
        return {}
    }

    render() {
        return html\`
            <style>
                button {
                    background: pink;
                }
            </style>
            
            <button @click=\${() => {console.log("You clicked on the pink button!")}}>
                <slot></slot>
            </button>
        \`;
    }  
}

customElements.define('pink-button', PinkButtonElement);`
}

old_session_code = localStorage.getItem("code") ? localStorage.getItem("code") : PLACEHOLDERS.CODE
componentInitText.value = localStorage.getItem('componentInitText') ? localStorage.getItem("componentInitText") : PLACEHOLDERS.COMPONENT_INIT_TEXT

var myCodeMirror = CodeMirror(document.getElementById("code"), {
    size: 100,
    mode: "javascript",
    lineWrapping: false,
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    value:old_session_code ? old_session_code : ''
});
myCodeMirror.setSize('100%', '100%');

window.onbeforeunload = function() {
    localStorage.setItem("code", myCodeMirror.getValue());
    localStorage.setItem("componentInitText", componentInitText.value);
}

let refreshElement = () => {
    let userScript = document.getElementById('userScript')
    let dupScript = document.createElement('script')
    dupScript.setAttribute('type', 'module')
    dupScript.setAttribute('id', 'userScript')
    dupScript.textContent = myCodeMirror.getValue();
    console.log(dupScript)
    document.body.replaceChild(dupScript, userScript)
}
myCodeMirror.on('changes', () => {
    var regex = /customElements.define\('(.+)'/;
    var found = myCodeMirror.getValue().match(regex);
    if (found[1] != localStorage.getItem('lastElementKey')) {
        componentInitText.value = `<${found[1]}></${found[1]}>`
        localStorage.setItem('lastElementKey', found[1])
    }
})
window.onload = () => {
    refreshElement()
    componentView.innerHTML = componentInitText.value
}
refreshEelementButton.addEventListener('click', () => {
    // let newEelement = document.createElement(elemkey)
    // componentView.appendChild(newEelement)
    componentView.innerHTML = componentInitText.value
    window.location.reload()
})


let hitFirebaseFunction = () => {
    // console.log(`testing/${username}/${componentType.value}/${componentName.value}.js`)
    payload = {
        "content": myCodeMirror.getValue(),
        "message": prompt('Tell something about this version update:'),
        "path": `${username}/${componentType.value}/${componentName.value}.js`
    }
    return fetch("/saveFileToCDN", {
        method: "POST",
        // mode: "cors",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(res => {
            console.log(res.cdn_url)
            alert(`
            Your file is uploaded to CDN, add the following in <head> tag:
            
            <script src='${res.cdn_url}' type='module'></script>`)
        })
}

saveToCDN.addEventListener('click', hitFirebaseFunction)