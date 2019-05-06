let cm = document.getElementById('code')
let componentView = document.getElementById('componentView')
let refreshEelementButton = document.getElementById('refreshElement')
let publishButton = document.getElementById('publish')
let createProject = document.getElementById('createProject')
let projectList = document.getElementById('projectList')
let componentInitText = document.getElementById('componentInitText')
let projectVersion = document.getElementById('projectVersion')
let componentName = document.getElementById('componentName')
let loginWithGithubButton = document.getElementById('loginWithGithub')
let cdnLink = document.getElementById('cdnLink')

let auth, db
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
projectVersion.innerHTML = `${JSON.parse(localStorage.getItem('projectsData'))[localStorage.getItem('projectName')]['versions'].reverse().map(versionString => `<option value="${versionString}">${versionString}</option>`.split(',').join('')).join('')}`

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
myCodeMirror.setSize('100%', '85vh');

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

let isLoggedIn = () => {
    if (username == 'anonymous') {
        return False
    } else {
        return True
    }
}

let getProjectList = async () => {
    let projects = {}
    return await db.collection("projects").where("owner", "==", auth.currentUser.uid).get()
        .then((querySnapshot) => {
            querySnapshot.forEach(function(doc) {
                // doc.data() is never undefined for query doc snapshots
                console.log(doc.id, " => ", doc.data());
                projects[doc.id] = doc.data()
            })
            localStorage.setItem("projectsData", JSON.stringify(projects))
            htmlString = `
                ${Object.keys(projects).map(projectName => `
                    <div class="projectName" id="project-${projectName}">
                        <span>${projectName}</span>
                        ${projects[projectName]['components'].map(component => `<li class="componentName" id="component-${component}"><a href="#">${component}</a></li>`)}
                    </div>
                `.split(',').join('')).join('')}
            `
            console.log(htmlString)
            projectList.innerHTML = htmlString
            document.querySelectorAll('.projectName').forEach(p => p.addEventListener('click', a => {
                console.log(a.target.id)
                console.log(projects[a.target.id.split('project-')[1]])
                projectVersion.innerHTML = `
                    ${projects[a.target.id.split('project-')[1]]['versions'].reverse().map(versionString => `<option value="${versionString}">${versionString}</option>`.split(',').join('')).join('')}
                `
                localStorage.setItem('projectName', a.target.firstElementChild.innerText)
            }))
            document.querySelectorAll('.componentName').forEach(p => p.addEventListener('click', a => {
                console.log(a.target.innerText)
                hitGetFileContent(a.target.innerText)
            }))
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        });
    
}

let createProjectDocument = (projectName) => {
    db.collection("projects").doc(projectName).set({
        owner: auth.currentUser.uid,
        components: [],
        versions: ["0.0.0"],
        gh_path: `https://github.com/lit-sink/${projectName}`
    })
    .then(function() {
        console.log(`Document written with ID: ${projectName}`);
    })
    .catch(function(error) {
        console.error("Error adding document: ", error);
    });
}

let bump_version = (lastVersion) => {
    vInfo = lastVersion.split(".")
    vInfo[2] = (parseInt(vInfo[2]) + 1).toString()
    return vInfo.join(".")
}

let hitSaveFileToCDN = async () => {
    if (!isLoggedIn) {
        return alert("Please login")
    }

    projectName = localStorage.getItem('projectName')
    lastVersion = JSON.parse(localStorage.getItem('projectsData'))[projectName]['versions'].reverse()[0]
    payload = {
        "token": localStorage.getItem('access_token'),
        "content": myCodeMirror.getValue(),
        "message": prompt('Tell something about this version update:'),
        "projectName": projectName,
        "filename": `${componentName.value}.js`,
        "version": prompt("Any specific version release?", bump_version(lastVersion))
    }
    idToken = await firebase.auth().currentUser.getIdToken()
    return fetch("/saveFileToCDN", {
        method: "POST",
        // mode: "cors",
        headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(res => {
            console.log(res.cdn_url)
            if (res.result == 'File already exists. Need to bump the version!') {
                alert(`Your have a component of previous version registered already. Try bumping the version!`)
            } else {
                cdnLink.innerHTML = `<a href=${res.cdn_url}>${res.cdn_url}</a>`
                cdnLink.hidden = false
                alert(`Your file is uploaded to CDN, add the following in <head> tag:\n\n<script src='${res.cdn_url}' type='module'></script>`)
                window.location.reload()
            }
        })
}

let hitCreateProject = async () => {
    let projectName = prompt("Enter project name:")
    console.log("createProject")
    if (!isLoggedIn) {
        return alert("Please login")
    }

    payload = {
        "token": localStorage.getItem('access_token'),
        "projectName": projectName
    }

    idToken = await firebase.auth().currentUser.getIdToken()
    return fetch("/createProject", {
        method: "POST",
        // mode: "cors",
        headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(res => {
            console.log(res)
            if (res.result == "success") {
                createProjectDocument(projectName)
                localStorage.setItem('projectName', projectName)
                alert("Successfully created the project")
            } else {
                alert(res.result)
            }
        })
}

let hitGetFileContent = async (filename, projectVersion = null) => {
    let projectName = localStorage.getItem('projectName')
    console.log("getFileContent")
    if (!isLoggedIn) {
        return alert("Please login")
    }

    payload = {
        "token": localStorage.getItem('access_token'),
        "filename": filename,
        "projectName": projectName,
        "version": projectVersion ? projectVersion : undefined
    }
    idToken = await firebase.auth().currentUser.getIdToken()
    return fetch("/getFileContent", {
        method: "POST",
        // mode: "cors",
        headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(res => {
            console.log(res)
            if (res.result == "success") {
                myCodeMirror.setValue(atob(res.content))
            } else {
                alert(res.result)
            }
        })
}

publishButton.addEventListener('click', hitSaveFileToCDN)
createProject.addEventListener('click', hitCreateProject)


// Authentication Flow
let loginWithGithub = () => {
    const provider = new firebase.auth.GithubAuthProvider();
    provider.addScope('read:user');

    firebase.auth().signInWithPopup(provider).then(function(result) {
        // This gives you a GitHub Access Token. You can use it to access the GitHub API.
        var token = result.credential.accessToken;
        localStorage.setItem('access_token', token)
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
        auth = firebase.auth();
        db = firebase.firestore();
        
        let features = ['auth', 'database', 'messaging', 'storage'].filter(feature => typeof app[feature] === 'function');
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log("User logged in:", `${user.email} (${user.displayName})` )
                loginWithGithubButton.innerText = user.email
                loginWithGithubButton.removeEventListener('click', loginWithGithub)
                username = localStorage.getItem('username')

                getProjectList()
            } else {
                console.log("User not logged in")
                loginWithGithubButton.innerText = "Login with Github"
                loginWithGithubButton.addEventListener('click', loginWithGithub)
                localStorage.removeItem('username')
                localStorage.removeItem('access_token')
                username = 'anonymous'
            }
        })
  
    } catch (e) {
      console.error(e);
    }
  });

