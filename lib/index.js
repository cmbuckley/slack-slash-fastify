const EventEmitter = require('events');
const qs = require('qs');
const Fastify = require('fastify');
const { IncomingWebhook } = require('@slack/webhook');

const fastify = Fastify({logger: true});

// server to listen for /slash commands
function createServer(slack) {
    let immediate = true,
        timeout;

    // either respond immediately or post reply via webhook
    function respond(req, res) {
        return function (message) {
            if (immediate) {
                clearTimeout(timeout);
                return res.send(message);
            }

            const webhook = new IncomingWebhook(req.data.response_url);
            webhook.send(message);
        };
    }

    // we need the raw body for the signature verification, so parse as plain text (but parse before the handler)
    fastify.addContentTypeParser('application/x-www-form-urlencoded', {parseAs: 'string'}, (req, body, done) => done(null, body));
    fastify.addHook('preHandler', (req, res, done) => { req.data = qs.parse(req.body); done(); });

    fastify.post('/', function (req, res) {
        // parse command arguments
        let command = req.data.command.replace(/^\//, ''),
            args = req.data.text.match(/(?<=“|")[^"“”]+?(?=”|")|[^\s"“”]+/g) || [];

        // force a response if handler is slow
        timeout = setTimeout(function () {
            immediate = false;
            res.send();
        }, 2000);

        // targeted slash:command event, plus generic slash event
        slack.emit('slash:' + command, args, respond(req, res), req.data);
        slack.emit('slash', command, args, respond(req, res), req.data);
    });
}

class SlashEmitter extends EventEmitter {
    constructor(options) {
        super();

        this.options = options || {};
        createServer(this);

        (async () => {
            try {
                await fastify.listen(3000);
                this.emit('ready');
            } catch (err) {
                fastify.log.error(err);
                this.emit('error', err);
            }
        })();
    }
}

module.exports = SlashEmitter;
