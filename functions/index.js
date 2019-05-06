const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()
const fs = require('fs')
const App = require('@octokit/app')
const request = require('@octokit/request')
const fetch = require("node-fetch")
const cors = require('cors')({origin: true})
const cert = functions.config().testservice != undefined ? functions.config().testservice.key : fs.readFileSync(__dirname+'/../github_app.pem')

let owner = 'nandubatchu'
let org = 'lit-sink'
const APP_ID = 24297


let call_org_installation_data = (app, jwt) => {
    return request('GET /orgs/:org/installation', {
        org: org,
        headers: {
            authorization: `Bearer ${jwt}`,
            accept: 'application/vnd.github.machine-man-preview+json'
        }
    }).then(res => res.data)
}

let call_get_contents = (installationAccessToken, projectName, filename, version) => {
    return request('GET /repos/:owner/:repo/contents/:path', {
        owner: org,
        repo: projectName,
        path: filename,
        ...(version && {ref: version}),
        headers: {
            authorization: `token ${installationAccessToken}`,
            accept: 'application/vnd.github.machine-man-preview+json'
        }
    }).then(res => res.data)
}

let saveFileToRepo = (contentString, commitMessage, projectName, filename, version, userData) => {
    let repo = projectName
    let path = filename
    let branch = 'master'
    let committer = author = userData

    // Initialising the File content
    let content = contentString
    let message = commitMessage

    let fetch_last_version = () => {
        return admin.firestore().collection('projects').doc(projectName).get()
            .then(doc => {
                if (doc.exists) {
                    console.log("Document data: ", doc.data())
                    return doc.data().versions
                } else {
                    console.log("No such document")
                }
            })
            .catch(err => console.log(err))
    }
    
    const app = new App({ id: APP_ID, privateKey: cert })
    const jwt = app.getSignedJsonWebToken()

    let call_installation_data = () => {
        return request('GET /repos/:owner/:repo/installation', {
            owner: org,
            repo: repo,
            headers: {
                authorization: `Bearer ${jwt}`,
                accept: 'application/vnd.github.machine-man-preview+json'
            }
        }).then(res => res.data)
    }

    let call_save_blob_data = (installationAccessToken) => {
        return request('POST /repos/:owner/:repo/git/blobs', {
            owner: org,
            repo: repo,
            content: content,
            headers: {
                authorization: `token ${installationAccessToken}`,
                accept: 'application/vnd.github.machine-man-preview+json'
            }
        }).then(res => res.data)
    }

    let call_get_blob_data = (installationAccessToken, save_blob_data) => {
        return request('GET /repos/:owner/:repo/git/blobs/:file_sha', {
            owner: org,
            repo: repo,
            file_sha: save_blob_data.sha,
            headers: {
                authorization: `token ${installationAccessToken}`,
                accept: 'application/vnd.github.machine-man-preview+json'
            }
        }).then(res => res.data)
    }

    let call_create_file_data = (installationAccessToken, get_blob_data) => {
        return request('PUT /repos/:owner/:repo/contents/:path', {
            owner: org, 
            repo: repo, 
            path: path, 
            message: message, 
            content: get_blob_data.content, 
            branch: branch, 
            committer: committer, 
            author: author,
            headers: {
                authorization: `token ${installationAccessToken}`,
                accept: 'application/vnd.github.machine-man-preview+json'
            }
        }).then(res => res.data)
    }

    let call_update_file_data = (installationAccessToken, get_blob_data, get_contents_data) => {
        return request('PUT /repos/:owner/:repo/contents/:path', {
            owner: org, 
            repo: repo, 
            path: path, 
            message: message, 
            content: get_blob_data.content,
            sha: get_contents_data.sha,
            branch: branch, 
            committer: committer, 
            author: author,
            headers: {
                authorization: `token ${installationAccessToken}`,
                accept: 'application/vnd.github.machine-man-preview+json'
            }
        }).then(res => res.data)
    }

    let call_create_reference = (installationAccessToken, file_data, versionString) => {
        return request('POST /repos/:owner/:repo/git/refs', {
            owner: org,
            repo: repo,
            ref: `refs/tags/${versionString}`,
            sha: file_data.commit.sha,
            headers: {
                authorization: `token ${installationAccessToken}`,
                accept: 'application/vnd.github.machine-man-preview+json'
            }
        }).then(res => res.data)
    }

    let bump_version = (lastVersion) => {
        vInfo = lastVersion.split(".")
        vInfo[2] = (parseInt(vInfo[2]) + 1).toString()
        return vInfo.join(".")
    }

    let isVersionValid = (lastVersion, newVersion) => {
        lvInfo = lastVersion.split(".")
        nvInfo = newVersion.split(".")
        console.log(lvInfo, nvInfo)
        for (let i=0; i < nvInfo.length; i++) {
            if (nvInfo[i] >= lvInfo[i]) {
                if (i == 2) { return false }
                continue
            }
            return false
        }
        return true
    }

    return fetch_last_version()
        .then(versions_data => {
            console.log("versions_data", versions_data)
            let lastVersion = versions_data.slice(-1)[0]
            let newVersion
            if (version) {
                newVersion = isVersionValid(lastVersion, version) ? version : bump_version(lastVersion)
            } else {
                newVersion = bump_version(lastVersion)
            }
            console.log("New version: ", newVersion)
            return call_installation_data()
                .then(installation_data => {
                    console.log("installation_data", installation_data)
                    const installationId = installation_data.id
                    console.log("installationId:", installationId)
                    return app.getInstallationAccessToken({ installationId })
                        .then(installationAccessToken => {
                            return call_save_blob_data(installationAccessToken)
                                .then(save_blob_data => {
                                    console.log("save_blob_data", save_blob_data)
                                    return call_get_blob_data(installationAccessToken, save_blob_data)
                                        .then(get_blob_data => {
                                            console.log("get_blob_data", get_blob_data)
                                            return call_create_file_data(installationAccessToken, get_blob_data)
                                                .then(create_file_data => {
                                                    console.log("create_file_data", create_file_data)
                                                    return call_create_reference(installationAccessToken, create_file_data, newVersion)
                                                        .then(create_reference_data => {
                                                            console.log("create_reference_data", create_reference_data)
                                                            // update the project with the new component
                                                            return admin.firestore().collection('projects').doc(projectName).update({
                                                                components: admin.firestore.FieldValue.arrayUnion(filename),
                                                                versions: admin.firestore.FieldValue.arrayUnion(newVersion)
                                                            })
                                                                .then(() => {
                                                                    create_file_data['newVersion'] = newVersion
                                                                    return create_file_data
                                                                })
                                                                .catch(err => console.log(err))
                                                        })
                                                        .catch(err => console.log(err))
                                                })
                                                .catch(err => {
                                                    console.log(err)
                                                    if (err.message.includes(`"sha" wasn't supplied.`)) {
                                                        // Fetch the file sha
                                                        return call_get_contents(installationAccessToken, projectName, filename)
                                                            .then(get_contents_data => {
                                                                console.log("get_contents_data", get_contents_data)
                                                                return call_update_file_data(installationAccessToken, get_blob_data, get_contents_data)
                                                                    .then(update_file_data => {
                                                                        console.log("update_file_data", update_file_data)
                                                                        return call_create_reference(installationAccessToken, update_file_data, newVersion)
                                                                            .then(create_reference_data => {
                                                                                console.log("create_reference_data", create_reference_data)
                                                                                // update the project with the new component
                                                                                return admin.firestore().collection('projects').doc(projectName).update({
                                                                                    versions: admin.firestore.FieldValue.arrayUnion(newVersion)
                                                                                })
                                                                                    .then(() => {
                                                                                        update_file_data['newVersion'] = newVersion
                                                                                        return update_file_data
                                                                                    })
                                                                                    .catch(err => console.log(err))
                                                                            })
                                                                            .catch(err => console.log(err))
                                                                    })
                                                                    .catch(err => console.log(err))
                                                            })
                                                    }
                                                    return undefined
                                                })
                                        })
                                })
                        })
                })
        })
    
}

