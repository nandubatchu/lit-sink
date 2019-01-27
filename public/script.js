let cm = document.getElementById('code')
let componentView = document.getElementById('componentView')
let refreshEelementButton = document.getElementById('refreshElement')
let saveToCDN = document.getElementById('saveToCDN')
let componentInitText = document.getElementById('componentInitText')
let componentType = document.getElementById('componentType')
let componentName = document.getElementById('componentName')
let loginWithGithubButton = document.getElementById('loginWithGithub')
let cdnLink = document.getElementById('cdnLink')

let username = localStorage.getItem('username') ? localStorage.getItem('username') : 'anonymous'
const PLACEHOLDERS = {
    COMPONENT_NAME: 'pink-button',
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
componentName.value = localStorage.getItem('componentName') ? localStorage.getItem("componentName") : PLACEHOLDERS.COMPONENT_NAME

var myCodeMirror = CodeMirror(document.getElementById("code"), {
    size: 100,
    mode: "javascript",
    lineWrapping: false,
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    smartIndent: true,
    value:old_session_code ? old_session_code : ''
});
myCodeMirror.setSize('100%', '100%');

window.onbeforeunload = function() {
    localStorage.setItem("code", myCodeMirror.getValue());
    localStorage.setItem("componentInitText", componentInitText.value);
    localStorage.setItem("componentName", componentName.value);
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
    console.log(`${username}/${componentType.value}/${componentName.value}.js`)
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
            cdnLink.innerHTML = res.cdn_url
            cdnLink.hidden = false
            alert(`Your file is uploaded to CDN, add the following in <head> tag:\n\n<script src='${res.cdn_url}' type='module'></script>`)
        })
}

saveToCDN.addEventListener('click', hitFirebaseFunction)

// Authentication Flow
let loginWithGithub = () => {
    const provider = new firebase.auth.GithubAuthProvider();
    provider.addScope('read:user');
    console.log(provider)

    firebase.auth().signInWithPopup(provider).then(function(result) {
        // This gives you a GitHub Access Token. You can use it to access the GitHub API.
        var token = result.credential.accessToken;
        // The signed-in user info.
        var user = result.user;
        console.log("User Info:", user)
        console.log("Additional User Info:", result.additionalUserInfo)
        localStorage.setItem('username', result.additionalUserInfo.username)
        console.log("OAuth response", result)
        // ...
    }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        // ...
    });
}
document.addEventListener('DOMContentLoaded', function() {
    // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
    // // The Firebase SDK is initialized and available here!
    //
    // firebase.auth().onAuthStateChanged(user => { });
    // firebase.database().ref('/path/to/ref').on('value', snapshot => { });
    // firebase.messaging().requestPermission().then(() => { });
    // firebase.storage().ref('/path/to/ref').getDownloadURL().then(() => { });
    //
    // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

    try {
      let app = firebase.app();
      let features = ['auth', 'database', 'messaging', 'storage'].filter(feature => typeof app[feature] === 'function');
      firebase.auth().onAuthStateChanged(user => {
          if (user) {
            console.log("User logged in:", `${user.email} (${user.displayName})` )
            loginWithGithubButton.hidden = true
            username = localStorage.getItem('username')
          } else {
            console.log("User not logged in")
            loginWithGithubButton.addEventListener('click', loginWithGithub)
            loginWithGithubButton.hidden = false
            localStorage.removeItem('username')
            username = 'anonymous'
          }
      })
      
    } catch (e) {
      console.error(e);
    }
  });

