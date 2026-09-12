import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateDriver } from './update-driver';

describe('UpdateDriver', () => {
  let component: UpdateDriver;
  let fixture: ComponentFixture<UpdateDriver>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateDriver]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateDriver);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
