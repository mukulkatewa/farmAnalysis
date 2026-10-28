
export class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.firstName || '';
    this.lastName = data.lastName || '';
    this.farmAddress = data.farmAddress || '';
    this.acres = data.acres || '';
    this.phone = data.phone || '';
    this.role = data.role || 'user';
    this.location = data.location || null; // { latitude, longitude, timestamp }
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      farmAddress: this.farmAddress,
      acres: this.acres,
      phone: this.phone,
      role: this.role,
      location: this.location,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

