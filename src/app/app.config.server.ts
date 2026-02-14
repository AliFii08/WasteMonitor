import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';
import * as admin from 'firebase-admin';

// Creamos un Token para identificar a Firebase Admin en la app
export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    {
      provide: FIREBASE_ADMIN,
      useFactory: () => {
        if (admin.apps.length === 0) {
          return admin.initializeApp({
            // Reemplaza con tus datos de Firebase
            credential: admin.credential.applicationDefault(),
            databaseURL: 'https://wastemonitor-c425a-default-rtdb.firebaseio.com/',
          });
        }
        return admin.app();
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
