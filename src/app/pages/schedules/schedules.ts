import { Component } from '@angular/core';

@Component({
  selector: 'app-schedules',
  imports: [],
  templateUrl: './schedules.html',
  styleUrl: './schedules.scss',
})
export class Schedules {
  readonly weekDays = [
    { number: '01', name: 'Lunes', key: 'monday' },
    { number: '02', name: 'Martes', key: 'tuesday' },
    { number: '03', name: 'Miércoles', key: 'wednesday' },
    { number: '04', name: 'Jueves', key: 'thursday' },
    { number: '05', name: 'Viernes', key: 'friday' },
    { number: '06', name: 'Sábado', key: 'saturday' },
    { number: '07', name: 'Domingo', key: 'sunday' },
  ];
}
