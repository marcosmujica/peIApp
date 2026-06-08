const fs = require('fs');
const path = require('path');

const SESSION_SECRET = JSON.parse(
  fs.readFileSync(path.join(process.env.USERPROFILE, '.expo', 'state.json'), 'utf-8')
).auth.sessionSecret;

const PROJECT_ID = 'e68496e5-32ba-4b72-96f7-63cbd0010ed6';
const KEY_ID = '30fbe04d-cb78-4643-a722-60890bb935cc';
const EXPO_API = 'https://api.expo.dev/graphql';

const headers = {
  'Content-Type': 'application/json',
  'expo-session': SESSION_SECRET,
};

async function gql(query, variables = {}) {
  const res = await fetch(EXPO_API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function associateKey() {
  // Get Android credentials
  console.log('1. Getting Android app credentials...');
  const appData = await gql(`
    query GetApp($fullName: String!) {
      app {
        byFullName(fullName: $fullName) {
          id
          slug
          ownerAccount { id }
          androidAppCredentials {
            id
            applicationIdentifier
            googleServiceAccountKeyForFcmV1 { id clientEmail }
          }
        }
      }
    }
  `, { fullName: '@marcosmujica/peiapp' });

  console.log(JSON.stringify(appData, null, 2));

  if (appData.errors) { console.error('Error:', appData.errors); return; }

  const androidCreds = appData.data.app.byFullName.androidAppCredentials;
  console.log(`   Found ${androidCreds ? androidCreds.length : 0} Android credential(s)`);

  if (androidCreds && androidCreds.length > 0) {
    const credId = androidCreds[0].id;
    console.log(`\n2. Setting FCM V1 key on credentials (${credId})...`);

    const setData = await gql(`
      mutation SetFcmV1Key($androidAppCredentialsId: ID!, $googleServiceAccountKeyId: ID!) {
        androidAppCredentials {
          setGoogleServiceAccountKeyForFcmV1(
            id: $androidAppCredentialsId
            googleServiceAccountKeyId: $googleServiceAccountKeyId
          ) {
            id
            googleServiceAccountKeyForFcmV1 { id clientEmail projectIdentifier }
          }
        }
      }
    `, {
      androidAppCredentialsId: credId,
      googleServiceAccountKeyId: KEY_ID,
    });

    if (setData.errors) {
      console.error('Error:', JSON.stringify(setData.errors, null, 2));
    } else {
      const result = setData.data.androidAppCredentials.setGoogleServiceAccountKeyForFcmV1;
      console.log(`\n✅ FCM V1 key successfully associated!`);
      console.log(`   Client Email: ${result.googleServiceAccountKeyForFcmV1.clientEmail}`);
    }
  } else {
    console.log(`\n2. Creating new Android app credentials with FCM V1 key...`);
    const createData = await gql(`
      mutation CreateAndroidAppCredentials($androidAppCredentialsInput: AndroidAppCredentialsInput!, $appId: ID!, $applicationIdentifier: String!) {
        androidAppCredentials {
          createAndroidAppCredentials(
            androidAppCredentialsInput: $androidAppCredentialsInput
            appId: $appId
            applicationIdentifier: $applicationIdentifier
          ) {
            id
            googleServiceAccountKeyForFcmV1 { id clientEmail }
          }
        }
      }
    `, {
      appId: PROJECT_ID,
      applicationIdentifier: 'com.marcosmujica.peiapp',
      androidAppCredentialsInput: {
        fcmV1Credential: { googleServiceAccountKeyId: KEY_ID },
      },
    });

    if (createData.errors) {
      console.error('Error:', JSON.stringify(createData.errors, null, 2));
    } else {
      console.log(`\n✅ FCM V1 key successfully configured!`);
    }
  }
}

associateKey().catch(console.error);
