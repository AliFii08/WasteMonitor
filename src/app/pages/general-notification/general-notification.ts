import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Database, get, ref } from '@angular/fire/database';
import { NotificationService } from '../../@core/services/notification.service';

type AudienceMode = 'all' | 'roles' | 'truck' | 'sector' | 'route';

interface AudiencePerson {
  uid: string;
  name: string;
  role: string;
  truckId: string;
  assignedRoute: string;
  sector: string;
  nearestRoute: string;
}

interface AudienceTruck {
  id: string;
  label: string;
  route: string;
}

interface AudienceSector {
  id: string;
  label: string;
}

interface AudienceRoute {
  id: string;
  label: string;
  aliases: string[];
  points: Array<{ lat: number; lng: number }>;
}

@Component({
  selector: 'app-general-notification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './general-notification.html',
  styleUrl: './general-notification.scss',
})
export class GeneralNotificationComponent implements OnInit {
  private database = inject(Database);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  isClosing = false;

  readonly roleOptions = [
    { id: 'admin', label: 'Administración' },
    { id: 'supervisor', label: 'Supervisión' },
    { id: 'user', label: 'Usuarios' },
    { id: 'conductor', label: 'Conductores' },
    { id: 'crew', label: 'Equipo de recolección' },
  ];

  people: AudiencePerson[] = [];
  trucks: AudienceTruck[] = [];
  routes: AudienceRoute[] = [];
  sectors: AudienceSector[] = [];

