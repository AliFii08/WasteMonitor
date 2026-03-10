import { mergeApplicationConfig, ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from '../app.config';
import * as admin from 'firebase-admin';

// Definimos un InjectionToken para usarlo en nuestros servicios
export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    {
      provide: FIREBASE_ADMIN,
      useFactory: () => {
        // Evitamos inicializarlo varias veces si el proceso se reinicia
        if (admin.apps.length === 0) {
          return admin.initializeApp({
            // Aquí van tus credenciales o usa las variables de entorno de Google
            credential: admin.credential.applicationDefault(),
            databaseURL: "https://TU_PROYECTO.firebaseio.com"
          });
        }
        return admin.app();
      }
    }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
