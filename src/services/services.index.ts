export { PetService } from "./pet.service";
export type { NewPet } from "./pet.service";

export { HealthService } from "./health.service";
export type { Vaccination, Medication, WeightLog } from "./health.service";

export { VetService } from "./vet.service";
export type { Vet, Appointment, NewAppointment } from "./vet.service";

export { AdoptionService } from "./adoption.service";
export type {
  AdoptionListing,
  AdoptionApplication,
} from "./adoption.service";

export { ProfileService } from "./profile.service";
export type { Profile } from "./profile.service";

export { CommunityService } from "./community.service";
export type { Message, NewMessage } from "./community.service";
