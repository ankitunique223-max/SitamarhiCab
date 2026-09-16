# Firestore security and test guide

## What is protected

- `users`: a signed-in user can access only their own profile. Profile `role`,
  `status`, and `uid` cannot be changed by that user.
- `rides`: customers can create, assign, and cancel their own rides; an approved
  driver can advance only their assigned ride through `assigned → accepted →
  ongoing → completed`.
- `driver_locations`: a customer can read a driver's coordinates only while the
  driver has linked that location document to the customer's active ride.
- `earnings`: browser writes are denied. Create accounting records only from a
  trusted server after verifying the payment and ride.
- Admin: Firestore documents do not confer admin permissions. The authenticated
  user's custom token must contain `admin: true`.

## Make an admin

Set the custom claim using a trusted Firebase Admin SDK environment, then make
the user sign out and sign back in so their ID token is refreshed:

```js
await admin.auth().setCustomUserClaims(uid, { admin: true });
```

Do not use a browser client or a writable `users/{uid}.role` field for this.

## Run the security end-to-end suite

```powershell
npm install
npm test
```

The suite exercises registration, booking, assignment, driver state changes,
private live tracking, and denied privilege-escalation/payment/earnings attacks.
It uses the local Firestore emulator and never touches production data.

## Deploy rules

After the suite passes and a production admin has a custom claim:

```powershell
npx firebase login
npx firebase use sitamarhicab-ba312
npx firebase deploy --only firestore:rules
```

## Payment production requirement

The existing browser payment code must not be treated as proof of payment. Keep
the rules' client-side `paymentStatus` denial in place and have a server endpoint
verify the Razorpay signature before it writes `paid` and creates the related
`earnings` record with the Firebase Admin SDK.
