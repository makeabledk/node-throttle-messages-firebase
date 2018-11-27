# throttled-messages-firebase
> Enables you to send notifications and emails throttled from firebase with simple Cloud Function implementation.

## General usage

To queue the messages use:
```js
const throttledMessages = require('../functions/npm-throttle-messages-firebase')
throttledMessages.queueMessage(admin, delay, type, address, payload, id)
    .then(msgKey => {
        console.log('message queued with key', msgKey)
        process.exit();
})
```
It basically just creates an entry in Realtime Database under `message_queue` to be handled by cron.
`queueMessage` returns the id of the queued message and if you pass it as the id parameter next time you queue the message, it replaces the first one. Essencially throttling the message.

## Cloud functions

Here's an example of how to implement the Cloud Functions 

```js
export const messageQueueOnWrite = functions.database.ref('message_queue/{messageId}').onWrite((change, context) => throttledMessages.messageCreated(admin, change, context))
export const sendWithCron = functions.https.onRequest((req, res) => throttledMessages.cronCallback(admin, req, res))
```

Build process uses TypeScript

## License
CC BY-SA

This project was brought to you by [Makeable ApS](https://github.com/makeabledk) 