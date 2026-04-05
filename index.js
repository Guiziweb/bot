import { createNodeMiddleware, createProbot } from 'probot'
import http from 'http'
import crypto from 'crypto'

const app = (app) => {
  app.on('issue_comment.created', async (context) => {
    const { comment, issue, sender, repository } = context.payload

    if (sender.login !== 'camilleislasse') return
    if (!issue.pull_request) return
    if (!comment.body.includes('@claude')) return

    console.log(`@claude triggered on ${repository.full_name}#${issue.number} by ${sender.login}`)

    await context.octokit.repos.createDispatchEvent({
      owner: 'Guiziweb',
      repo: '.github',
      event_type: 'claude-review',
      client_payload: {
        repo: repository.full_name,
        pr: String(issue.number),
        comment: comment.body
      }
    })

    console.log(`Dispatched claude-review for ${repository.full_name}#${issue.number}`)
  })
}

const probot = createProbot()
const middleware = createNodeMiddleware(app, { probot })

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      const sig = req.headers['x-hub-signature-256']
      const expected = 'sha256=' + crypto.createHmac('sha256', process.env.WEBHOOK_SECRET).update(body).digest('hex')
      console.log('received:', sig)
      console.log('expected:', expected)
      console.log('match:', sig === expected)
    })
  }
  middleware(req, res)
})

server.listen(3000, () => {
  console.log('Bot listening on port 3000')
})