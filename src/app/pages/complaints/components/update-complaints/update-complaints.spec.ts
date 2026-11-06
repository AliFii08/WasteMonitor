import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateComplaints } from './update-complaints';
import { QuejasService } from '../../../../@core/services/quejas.service';

describe('UpdateComplaints', () => {
  let component: UpdateComplaints;
  let fixture: ComponentFixture<UpdateComplaints>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateComplaints],
      providers: [{ provide: QuejasService, useValue: {} }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateComplaints);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
