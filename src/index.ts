
export const queueMessage = (admin, delay, type, address, payload, id, extras = {}) => {
  const status = 'created'
  const key = admin.database().ref().child('message_queue').push().key
  return admin.database().ref(`message_queue/${key}`).set({
    type, payload, delay: parseInt(delay), address, status, extras
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


  console.log('messageCreated')
  let version1 = false
  let prev = change.data.previous
  let next = change.data
  if (version1) {
    prev = change.before
    next = change.after
  }
  // Only edit data when it is first created.
  if (prev.exists()) {
    return null;
  }
  // Exit when the data is deleted.
  if (!next.exists()) {
    return null;
  }

  if (next.child('status').val() === 'created') {
    const created_at = Date.now();
    console.log(created_at)
    const send_at = created_at + next.child('delay').val();

    return next.ref.update({
      created_at,
      send_at,
      status: 'queued',
      delay: null
    })
  }
  return null;
}

/*const processMessage = child => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('child', child)
            resolve()
        }, 2000)
    })
}*/

export const cronCallback = async (admin) => {
  const now = Date.now();
  const children = await admin.database().ref('message_queue').once('value');
  let promises = []
  children.forEach(childSnapshot => {
    const child = childSnapshot.val();
    if (child.status === 'queued') {
      if (child.send_at < now) {
        console.log(`send ${child.type} to ${child.address}`);
        promises.push(childSnapshot.ref.update({
          status: 'processed'
        }).then(() => child).catch(e => {
          return childSnapshot.ref.update({
            status: 'error',
            error_message: e
          });
        }));
      }
      if (child.send_at >= now) {
        console.log(`wait ${child.send_at - now} with sending ${child.type} to ${child.address}`);
      }
    }
    if (child.status === 'processed' || child.status === 'replaced' && child.status === 'cancelled') {
      promises.push(childSnapshot.ref.remove().catch(() => console.log));
    }
    return false;
  });
  return Promise.all(promises)
}
