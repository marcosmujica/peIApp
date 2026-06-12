const fs = require('fs');
const path = require('path');

const SESSION_SECRET = JSON.parse(
  fs.readFileSync(path.join(process.env.USERPROFILE, '.expo', 'state.json'), 'utf-8')
).auth.sessionSecret;

const SERVICE_ACCOUNT_KEY_PATH = path.join(__dirname, 'peiapp-3f012-firebase-adminsdk-fbsvc-cffc6bcea8.json');
const serviceAccountKey = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf-8'));

const PROJECT_ID = 'e68496e5-32ba-4b72-96f7-63cbd0010ed6';
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

async function uploadFcmV1Key() {
  // Step 1: Get account ID
  console.log('1. Getting account info...');
  const meData = await gql(`query { meActor { ... on User { id accounts { id name } } } }`);
  if (meData.errors) { console.error('Error:', meData.errors); return; }
  
  const accountId = meData.data.meActor.accounts[0].id;
  console.log(`   Account ID: ${accountId}`);

  // Step 2: Upload service account key - jsonKey expects JSONObject (the object itself, not a string)
  console.log('\n2. Uploading FCM V1 service account key...');
  const uploadData = await gql(`
    mutation CreateGoogleServiceAccountKey($accountId: ID!, $googleServiceAccountKeyInput: GoogleServiceAccountKeyInput!) {
      googleServiceAccountKey {
        createGoogleServiceAccountKey(
          accountId: $accountId
          googleServiceAccountKeyInput: $googleServiceAccountKeyInput
        ) {
          id
          projectIdentifier
          clientEmail
          clientIdentifier
        }
      }
    }
  `, {
    accountId,
    googleServiceAccountKeyInput: {
      jsonKey: serviceAccountKey,  // pass the object directly, not JSON.stringify
    },
  });

  if (uploadData.errors) { console.error('Error uploading key:', JSON.stringify(uploadData.errors, null, 2)); return; }
  
  const keyId = uploadData.data.googleServiceAccountKey.createGoogleServiceAccountKey.id;
  const clientEmail = uploadData.data.googleServiceAccountKey.createGoogleServiceAccountKey.clientEmail;
  console.log(`   Key uploaded! ID: ${keyId}`);
  console.log(`   Client Email: ${clientEmail}`);

  // Step 3: Get existing Android app credentials
  console.log('\n3. Getting Android app credentials...');
  const appData = await gql(`
    query GetApp($projectId: String!) {
      app {
        byId(appId: $projectId) {
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
  `, { projectId: PROJECT_ID });

  if (appData.errors) { console.error('Error:', JSON.stringify(appData.errors, null, 2)); return; }

  const androidCreds = appData.data.app.byId.androidAppCredentials;
  console.log(`   Found ${androidCreds ? androidCreds.length : 0} Android credential(s)`);

  // Step 4: Associate key
  if (androidCreds && androidCreds.length > 0) {
    const credId = androidCreds[0].id;
    console.log(`\n4. Setting FCM V1 key on existing credentials (${credId})...`);

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
      googleServiceAccountKeyId: keyId,
    });

    if (setData.errors) {
      console.error('Error setting FCM V1 key:', JSON.stringify(setData.errors, null, 2));
    } else {
      const result = setData.data.androidAppCredentials.setGoogleServiceAccountKeyForFcmV1;
      console.log(`\n✅ FCM V1 key successfully configured!`);
      console.log(`   Client Email: ${result.googleServiceAccountKeyForFcmV1.clientEmail}`);
    }
  } else {
    console.log(`\n4. Creating new Android app credentials with FCM V1 key...`);

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
        fcmV1Credential: { googleServiceAccountKeyId: keyId },
      },
    });

    if (createData.errors) {
      console.error('Error creating credentials:', JSON.stringify(createData.errors, null, 2));
    } else {
      console.log(`\n✅ FCM V1 key successfully configured!`);
    }
  }
}

uploadFcmV1Key().catch(console.error);