let createProject = (projectName) => {
    const app = new App({ id: APP_ID, privateKey: cert })
    const jwt = app.getSignedJsonWebToken()

    let call_create_repo = (installationAccessToken) => {
        return request('POST /orgs/:org/repos', {
            org: org,
            name: projectName,
            auto_init: true,
            headers: {
                authorization: `token ${installationAccessToken}`,
                accept: 'application/vnd.github.machine-man-preview+json'
            }
        }).then(res => res.data)
    }

    return call_org_installation_data(app, jwt)
        .then(installation_data => {
            console.log("installation_data", installation_data)
            const installationId = installation_data.id
            console.log("installationId:", installationId)
            return app.getInstallationAccessToken({ installationId })
                .then(installationAccessToken => {
                    return call_create_repo(installationAccessToken)
                        .then(create_repo_data => {
                            console.log("create_repo_data", create_repo_data)
                            return create_repo_data
                        })
                        .catch(err => console.log(err))
                })
        })
}

let getFileContent = (filename, projectName, version) => {
    const app = new App({ id: APP_ID, privateKey: cert })
    const jwt = app.getSignedJsonWebToken()

    return call_org_installation_data(app, jwt)
        .then(installation_data => {
            console.log("installation_data", installation_data)
            const installationId = installation_data.id
            console.log("installationId:", installationId)
            return app.getInstallationAccessToken({ installationId })
                .then(installationAccessToken => {
                    return call_get_contents(installationAccessToken, projectName, filename, version)
                        .then(get_contents_data => {
                            console.log("get_contents_data", get_contents_data)
                            return get_contents_data
                        })
                        .catch(err => console.log(err))
                })
        })
}

