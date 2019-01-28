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
let repo = 'lit-sink'
const APP_ID = 24297

let saveFileToRepo = (contentString, commitMessage, filename, version, userData) => {
    let path = `components/beta/${userData.username}/${version}/${filename}`
    let branch = 'master'
    let committer = author = userData

    // Initialising the File content
    let content = contentString
    let message = commitMessage
    
    const app = new App({ id: APP_ID, privateKey: cert })
    const jwt = app.getSignedJsonWebToken()

    let call_installation_data = () => {
        return request('GET /repos/:owner/:repo/installation', {
            owner: owner,
            repo: repo,
            headers: {
                authorization: `Bearer ${jwt}`,
                accept: 'application/vnd.github.machine-man-preview+json'
            }
        }).then(res => res.data)
    }

    let call_save_blob_data = (installationAccessToken) => {
        return request('POST /repos/:owner/:repo/git/blobs', {
            owner: owner,
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
            owner: owner,
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
            owner: owner, 
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

    let call_create_reference = (installationAccessToken, create_file_data) => {
        return request('POST /repos/:owner/:repo/git/refs', {
            owner: owner,
            repo: repo,
            ref: `refs/tags/${userData.username}-${userData.versionString}`,
            sha: create_file_data.commit.sha,
            headers: {
                authorization: `token ${installationAccessToken}`,
                accept: 'application/vnd.github.machine-man-preview+json'
            }
        }).then(res => res.data)
    }

    return call_installation_data()
        .then(installation_data => {
            console.log("installation_data", installation_data)
            const installationId = installation_data ? installation_data.id : INSTALLATION_ID
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
                                            return create_file_data
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            if (err.message.includes(`"sha" wasn't supplied.`)) {
                                                console.log("Retrying to save the file with version bump")
                                                return saveFileToRepo(contentString, commitMessage, filename, version+1, userData)
                                            }
                                            return undefined
                                        })
                                })
                        })
                })
        })

    // const { data: installation_data } = await request('GET /repos/:owner/:repo/installation', {
    //     owner: owner,
    //     repo: repo,
    //     headers: {
    //       authorization: `Bearer ${jwt}`,
    //       accept: 'application/vnd.github.machine-man-preview+json'
    //     }
    //   })
    // console.log("installation_data", installation_data)
    
    // const installationId = installation_data ? installation_data.id : INSTALLATION_ID
    // console.log("installationId:", installationId)
    // const installationAccessToken = await app.getInstallationAccessToken({ installationId })

    

    // const { data: save_blob_data } = await request('POST /repos/:owner/:repo/git/blobs', {
    //     owner: owner,
    //     repo: repo,
    //     content: content,
    //     headers: {
    //       authorization: `token ${installationAccessToken}`,
    //       accept: 'application/vnd.github.machine-man-preview+json'
    //     }
    //   })

    // console.log("save_blob_data", save_blob_data)

    // const { data: get_blob_data } = await request('GET /repos/:owner/:repo/git/blobs/:file_sha', {
    //     owner: owner,
    //     repo: repo,
    //     file_sha: save_blob_data.sha,
    //     headers: {
    //       authorization: `token ${installationAccessToken}`,
    //       accept: 'application/vnd.github.machine-man-preview+json'
    //     }
    //   })

    // console.log("get_blob_data", get_blob_data)

    // try {
    //     const { data: create_file_data} = await request('PUT /repos/:owner/:repo/contents/:path', {
    //         owner: owner, 
    //         repo: repo, 
    //         path: path, 
    //         message: message, 
    //         content: get_blob_data.content, 
    //         branch: branch, 
    //         committer: committer, 
    //         author: author,
    //         headers: {
    //           authorization: `token ${installationAccessToken}`,
    //           accept: 'application/vnd.github.machine-man-preview+json'
    //         }
    //       })
        
    //     console.log("create_file_data", create_file_data)
    //     return create_file_data.content.html_url

    // } catch (err) {
    //     console.log(err)
    //     return undefined
    // }
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

// Actual HTTP endpoint
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
            let filename = request.body.filename
            let version = request.body.version
                        
            return saveFileToRepo(contentString, commitMessage, filename, version, userData)
                .then(saveResponse => {
                    return response.json({
                        "result": saveResponse != undefined ? "success" : "File already exists. Need to bump the version!",
                        "html_url": saveResponse != undefined ? saveResponse.content.html_url : undefined,
                        "cdn_url": saveResponse != undefined ? `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${saveResponse.commit.sha.substring(0,7)}/${saveResponse.content.html_url.split('master/')[1]}` : undefined
                    })
                })
        })
    })
})





