# slack-slash-fastify

A simple Slack Slash Command handler using [Fastify](https://www.fastify.io).

This package is intended to be used to create slash commands in a project that has no other need for a Web server.

## Installation

Install with npm:

```bash
npm i slack-slash-fastify --save
```

## Usage

```js
const SlashEmitter = require('slack-slash-fastify');
const slash = new SlashEmitter({secret: "SECRET"}); // secret is used to verify requests

slash.on('slash', function (slashCommand, args, reply) {
    switch (slashCommand) {
        case 'foo':
            reply({
                response_type: 'in_channel',
                text: foo(args),
            })
            break;
    }
});

// alternative format for subscribing to /foo commands
slash.on('slash:foo', function (args, reply) {
    reply({
        response_type: 'in_channel',
        text: foo(args),
    })
});
```

## Class: SlashEmitter

* `options`
    * `secret`: Signing secret used to [verify requests from Slack](https://api.slack.com/docs/verifying-requests-from-slack).
    * `allowImmediate`: Allow immediate response to Slack requests. Defaults to `false`, meaning the reply is sent separately using a Webhook. If `true`, the reply will be sent inline if the subscriber responds within the default 2 seconds. If a number is passed, it alters this timeout in milliseconds (to a maximum of 2000).
    * `port`: The port for Fastify to use for the server.

The class will emit events in 2 different formats:

### Event: 'slash'

* `slashCommand`: The command used to trigger the event, without the leading slash.
* `args`: Array of arguments sent to the slash command. Parses `foo "bar baz"` to `['foo', 'bar baz']` automatically.
* `reply`: Callback function to reply to the command.
* `data`: Object containing the data sent in the request from Slack.

### Event: 'slash:*'

* `args`: Array of arguments as above.
* `reply`: Callback function to reply to the command.
* `data`: Object containing the data sent in the request from Slack.
