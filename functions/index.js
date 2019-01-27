const functions = require('firebase-functions')
const fs = require('fs')
const App = require('@octokit/app')
const request = require('@octokit/request')
const cors = require('cors')({origin: true})
const cert = functions.config().testservice != undefined ? functions.config().testservice.key : fs.readFileSync(__dirname+'/../github_app.pem')

let owner = 'nandubatchu'
let repo = 'lit-sink'
const APP_ID = 24297

let saveFileToRepo = (contentString, commitMessage, filePath, userData) => {
    let path = filePath
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

    return call_installation_data()
        .then(installation_data => {
            console.log("installation_data", installation_data)
            const installationId = installation_data ? installation_data.id : INSTALLATION_ID
            console.log("installationId:", installationId)
            app.getInstallationAccessToken({ installationId })
                .then(installationAccessToken => {
                    call_save_blob_data(installationAccessToken)
                        .then(save_blob_data => {
                            console.log("save_blob_data", save_blob_data)
                            call_get_blob_data(installationAccessToken, save_blob_data)
                                .then(get_blob_data => {
                                    console.log("get_blob_data", get_blob_data)
                                    call_create_file_data(installationAccessToken, get_blob_data)
                                        .then(create_file_data => {
                                            console.log("create_file_data", create_file_data)
                                            return create_file_data.content.html_url
                                        })
                                        .catch(err => {
                                            console.log(err)
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


// Actual HTTP endpoint
exports.saveFileToCDN = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        let contentString = request.body.content
        let commitMessage = request.body.message
        let filePath = 'components/beta/' + request.body.path
        let userData = {
            name: "Yadunandan",
            email: "nandubatchu@gmail.com"
        }

        saveFileToRepo(contentString, commitMessage, filePath, userData)
            .then(saveResponse => {
                response.json({
                    "result": saveResponse ? "success" : "File already exists. Need to bump the version!",
                    "html_url": saveResponse,
                    "cdn_url": `https://cdn.jsdelivr.net/gh/${owner}/${repo}/${filePath}`
                })
            })
    })
})





