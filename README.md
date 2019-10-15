# slack-slash-fastify

A simple Slack Slash Command handler using Fastify.

This package is intended to be used to create slash commands in a project that has no other need for a Web server.

## Usage

```
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