let validateFirebaseIdToken = (request, response, next) => {
    let idToken = request.headers.authorization.split('Bearer ')[1];
    return admin.auth().verifyIdToken(idToken).then((decodedIdToken) => {
        console.log('ID Token correctly decoded', decodedIdToken);
        request.user = decodedIdToken;
        return fetch(`https://api.github.com/user?access_token=${request.body.token}`)
            .then(res => res.json())
            .then(res => {
                if (res.id.toString() === decodedIdToken.firebase.identities['github.com'][0]) {
                    console.log("User Authenticated successfully")
                    return next(res)
                }
                else {
                    console.log("Invalid authentication")
                    response.status(403).send('Unauthorized');
                }
            })
      }).catch((error) => {
        console.error('Error while verifying Firebase ID token:', error);
        response.status(403).send('Unauthorized');
      });
}

// Actual HTTP endpoints
exports.saveFileToCDN = functions.https.onRequest((request, response) => {
    return cors(request, response, () => {
        return validateFirebaseIdToken(request, response, (user) => {
            let userData = {
                name: user.name,
                email: user.email,
                username: user.login,
            }
            let contentString = request.body.content
            let commitMessage = request.body.message
            let projectName = request.body.projectName
            let filename = request.body.filename
            let version = request.body.version

            // Need authentication layer here { user <=> projects }
                        
            return saveFileToRepo(contentString, commitMessage, projectName, filename, version, userData)
                .then(saveResponse => {
                    return response.json({
                        "result": saveResponse != undefined ? "success" : "File already exists. Need to bump the version!",
                        "html_url": saveResponse != undefined ? saveResponse.content.html_url : undefined,
                        "cdn_url": saveResponse != undefined ? `https://cdn.jsdelivr.net/gh/${org}/${projectName}@${saveResponse.newVersion}/${saveResponse.content.html_url.split('master/')[1]}` : undefined
                    })
                })
        })
    })
})

exports.createProject = functions.https.onRequest((request, response) => {
    return cors(request, response, () => {
        return validateFirebaseIdToken(request, response, user => {
            let userData = {
                name: user.name,
                email: user.email,
                username: user.login,
            }

            let projectName = request.body.projectName

            // Need to add logic for { user <=> project } access mapping from firestore

            return createProject(projectName)
                .then(createResponse => {
                    return response.json({
                        "result": createResponse != undefined ? "success" : "Project already exists. Be indigenous",
                        "html_url": createResponse != undefined ? createResponse.html_url : undefined
                    })
                })
        })
    })
})


exports.getFileContent = functions.https.onRequest((request, response) => {
    return cors(request, response, () => {
        return validateFirebaseIdToken(request, response, user => {
            let filename = request.body.filename
            let projectName = request.body.projectName
            let version = request.body.version

            return getFileContent(filename, projectName, version)
                .then(content => {
                    return response.json({
                        "result": content != undefined ? "success": "File not found or unauthorized",
                        "content": content != undefined ? content.content : undefined
                    })
                })
        })
    })
})
