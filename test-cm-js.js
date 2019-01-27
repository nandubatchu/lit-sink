
let on2fa = async () => {
  return prompt('Two-factor authentication Code:')
}
const clientWithAuth = new Octokit({
  auth: {
    username: 'nandubatchu',
    on2fa
  }
})
