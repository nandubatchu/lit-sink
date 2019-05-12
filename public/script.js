let cm = document.getElementById('code')
let componentView = document.getElementById('componentView')
let refreshEelementButton = document.getElementById('refreshElement')
let copyLinkButton = document.getElementById('copyLink')
let publishButton = document.getElementById('publish')
let newProjectButton = document.getElementById('newProject')
let newComponentButton = document.getElementById('newComponent')
let componentInitText = document.getElementById('componentInitText')
let projectVersion = document.getElementById('projectVersion')
let projectNameSelection = document.getElementById('projectName')
let componentNameSelection = document.getElementById('componentName')
let loginWithGithubButton = document.getElementById('loginWithGithub')
let cdnLink = document.getElementById('cdnLink')

let auth, db
let username = localStorage.getItem('username') ? localStorage.getItem('username') : 'anonymous'
const PLACEHOLDERS = {
    PROJECT_NAME: `${username}_components`,
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

let fetchProjectsData = async () => {
    let projects = {}
    return await db.collection("projects").where("owner", "==", auth.currentUser.uid).get()
        .then((querySnapshot) => {
            querySnapshot.forEach(function(doc) {
                // doc.data() is never undefined for query doc snapshots
                // console.log(doc.id, " => ", doc.data());
                projects[doc.id] = doc.data()
            })
            projectDataString = JSON.stringify(projects)
            if (localStorage.getItem("projectsData") == projectDataString) {
                console.log("No change in the projectsData!")
            } else {
                localStorage.setItem("projectsData", projectDataString)
                window.location.reload()
            }
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        });
    
}

let getProjectList = () => {
    let projects = JSON.parse(localStorage.getItem("projectsData"))
    projectsSelectString = `
        ${Object.keys(projects).map(projectName => `
            <option id=${projectName} value=${projectName}>${projectName}</option>
        `)}
    `
    projectNameSelection.innerHTML = projectsSelectString
    projectNameSelection.value = localStorage.getItem("projectName") ? localStorage.getItem("projectName") : PLACEHOLDERS.PROJECT_NAME
}

let getVersionList = () => {
    let projects = JSON.parse(localStorage.getItem('projectsData'))
    let project = localStorage.getItem("projectName")
    projectVersion.innerHTML = `
        ${projects[project]['versions'].reverse().map(versionString => `
            <option value="${versionString}">${versionString}</option>
        `.split(',').join('')).join('')}
    `
}

let getComponentList = () => {
    let project = localStorage.getItem("projectName")
    let componentList = JSON.parse(localStorage.getItem('projectsData'))[project]['components']
    let componentSelectString = `
        ${componentList.map(componentFile => {
            let component = componentFile.slice(0, -3)
            return `<option class="componentOption" value=${component}>${component}</option>`}
        )}
    `
    componentNameSelection.innerHTML = componentSelectString
    componentNameSelection.value = localStorage.getItem('componentName') ? localStorage.getItem("componentName") : PLACEHOLDERS.COMPONENT_NAME
}

let constructCDNLink = () => {
    let projectsData = JSON.parse(localStorage.getItem("projectsData"))
    let project = localStorage.getItem("projectName")
    let component = localStorage.getItem("componentName")

    let projectVersions = projectsData[project]['versions']
    let version = projectVersions.reverse()[0]
    cdn_url = `https://cdn.jsdelivr.net/gh/lit-sink/${project}@${version}/${component}.js`
    return cdn_url
}


// Initialising the placeholders
old_session_code = localStorage.getItem("code") ? localStorage.getItem("code") : PLACEHOLDERS.CODE
componentInitText.value = localStorage.getItem('componentInitText') ? localStorage.getItem("componentInitText") : PLACEHOLDERS.COMPONENT_INIT_TEXT
getProjectList()
getVersionList()
getComponentList()


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
    localStorage.setItem("componentName", componentNameSelection.value);
    if (componentNameSelection.value == "") {return "Component data not saved!"}
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

let createProjectDocument = (projectName) => {
    db.collection("projects").doc(projectName).set({
        owner: auth.currentUser.uid,
        components: [],
        versions: ["0.0.0"],
        gh_path: `https://github.com/lit-sink/${projectName}`
    })
    .then(function() {
        console.log(`Document written with ID: ${projectName}`);
        fetchProjectsData()
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
                cdnLink.innerHTML = res.cdn_url
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

let hitGetFileContent = async () => {
    let projectName = projectNameSelection.value
    let component = componentNameSelection.value
    let filename = component + ".js"

    console.log("getFileContent")
    if (!isLoggedIn) {
        return alert("Please login")
    }

    payload = {
        "token": localStorage.getItem('access_token'),
        "filename": filename,
        "projectName": projectName,
        "version": projectVersion.value
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

let handleProjectSelection = (a) => {
    localStorage.setItem("projectName", a.target.value)
    getVersionList()
    getComponentList()
    if (componentNameSelection.value != "") {
        cdnLink.innerHTML = constructCDNLink()
    }
}

let handleComponentSelection = (a) => {
    localStorage.setItem("componentName", a.target.value)
    hitGetFileContent()
    cdnLink.innerHTML = constructCDNLink()
}

const copyToClipboard = str => {
    // https://hackernoon.com/copying-text-to-clipboard-with-javascript-df4d4988697f
    const el = document.createElement('textarea');
    el.value = str;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

let handleCopyLink = () => {
    if (componentNameSelection.value != "") {
        copyToClipboard(constructCDNLink())
    } else {
        alert("Component name is not defined!")
    }
}

let handleNewComponentButtonClick = () => {
    let newComponentName = prompt("Enter component name:")
    localStorage.setItem("componentName", newComponentName)
    componentNameSelection.innerHTML += `<option class="componentOption" value=${newComponentName}>${newComponentName}</option>`
    componentNameSelection.value = newComponentName
    myCodeMirror.setValue(PLACEHOLDERS.CODE)
}

projectNameSelection.onchange = handleProjectSelection
componentNameSelection.onchange = handleComponentSelection
publishButton.onclick = hitSaveFileToCDN
newProjectButton.onclick = hitCreateProject
newComponentButton.onclick = handleNewComponentButtonClick
copyLinkButton.onclick = handleCopyLink


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

                fetchProjectsData()
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

