export const queueMessage = (admin, delay, type, address, payload, id) => {
    const status = 'created'
    const key = admin.database().ref().child('message_queue').push().key
    return admin.database().ref(`message_queue/${key}`).set({
        type, payload, delay: parseInt(delay), address, status
    })
        .then(() => {
            if (id) {
                return admin.database().ref(`message_queue/${id}`).update({ status: 'replaced' });
            }
            return true
        })
        .then(() => key)
}

export const messageCreated = (admin, change, context) => {
    // Only edit data when it is first created.
    if (change.before.exists()) {
        return null;
    }
    // Exit when the data is deleted.
    if (!change.after.exists()) {
        return null;
    }

    if (change.after.child('status').val() === 'created') {
        const created_at = Date.parse(context.timestamp);
        console.log(created_at)
        const send_at = created_at + change.after.child('delay').val();

        return change.after.ref.update({
            created_at,
            send_at,
            status: 'queued',
            delay: null
        })
    }
    return null;
}

const processMessage = child => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('child', child)
            resolve()
        }, 2000)
    })
}

export const cronCallback = async (admin, req, res) => {
    const now = Date.now();
    const children = await admin.database().ref('message_queue').once('value');
    children.forEach(childSnapshot => {
        const child = childSnapshot.val();
        if (child.status === 'queued') {
            if (child.send_at < now) {
                console.log(`send ${child.type} to ${child.address}`);
                processMessage(child).then(status => {
                    return childSnapshot.ref.update({
                        status: 'processed'
                    });
                }).catch(e => {
                    return childSnapshot.ref.update({
                        status: 'error',
                        error_message: e
                    });
                });
            }
            if (child.send_at >= now) {
                console.log(`wait ${child.send_at - now} with sending ${child.type} to ${child.address}`);
            }
        }
        if (child.status === 'processed' || child.status === 'replaced') {
            childSnapshot.ref.remove().catch(() => console.log);
        }
        return false;
    });
    console.log('done');
    res.send('done');
}