  audienceMode: AudienceMode = 'roles';
  selectedRoles = ['supervisor', 'crew'];
  selectedTruckId = '';
  selectedSector = '';
  selectedRouteId = '';
  selectedUserIds: string[] = [];
  title = '';
  message = '';
  loading = true;
  sending = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    void this.loadAudienceData();
  }

  get candidates(): AudiencePerson[] {
    switch (this.audienceMode) {
      case 'all':
        return this.people.filter((person) => this.roleOptions.some((role) => role.id === person.role));
      case 'roles':
        return this.people.filter((person) => this.selectedRoles.includes(person.role));
      case 'truck':
        if (!this.selectedTruckId) return [];
        return this.people.filter((person) => person.truckId === this.selectedTruckId &&
          ['supervisor', 'crew', 'conductor'].includes(person.role));
      case 'sector':
        if (!this.selectedSector) return [];
        return this.people.filter((person) => person.role === 'user' && person.sector === this.selectedSector);
      case 'route':
        if (!this.selectedRouteId) return [];
        return this.people.filter((person) => this.personMatchesRoute(person, this.selectedRouteId));
    }
  }

  get selectedCount(): number {
    return this.candidates.filter((person) => this.selectedUserIds.includes(person.uid)).length;
  }

  get canSend(): boolean {
    return !this.loading && !this.sending && this.title.trim().length > 0 &&
      this.message.trim().length > 0 && this.selectedCount > 0;
  }

  close(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(false);
    }, 180);
  }

  onAudienceChange(): void {
    this.selectAllCandidates();
  }

  toggleRole(role: string, selected: boolean): void {
    this.selectedRoles = selected
      ? [...new Set([...this.selectedRoles, role])]
      : this.selectedRoles.filter((item) => item !== role);
    this.selectAllCandidates();
  }

  selectAllCandidates(): void {
    this.selectedUserIds = this.candidates.map((person) => person.uid);
  }

  clearCandidates(): void {
    this.selectedUserIds = [];
  }

  togglePerson(uid: string, selected: boolean): void {
    this.selectedUserIds = selected
      ? [...new Set([...this.selectedUserIds, uid])]
      : this.selectedUserIds.filter((item) => item !== uid);
  }

  isSelected(uid: string): boolean {
    return this.selectedUserIds.includes(uid);
  }

  roleLabel(role: string): string {
    return this.roleOptions.find((option) => option.id === role)?.label ?? role;
  }

  async send(): Promise<void> {
      if (!this.canSend) return;
  
      this.sending = true;
      this.errorMessage = '';
      this.successMessage = '';
      this.cdr.detectChanges(); // Forzar actualización visual a "Enviando..."
  
      try {
        const targetUids = this.selectedUserIds.filter((uid) =>
          this.candidates.some((person) => person.uid === uid)
        );
  
        await this.notificationService.crearNotificacionParaUsuarios(
          this.title.trim(),
          this.message.trim(),
          targetUids
        );
  
        this.successMessage = `Notificación enviada a ${targetUids.length} destinatario(s).`;
        this.title = '';
        this.message = '';
      } catch (err: any) {
        this.errorMessage = err.message || 'No se pudo enviar la notificación. Inténtalo de nuevo.';
      } finally {
        this.sending = false;
        this.cdr.detectChanges(); // 2. Forzar actualización visual para quitar "Enviando..."
      }
    }

  private async loadAudienceData(): Promise<void> {
    try {
      const [usersSnapshot, trucksSnapshot, routesSnapshot] = await Promise.all([
        get(ref(this.database, 'usuarios')),
        get(ref(this.database, 'camiones')),
        get(ref(this.database, 'routes')),
      ]);

      const truckData = trucksSnapshot.exists() ? trucksSnapshot.val() as Record<string, any> : {};
      this.trucks = Object.entries(truckData).map(([id, truck]) => ({
        id,
        label: [id, truck.placa].filter(Boolean).join(' · '),
        route: String(truck.ruta || ''),
      })).sort((a, b) => a.id.localeCompare(b.id));

      const routeData = routesSnapshot.exists() ? routesSnapshot.val() as Record<string, any> : {};
      const routeMap = new Map<string, AudienceRoute>();
      for (const [id, data] of Object.entries(routeData)) {
        const name = String(data.nombreRuta || id);
        const points = Object.entries(data)
          .filter(([key, value]) => /^p\d+$/i.test(key) && value && typeof value === 'object')
          .map(([, value]) => ({
            lat: Number((value as any).x),
            lng: Number((value as any).y),
          }))
          .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
        routeMap.set(id, { id, label: name, aliases: [id, name], points });
      }

      const rawPeople: AudiencePerson[] = [];
      const userData = usersSnapshot.exists() ? usersSnapshot.val() as Record<string, any> : {};
      for (const [uid, data] of Object.entries(userData)) {
        if (!data || data.activo === false || data.active === false) continue;
        const address = data.address ?? {};
        const latitude = address.lat == null ? NaN : Number(address.lat);
        const longitude = address.lng == null ? NaN : Number(address.lng);
        rawPeople.push({
          uid,
          name: [data.name, data.lastName].filter(Boolean).join(' ') || data.email || uid,
          role: String(data.rol || 'user').toLowerCase(),
          truckId: String(data.camionId || ''),
          assignedRoute: String(data.rutaAsignada || ''),
          sector: String(address.sector || ''),
          nearestRoute: this.findNearestRoute(latitude, longitude, [...routeMap.values()]),
        });
      }

      for (const alias of [
        ...this.trucks.map((truck) => truck.route),
        ...rawPeople.map((person) => person.assignedRoute),
      ]) {
        this.addRouteAlias(routeMap, alias);
      }

      this.people = rawPeople;
      this.routes = [...routeMap.values()].sort((a, b) => a.label.localeCompare(b.label));
      const sectorLabels: Record<string, string> = {
        'Urb-Jacinto': 'San Jacinto',
        'Urb-Trinidad': 'La Trinidad',
        'Sect-Ziruma': 'Ziruma',
        'Sect-Naranjal': 'El Naranjal',
        'Sect-LaPiedra': 'La Piedra',
      };
      this.sectors = [...new Set(rawPeople.map((person) => person.sector).filter(Boolean))]
        .map((id) => ({ id, label: sectorLabels[id] || id }))
        .sort((a, b) => a.label.localeCompare(b.label));
      this.selectAllCandidates();
    } catch {
      this.errorMessage = 'No se pudieron cargar usuarios, camiones y rutas.';
    } finally {
      this.loading = false;
    }
  }

  private addRouteAlias(routeMap: Map<string, AudienceRoute>, value: string): void {
    const alias = value.trim();
    if (!alias) return;
    const normalized = this.normalize(alias);
    const existing = [...routeMap.values()].find((route) =>
      route.aliases.some((item) => this.normalize(item) === normalized));
    if (existing) {
      if (!existing.aliases.includes(alias)) existing.aliases.push(alias);
      return;
    }
    routeMap.set(normalized, { id: alias, label: alias, aliases: [alias], points: [] });
  }

  private personMatchesRoute(person: AudiencePerson, selectedRouteId: string): boolean {
    const route = this.routes.find((item) => item.id === selectedRouteId);
    if (!route) return false;
    const aliases = route.aliases.map((alias) => this.normalize(alias));
    const assignedMatch = aliases.includes(this.normalize(person.assignedRoute));
    const nearestMatch = person.role === 'user' &&
      aliases.includes(this.normalize(person.nearestRoute));
    const truckRoute = this.trucks.find((truck) => truck.id === person.truckId)?.route || '';
    const truckMatch = ['supervisor', 'crew', 'conductor'].includes(person.role) &&
      aliases.includes(this.normalize(truckRoute));
    return assignedMatch || nearestMatch || truckMatch;
  }

  private findNearestRoute(latitude: number, longitude: number, routes: AudienceRoute[]): string {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
      return '';
    }

    let closestRoute = '';
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const route of routes) {
      for (const point of route.points) {
        const distance = this.distanceInMeters(latitude, longitude, point.lat, point.lng);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestRoute = route.id;
        }
      }
    }
    return closestRoute;
  }

  private distanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const radians = (degrees: number) => degrees * Math.PI / 180;
    const deltaLat = radians(lat2 - lat1);
    const deltaLng = radians(lng2 - lng1);
    const value = Math.sin(deltaLat / 2) ** 2 +
      Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  private normalize(value: string): string {
    return value.trim().toLocaleLowerCase();
  }
}
