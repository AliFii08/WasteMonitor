import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewComplaints } from './view-complaints';
import { QuejasService } from '../../../../@core/services/quejas.service';

describe('ViewComplaints', () => {
  let component: ViewComplaints;
  let fixture: ComponentFixture<ViewComplaints>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewComplaints],
      providers: [{ provide: QuejasService, useValue: {} }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewComplaints);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
