# WasteMonitor

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Browser notifications

The app can show free browser/system notifications for new Firebase notices while the
application is open, connected, and the recipient is signed in. Users enable them from
the notification bell; they are not push notifications and are not delivered when the app
is closed, disconnected, or signed out. Firebase Realtime Database continues to store and
display the in-app notification history.

### Backend checklist for later

No Cloud Functions, Firebase Cloud Messaging setup, VAPID keys, or paid-plan upgrade
is needed for these in-app/browser notifications. Before relying on them in production,
check Firebase Console → Realtime Database → Rules:

1. Signed-in users can read `/notificaciones` so the app can filter notices by
   `rolDestino` and `uidDestino`.
2. Only authorized users can create notices (administrators for announcements,
   supervisors for emergency/journey events, and the roles permitted by the emergency
   workflow). Do not allow unauthenticated public writes.
3. Users can only update the `leida` field on notices they are allowed to see.
4. Confirm Firebase Authentication is enabled and each recipient's `/usuarios/{uid}/rol`
   value is correct; delivery depends on that role and the destination saved with the
   notice.

If the database rules deny the app's notification writes, update the client to send the
Firebase Authentication ID token with its Realtime Database REST requests (or migrate
those writes to the authenticated AngularFire Database SDK), then test each role. Do not
make `/notificaciones` publicly writable just to make notices work.

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
