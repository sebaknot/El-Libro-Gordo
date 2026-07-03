import { cookies } from "next/headers";

export type Locale = "en" | "es";

const dictionaries = {
  en: {
    dashboard: "Dashboard",
    clients: "Clients",
    households: "Households",
    tasks: "Tasks",
    export: "Export",
    signOut: "Sign out",
    search: "Search by name, phone, email, or policy #…",
    newClient: "New client",
    newHousehold: "New household",
    notes: "Notes",
    documents: "Documents",
    policies: "Policies",
    members: "Members",
    save: "Save",
    cancel: "Cancel",
    addNote: "Add note",
    upload: "Upload",
    download: "Download",
    fullBookExport: "Full Book (Excel)",
    openTasks: "Open tasks",
    activeClients: "Active clients",
    activePolicies: "Active policies",
    needsCleanup: "Data cleanup",
    language: "Español",
  },
  es: {
    dashboard: "Panel",
    clients: "Clientes",
    households: "Hogares",
    tasks: "Tareas",
    export: "Exportar",
    signOut: "Cerrar sesión",
    search: "Buscar por nombre, teléfono, correo o # de póliza…",
    newClient: "Nuevo cliente",
    newHousehold: "Nuevo hogar",
    notes: "Notas",
    documents: "Documentos",
    policies: "Pólizas",
    members: "Miembros",
    save: "Guardar",
    cancel: "Cancelar",
    addNote: "Agregar nota",
    upload: "Subir",
    download: "Descargar",
    fullBookExport: "Libro completo (Excel)",
    openTasks: "Tareas abiertas",
    activeClients: "Clientes activos",
    activePolicies: "Pólizas activas",
    needsCleanup: "Limpieza de datos",
    language: "English",
  },
} satisfies Record<Locale, Record<string, string>>;

export type Dict = { [K in keyof (typeof dictionaries)["en"]]: string };

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("locale")?.value === "es" ? "es" : "en";
}

export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
