import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SolicitudService } from './solicitud.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { CrearSolicitudRequest } from '../../core/models/dtos';
import { TipoDoc } from '../../core/models/enums';

@Component({
  selector: 'app-solicitud-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="card">
      <div class="row-between">
        <div>
          <h1 class="card-title">Nueva solicitud</h1>
          <p class="card-sub">Registro de solicitud de crédito (HU01)</p>
        </div>
        <span class="badge badge-blue">Estado inicial: REGISTRADA</span>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div formGroupName="cliente">
          <h2 class="section-title">Datos del cliente</h2>
          <div class="form-grid">
            <div class="field">
              <label for="tipoDoc">Tipo de documento</label>
              <select id="tipoDoc" formControlName="tipoDoc">
                @for (t of tiposDoc; track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="numDoc">N° de documento</label>
              <input id="numDoc" type="text" formControlName="numDoc" placeholder="Ingrese número"
                [class.invalid]="invalid('cliente.numDoc')" />
              <!-- @if (invalid('cliente.numDoc')) {
                <span class="field-error">Obligatorio.</span>
              } -->
              @if (invalid('cliente.numDoc')) {
                <span class="field-error">
                  @if (form.get('cliente.numDoc')?.hasError('required')) {
                    Obligatorio.
                  } @else {
                    @if (form.get('cliente.tipoDoc')?.value === 'DNI') {
                      El DNI debe tener 8 dígitos.
                    } @else if (form.get('cliente.tipoDoc')?.value === 'RUC') {
                      El RUC debe tener 11 dígitos.
                    } @else if (form.get('cliente.tipoDoc')?.value === 'CE') {
                      El CE debe tener de 9 a 12 dígitos.
                    }
                  }
                </span>
              }
            </div>
            <div class="field">
              <label for="nombres">Nombres</label>
              <input id="nombres" type="text" formControlName="nombres"
                [class.invalid]="invalid('cliente.nombres')" />
              @if (invalid('cliente.nombres')) {
                <span class="field-error">Obligatorio.</span>
              }
            </div>
            <div class="field">
              <label for="apellidos">Apellidos</label>
              <input id="apellidos" type="text" formControlName="apellidos"
                [class.invalid]="invalid('cliente.apellidos')" />
              @if (invalid('cliente.apellidos')) {
                <span class="field-error">Obligatorio.</span>
              }
            </div>
            <div class="field">
              <label for="ingresoMensual">Ingreso mensual (S/)</label>
              <input id="ingresoMensual" type="number" step="0.01" formControlName="ingresoMensual"
                [class.invalid]="invalid('cliente.ingresoMensual')" />
              @if (invalid('cliente.ingresoMensual')) {
                <span class="field-error">Requerido y ≥ 0.</span>
              }
            </div>
            <div class="field">
              <label for="deudasActuales">Deudas actuales (S/)</label>
              <input id="deudasActuales" type="number" step="0.01" formControlName="deudasActuales"
                [class.invalid]="invalid('cliente.deudasActuales')" />
              @if (invalid('cliente.deudasActuales')) {
                <span class="field-error">Requerido y ≥ 0.</span>
              }
            </div>
          </div>
        </div>

        <h2 class="section-title">Datos del crédito</h2>
        <div class="form-grid">
          <div class="field">
            <label for="monto">Monto solicitado (S/)</label>
            <input id="monto" type="number" step="0.01" formControlName="monto"
              [class.invalid]="invalid('monto')" />
            @if (invalid('monto')) {
              <span class="field-error">Debe ser mayor que 0.</span>
            }
          </div>
          <div class="field">
            <label for="plazoMeses">Plazo (meses)</label>
            <input id="plazoMeses" type="number" formControlName="plazoMeses"
              [class.invalid]="invalid('plazoMeses')" />
            @if (invalid('plazoMeses')) {
              <span class="field-error">Debe ser mayor que 0.</span>
            }
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-ghost" type="button" (click)="cancelar()">Cancelar</button>
          <button class="btn btn-primary" type="submit" [disabled]="loading()">
            {{ loading() ? 'Registrando…' : 'Registrar' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
// export class SolicitudFormComponent{
export class SolicitudFormComponent implements OnInit{
  private fb = inject(FormBuilder);
  private service = inject(SolicitudService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  tiposDoc: TipoDoc[] = ['DNI', 'CE', 'RUC'];

  // Validaciones mínimas de UX. Las reglas de negocio reales las valida el backend (400).
  form = this.fb.nonNullable.group({
    cliente: this.fb.nonNullable.group({
      tipoDoc: ['DNI' as TipoDoc, Validators.required],
      // numDoc: ['', Validators.required],
      numDoc: ['', Validators.required, Validators.pattern('^[0-9]{8}$')],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      ingresoMensual: [null as number | null, [Validators.required, Validators.min(0)]],
      deudasActuales: [null as number | null, [Validators.required, Validators.min(0)]],
    }),
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    plazoMeses: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  // Validación según el tipo de documento seleccionado
  ngOnInit(): void {
    const tipoDocControl = this.form.get('cliente.tipoDoc');

    if (tipoDocControl?.value) {
      this.aplicarValidaciones(tipoDocControl.value);
    }
  
    tipoDocControl?.valueChanges.subscribe((tipo) => {
      this.aplicarValidaciones(tipo);
    });
  }

  private aplicarValidaciones(tipo: string): void {
      const numDocControl = this.form.get('cliente.numDoc');
      
      numDocControl?.clearValidators();
      numDocControl?.clearAsyncValidators();
      
      const nuevasReglas = [Validators.required];

      if (tipo === 'DNI') {
        nuevasReglas.push(Validators.pattern('^[0-9]{8}$'));
      } else if (tipo === 'RUC') {
        nuevasReglas.push(Validators.pattern('^[0-9]{11}$'));
      } else if (tipo === 'CE') {
        nuevasReglas.push(Validators.minLength(9), Validators.maxLength(12));
      }

      numDocControl?.setValidators(nuevasReglas);
      numDocControl?.updateValueAndValidity();  
  }

  invalid(path: string): boolean {
    const c = this.form.get(path);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const body = this.form.getRawValue() as CrearSolicitudRequest;
    this.service.crear(body).subscribe({
      next: (sol) => {
        this.loading.set(false);
        this.notify.success(`Solicitud N° ${sol.id} registrada (${sol.estado}).`);
        this.router.navigate(['/solicitudes', sol.id]);
      },
      error: () => this.loading.set(false),
    });
  }

  cancelar(): void {
    this.router.navigate(['/solicitudes']);
  }
}
