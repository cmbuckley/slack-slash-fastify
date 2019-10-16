const EventEmitter = require('events');
const qs = require('qs');
const Fastify = require('fastify');
const { IncomingWebhook } = require('@slack/webhook');

const fastify = Fastify({logger: true});

// server to listen for /slash commands
function createServer(slack) {
    let immediate = !!slack.options.allowImmediate,
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

    // verify the request signature
    function verify(req) {
        // recreate each time
        const hmac = crypto.createHmac('sha256', slack.options.signingSecret);

        let signature = req.headers['x-slack-signature'].split('='),
            timestamp = req.headers['x-slack-request-timestamp'],
            basestring = [signature[0], timestamp, req.body].join(':');

        try {
            return (signature[1] == hmac.update(basestring).digest('hex'));
        } catch (err) {
            fastify.log.warn(err);
        }
    }

    // we need the raw body for the signature verification, so parse as plain text (but parse before the handler)
    fastify.addContentTypeParser('application/x-www-form-urlencoded', {parseAs: 'string'}, (req, body, done) => done(null, body));
    fastify.addHook('preHandler', (req, res, done) => { req.data = qs.parse(req.body); done(); });

    fastify.post('/', function (req, res) {
        // parse command arguments
        let command = req.data.command.replace(/^\//, ''),
            args = req.data.text.match(/(?<=“|")[^"“”]+?(?=”|")|[^\s"“”]+/g) || [];

        // exit cleanly for non-verified requests
        if (slack.options.signingSecret && !verify(req)) {
            fastify.log.warn('Could not verify request');
            return res.send();
        }

        if (immediate) {
            // force a response if handler is slow
            timeout = setTimeout(function () {
                immediate = false;
                res.send();
            }, slack.options.timeout || 2000);
        } else {
            res.send();
        }

        // targeted slash:command event, plus generic slash event
        slack.emit('slash:' + command, args, respond(req, res), req.data);
        slack.emit('slash', command, args, respond(req, res), req.data);
    });
}

class SlashEmitter extends EventEmitter {
    constructor(options) {
        super();

        this.options = options || {};
        if (this.options.hasOwnProperty('allowImmediate')) {
            if (Number.isInteger(this.options.allowImmediate)) {
                if (this.options.allowImmediate > 2000) {
                    throw new TypeError('Cannot set a timeout greater than 2 seconds');
                }

                this.options.timeout = this.options.allowImmediate;
                this.options.allowImmediate = true;
            }
        }

        createServer(this);

        (async () => {
            try {
                await fastify.listen(this.options.port || 3000);
                this.emit('ready');
            } catch (err) {
                fastify.log.error(err);
                this.emit('error', err);
            }
        })();
    }
}

module.exports = SlashEmitter;
