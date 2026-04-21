export type StarterChecklist = {
  title: string;
  frequency: "daily" | "weekly" | "monthly" | "custom";
  tasks: string[];
};

export const starterChecklists: StarterChecklist[] = [
  {
    title: "Öppning",
    frequency: "daily",
    tasks: [
      "Lås upp och släck larmet",
      "Kontrollera utrymningsvägar",
      "Starta luftning och ljus i rummen",
      "Kontrollera att första hjälpen-väskan är komplett",
      "Gå igenom dagens barnlista och allergier",
    ],
  },
  {
    title: "Stängning",
    frequency: "daily",
    tasks: [
      "Släck lampor i alla rum",
      "Kontrollera att alla fönster är stängda",
      "Kontrollera att alla barn är hämtade",
      "Stäng av kökets utrustning",
      "Aktivera larmet och lås",
    ],
  },
  {
    title: "Brandsäkerhet",
    frequency: "weekly",
    tasks: [
      "Utrymningsvägar fria från hinder",
      "Brandsläckare på plats och plomberade",
      "Brandvarnare testade",
      "Utrymningsplan synlig och uppdaterad",
      "Dörrar i brandcell stängs korrekt",
    ],
  },
  {
    title: "Städning & hygien",
    frequency: "daily",
    tasks: [
      "Rengöra toaletter och handfat",
      "Torka bord och stolar efter måltider",
      "Desinficera leksaker i småbarnsavdelningen",
      "Byta handdukar och moppar",
      "Tömma papperskorgar",
    ],
  },
];
